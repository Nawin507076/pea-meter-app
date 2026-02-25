import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Meter from "@/models/Meter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const { meterId, type, result } = body;

        if (!meterId || !type || !result) {
            return NextResponse.json({ success: false, error: "ข้อมูลไม่ครบถ้วน (ต้องการ meterId, type, result)" }, { status: 400 });
        }

        let updateLogic = {};
        if (type === "old") {
            updateLogic = { aiVerificationOld: result };
        } else if (type === "new") {
            updateLogic = { aiVerificationNew: result };
        } else {
            return NextResponse.json({ success: false, error: "ประเภทไม่ถูกต้อง (ต้องเป็น 'old' หรือ 'new')" }, { status: 400 });
        }

        const updatedMeter = await Meter.findByIdAndUpdate(
            meterId,
            { $set: updateLogic },
            { new: true } // ให้ return document ใหม่กลับมา
        );

        if (!updatedMeter) {
            return NextResponse.json({ success: false, error: "ไม่พบข้อมูลประวัติมิเตอร์ดัวกล่าวในระบบ" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedMeter });

    } catch (error: any) {
        console.error("Update AI Result Error:", error);
        return NextResponse.json({ success: false, error: error.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, { status: 500 });
    }
}
