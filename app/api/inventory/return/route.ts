export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Inventory from "@/models/Inventory";

// 1. กำหนด Interface สำหรับข้อมูลที่รับเข้ามา
interface InventoryRequest {
  items: string[];
  staffName: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InventoryRequest;
    const { items, staffName } = body;

    await dbConnect();

    // 1. ตรวจสอบสถานะของแต่ละรายการก่อนอัปเดต
    const forbiddenPeas: string[] = [];
    const notFoundPeas: string[] = [];
    const validPeas: string[] = [];

    // ตรวจสอบข้อมูลจาก MongoDB
    const inventoryItems = await Inventory.find({
      pea_new: { $in: items.map(i => i.trim().toUpperCase()) }
    });

    // Map เพื่อการเข้าถึงที่รวดเร็ว
    const invMap = new Map();
    inventoryItems.forEach(inv => invMap.set(inv.pea_new, inv));

    items.forEach(pea => {
      const cleanPea = pea.trim().toUpperCase();
      const inv = invMap.get(cleanPea);

      if (!inv) {
        notFoundPeas.push(cleanPea);
      } else if (inv.inst_flag === 'yes') {
        // ห้ามคืนถ้าติดตั้งแล้ว
        forbiddenPeas.push(cleanPea);
      } else {
        validPeas.push(cleanPea);
      }
    });

    // 2. ถ้ามีรายการที่ผิดเงื่อนไข ให้แจ้ง Error
    if (forbiddenPeas.length > 0) {
      return NextResponse.json({
        success: false,
        error: `ไม่สามารถคืนคลังได้เนื่องจากเครื่องสถานะเป็น (ติดตั้งไปแล้ว): ${forbiddenPeas.join(", ")} ตรวจสอบในงานรอคีย์เข้าในระบบ`
      }, { status: 400 });
    }

    if (validPeas.length === 0) {
      return NextResponse.json({
        success: false,
        error: "ไม่พบหมายเลข PEA ที่สามารถทำรายการได้ในระบบ"
      }, { status: 404 });
    }

    // 3. ทำการอัปเดตเฉพาะรายการที่ผ่านเงื่อนไขใน MongoDB
    const returnDate = new Date().toLocaleString("th-TH");

    await Inventory.updateMany(
      { pea_new: { $in: validPeas } },
      {
        $set: {
          inst_flag: "pullback",
          return_date: returnDate
        }
      }
    );

    console.log(`Return Success: ${validPeas.length} items by ${staffName}`);

    return NextResponse.json({
      success: true,
      message: `คืนคลังสำเร็จ ${validPeas.length} รายการ`
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Return API Error:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}