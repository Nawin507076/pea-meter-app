"use client";

import { useEffect, useState, useMemo } from "react";

interface MeterData {
  _id: string;
  worker: string;
  jobType: string;
  meterIdOld: string;
  readingOld: number;
  meterIdNew: string;
  readingNew: number;
  remark: string; // เพิ่มฟิลด์สาเหตุ
  photoOldUrl?: string;
  photoNewUrl?: string;
  location: { lat: string; lng: string };
  recordedAt: string;
}

export default function Dashboard() {
  const [data, setData] = useState<MeterData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterWorker, setFilterWorker] = useState("");
  const [filterOldId, setFilterOldId] = useState("");
  const [filterNewId, setFilterNewId] = useState("");
  const [filterJobType, setFilterJobType] = useState("all");

  useEffect(() => {
    fetch("/api/mongo/get-meters")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchWorker = item.worker.toLowerCase().includes(filterWorker.toLowerCase());
      const matchOldId = item.meterIdOld.includes(filterOldId);
      const matchNewId = item.meterIdNew.includes(filterNewId);
      const matchJobType = filterJobType === "all" || item.jobType === filterJobType;
      return matchWorker && matchOldId && matchNewId && matchJobType;
    });
  }, [data, filterWorker, filterOldId, filterNewId, filterJobType]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-12 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">รายการเปลี่ยนมิเตอร์</h1>
            <p className="text-slate-600 mt-2 text-lg font-medium">ตรวจสอบข้อมูลพิกัด รูปภาพ และสาเหตุการสับเปลี่ยน</p>
          </div>
          
          {/* แผนก Selector (Untitled UI Style) */}
          <div className="flex border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm h-12 bg-white">
            {[{ label: "ทั้งหมด", v: "all" }, { label: "แก้ไฟ", v: "incident" }, { label: "บริการ", v: "service" }].map((t) => (
              <button
                key={t.v} onClick={() => setFilterJobType(t.v)}
                className={`px-6 text-sm font-bold transition-all border-r last:border-r-0 border-slate-200 ${
                  filterJobType === t.v ? "bg-slate-100 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Section (High Contrast) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">ค้นหาพนักงาน</label>
            <div className="relative shadow-sm rounded-xl overflow-hidden border-2 border-slate-200 focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-600 transition-all bg-white">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" placeholder="ระบุชื่อ..."
                className="w-full p-3 pl-12 outline-none text-slate-900 font-bold"
                value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">มิเตอร์เก่า</label>
            <div className="shadow-sm rounded-xl overflow-hidden border-2 border-slate-200 focus-within:ring-4 focus-within:ring-red-50 focus-within:border-red-600 transition-all bg-white">
              <input 
                type="text" placeholder="เลข PEA เก่า..."
                className="w-full p-3 px-5 outline-none text-slate-900 font-bold"
                value={filterOldId} onChange={(e) => setFilterOldId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">มิเตอร์ใหม่</label>
            <div className="shadow-sm rounded-xl overflow-hidden border-2 border-slate-200 focus-within:ring-4 focus-within:ring-emerald-50 focus-within:border-emerald-600 transition-all bg-white">
              <input 
                type="text" placeholder="เลข PEA ใหม่..."
                className="w-full p-3 px-5 outline-none text-slate-900 font-bold"
                value={filterNewId} onChange={(e) => setFilterNewId(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-left">วัน / เวลา</th>
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-left">พนักงาน</th>
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-left">แผนก</th>
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-left">สาเหตุ</th>
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-center">มิเตอร์เก่า</th>
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-center">มิเตอร์ใหม่</th>
                  <th className="p-5 text-xs font-bold text-slate-900 uppercase tracking-wider text-center">พิกัดงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item._id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-5 whitespace-nowrap text-sm font-bold text-slate-600">{item.recordedAt}</td>
                    <td className="p-5 font-bold text-slate-900 text-lg">{item.worker}</td>
                    <td className="p-5">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-black border-2 ${
                        item.jobType === 'incident' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {item.jobType === 'incident' ? 'แก้ไฟ' : 'บริการ'}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-bold text-slate-700">
                        <div className="bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 w-fit max-w-[200px]">
                           {item.remark || "-"}
                        </div>
                    </td>
                    
                    {/* มิเตอร์เก่า */}
                    <td className="p-5 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{item.meterIdOld}</p>
                      <p className="text-2xl font-black text-red-600 tracking-tighter">{item.readingOld}</p>
                      {item.photoOldUrl && (
                        <div className="mt-2 relative inline-block group">
                          <img src={item.photoOldUrl} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md transition-all duration-300 group-hover:scale-[5] group-hover:z-50 group-hover:relative" alt="Old" />
                        </div>
                      )}
                    </td>

                    {/* มิเตอร์ใหม่ */}
                    <td className="p-5 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{item.meterIdNew}</p>
                      <p className="text-2xl font-black text-emerald-600 tracking-tighter">{item.readingNew}</p>
                      {item.photoNewUrl && (
                        <div className="mt-2 relative inline-block group">
                          <img src={item.photoNewUrl} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md transition-all duration-300 group-hover:scale-[5] group-hover:z-50 group-hover:relative" alt="New" />
                        </div>
                      )}
                    </td>

                    {/* แผนที่ */}
                    <td className="p-5 text-center">
                      <a href={`https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`} target="_blank" rel="noreferrer" className="inline-block group">
                        <div className="w-24 h-16 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm group-hover:border-blue-600 transition-all">
                          <img src="https://www.google.com/maps/vt/pb=!1m4!1m3!1i15!2i25765!3i12891!2m3!1e0!2sm!3i605142641!3m8!2sth!3sUS!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1f2!10b1" className="w-full h-full object-cover" alt="Map" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 mt-1 block uppercase">📍 ดูพิกัดจริง</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}