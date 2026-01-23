import dbConnect from '@/lib/dbConnect';
import Meter from '@/models/Meter';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const data = await req.json();

    // บันทึกข้อมูลลง MongoDB
    const newEntry = await Meter.create(data);

    return NextResponse.json({ 
      success: true, 
      message: "บันทึกข้อมูลลง MongoDB สำเร็จ!", 
      data: newEntry 
    });
  } catch (error: unknown) { // เปลี่ยนจาก any เป็น unknown เพื่อความปลอดภัย
    console.error("Database Error:", error);
    
    // ตรวจสอบว่า error เป็น Instance ของ Error หรือไม่ก่อนดึง message
    const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";

    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}