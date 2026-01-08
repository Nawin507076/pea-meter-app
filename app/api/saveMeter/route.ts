export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// 1. ปรับ Interface ให้รองรับฟิลด์ใหม่
interface MeterPayload {
  worker: string;
  jobType: string;
  peaOld: string;
  oldUnit: string;
  photoOld?: string; // เพิ่ม
  peaNew: string;
  newUnit: string;
  photoNew?: string; // เพิ่ม
  remark: string;
  lat: string;       // เพิ่ม
  lng: string;       // เพิ่ม
  timestamp: string;
}

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  [key: string]: string | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    // 2. ดึงข้อมูลจาก FormData ให้ครบทุก Key ที่ส่งมาจากหน้าบ้าน
    const payload: Partial<MeterPayload> = {};
    data.forEach((value, key) => {
      if (value instanceof File) {
        // เก็บชื่อไฟล์รูปภาพ
        payload[key as keyof MeterPayload] = value.name;
      } else {
        payload[key as keyof MeterPayload] = value.toString();
      }
    });

    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      throw new Error("Missing environment variables");
    }

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

    // 3. จัดเรียงลำดับคอลัมน์ที่จะลงใน Google Sheet (เรียงตามใจชอบ)
    const values = [
      [
        payload.timestamp ?? "",
        payload.worker ?? "",
        payload.jobType ?? "",
        payload.peaOld ?? "",
        payload.oldUnit ?? "",
        payload.photoOld ?? "", // รูปเก่า
        payload.peaNew ?? "",
        payload.newUnit ?? "",
        payload.photoNew ?? "", // รูปใหม่
        payload.remark ?? "",
        payload.lat ?? "",      // ละติจูด
        payload.lng ?? "",      // ลองจิจูด
        // แถม: สร้างลิงก์ Google Maps ให้กดดูได้ทันที
        payload.lat ? `https://www.google.com/maps?q=${payload.lat},${payload.lng}` : ""
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(),
      range: "A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Sheet API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}