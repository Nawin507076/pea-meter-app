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

    // เตรียม Operations สำหรับ bulkWrite (Upsert: ถ้ามีอัปเดต ถ้าไม่มีเพิ่มใหม่)
    const operations = items.map((pea: string) => ({
      updateOne: {
        filter: { pea_new: pea.trim().toUpperCase() },
        update: {
          $set: {
            staff_name: staffName,
            withdraw_date: withdrawDate,
            inst_flag: "no",
            installed_date: ""
          }
        },
        upsert: true
      }
    }));

    try {
      if (operations.length > 0) {
        await Inventory.bulkWrite(operations);
      }
    } catch (mongoErr: any) {
      console.error("BulkWrite Error:", mongoErr);
      throw new Error("เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล");
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Inventory API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}