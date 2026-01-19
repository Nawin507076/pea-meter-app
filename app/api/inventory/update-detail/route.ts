import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  try {
    // 1. ดึงค่าจาก Env และใส่ค่าว่างสำรองเพื่อป้องกัน Type Error
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "";
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "";
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

    if (!serviceAccountKey || !spreadsheetId) {
      throw new Error("Missing Environment Variables");
    }

    const credentials = JSON.parse(serviceAccountKey);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    const formData = await req.formData();
    
    // 2. จัดการค่าจาก FormData (ใส่ || "" เพื่อให้แน่ใจว่าเป็น string)
    const originalPeaId = (formData.get("originalPeaId") as string) || "";
    const newPeaId = (formData.get("pea") as string) || "";
    const peaOld = (formData.get("peaOld") as string) || "";
    const oldUnit = (formData.get("oldUnit") as string) || "";
    const newUnit = (formData.get("newUnit") as string) || "";
    const remark = (formData.get("remark") as string) || "";

    const photoOldFile = formData.get("photoOldFile") as File | null;
    const photoNewFile = formData.get("photoNewFile") as File | null;

    let photoOldId = "";
    let photoNewId = "";

    const uploadToDrive = async (file: File, fileName: string) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: folderId ? [folderId] : [],
        },
        media: {
          mimeType: file.type,
          body: Readable.from(buffer),
        },
        fields: "id",
      });
      return response.data.id || ""; // เติม || "" กันเหนียว
    };

    if (photoOldFile) photoOldId = await uploadToDrive(photoOldFile, `OLD_${newPeaId || originalPeaId}.jpg`);
    if (photoNewFile) photoNewId = await uploadToDrive(photoNewFile, `NEW_${newPeaId || originalPeaId}.jpg`);

    const sheetName = "Sheet1"; 
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId, // ระบุชื่อตัวแปรให้ชัดเจน
      range: `${sheetName}!A:N`, 
    });

    const rows = (getRes.data.values as string[][]) || [];
    const rowIndex = rows.findIndex((row) => row[6] === originalPeaId);

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูล PEAใหม่ นี้ในระบบ" }, { status: 404 });
    }

    const currentRow = rows[rowIndex];

    const updatedRow = [
      currentRow[0] || "",
      currentRow[1] || "",
      currentRow[2] || "",
      peaOld || currentRow[3] || "",
      oldUnit || currentRow[4] || "",
      photoOldId || currentRow[5] || "",
      newPeaId || currentRow[6] || "",
      newUnit || currentRow[7] || "",
      photoNewId || currentRow[8] || "",
      remark || currentRow[9] || "",
      currentRow[10] || "",
      currentRow[11] || "",
      currentRow[12] || "",
      currentRow[13] || ""
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A${rowIndex + 1}:N${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}