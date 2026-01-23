export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from '@/lib/dbConnect'; // นำเข้าตัวเชื่อมต่อ
import Inventory from '@/models/Inventory'; // นำเข้า Model ใหม่

interface InventoryRequest {
  items: string[];
  staffName: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InventoryRequest;
    const { items, staffName } = body;

    const withdrawDate = new Date().toLocaleString("th-TH");

    // --- [ส่วนที่ 1: บันทึกลง MongoDB] ---
    await dbConnect();

    // เตรียมข้อมูลสำหรับ MongoDB
    const mongoItems = items.map((pea: string) => ({
      pea_new: pea.trim().toUpperCase(), // ป้องกันเว้นวรรคและตัวพิมพ์เล็ก
      staff_name: staffName,
      withdraw_date: withdrawDate,
      inst_flag: "no",
      installed_date: ""
    }));

    /** * ใช้ insertMany เพื่อบันทึกข้อมูลหลายตัวพร้อมกัน
     * ordered: false หมายถึงถ้าตัวไหนซ้ำ (Duplicate) ให้ข้ามไปแล้วทำตัวอื่นต่อ 
     */
    try {
      await Inventory.insertMany(mongoItems, { ordered: false });
    } catch (mongoErr: any) {
      // Duplicate key check
      if (mongoErr.code !== 11000) {
        throw mongoErr; // ถ้าไม่ใช่ Duplicate error ให้โยนต่อ
      }
      console.warn("บางรายการอาจจะซ้ำในระบบ MongoDB (ข้ามไป)");
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Inventory API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}