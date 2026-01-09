export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";

// 1. ตั้งค่า Cloudinary (ดึงค่าจาก .env.local ที่คุณไปก๊อปมา)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * ฟังก์ชันอัปโหลดรูปไป Cloudinary (มาแทน uploadToDrive เดิม)
 */
async function uploadToCloudinary(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: "meter_photos",
          resource_type: "auto" 
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            reject(error);
          } else {
            // คืนค่าเป็น URL รูปภาพ (https://...)
            resolve(result?.secure_url || ""); 
          }
        }
      );
      uploadStream.end(buffer);
    });
  } catch (err) {
    console.error("Cloudinary Buffer Error:", err);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!keyRaw || !sheetId) {
      return NextResponse.json({ success: false, error: "Missing Env" }, { status: 500 });
    }

    // รับไฟล์รูปจาก FormData
    const photoOldFile = formData.get("photoOld") as File | null;
    const photoNewFile = formData.get("photoNew") as File | null;

    // --- ส่วนที่ 1: อัปโหลดรูปไป Cloudinary ---
    const [photoOldUrl, photoNewUrl] = await Promise.all([
      photoOldFile && photoOldFile.size > 0 ? uploadToCloudinary(photoOldFile) : Promise.resolve(""),
      photoNewFile && photoNewFile.size > 0 ? uploadToCloudinary(photoNewFile) : Promise.resolve("")
    ]);

    // --- ส่วนที่ 2: ตั้งค่า Google Auth (ใช้เฉพาะสิทธิ์ Sheets) ---
    const serviceAccount = JSON.parse(keyRaw.trim());
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    // ดึงค่าอื่นๆ จากฟอร์ม
    const lat = formData.get("lat")?.toString() || "";
    const lng = formData.get("lng")?.toString() || "";
    const peaNew = formData.get("peaNew")?.toString() || "";
    const timestamp = formData.get("timestamp")?.toString() || new Date().toLocaleString("th-TH");

    // --- ส่วนที่ 3: บันทึกข้อมูลลง Sheet1 ---
    const values = [[
      timestamp,
      formData.get("worker")?.toString() || "",
      formData.get("jobType")?.toString() || "",
      formData.get("peaOld")?.toString() || "",
      formData.get("oldUnit")?.toString() || "",
      photoOldUrl, // กลายเป็น Link รูปภาพแล้ว
      peaNew,
      formData.get("newUnit")?.toString() || "",
      photoNewUrl, // กลายเป็น Link รูปภาพแล้ว
      formData.get("remark")?.toString() || "",
      lat,
      lng,
      (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : ""
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(),
      range: "Sheet1!A1", 
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    // --- ส่วนที่ 4: ตัดสต็อก Inventory (เหมือนเดิมเป๊ะ) ---
    const invRes = await sheets.spreadsheets.values.get({ 
      spreadsheetId: sheetId.trim(), 
      range: "Inventory!A:A" 
    });

    const invRows = invRes.data.values as string[][] | null | undefined;
    if (invRows) {
      const rowIndex = invRows.findIndex((row) => row[0] === peaNew);
      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId.trim(),
          range: `Inventory!D${rowIndex + 1}:E${rowIndex + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["yes", timestamp]] }
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Error";
    console.error("Critical API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}