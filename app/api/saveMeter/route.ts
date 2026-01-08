export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

type MeterPayload = {
  worker: string;
  jobType: string;
  peaOld: string;
  oldUnit: string;
  peaNew: string;
  newUnit: string;
  remark: string;
  photo?: string;
  timestamp: string;
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    // แปลง FormData เป็น Object
    const payload: Partial<MeterPayload> = {};
    data.forEach((value, key) => {
      if (value instanceof File) {
        payload[key as keyof MeterPayload] = value.name;
      } else {
        payload[key as keyof MeterPayload] = value.toString();
      }
    });

    // อ่าน service account จาก env
    const serviceAccountRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
    const serviceAccount = JSON.parse(serviceAccountRaw);

    // แปลง \n เป็น newline จริง
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // สร้าง row สำหรับ Google Sheet
    const values = [
      [
        payload.worker || "",
        payload.jobType || "",
        payload.peaOld || "",
        payload.oldUnit || "",
        payload.peaNew || "",
        payload.newUnit || "",
        payload.remark || "",
        payload.photo || "",
        payload.timestamp || "",
      ],
    ];
    console.log("SERVICE ACCOUNT KEY:", process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.slice(0,50));
    console.log("SHEET ID:", process.env.GOOGLE_SHEET_ID);

    // Append ข้อมูลลง Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
