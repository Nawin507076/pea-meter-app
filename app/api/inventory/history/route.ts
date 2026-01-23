export const runtime = "nodejs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Meter from "@/models/Meter";

export async function GET() {
  try {
    await dbConnect();

    // ดึงข้อมูล Meter ที่มีสถานะเป็น "done" และเรียงลำดับจากใหม่ไปเก่า
    const doneMeters = await Meter.find({ status: "done" }).sort({ createdAt: -1 });

    const completedItems = doneMeters.map(meter => ({
      pea: meter.meterIdNew || "",
      staff: meter.worker || "Unknown",
      date: meter.recordedAt || "-",
      history: {
        worker: meter.worker || "",
        peaOld: meter.meterIdOld || "",
        oldUnit: meter.readingOld ? meter.readingOld.toString() : "",
        photoOld: meter.photoOldUrl || "",
        newUnit: meter.readingNew ? meter.readingNew.toString() : "",
        photoNew: meter.photoNewUrl || "",
        remark: meter.remark || "",
        lat: meter.location?.lat || "",
        lng: meter.location?.lng || "",
        inst_flag: "done"
      }
    }));

    return NextResponse.json({
      success: true,
      count: completedItems.length,
      completedItems
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching history";
    console.error("History API Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}