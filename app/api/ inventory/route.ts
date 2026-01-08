export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

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
    // ระบุ Type ให้กับข้อมูลที่รับจาก Body
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

    // ระบุ Type ให้กับผลลัพธ์จาก JSON.parse
    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleKey;
    
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    // เตรียมข้อมูลลง Inventory (A: เลข PEA, B: ชื่อคนเบิก, C: วันที่เบิก, D: inst_flag)
    const values: string[][] = items.map((pea: string) => [
      pea,
      staffName,
      new Date().toLocaleString("th-TH"),
      "no" // Default ค่าเป็น no
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(),
      range: "Inventory!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    // 3. จัดการ Error แบบ Type-safe (แทนที่ any)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Inventory API Error:", errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}