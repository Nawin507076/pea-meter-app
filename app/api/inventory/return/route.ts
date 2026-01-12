export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";

// 1. กำหนด Interface สำหรับข้อมูลที่รับเข้ามา
interface InventoryRequest {
  items: string[];
  staffName: string;
}

// 2. Interface สำหรับ Google Service Account
interface GoogleKey {
  client_email: string;
  private_key: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InventoryRequest;
    const { items, staffName } = body;

    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      return NextResponse.json(
        { success: false, error: "Missing Env Variables" },
        { status: 500 }
      );
    }

    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleKey;
    
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = sheetId.trim();

    // 1. ดึงข้อมูลจากชีต Inventory (คอลัมน์ A ถึง D)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Inventory!A:D",
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลในระบบ" },
        { status: 404 }
      );
    }

    // ✅ แก้ไข "Unexpected any" โดยการระบุ Type ของ Google Sheets SDK
    const dataToUpdate: sheets_v4.Schema$ValueRange[] = [];
    const forbiddenPeas: string[] = [];
    const notFoundPeas: string[] = [];

    // 2. ตรวจสอบเงื่อนไขแต่ละรายการ PEA ที่ส่งมา
    items.forEach((peaToFind: string) => {
      const rowIndex = rows.findIndex((row) => row[0] === peaToFind);
      
      if (rowIndex !== -1) {
        const currentStatus = rows[rowIndex][3]; // คอลัมน์ D คือ Index 3

        // 🛑 ถ้าสถานะเป็น 'yes' (ติดตั้งแล้ว) ห้ามคืนคลัง
        if (currentStatus === "yes") {
          forbiddenPeas.push(peaToFind);
        } else {
          // เตรียมข้อมูลเพื่อ Update แถวนั้นๆ ในคอลัมน์ D
          dataToUpdate.push({
            range: `Inventory!D${rowIndex + 1}`,
            values: [["back"]]
          });
        }
      } else {
        notFoundPeas.push(peaToFind);
      }
    });

    // 3. จัดการกรณีที่มีรายการติดเงื่อนไข
    if (forbiddenPeas.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `ไม่สามารถคืนคลังได้เนื่องจากเครื่องสถานะเป็น (ติดตั้งไปแล้ว): ${forbiddenPeas.join(", ")} ตรวจสอบในงานรอคีย์เข้าในระบบ` 
      }, { status: 400 });
    }

    if (dataToUpdate.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "ไม่พบหมายเลข PEA ที่สามารถทำรายการได้ในระบบ" 
      }, { status: 404 });
    }

    // 4. บันทึกข้อมูลกลับไปยัง Google Sheets แบบ Batch
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        data: dataToUpdate,
        valueInputOption: "USER_ENTERED",
      },
    });

    console.log(`Return Success: ${dataToUpdate.length} items by ${staffName}`);

    return NextResponse.json({ 
      success: true, 
      message: `คืนคลังสำเร็จ ${dataToUpdate.length} รายการ` 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Return API Error:", errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}