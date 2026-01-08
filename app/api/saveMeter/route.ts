export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// 1. กำหนด Interface ให้ชัดเจน
interface MeterPayload {
  worker: string;
  jobType: string;
  peaOld: string;
  oldUnit: string;
  peaNew: string;
  newUnit: string;
  remark: string;
  photo?: string;
  timestamp: string;
}

// กำหนด Type สำหรับ Service Account JSON
interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  [key: string]: string | undefined; // สำหรับ field อื่นๆ ใน JSON
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    // 2. ใช้ Partial<MeterPayload> แทน any
    const payload: Partial<MeterPayload> = {};
    data.forEach((value, key) => {
      if (value instanceof File) {
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

    // 3. ระบุ Type ให้กับผลลัพธ์ของ JSON.parse
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

    const values = [
      [
        payload.worker ?? "",
        payload.jobType ?? "",
        payload.peaOld ?? "",
        payload.oldUnit ?? "",
        payload.peaNew ?? "",
        payload.newUnit ?? "",
        payload.remark ?? "",
        payload.photo ?? "",
        payload.timestamp ?? "",
      ],
    ];
    // เพิ่มบรรทัดนี้ก่อน append
console.log("Using ID:", sheetId);
console.log("Service Account Email:", serviceAccount.client_email);
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(), // เพิ่ม .trim() เพื่อป้องกันช่องว่างที่แฝงมา,
      range: "A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    // 4. แก้ไข catch (error: any) โดยการเช็คว่าเป็น Error Instance หรือไม่
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    console.error("Sheet API Error:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}