"use client";

import { useEffect, useState } from "react";

// --- 1. กำหนด Interfaces เพื่อความปลอดภัยของข้อมูล (No any) ---
interface HistoryDetail {
  worker: string;
  peaOld: string;
  oldUnit: string;
  photoOld: string;
  newUnit: string;
  photoNew: string;
  remark: string;
  lat: string;
  lng: string;
}

interface MeterItem {
  pea: string;
  staff: string;
  date: string;
  history?: HistoryDetail;
}

interface DashboardData {
  success: boolean;
  remainingCount: number;
  installedCount: number;
  remainingItems: MeterItem[];
  installedItems: MeterItem[];
  error?: string;
}

// กำหนด Type สำหรับโหมดการมองเห็น
type ViewMode = "none" | "remaining" | "installed";

export default function InventoryDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("none");
  const [expandedPea, setExpandedPea] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // --- 2. ฟังก์ชันดึงรูปภาพจาก Google Drive ID ---
  const getImageUrl = (photoSource: string): string => {
    if (!photoSource || photoSource.length < 5) return "https://placehold.co/400x400?text=No+Photo";

    // กรณีเป็น Link เต็มที่มี id= ให้ดึง ID ออกมา
    if (photoSource.includes("id=")) {
      const id = photoSource.split("id=")[1].split("&")[0];
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    
    // ถ้าเป็น ID ยาวๆ (ไม่มีจุดนามสกุลไฟล์) ให้ต่อลิงก์ Drive ทันที
    if (!photoSource.includes(".")) {
      return `https://drive.google.com/thumbnail?id=${photoSource}&sz=w1000`;
    }

    // กรณีอื่นๆ เช่น Link ตรง
    if (photoSource.startsWith("http")) return photoSource;

    return `https://placehold.co/400x400?text=${encodeURIComponent(photoSource)}`;
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/inventory/stats");
        const json = (await res.json()) as DashboardData;
        if (json.success) setData(json);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-black text-slate-500 text-xl animate-pulse">กำลังสรุปยอดมิเตอร์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans pb-32 overflow-x-hidden text-slate-900">
      <div className="max-w-md mx-auto space-y-6 mt-6">
        
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight italic">📊 DASHBOARD</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">ระบบบริหารจัดการคลังมิเตอร์</p>
        </header>

        {/* --- Card สรุปยอด --- */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => { setViewMode("remaining"); setExpandedPea(null); }}
            className={`p-6 rounded-[2.5rem] shadow-xl transition-all duration-300 border-4 ${
              viewMode === "remaining" ? "bg-blue-600 text-white border-blue-200 scale-105" : "bg-white text-blue-600 border-white"
            }`}
          >
            <span className="text-[10px] font-black opacity-80 block mb-1 uppercase tracking-widest text-center">คงเหลือ แผนกแก้ไฟ</span>
            <div className="text-5xl font-black text-center">{data?.remainingCount || 0}</div>
          </button>

          <button 
            onClick={() => { setViewMode("installed"); setExpandedPea(null); }}
            className={`p-6 rounded-[2.5rem] shadow-xl transition-all duration-300 border-4 ${
              viewMode === "installed" ? "bg-emerald-600 text-white border-emerald-200 scale-105" : "bg-white text-emerald-600 border-white"
            }`}
          >
            <span className="text-[10px] font-black opacity-80 block mb-1 uppercase tracking-widest text-center">แผนกแก้ไฟ ติดแล้ว</span>
            <div className="text-5xl font-black text-center">{data?.installedCount || 0}</div>
          </button>
        </div>

        {/* --- ส่วนแสดงรายการ --- */}
        {viewMode !== "none" && (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-800 ml-2">
              {viewMode === "remaining" ? "📦 รายการในคลังแก้ไฟ" : "📜 ประวัติงานสับเปลี่ยน"}
            </h3>

            <div className="space-y-4">
              {(viewMode === "remaining" ? data?.remainingItems : data?.installedItems)?.map((item) => (
                <div 
                  key={item.pea} 
                  className={`bg-white rounded-[2.5rem] shadow-md border-2 transition-all overflow-hidden ${
                    expandedPea === item.pea ? "border-emerald-500 ring-4 ring-emerald-50 shadow-emerald-100" : "border-slate-50"
                  }`}
                >
                  {/* หัวข้อรายการ */}
                  <div 
                    onClick={() => viewMode === "installed" && setExpandedPea(expandedPea === item.pea ? null : item.pea)}
                    className={`p-6 flex justify-between items-center ${viewMode === "installed" ? "cursor-pointer active:bg-slate-50" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${viewMode === "remaining" ? "bg-blue-50" : "bg-emerald-50"}`}>
                        {viewMode === "remaining" ? "📦" : "✅"}
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.pea}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">เบิกโดย: {item.staff}</div>
                      </div>
                    </div>
                    {viewMode === "installed" && (
                      <div className={`transition-transform duration-300 ${expandedPea === item.pea ? "rotate-180 text-emerald-500" : "text-slate-300"}`}>
                         <span className="text-xl font-bold">▼</span>
                      </div>
                    )}
                  </div>

                  {/* --- ส่วนขยายประวัติย้อนหลัง (Expanded) --- */}
                  {expandedPea === item.pea && item.history && (
                    <div className="px-6 pb-8 space-y-6">
                      
                      <div className="h-px bg-slate-100 w-full mb-2"></div>

                      {/* บล็อกพนักงานผู้สับเปลี่ยน (ตัวใหญ่) */}
                      <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-100">
                        <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">พนักงานผู้ปฏิบัติงาน</span>
                        <div className="text-3xl font-black mt-1 leading-tight">{item.history.worker}</div>
                        <div className="mt-4 text-xs font-bold bg-black/10 inline-block px-3 py-1 rounded-lg">
                          📍 พิกัด: {item.history.lat}, {item.history.lng}
                        </div>
                      </div>

                      {/* บล็อกรูปภาพเปรียบเทียบ */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-100">
                              <img 
                                src={getImageUrl(item.history.photoOld)} 
                                alt="Old" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 bg-red-500 text-[9px] text-white font-black px-2 py-1 rounded-lg uppercase">เก่า</div>
                           </div>
                           <div className="text-center p-2 bg-red-50 rounded-2xl border border-red-100">
                              <div className="text-lg font-black text-slate-700 leading-none">{item.history.peaOld}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">หน่วย: {item.history.oldUnit}</div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-100">
                              <img 
                                src={getImageUrl(item.history.photoNew)} 
                                alt="New" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 bg-emerald-500 text-[9px] text-white font-black px-2 py-1 rounded-lg uppercase">ใหม่</div>
                           </div>
                           <div className="text-center p-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <div className="text-lg font-black text-slate-700 leading-none">{item.pea}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">หน่วย: {item.history.newUnit}</div>
                           </div>
                        </div>
                      </div>

                      {/* หมายเหตุ */}
                      <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">บันทึกเหตุผลการสับเปลี่ยน</span>
                        <div className="text-2xl font-bold text-slate-700 leading-tight italic">
                          {item.history.remark || "ไม่มีการบันทึก"}
                        </div>
                      </div>

                      <a 
                        href={`http://googleusercontent.com/maps.google.com/maps?q=${item.history.lat},${item.history.lng}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-6 bg-white border-4 border-slate-100 text-slate-700 rounded-[2.5rem] text-xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md"
                      >
                        📍 เปิด Google Maps
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ปุ่มลอย */}
        <button 
          onClick={() => window.location.href = "/inventory/add"}
          className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] text-xl font-black shadow-2xl active:scale-95 transition-all mt-8"
        >
          ➕ บันทึกรับพัสดุเข้าคลัง
        </button>
      </div>
    </div>
  );
}