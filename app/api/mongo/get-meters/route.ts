import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Meter from '@/models/Meter';

export const runtime = "nodejs";

export async function GET() {
    try {
        await dbConnect();
        // ดึงข้อมูลทั้งหมด และเรียงลำดับตามวันที่สร้าง (ใหม่สุดขึ้นก่อน)
        const meters = await Meter.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: meters });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Error fetching data";
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
