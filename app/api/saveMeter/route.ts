export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";

// 1. Interface ข้อมูลมิเตอร์
interface MeterData {
  timestamp: string;
  worker: string;
  jobType: string;
  peaOld: string;
  oldUnit: string;
  photoOld: string;
  peaNew: string;
  newUnit: string;
  photoNew: string;
  remark: string;
  lat: string;
  lng: string;
}

// 2. Interface สำหรับ Key
interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    // 3. ดึงข้อมูลจาก FormData
    const photoOldFile = data.get("photoOld");
    const photoNewFile = data.get("photoNew");

    const payload: MeterData = {
      timestamp: data.get("timestamp")?.toString() || new Date().toLocaleString("th-TH"),
      worker: data.get("worker")?.toString() || "",
      jobType: data.get("jobType")?.toString() || "",
      peaOld: data.get("peaOld")?.toString() || "",
      oldUnit: data.get("oldUnit")?.toString() || "",
      photoOld: (photoOldFile instanceof File) ? photoOldFile.name : "",
      peaNew: data.get("peaNew")?.toString() || "",
      newUnit: data.get("newUnit")?.toString() || "",
      photoNew: (photoNewFile instanceof File) ? photoNewFile.name : "",
      remark: data.get("remark")?.toString() || "",
      lat: data.get("lat")?.toString() || "",
      lng: data.get("lng")?.toString() || "",
    };

    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      return NextResponse.json({ success: false, error: "Missing Env Variables" }, { status: 500 });
    }

    // 4. เตรียม Auth
    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleServiceAccount;
    const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: serviceAccount.client_email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 5. สร้างลิงก์พิกัด
    const mapLink = (payload.lat && payload.lng) 
      ? `https://www.google.com/maps?q=${payload.lat},${payload.lng}` 
      : "";

    // 6. บันทึกข้อมูลหลัก (Append ลงชีทแรกปกติ)
    const values: string[][] = [[
      payload.timestamp, payload.worker, payload.jobType, payload.peaOld,
      payload.oldUnit, payload.photoOld, payload.peaNew, payload.newUnit,
      payload.photoNew, payload.remark, payload.lat, payload.lng, mapLink
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(),
      range: "A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    // --- 7. ส่วนเพิ่มใหม่: อัปเดตสถานะในชีท Inventory ---
    try {
      // ดึงข้อมูลคอลัมน์ A (เลข PEA ใหม่) จากชีทชื่อ "Inventory"
      const inventoryResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId.trim(),
        range: "Inventory!A:A", 
      });

      const inventoryRows = inventoryResponse.data.values;
      if (inventoryRows) {
        // หาตำแหน่งแถวที่เลข peaNew ตรงกัน (ต้องตรงกันเป๊ะ)
        const rowIndex = inventoryRows.findIndex(row => row[0] === payload.peaNew);

        if (rowIndex !== -1) {
          // ถ้าเจอ ให้ไป Update คอลัมน์ D (แถวที่เจอ) เป็น 'yes' และ E เป็นวันที่ติดตั้ง
          // หมายเหตุ: rowIndex เริ่มที่ 0, แถวใน Sheet เริ่มที่ 1 ดังนั้นต้อง +1
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId.trim(),
            range: `Inventory!D${rowIndex + 1}:E${rowIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [["yes", payload.timestamp]],
            },
          });
        }
      }
    } catch (invError) {
      // ถ้าหาชีท Inventory ไม่เจอ หรือมีปัญหาในการอัปเดต 
      // เราจะไม่ให้ Error นี้ไปขัดขวางการ return success ของข้อมูลหลัก
      console.error("Inventory Update Error (Optional Step):", invError);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Sheet API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}