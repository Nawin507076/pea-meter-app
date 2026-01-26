import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Inventory from '@/models/Inventory';
import Meter from '@/models/Meter';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
    try {
        await dbConnect();

        // 1. Fetch data from both collections
        const [inventoryItems, meters] = await Promise.all([
            Inventory.find({}).lean(),
            Meter.find({}).lean()
        ]);

        // 2. Map meters by meterIdNew for O(1) lookup
        const meterMap = new Map();
        meters.forEach((m: any) => {
            if (m.meterIdNew) meterMap.set(m.meterIdNew, m);
        });

        const remainingItems: any[] = [];
        const installedItems: any[] = [];
        const completedItems: any[] = [];

        // 3. Process each inventory item
        inventoryItems.forEach((inv: any) => {
            const isInstalled = inv.inst_flag === 'yes';

            // Find associated meter work
            const meterWork = meterMap.get(inv.pea_new);

            const item = {
                pea: inv.pea_new,
                staff: inv.staff_name || "Unknown",
                date: inv.withdraw_date || inv.createdAt?.toISOString().split('T')[0] || "-",
                history: isInstalled && meterWork ? {
                    worker: meterWork.worker,
                    peaOld: meterWork.meterIdOld,
                    oldUnit: meterWork.readingOld,
                    photoOld: meterWork.photoOldUrl || "",
                    newUnit: meterWork.readingNew,
                    photoNew: meterWork.photoNewUrl || "",
                    remark: meterWork.remark,
                    lat: meterWork.location?.lat,
                    lng: meterWork.location?.lng,
                    date: meterWork.createdAt?.toISOString().split('T')[0],
                    inst_flag: inv.inst_flag
                } : undefined
            };

            if (isInstalled) {
                if (meterWork && meterWork.status === "done") {
                    completedItems.push(item);
                } else if (meterWork && (!meterWork.status || meterWork.status === "")) {
                    installedItems.push(item);
                }
            } else {
                // Filter: Only show items that are explicitly "no" and not yet installed
                if (inv.inst_flag === 'no' && (!inv.installed_date || inv.installed_date === "")) {
                    remainingItems.push(item);
                }
            }
        });

        // Sort by date (newest first)
        // Helper to get effective date: use history date (install) if available, otherwise inventory date (withdraw)
        const getSortDate = (item: any) => item.history?.date || item.date;

        installedItems.sort((a, b) => new Date(getSortDate(b)).getTime() - new Date(getSortDate(a)).getTime());
        remainingItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        completedItems.sort((a, b) => new Date(getSortDate(b)).getTime() - new Date(getSortDate(a)).getTime());

        return NextResponse.json({
            success: true,
            remainingCount: remainingItems.length,
            installedCount: installedItems.length,
            completedCount: completedItems.length,
            remainingItems,
            installedItems,
            completedItems
        });

    } catch (error: unknown) {
        console.error("Dashboard Stats Error:", error);
        const msg = error instanceof Error ? error.message : "Error fetching dashboard stats";
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
