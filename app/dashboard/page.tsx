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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ✅ State สำหรับการแก้ไข
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HistoryDetail & { pea: string }>>({});
  const [tempPhotos, setTempPhotos] = useState<{ old?: File; new?: File }>({});

  const remarkOptions: string[] = ["ไหม้ทั้งเครื่อง", "ที่ต่อสายไหม้", "น้ำเข้า", "เปลี่ยนเป็นมิเตอร์อิเล็กทรอนิกส์", "ใช้ไฟเกิน(ct ไหม้)", "ไม่หมุน", "หมุนติดขัด", "ฝาครอบแตก", "ตราข้างชำรุด", "จอไม่แสดงค่า", "หมุนขณะไม่มีโหลด", "หมุนถอยหลัง", "อื่นๆ"];

  // ✅ ฟังก์ชันแสดงรูปภาพ (ปรับปรุงใหม่ให้รูปเดิมขึ้นแน่นอน)
  const getImageUrl = (photoSource: string, type: 'old' | 'new'): string => {
    // 1. ถ้ามีการเลือกรูปใหม่จากอัลบั้มในโหมดแก้ไข ให้ Preview รูปนั้น
    if (isEditing) {
      if (type === 'old' && tempPhotos.old) return URL.createObjectURL(tempPhotos.old);
      if (type === 'new' && tempPhotos.new) return URL.createObjectURL(tempPhotos.new);
    }

    // 2. ถ้าไม่มีการเลือกใหม่ ให้โชว์รูปจากฐานข้อมูล (รองรับทั้ง ID และ URL เต็ม)
    if (!photoSource || photoSource.length < 5) return "https://placehold.co/400x400?text=No+Photo";

    // ถ้าเป็น Google Drive ID หรือมีคำว่า id= ให้จัด Format สำหรับดึง Thumbnail
    if (photoSource.includes("id=")) {
      const id = photoSource.split("id=")[1].split("&")[0];
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }

    // ถ้าส่งมาแค่ ID ยาวๆ (ไม่มี http) ให้เติม URL Drive ให้
    if (!photoSource.startsWith("http")) {
      return `https://drive.google.com/thumbnail?id=${photoSource}&sz=w1000`;
    }

    return photoSource; // ถ้าเป็น URL อื่นๆ ให้ส่งกลับไปเลย
  };

  const startEditing = (item: MeterItem) => {
    setIsEditing(item.pea);
    setEditData({
      pea: item.pea,
      peaOld: item.history?.peaOld || "",
      oldUnit: item.history?.oldUnit || "",
      newUnit: item.history?.newUnit || "",
      remark: item.history?.remark || remarkOptions[0]
    });
    setTempPhotos({});
  };

  const handleUpdateDetail = async (originalPeaId: string) => {
    if (!window.confirm("ยืนยันการบันทึกแก้ไขข้อมูลและรูปภาพ?")) return;
    setUpdateLoading(originalPeaId);

    const formData = new FormData();
    formData.append("originalPeaId", originalPeaId);
    formData.append("pea", editData.pea || "");
    formData.append("peaOld", editData.peaOld || "");
    formData.append("oldUnit", editData.oldUnit || "");
    formData.append("newUnit", editData.newUnit || "");
    formData.append("remark", editData.remark || "");
    if (tempPhotos.old) formData.append("photoOldFile", tempPhotos.old);
    if (tempPhotos.new) formData.append("photoNewFile", tempPhotos.new);

    try {
      const res = await fetch("/api/inventory/update-detail", { method: "POST", body: formData });
      if (res.ok) { alert("✅ บันทึกสำเร็จ"); window.location.reload(); }
      else { alert("❌ บันทึกไม่สำเร็จ"); }
    } catch (err) { alert("❌ เกิดข้อผิดพลาด"); }
    finally { setUpdateLoading(null); }
  };

  const handleMarkAsDone = async (peaId: string) => {
    if (!window.confirm(`ยืนยันการสับเปลี่ยนเครื่อง ${peaId} ในระบบ?`)) return;
    setUpdateLoading(peaId);
    try {
      const res = await fetch("/api/updateStatus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peaId }) });
      if (res.ok) { alert("✅ สำเร็จ"); window.location.reload(); }
    } catch (err) { console.error(err); }
    finally { setUpdateLoading(null); }
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/mongo/dashboard-stats");
        const json = await res.json();
        if (json.success) setData(json);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const filterData = (items: MeterItem[]) => {
    if (!items) return [];
    return items.filter((item) => {
      const isTheerapat = item.staff === "นายธีรภัทร์ ขาวหนูนา" || item.history?.worker === "นายธีรภัทร์ ขาวหนูนา";
      const matchStaff = staffFilter === "all" ? true : (staffFilter === "แก้ไฟ" ? isTheerapat : !isTheerapat);
      const matchSearch = item.pea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.history?.peaOld?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      return matchStaff && matchSearch;
    });
  };

  const filteredRemainingItems = useMemo(() => filterData(data?.remainingItems || []), [data, staffFilter, searchTerm]);
  const filteredInstalledItems = useMemo(() => filterData(data?.installedItems || []), [data, staffFilter, searchTerm]);

  if (loading) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-black text-xl animate-pulse">กำลังสรุปยอด...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans pb-32 text-slate-900 overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6 mt-6">

        <header className="flex justify-between items-center">
          <Link href="/" className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 text-red-600 font-black text-sm active:scale-95">กลับ</Link>

          <Link href="/inventory/history" className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 text-blue-600 font-black text-sm active:scale-95">ประวัติสับเปลี่ยน</Link>
        </header>
        <div className="flex justify-center items-center">
          <h1 className="text-3xl font-black italic">📊 DASHBOARD</h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => { setViewMode("remaining"); setExpandedPea(null); setIsEditing(null); }} className={`p-6 rounded-[2.5rem] shadow-xl border-4 transition-all ${viewMode === "remaining" ? "bg-blue-600 text-white border-blue-200" : "bg-white text-blue-600 border-white"}`}>
            <span className="text-[12px] font-black uppercase block opacity-70">เบิกใช้งาน</span>
            <div className="text-4xl font-black text-center">{filteredRemainingItems.length}</div>
          </button>
          <button onClick={() => { setViewMode("installed"); setExpandedPea(null); setIsEditing(null); }} className={`p-6 rounded-[2.5rem] shadow-xl border-4 transition-all ${viewMode === "installed" ? "bg-emerald-600 text-white border-emerald-200" : "bg-white text-emerald-600 border-white"}`}>
            <span className="text-[12px] font-black uppercase block opacity-70">เปลี่ยนหน้างานแล้ว</span>
            <div className="text-4xl font-black text-center">{filteredInstalledItems.length}</div>
          </button>
        </div>

        {viewMode !== "none" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xl font-black">{viewMode === "remaining" ? "📦 เบิกใช้งาน" : "📜 รอเปลี่ยนในระบบ"}</h3>
                <div className="relative">
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="bg-white border-2 border-orange-200 rounded-2xl pl-4 pr-3 py-2 font-black text-sm text-slate-700 shadow-sm flex items-center gap-2">
                    {staffFilter === "all" ? "🔍 ทั้งหมด" : staffFilter === "แก้ไฟ" ? "⚡ แก้ไฟ" : "🛠️ บริการ"} <span>▼</span>
                  </button>
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-40 bg-white border-2 rounded-2xl shadow-2xl z-20 overflow-hidden">
                        <button className="w-full p-4 text-left font-black hover:bg-slate-50 border-b" onClick={() => { setStaffFilter("all"); setIsDropdownOpen(false); }}>🔍 ทั้งหมด</button>
                        <button className="w-full p-4 text-left font-black hover:bg-orange-50 border-b text-orange-600" onClick={() => { setStaffFilter("แก้ไฟ"); setIsDropdownOpen(false); }}>⚡ แก้ไฟ</button>
                        <button className="w-full p-4 text-left font-black hover:bg-blue-50 text-blue-600" onClick={() => { setStaffFilter("บริการ"); setIsDropdownOpen(false); }}>🛠️ บริการ</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <input type="text" placeholder="🔍 ค้นหาเลข PEA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none" />
            </div>

            <div className="space-y-4">
              {(viewMode === "remaining" ? filteredRemainingItems : filteredInstalledItems).map((item) => (
                <div key={item.pea} className={`bg-white rounded-[2.5rem] shadow-md border-2 overflow-hidden ${expandedPea === item.pea ? "border-emerald-500 ring-4 ring-emerald-50" : "border-slate-50"}`}>
                  <div onClick={() => viewMode === "installed" && setExpandedPea(expandedPea === item.pea ? null : item.pea)} className={`p-6 flex justify-between items-center ${viewMode === "installed" ? "cursor-pointer active:bg-slate-50" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${viewMode === "remaining" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>{viewMode === "remaining" ? "📦" : "✅"}</div>
                      <div className="flex flex-col">
                        <div className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.pea}</div>
                        <div className="text-[13px] font-bold text-slate-400 mt-2">ผู้เบิก: {item.staff}</div>
                      </div>
                    </div>
                  </div>

                  {expandedPea === item.pea && item.history && (
                    <div className="px-6 pb-8 space-y-6">
                      <div className="h-px bg-slate-100 w-full mb-2"></div>

                      <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg relative">
                        <span className="text-[12px] font-black uppercase opacity-70">พนักงานผู้ติดตั้ง</span>
                        <div className="text-2xl font-black mt-1 leading-tight">{item.history.worker}</div>
                        <div className="mt-3 bg-white/20 px-3 py-1.5 rounded-xl w-fit text-[11px] font-black italic">📅 วันที่/เวลา: {item.date}</div>

                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                          <button onClick={(e) => { e.stopPropagation(); isEditing === item.pea ? handleUpdateDetail(item.pea) : startEditing(item); }} className="bg-white text-emerald-700 px-4 py-2 rounded-xl text-xs font-black shadow-md">
                            {isEditing === item.pea ? "💾 บันทึก" : "📝 แก้ไข"}
                          </button>
                          {isEditing === item.pea && (
                            <button onClick={(e) => { e.stopPropagation(); setIsEditing(null); }} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">ยกเลิก</button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-100 shadow-sm">
                            <img src={getImageUrl(item.history.photoOld, 'old')} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 bg-red-500 text-[9px] text-white font-black px-2 py-1 rounded-lg">เก่า</div>
                            {isEditing === item.pea && (
                              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer">
                                <span className="text-white text-[10px] font-black text-center">📷 เลือกรูปเก่าใหม่</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setTempPhotos({ ...tempPhotos, old: e.target.files?.[0] })} />
                              </label>
                            )}
                          </div>
                          {isEditing === item.pea ? (
                            <div className="space-y-1">
                              <input type="text" value={editData.peaOld} onChange={(e) => setEditData({ ...editData, peaOld: e.target.value })} className="w-full p-2 border-2 border-blue-200 rounded-xl text-[12px] font-bold" placeholder="PEA เก่า" />
                              <input type="number" value={editData.oldUnit} onChange={(e) => setEditData({ ...editData, oldUnit: e.target.value })} className="w-full p-2 border-2 border-blue-200 rounded-xl text-[12px] font-bold" placeholder="หน่วยเก่า" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="bg-red-50 p-2 rounded-xl text-[12px] font-bold text-red-700">PEA: {item.history.peaOld}</div>
                              <div className="bg-red-50 p-2 rounded-xl text-[12px] font-bold text-red-700 mt-1">หน่วย: {item.history.oldUnit}</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-100 shadow-sm">
                            <img src={getImageUrl(item.history.photoNew, 'new')} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 bg-emerald-500 text-[9px] text-white font-black px-2 py-1 rounded-lg">ใหม่</div>
                            {isEditing === item.pea && (
                              <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer">
                                <span className="text-white text-[10px] font-black text-center">📸 เลือกรูปใหม่ใหม่</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setTempPhotos({ ...tempPhotos, new: e.target.files?.[0] })} />
                              </label>
                            )}
                          </div>
                          {isEditing === item.pea ? (
                            <div className="space-y-1">
                              <input type="text" value={editData.pea} onChange={(e) => setEditData({ ...editData, pea: e.target.value })} className="w-full p-2 border-2 border-blue-200 rounded-xl text-[10px] font-bold" placeholder="PEA ใหม่" />
                              <input type="number" value={editData.newUnit} onChange={(e) => setEditData({ ...editData, newUnit: e.target.value })} className="w-full p-2 border-2 border-blue-200 rounded-xl text-[10px] font-bold" placeholder="หน่วยใหม่" />
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="bg-emerald-50 p-2 rounded-xl text-[12px] font-bold text-emerald-700">PEA: {item.pea}</div>
                              <div className="bg-emerald-50 p-2 rounded-xl text-[12px] font-bold text-emerald-700 mt-1">หน่วย: {item.history.newUnit}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase italic">เหตุผลการสับเปลี่ยน</span>
                        {isEditing === item.pea ? (
                          <select value={editData.remark} onChange={(e) => setEditData({ ...editData, remark: e.target.value })} className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold">
                            {remarkOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <div className="text-xl font-bold text-slate-700 italic">{item.history.remark || "ไม่มีบันทึก"}</div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <button onClick={() => handleMarkAsDone(item.pea)} disabled={updateLoading === item.pea || isEditing === item.pea} className={`w-full py-6 rounded-[2.5rem] text-xl font-black shadow-xl transition-all ${updateLoading === item.pea || isEditing === item.pea ? "bg-slate-200 text-slate-400" : "bg-blue-600 text-white active:scale-95 shadow-blue-200"}`}>
                          {updateLoading === item.pea ? "⏳ กำลังบันทึก..." : "✅ สับเปลี่ยนในระบบแล้ว"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => window.location.href = "/inventory/add"} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] text-xl font-black shadow-2xl active:scale-95 transition-all mt-8">➕ บันทึกรับพัสดุเข้าคลัง</button>
      </div>
    </div>
  );
}