export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

// 1. ตั้งค่า Cloudinary (ให้เหมือนไฟล์ที่ใช้งานได้)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "meter_photos", resource_type: "auto" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result?.secure_url || "");
        }
      );
      uploadStream.end(buffer);
    });
  } catch (err) {
    console.error("Cloudinary Error:", err);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      return NextResponse.json({ success: false, error: "Missing Env" }, { status: 500 });
    }

    const formData = await req.formData();
    const originalPeaId = (formData.get("originalPeaId") as string) || "";
    const newPeaId = (formData.get("pea") as string) || "";
    const peaOld = (formData.get("peaOld") as string) || "";
    const oldUnit = (formData.get("oldUnit") as string) || "";
    const newUnit = (formData.get("newUnit") as string) || "";
    const remark = (formData.get("remark") as string) || "";

    const photoOldFile = formData.get("photoOldFile") as File | null;
    const photoNewFile = formData.get("photoNewFile") as File | null;

    // --- ส่วนที่ 1: อัปโหลดรูปไป Cloudinary (ถ้ามีการแนบไฟล์มาใหม่) ---
    const [photoOldUrl, photoNewUrl] = await Promise.all([
      photoOldFile && photoOldFile.size > 0 ? uploadToCloudinary(photoOldFile) : Promise.resolve(""),
      photoNewFile && photoNewFile.size > 0 ? uploadToCloudinary(photoNewFile) : Promise.resolve("")
    ]);

    // --- ส่วนที่ 2: ตั้งค่า Google Auth ---
    const serviceAccount = JSON.parse(keyRaw.trim());
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = "Sheet1";

    // ดึงข้อมูลเดิมมาตรวจสอบ
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId.trim(),
      range: `${sheetName}!A:N`,
    });

    const rows = (getRes.data.values as string[][]) || [];
    // หาแถวที่คอลัมน์ G (Index 6) ตรงกับเลข PEA ใหม่เดิม
    const rowIndex = rows.findIndex((row) => row[6] === originalPeaId);

    if (rowIndex === -1) {
      return NextResponse.json({ success: false, error: "Requested entity was not found (PEA ID)" }, { status: 404 });
    }

    const currentRow = rows[rowIndex];

    // --- ส่วนที่ 3: รวมข้อมูลใหม่กับข้อมูลเดิม ---
    // ลำดับ A-N: วันที่,พนักงาน,แผนก,PEAเก่า,หน่วยเก่า,รูปเก่า,PEAใหม่,หน่วยใหม่,รูปใหม่,สาเหตุ,lat,long,map,เปลี่ยนแล้ว
    const updatedRow = [
      currentRow[0] || "",               // A: วันที่เดิม
      currentRow[1] || "",               // B: พนักงานเดิม
      currentRow[2] || "",               // C: แผนกเดิม
      peaOld || currentRow[3] || "",     // D: PEAเก่าใหม่ หรือ เดิม
      oldUnit || currentRow[4] || "",    // E: หน่วยเก่าใหม่ หรือ เดิม
      photoOldUrl || currentRow[5] || "", // F: Link Cloudinary ใหม่ หรือ Link เดิม
      newPeaId || currentRow[6] || "",   // G: PEAใหม่ (ตัวแก้ไข)
      newUnit || currentRow[7] || "",    // H: หน่วยใหม่
      photoNewUrl || currentRow[8] || "", // I: Link Cloudinary ใหม่ หรือ Link เดิม
      remark || currentRow[9] || "",     // J: สาเหตุ
      currentRow[10] || "",              // K: lat
      currentRow[11] || "",              // L: lng
      currentRow[12] || "",              // M: map link
      currentRow[13] || ""               // N: เปลี่ยนแล้ว (สถานะเดิม)
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId.trim(),
      range: `${sheetName}!A${rowIndex + 1}:N${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    console.error("Update API Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}