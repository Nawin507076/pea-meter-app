export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import dbConnect from '@/lib/dbConnect'; // นำเข้าตัวเชื่อมต่อ
import Inventory from '@/models/Inventory'; // นำเข้า Model ใหม่

interface InventoryRequest {
  items: string[];
  staffName: string;
}

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
      return NextResponse.json({ success: false, error: "Missing Env" }, { status: 500 });
    }

    const withdrawDate = new Date().toLocaleString("th-TH");

    // --- [ส่วนที่ 1: บันทึกลง MongoDB] ---
    await dbConnect();
    
    // เตรียมข้อมูลสำหรับ MongoDB
    const mongoItems = items.map((pea: string) => ({
      pea_new: pea.trim().toUpperCase(), // ป้องกันเว้นวรรคและตัวพิมพ์เล็ก
      staff_name: staffName,
      withdraw_date: withdrawDate,
      inst_flag: "no",
      installed_date: ""
    }));

    /** * ใช้ insertMany เพื่อบันทึกข้อมูลหลายตัวพร้อมกัน
     * ordered: false หมายถึงถ้าตัวไหนซ้ำ (Duplicate) ให้ข้ามไปแล้วทำตัวอื่นต่อ 
     */
    try {
      await Inventory.insertMany(mongoItems, { ordered: false });
    } catch (mongoErr) {
      console.warn("บางรายการอาจจะซ้ำในระบบ MongoDB แต่จะดำเนินการต่อที่ Sheets");
    }

    // --- [ส่วนที่ 2: บันทึกลง Google Sheets (โค้ดเดิม)] ---
    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleKey;
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    const values: string[][] = items.map((pea: string) => [
      pea,
      staffName,
      withdrawDate,
      "no"
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(),
      range: "Inventory!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Inventory API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}