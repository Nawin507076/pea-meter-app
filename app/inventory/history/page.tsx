"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ================= Interfaces ================= */
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

/* ================= Component ================= */
export default function DoneHistory() {
  const [completedItems, setCompletedItems] = useState<MeterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPea, setExpandedPea] = useState<string | null>(null);
  const [searchPea, setSearchPea] = useState("");

  /* ---------- Image helper ---------- */
  const getImageUrl = (photoSource: string): string => {
    if (!photoSource || photoSource.length < 5) {
      return "https://placehold.co/400x400?text=No+Photo";
    }
    if (photoSource.includes("id=")) {
      return `https://drive.google.com/thumbnail?id=${
        photoSource.split("id=")[1].split("&")[0]
      }&sz=w1000`;
    }
    if (!photoSource.includes(".")) {
      return `https://drive.google.com/thumbnail?id=${photoSource}&sz=w1000`;
    }
    return photoSource.startsWith("http")
      ? photoSource
      : "https://placehold.co/400x400?text=No+Photo";
  };

  /* ---------- Fetch history ---------- */
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/inventory/history");
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

  /* ---------- Sort (new → old) + Filter ---------- */
  const filteredItems = useMemo(() => {
    return [...completedItems]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .filter((item) =>
        item.pea.toLowerCase().includes(searchPea.toLowerCase())
      );
  }, [completedItems, searchPea]);

  /* ================= Render ================= */
  return (
    <div className="min-h-screen bg-slate-900 p-4 font-sans text-white pb-20 overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6">

        {/* ===== Header ===== */}
        <header className="relative flex items-center mt-6">
          <Link
            href="/dashboard"
            className="w-12 h-12 text-red-600 bg-white/10 rounded-2xl flex items-center justify-center text-2xl active:scale-95 transition-all"
          >
            ←
          </Link>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="text-3xl font-black italic tracking-tighter">
              COMPLETED
            </h1>
            <p className="text-emerald-400 text-[12px] font-bold uppercase tracking-widest">
              รายการที่สับเปลี่ยนในระบบแล้ว (Done)
            </p>
          </div>
        </header>

        {/* ===== Search ===== */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <input
            value={searchPea}
            onChange={(e) => setSearchPea(e.target.value)}
            placeholder="🔍 ค้นหา PEA เช่น 123456789"
            className="w-full bg-transparent outline-none text-sm font-bold tracking-wide placeholder:text-slate-500"
          />
        </div>

        {/* ===== Content ===== */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-500 animate-pulse uppercase text-xs">
              Loading Archive...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 italic text-slate-500">
                ไม่พบรายการที่ค้นหา
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.pea}
                  className={`bg-white/5 border transition-all rounded-[2.5rem] overflow-hidden ${
                    expandedPea === item.pea
                      ? "border-emerald-500/50 bg-white/10"
                      : "border-white/10"
                  }`}
                >
                  {/* ---- Item header ---- */}
                  <div
                    onClick={() =>
                      setExpandedPea(
                        expandedPea === item.pea ? null : item.pea
                      )
                    }
                    className="p-6 flex justify-between items-center cursor-pointer active:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">
                        ✅
                      </div>
                      <div>
                        <div className="text-2xl font-black tracking-tighter">
                          {item.pea}
                        </div>
                        <div className="text-[14px] font-bold text-slate-400 uppercase mt-2">
                          ผู้สับเปลี่ยน: {item.staff}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-slate-500 transition-transform ${
                        expandedPea === item.pea ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </div>
                  </div>

                  {/* ---- Expanded ---- */}
                  {expandedPea === item.pea && item.history && (
                    <div className="px-6 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2">
                      <div className="h-px bg-white/10" />

                      <div className="bg-emerald-600/20 p-4 rounded-2xl border border-emerald-500/30">
                        <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">
                          ผู้สับเปลี่ยน
                        </span>
                        <div className="text-xl font-bold text-white">
                          {item.history.worker}
                        </div>
                        <div className="text-[12px] text-slate-400 mt-1 uppercase italic">
                          {item.date}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <img
                            src={getImageUrl(item.history.photoOld)}
                            className="rounded-2xl aspect-[3/4] object-cover border border-white/10 shadow-lg"
                          />
                          <div className="text-center">
                            <div className="text-[14px] font-black text-red-400">
                              PEA เก่า: {item.history.peaOld}
                            </div>
                            <div className="text-[12px] text-slate-500 uppercase">
                              หน่วย: {item.history.oldUnit}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <img
                            src={getImageUrl(item.history.photoNew)}
                            className="rounded-2xl aspect-[3/4] object-cover border border-white/10 shadow-lg"
                          />
                          <div className="text-center">
                            <div className="text-[14px] font-black text-emerald-400">
                              PEA ใหม่: {item.pea}
                            </div>
                            <div className="text-[12px] text-slate-500 uppercase">
                              หน่วย: {item.history.newUnit}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">
                          หมายเหตุ
                        </span>
                        <p className="text-sm font-medium italic text-slate-300">
                          {item.history.remark || "-"}
                        </p>
                      </div>

                      <a
                        href={`http://googleusercontent.com/maps.google.com/maps?q=${item.history.lat},${item.history.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
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
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
            End of Record
          </p>
        </footer>
      </div>
    </div>
  );
}
