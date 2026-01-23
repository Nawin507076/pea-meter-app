export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from '@/lib/dbConnect';
import Meter from '@/models/Meter';
import Inventory from '@/models/Inventory';

// 1. ตั้งค่า Cloudinary
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
    await dbConnect();

    const formData = await req.formData();
    const originalPeaId = (formData.get("originalPeaId") as string)?.trim();
    const newPeaId = (formData.get("pea") as string)?.trim(); // ค่า PEA ใหม่ที่อาจถูกแก้ไข

    const peaOld = (formData.get("peaOld") as string);
    const oldUnit = Number(formData.get("oldUnit"));
    const newUnit = Number(formData.get("newUnit"));
    const remark = (formData.get("remark") as string);

    const photoOldFile = formData.get("photoOldFile") as File | null;
    const photoNewFile = formData.get("photoNewFile") as File | null;

    if (!originalPeaId) {
      return NextResponse.json({ success: false, error: "Missing Original PEA ID" }, { status: 400 });
    }

    // 1. หาข้อมูล Meter เดิม
    const meter = await Meter.findOne({ meterIdNew: originalPeaId });
    if (!meter) {
      return NextResponse.json({ success: false, error: "Meter record not found" }, { status: 404 });
    }

    // 2. อัปโหลดรูปใหม่ (ถ้ามี)
    const [photoOldUrl, photoNewUrl] = await Promise.all([
      photoOldFile && photoOldFile.size > 0 ? uploadToCloudinary(photoOldFile) : Promise.resolve(""),
      photoNewFile && photoNewFile.size > 0 ? uploadToCloudinary(photoNewFile) : Promise.resolve("")
    ]);

    // 3. เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = {
      meterIdOld: peaOld,
      readingOld: !isNaN(oldUnit) ? oldUnit : meter.readingOld,
      readingNew: !isNaN(newUnit) ? newUnit : meter.readingNew,
      remark: remark || meter.remark,
    };

    if (photoOldUrl) updateData.photoOldUrl = photoOldUrl;
    if (photoNewUrl) updateData.photoNewUrl = photoNewUrl;

    // 4. กรณีที่มีการเปลี่ยนเลข PEA ใหม่ (Inventory Swap)
    if (newPeaId && newPeaId !== originalPeaId) {
      // 4.1 ตรวจสอบว่า PEA ใหม่มีใน Inventory ไหม
      const newInv = await Inventory.findOne({ pea_new: newPeaId });
      if (!newInv) {
        return NextResponse.json({ success: false, error: `ไม่พบ PEA ${newPeaId} ในคลัง` }, { status: 400 });
      }

      // 4.2 ตรวจสอบว่า PEA ใหม่ถูกใช้ไปหรือยัง (ถ้าใช้แล้ว ต้องไม่ใช่ตัวมันเอง ซึ่งไม่น่าใช่เพราะ original != new)
      if (newInv.inst_flag === 'yes') {
        return NextResponse.json({ success: false, error: `PEA ${newPeaId} ถูกติดตั้งไปแล้ว` }, { status: 400 });
      }

      // 4.3 อัปเดต Inventory
      // คืนสถานะตัวเก่า
      await Inventory.updateOne(
        { pea_new: originalPeaId },
        { $set: { inst_flag: "no", installed_date: "" } }
      );

      // ตัดสถานะตัวใหม่
      await Inventory.updateOne(
        { pea_new: newPeaId },
        { $set: { inst_flag: "yes", installed_date: meter.recordedAt } }
      );

      // อัปเดตเลขใน Meter
      updateData.meterIdNew = newPeaId;
    }

    // 5. บันทึกข้อมูล Meter
    await Meter.updateOne({ _id: meter._id }, { $set: updateData });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Error";
    console.error("Update API Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}