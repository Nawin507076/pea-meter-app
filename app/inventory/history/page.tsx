"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

interface HistoryResponse {
  success: boolean;
  completedItems: MeterItem[];
  error?: string;
}

export default function DoneHistory() {
  const [completedItems, setCompletedItems] = useState<MeterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedPea, setExpandedPea] = useState<string | null>(null); // ✅ เพิ่มให้กดดูรูปย้อนหลังได้

  // ฟังก์ชันจัดการรูปภาพ
  const getImageUrl = (photoSource: string): string => {
    if (!photoSource || photoSource.length < 5) return "https://placehold.co/400x400?text=No+Photo";
    if (photoSource.includes("id=")) return `https://drive.google.com/thumbnail?id=${photoSource.split("id=")[1].split("&")[0]}&sz=w1000`;
    if (!photoSource.includes(".")) return `https://drive.google.com/thumbnail?id=${photoSource}&sz=w1000`;
    return photoSource.startsWith("http") ? photoSource : `https://placehold.co/400x400?text=No+Photo`;
  };

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/inventory/history"); // ✅ เรียก API แยกที่เราสร้างใหม่
        const json = (await res.json()) as HistoryResponse;
        if (json.success) {
          setCompletedItems(json.completedItems);
        }
      } catch (err) {
        console.error("Fetch History Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-white pb-20 overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center gap-4 mt-6">
          <Link href="/inventory/dashboard" className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl active:scale-95 transition-all">
            ←
          </Link>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">COMPLETED</h1>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">รายการที่บันทึกสำเร็จ (Done)</p>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold text-slate-500 animate-pulse uppercase text-xs">Loading Archive...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedItems.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 italic text-slate-500">
                ไม่พบรายการที่คีย์เสร็จสมบูรณ์
              </div>
            ) : (
              completedItems.map((item) => (
                <div 
                  key={item.pea} 
                  className={`bg-white/5 border transition-all rounded-[2.5rem] overflow-hidden ${
                    expandedPea === item.pea ? "border-emerald-500/50 bg-white/10" : "border-white/10"
                  }`}
                >
                  {/* หัวข้อรายการ */}
                  <div 
                    onClick={() => setExpandedPea(expandedPea === item.pea ? null : item.pea)}
                    className="p-6 flex justify-between items-center cursor-pointer active:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">✅</div>
                      <div>
                        <div className="text-2xl font-black tracking-tighter leading-none">{item.pea}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">ผู้เบิก: {item.staff}</div>
                      </div>
                    </div>
                    <div className={`text-slate-500 transition-transform ${expandedPea === item.pea ? "rotate-180" : ""}`}>▼</div>
                  </div>

                  {/* ส่วนขยาย (Expanded) ดูรายละเอียดประวัติ */}
                  {expandedPea === item.pea && item.history && (
                    <div className="px-6 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2">
                      <div className="h-px bg-white/10 w-full"></div>
                      
                      <div className="bg-emerald-600/20 p-4 rounded-2xl border border-emerald-500/30">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Worker</span>
                        <div className="text-xl font-bold text-white">{item.history.worker}</div>
                        <div className="text-[9px] text-slate-400 mt-1 uppercase italic">{item.date}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <img src={getImageUrl(item.history.photoOld)} className="rounded-2xl aspect-[3/4] object-cover border border-white/10 shadow-lg" />
                           <div className="text-center">
                              <div className="text-xs font-black text-red-400">เก่า: {item.history.peaOld}</div>
                              <div className="text-[9px] text-slate-500 uppercase">หน่วย: {item.history.oldUnit}</div>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <img src={getImageUrl(item.history.photoNew)} className="rounded-2xl aspect-[3/4] object-cover border border-white/10 shadow-lg" />
                           <div className="text-center">
                              <div className="text-xs font-black text-emerald-400">ใหม่: {item.pea}</div>
                              <div className="text-[9px] text-slate-500 uppercase">หน่วย: {item.history.newUnit}</div>
                           </div>
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">หมายเหตุ</span>
                        <p className="text-sm font-medium italic text-slate-300">{item.history.remark || "-"}</p>
                      </div>

                      <a 
                        href={`http://googleusercontent.com/maps.google.com/maps?q=${item.history.lat},${item.history.lng}`} 
                        target="_blank" rel="noopener noreferrer"
                        className="w-full py-4 bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        📍 ดูตำแหน่งที่สับเปลี่ยนในแผนที่
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <footer className="text-center pt-10 opacity-30">
           <p className="text-[10px] font-bold uppercase tracking-[0.3em]">End of Record</p>
        </footer>
      </div>
    </div>
  );
}