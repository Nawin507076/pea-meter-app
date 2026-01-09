export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const { peaId } = await req.json();

    if (!peaId) {
      return NextResponse.json({ success: false, error: "Missing peaId" }, { status: 400 });
    }

    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      return NextResponse.json({ success: false, error: "Missing Environment Variables" }, { status: 500 });
    }

    const serviceAccount = JSON.parse(keyRaw.trim());
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n")
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 1. ดึงข้อมูลใน Column G (ที่เก็บเลข PEA ใหม่) เพื่อหาตำแหน่งแถว
    // ปรับช่วง Range ให้ตรงกับ Column ที่เก็บ PEA ใหม่ใน Sheet ของคุณ (ตัวอย่างคือ G)
    const getRows = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId.trim(),
      range: "Sheet1!G:G", 
    });

    const rows = getRows.data.values || [];
    // ค้นหาว่า peaId อยู่ในแถวไหน (index 0 คือแถวที่ 1)
    const rowIndex = rows.findIndex(row => row[0] === peaId.toString());

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: "ไม่พบเลข PEA นี้ในฐานข้อมูล" }, { status: 404 });
    }

    const realRowNumber = rowIndex + 1; // ลำดับแถวจริงใน Sheet

    // 2. อัปเดต Column N (inst_flag) ในแถวที่พบให้เป็น "done"
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId.trim(),
      range: `Sheet1!N${realRowNumber}`, 
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["done"]] }
    });

    return NextResponse.json({ success: true, message: `Updated row ${realRowNumber}` });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("❌ Update Status Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}