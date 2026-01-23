export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import dbConnect from '@/lib/dbConnect';
import Meter from '@/models/Meter';
import Inventory from "@/models/Inventory";

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "meter_photos", resource_type: "auto" },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            reject(error);
          } else {
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
    await dbConnect();

    // 0. เตรียมเลข PEA ใหม่แบบ Clean Data (ตัดเว้นวรรค + ตัวพิมพ์ใหญ่)
    const peaNewClean = formData.get("peaNew")?.toString().trim().toUpperCase() || "";
    const remark = formData.get("remark")?.toString() || "";

    // --- ตรวจสอบ Inventory ก่อนเริ่มกระบวนการ ---
    // ถ้า remark ขึ้นต้นด้วย "ปกติ" ให้ข้ามการเช็ค pea new (เพราะเปลี่ยนตามรอบ หรือไม่ได้เปลี่ยนเพราะเสีย)
    if (!remark.startsWith("ปกติ")) {
      const checkInv = await Inventory.findOne({ pea_new: peaNewClean });
      if (!checkInv) {
        return NextResponse.json({
          success: false,
          error: `❌ ไม่พบเลขมิเตอร์ใหม่ ${peaNewClean} ในรายการเบิกพัสดุ\nตรวจสอบเลขมิเตอร์ใหม่ให้ถูกต้อง`
        }, { status: 400 });
      }

      if (checkInv.inst_flag === "yes") {
        return NextResponse.json({
          success: false,
          error: `⚠️ มิเตอร์เลข ${peaNewClean} ถูกติดตั้งไปแล้วเมื่อ ${checkInv.installed_date}`
        }, { status: 400 });
      }
    }

    // --- ส่วนที่ 1: จัดการรูปภาพ (Cloudinary) ---
    const photoOldFile = formData.get("photoOld") as File | null;
    const photoNewFile = formData.get("photoNew") as File | null;

    const [photoOldUrl, photoNewUrl] = await Promise.all([
      photoOldFile && photoOldFile.size > 0 ? uploadToCloudinary(photoOldFile) : Promise.resolve(""),
      photoNewFile && photoNewFile.size > 0 ? uploadToCloudinary(photoNewFile) : Promise.resolve("")
    ]);

    // --- ส่วนที่ 2: เตรียมข้อมูลบันทึก ---
    const mongoData = {
      worker: formData.get("worker")?.toString(),
      jobType: formData.get("jobType")?.toString(),
      meterIdOld: formData.get("peaOld")?.toString().trim().toUpperCase(),
      readingOld: Number(formData.get("oldUnit")) || 0,
      meterIdNew: peaNewClean, // ใช้ตัวที่ Clean แล้ว
      readingNew: Number(formData.get("newUnit")) || 0,
      remark: formData.get("remark")?.toString(),
      photoOldUrl: photoOldUrl,
      photoNewUrl: photoNewUrl,
      location: {
        lat: formData.get("lat")?.toString(),
        lng: formData.get("lng")?.toString()
      },
      recordedAt: formData.get("timestamp")?.toString() || new Date().toLocaleString("th-TH"),
      status: ""
    };

    // บันทึกลงตารางงาน (Meters)
    await Meter.create(mongoData);

    // --- ส่วนที่ 3: ตัดสต็อก Inventory (MongoDB Only) ---
    await Inventory.findOneAndUpdate(
      { pea_new: mongoData.meterIdNew },
      {
        $set: {
          inst_flag: "yes",
          installed_date: mongoData.recordedAt
        }
      },
      { new: true }
    );

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่รู้จัก";
    console.error("API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}