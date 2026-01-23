export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Meter from "@/models/Meter";

export async function POST(req: NextRequest) {
  try {
    const { peaId } = await req.json();

    if (!peaId) {
      return NextResponse.json({ success: false, error: "Missing peaId" }, { status: 400 });
    }

    await dbConnect();

    // Update Status in MongoDB
    const upDateStatus = await Meter.findOneAndUpdate(
      { meterIdNew: peaId.toString() },
      { $set: { status: "done" } },
      { new: true }
    );

    if (!upDateStatus) {
      return NextResponse.json({ success: false, error: "Meter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Updated status for ${peaId}` });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("❌ Update Status Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}