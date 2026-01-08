export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

// ⚠️ ตรวจสอบ Folder ID ของคุณอีกครั้ง
const DRIVE_FOLDER_ID = "1E9J1BdvfliTowlaKgqO0XSGztX-ndidG"; 

interface MeterData {
  timestamp: string;
  worker: string;
  jobType: string;
  peaOld: string;
  oldUnit: string;
  photoOld: string;
  peaNew: string;
  newUnit: string;
  photoNew: string;
  remark: string;
  lat: string;
  lng: string;
}

/**
 * ฟังก์ชันอัปโหลดไฟล์ไป Google Drive
 * ระบุ Type Auth ของ Google ให้ถูกต้องเพื่อเลี่ยง Error 'any'
 */
async function uploadToDrive(
  file: File, 
  auth: InstanceType<typeof google.auth.GoogleAuth>
): Promise<string> {
  try {
    if (file.size === 0) return "";

    const drive = google.drive({ version: "v3", auth });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // ปล่อยให้ TypeScript คาดเดา Type (Inference) เพื่อเลี่ยงปัญหา Header Incompatible
    const response = await drive.files.create({
      requestBody: {
        name: `meter_${Date.now()}_${file.name}`,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id",
    });

    console.log(`✅ อัปโหลดสำเร็จ ID: ${response.data.id}`);
    return response.data.id || "";
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Drive Upload Error";
    console.error("❌ Drive Error:", errorMsg);
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

    const serviceAccount = JSON.parse(keyRaw.trim());
    
    // 1. ตั้งค่า Auth พร้อม Scopes ที่จำเป็นสำหรับการเขียนไฟล์และเขียนชีท
    const auth = new google.auth.GoogleAuth({
      credentials: { 
        client_email: serviceAccount.client_email, 
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n") 
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file"
      ],
    });

    // 2. รับไฟล์จาก FormData (ตรวจสอบ name="photoOld" และ "photoNew" ในหน้าฟอร์มด้วย)
    const photoOldFile = formData.get("photoOld") as File | null;
    const photoNewFile = formData.get("photoNew") as File | null;

    // 3. อัปโหลดรูปพร้อมกัน (Parallel)
    const [photoOldId, photoNewId] = await Promise.all([
      photoOldFile && photoOldFile.size > 0 ? uploadToDrive(photoOldFile, auth) : Promise.resolve(""),
      photoNewFile && photoNewFile.size > 0 ? uploadToDrive(photoNewFile, auth) : Promise.resolve("")
    ]);

    // 4. เตรียมข้อมูล Payload ทั้งหมด
    const payload: MeterData = {
      timestamp: formData.get("timestamp")?.toString() || new Date().toLocaleString("th-TH"),
      worker: formData.get("worker")?.toString() || "",
      jobType: formData.get("jobType")?.toString() || "",
      peaOld: formData.get("peaOld")?.toString() || "",
      oldUnit: formData.get("oldUnit")?.toString() || "",
      photoOld: photoOldId, 
      peaNew: formData.get("peaNew")?.toString() || "",
      newUnit: formData.get("newUnit")?.toString() || "",
      photoNew: photoNewId, 
      remark: formData.get("remark")?.toString() || "",
      lat: formData.get("lat")?.toString() || "",
      lng: formData.get("lng")?.toString() || "",
    };

    const sheets = google.sheets({ version: "v4", auth });
    const mapLink = (payload.lat && payload.lng) 
      ? `https://www.google.com/maps?q=${payload.lat},${payload.lng}` 
      : "";

    // 5. ข้อมูลลง Sheet (A-M) มั่นใจว่า photoOld/New อยู่ใน Index 5 และ 8
    const values: string[][] = [[
      payload.timestamp, payload.worker, payload.jobType, payload.peaOld,
      payload.oldUnit, payload.photoOld, payload.peaNew, payload.newUnit,
      payload.photoNew, payload.remark, payload.lat, payload.lng, mapLink
    ]];

    // บันทึกประวัติลง Sheet1
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId.trim(),
      range: "Sheet1!A1", 
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    // 6. อัปเดตสถานะ Inventory
    const invRes = await sheets.spreadsheets.values.get({ 
      spreadsheetId: sheetId.trim(), 
      range: "Inventory!A:A" 
    });

    const invRows = invRes.data.values as string[][] | null | undefined;
    if (invRows) {
      const rowIndex = invRows.findIndex((row) => row[0] === payload.peaNew);
      if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId.trim(),
          range: `Inventory!D${rowIndex + 1}:E${rowIndex + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["yes", payload.timestamp]] }
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