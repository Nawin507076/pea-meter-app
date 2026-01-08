export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";

// 1. กำหนด Interface สำหรับข้อมูลมิเตอร์ให้ชัดเจน (ป้องกัน Error: Unexpected any)
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

// 2. Interface สำหรับ Google Service Account Key
interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    // 3. ดึงข้อมูลจาก FormData และระบุ Type ให้ชัดเจน
    // เราใช้การตรวจสอบ instanceof File สำหรับข้อมูลรูปภาพ
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
      return NextResponse.json(
        { success: false, error: "Missing Environment Variables" },
        { status: 500 }
      );
    }

    // 4. เตรียมการยืนยันตัวตนกับ Google Sheets
    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleServiceAccount;
    const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 5. สร้างลิงก์พิกัด Google Maps
    const mapLink = (payload.lat && payload.lng) 
      ? `https://www.google.com/maps?q=${payload.lat},${payload.lng}` 
      : "";

    // 6. จัดข้อมูลลงในตาราง (Array ของ String)
    const values: string[][] = [
      [
        payload.timestamp,
        payload.worker,
        payload.jobType,
        payload.peaOld,
        payload.oldUnit,
        payload.photoOld,
        payload.peaNew,
        payload.newUnit,
        payload.photoNew,
        payload.remark,
        payload.lat,
        payload.lng,
        mapLink
      ],
    ];

    // 7. ส่งคำขอ Append ข้อมูลไปยัง Sheet
    const request: sheets_v4.Params$Resource$Spreadsheets$Values$Append = {
      spreadsheetId: sheetId.trim(),
      range: "A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    };

    await sheets.spreadsheets.values.append(request);

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    // จัดการ Error แบบ Type-safe
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Sheet API Error:", errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}