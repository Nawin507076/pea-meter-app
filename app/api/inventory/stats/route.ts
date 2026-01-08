export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// --- Interfaces ---
interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

interface HistoryDetail {
  peaOld: string;
  oldUnit: string;
  newUnit: string;
  remark: string;
  lat: string;
  lng: string;
  photoOld: string;
  photoNew: string;
  worker: string;
}

interface MeterItem {
  pea: string;
  staff: string;
  date: string;
  history?: HistoryDetail; // ข้อมูลประวัติที่จะดึงมาจาก Sheet1
}

export async function GET() {
  try {
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) return NextResponse.json({ success: false, error: "Env missing" }, { status: 500 });

    const serviceAccount = JSON.parse(keyRaw.trim()) as GoogleServiceAccount;
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: serviceAccount.client_email, private_key: serviceAccount.private_key.replace(/\\n/g, "\n") },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 1. ดึงข้อมูลจากทั้ง 2 หน้าพร้อมกัน
    const [invRes, logRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId.trim(), range: "Inventory!A:E" }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId.trim(), range: "Sheet1!A:M" }) // หน้าที่เก็บประวัติสับเปลี่ยน
    ]);

    const inventoryRows = invRes.data.values || [];
    const logRows = logRes.data.values || [];

    // 2. กรองเฉพาะรายการที่ยังไม่ติดตั้ง (no)
    const remainingItems: MeterItem[] = inventoryRows.slice(1)
      .filter(row => row[3] === "no")
      .map(row => ({
        pea: row[0] || "",
        staff: row[1] || "",
        date: row[2] || ""
      }));

    // 3. กรองรายการที่ติดตั้งแล้ว (yes) พร้อมดึงข้อมูลจาก Sheet1 มาประกบ
    const installedItems: MeterItem[] = inventoryRows.slice(1)
      .filter(row => row[3] === "yes")
      .map(row => {
        const peaNew = row[0];
        // ค้นหาเลข peaNew นี้ใน Sheet1 (คอลัมน์ G คือ PEAใหม่)
        const logData = logRows.find(log => log[6] === peaNew);

        return {
          pea: peaNew,
          staff: row[1] || "",
          date: row[4] || row[2], // วันที่ติดตั้งสำเร็จ
          history: logData ? {
            worker: logData[1],
            peaOld: logData[3],
            oldUnit: logData[4],
            photoOld: logData[5],
            newUnit: logData[7],
            photoNew: logData[8],
            remark: logData[9],
            lat: logData[10],
            lng: logData[11]
          } : undefined
        };
      });

    return NextResponse.json({
      success: true,
      remainingCount: remainingItems.length,
      installedCount: installedItems.length,
      remainingItems,
      installedItems
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}