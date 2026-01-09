export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

export async function GET() {
  try {
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      return NextResponse.json({ success: false, error: "Env missing" }, { status: 500 });
    }

    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleServiceAccount;
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ดึงข้อมูลจาก Sheet1 เฉพาะ Column A ถึง N (N คือ inst_flag)
    const logRes = await sheets.spreadsheets.values.get({ 
      spreadsheetId: sheetId.trim(), 
      range: "Sheet1!A:N" 
    });

    const logRows = logRes.data.values || [];

    // กรองเฉพาะรายการที่ Column N (Index 13) มีค่าเท่ากับ "done"
    const completedItems = logRows.slice(1)
      .filter(row => row[13] === "done")
      .map(row => ({
        pea: row[6] || "",      // เลข PEA ใหม่
        staff: row[1] || "",    // ผู้ปฏิบัติงาน
        date: row[0] || "",     // วันที่/เวลา
        history: {
          worker: row[1],
          peaOld: row[3],
          oldUnit: row[4],
          photoOld: row[5],
          newUnit: row[7],
          photoNew: row[8],
          remark: row[9],
          lat: row[10],
          lng: row[11],
          inst_flag: row[13]
        }
      }));

    return NextResponse.json({
      success: true,
      count: completedItems.length,
      completedItems
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}