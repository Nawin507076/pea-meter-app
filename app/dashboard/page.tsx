"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

// --- 1. กำหนด Interfaces ---
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
  inst_flag?: string; 
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

type ViewMode = "none" | "remaining" | "installed";

export default function InventoryDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("none");
  const [expandedPea, setExpandedPea] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null); 
  const [staffFilter, setStaffFilter] = useState<string>("all");
  
  // ✅ เพิ่ม State สำหรับช่องค้นหา
  const [searchTerm, setSearchTerm] = useState<string>("");

  // ✅ เพิ่ม State สำหรับเปิด/ปิด Dropdown แบบกำหนดเอง
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ✅ ฟังก์ชันกรองข้อมูล (รวมทั้ง แผนก และ เลข PEA)
  const filterData = (items: MeterItem[]) => {
    if (!items) return [];
    return items.filter((item) => {
      // 1. กรองแผนก
      const isTheerapat = item.staff === "นายธีรภัทร์ ขาวหนูนา";
      const matchStaff = staffFilter === "all" ? true : (staffFilter === "แก้ไฟ" ? isTheerapat : !isTheerapat);
      
      // 2. กรองเลข PEA (ค้นหาได้ทั้งเลขใหม่ และเลขเก่าใน history)
      const matchSearch = item.pea.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.history?.peaOld?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      return matchStaff && matchSearch;
    });
  };

  const filteredRemainingItems = useMemo(() => filterData(data?.remainingItems || []), [data?.remainingItems, staffFilter, searchTerm]);
  const filteredInstalledItems = useMemo(() => filterData(data?.installedItems || []), [data?.installedItems, staffFilter, searchTerm]);

  const getImageUrl = (photoSource: string): string => {
    if (!photoSource || photoSource.length < 5) return "https://placehold.co/400x400?text=No+Photo";
    if (photoSource.includes("id=")) {
      const id = photoSource.split("id=")[1].split("&")[0];
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    if (!photoSource.includes(".")) return `https://drive.google.com/thumbnail?id=${photoSource}&sz=w1000`;
    if (photoSource.startsWith("http")) return photoSource;
    return `https://placehold.co/400x400?text=${encodeURIComponent(photoSource)}`;
  };

  const handleMarkAsDone = async (peaId: string) => {
    if (!window.confirm(`ยืนยันว่าทำการสับเปลี่ยนเครื่อง ${peaId} ในระบบเรียบร้อยแล้ว?`)) return;
    setUpdateLoading(peaId);
    try {
      const res = await fetch("/api/updateStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peaId }), 
      });
      const result = await res.json();
      if (res.ok && result.success) {
        if (data) {
          setData({
            ...data,
            installedItems: data.installedItems.filter(item => item.pea !== peaId),
            installedCount: data.installedCount - 1
          });
        }
        setExpandedPea(null);
        alert("✅ บันทึกสำเร็จ รายการนี้ถูกย้ายไปเก็บประวัติแล้ว");
      } else {
        alert(`❌ ผิดพลาด: ${result.error || "ไม่สามารถอัปเดตได้"}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setUpdateLoading(null);
    }
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

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-black text-slate-500 text-xl animate-pulse">กำลังสรุปยอด...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans pb-32 overflow-x-hidden text-slate-900">
      <div className="max-w-md mx-auto space-y-6 mt-6">
        
        <header className="text-center space-y-2">
          <div className="w-full max-w-md mb-4 flex justify-between">
            <Link href="/" className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 text-red-600 font-black text-sm active:scale-95 transition-all">กลับ</Link>
            <Link href="/inventory/history" className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 text-blue-600 font-black text-sm active:scale-95 transition-all">รายการที่สับเปลี่ยนแล้ว</Link>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight italic">📊 DASHBOARD</h1>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => { setViewMode("remaining"); setExpandedPea(null); setSearchTerm(""); }}
            className={`p-6 rounded-[2.5rem] shadow-xl transition-all duration-300 border-4 ${
              viewMode === "remaining" ? "bg-blue-600 text-white border-blue-200 scale-105" : "bg-white text-blue-600 border-white"
            }`}
          >
            <span className="text-[12px] font-black opacity-80 block mb-1 uppercase tracking-widest text-center">เบิกออกไปใช้งาน</span>
            <div className="text-5xl font-black text-center">{filteredRemainingItems.length}</div>
          </button>

          <button 
            onClick={() => { setViewMode("installed"); setExpandedPea(null); setSearchTerm(""); }}
            className={`p-6 rounded-[2.5rem] shadow-xl transition-all duration-300 border-4 ${
              viewMode === "installed" ? "bg-emerald-600 text-white border-emerald-200 scale-105" : "bg-white text-emerald-600 border-white"
            }`}
          >
            <span className="text-[12px] font-black opacity-80 block mb-1 uppercase tracking-widest text-center">งานรอคีย์เข้าระบบ</span>
            <div className="text-5xl font-black text-center">{filteredInstalledItems.length}</div>
          </button>
        </div>

        {viewMode !== "none" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xl font-black text-slate-800">
                  {viewMode === "remaining" ? "📦 รายการในคลัง" : "📜 งานรอคีย์"}
                </h3>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-white border-2 border-orange-200 rounded-2xl pl-4 pr-3 py-2 font-black text-sm text-slate-700 shadow-sm flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <span>
                      {staffFilter === "all" ? "🔍 ทั้งหมด" : staffFilter === "แก้ไฟ" ? "⚡ แก้ไฟ" : "🛠️ บริการ"}
                    </span>
                    <span className="text-slate-400 text-[10px] transform transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-40 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col">
                          <button className="px-4 py-4 text-left font-black text-lg hover:bg-slate-50 border-b border-slate-50" onClick={() => { setStaffFilter("all"); setIsDropdownOpen(false); }}>🔍 ทั้งหมด</button>
                          <button className="px-4 py-4 text-left font-black text-lg hover:bg-orange-50 border-b border-slate-50 text-orange-600" onClick={() => { setStaffFilter("แก้ไฟ"); setIsDropdownOpen(false); }}>⚡ แก้ไฟ</button>
                          <button className="px-4 py-4 text-left font-black text-lg hover:bg-blue-50 text-blue-600" onClick={() => { setStaffFilter("บริการ"); setIsDropdownOpen(false); }}>🛠️ บริการ</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ✅ ช่องค้นหา (Search Bar) */}
              <div className="px-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 ค้นหาเลข PEA..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(viewMode === "remaining" ? filteredRemainingItems : filteredInstalledItems).map((item) => (
                <div 
                  key={item.pea} 
                  className={`bg-white rounded-[2.5rem] shadow-md border-2 transition-all overflow-hidden ${
                    expandedPea === item.pea ? "border-emerald-500 ring-4 ring-emerald-50 shadow-emerald-100" : "border-slate-50"
                  }`}
                >
                  <div 
                    onClick={() => viewMode === "installed" && setExpandedPea(expandedPea === item.pea ? null : item.pea)}
                    className={`p-6 flex justify-between items-center ${viewMode === "installed" ? "cursor-pointer active:bg-slate-50" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${viewMode === "remaining" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                        {viewMode === "remaining" ? "📦" : "✅"}
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.pea}</div>
                        <div className="text-[14px] font-bold text-slate-400 uppercase mt-2">เบิกโดย: {item.staff}</div>
                      </div>
                    </div>
                    {viewMode === "installed" && (
                      <div className={`transition-transform duration-300 ${expandedPea === item.pea ? "rotate-180 text-emerald-500" : "text-slate-300"}`}>
                         <span className="text-xl font-bold">▼</span>
                      </div>
                    )}
                  </div>

                  {expandedPea === item.pea && item.history && (
                    <div className="px-6 pb-8 space-y-6">
                      <div className="h-px bg-slate-100 w-full mb-2"></div>
                      <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg">
                        <span className="text-[14px] font-black uppercase opacity-70 tracking-widest">พนักงานผู้ปฏิบัติงาน</span>
                        <div className="text-3xl font-black mt-1 leading-tight">{item.history.worker}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3 text-center">
                           <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-100">
                              <img src={getImageUrl(item.history.photoOld)} alt="Old" className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 bg-red-500 text-[9px] text-white font-black px-2 py-1 rounded-lg uppercase">เก่า</div>
                           </div>
                           <div className="bg-red-50 p-2 rounded-xl text-xs font-bold text-red-700">เลข: {item.history.peaOld}</div>
                        </div>
                        <div className="space-y-3 text-center">
                           <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-100">
                              <img src={getImageUrl(item.history.photoNew)} alt="New" className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 bg-emerald-500 text-[9px] text-white font-black px-2 py-1 rounded-lg uppercase">ใหม่</div>
                           </div>
                           <div className="bg-emerald-50 p-2 rounded-xl text-xs font-bold text-emerald-700">เลข: {item.pea}</div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">บันทึกเหตุผลการสับเปลี่ยน</span>
                        <div className="text-2xl font-bold text-slate-700 leading-tight italic">{item.history.remark || "ไม่มีการบันทึก"}</div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <button 
                          onClick={() => handleMarkAsDone(item.pea)}
                          disabled={updateLoading === item.pea}
                          className={`w-full py-6 rounded-[2.5rem] text-xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl ${
                            updateLoading === item.pea ? "bg-slate-200 text-slate-400" : "bg-blue-600 text-white shadow-blue-200"
                          }`}
                        >
                          {updateLoading === item.pea ? "⏳ กำลังบันทึก..." : (
                            <span className="flex flex-col leading-tight text-center">
                              <span>✅ สับเปลี่ยนในระบบแล้ว</span>
                              <span className="text-[16px] opacity-70">(พี่ดำคนเดียว)</span>
                            </span>
                          )}
                        </button>
                        
                        <a 
                          href={`https://www.google.com/maps?q=${item.history.lat},${item.history.lng}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                        >
                          📍 ดูพิกัดแผนที่ Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {(viewMode === "remaining" ? filteredRemainingItems : filteredInstalledItems).length === 0 && (
                <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <div className="text-4xl mb-2">🔍</div>
                  <div className="text-slate-400 font-bold">ไม่พบรายการที่ค้นหา</div>
                </div>
              )}
            </div>
          </div>
        )}

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