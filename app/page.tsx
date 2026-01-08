"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [worker, setWorker] = useState("");
  const [jobType, setJobType] = useState("");
  const router = useRouter();

  // รายชื่อเจ้าหน้าที่อัปเดตใหม่ 9 ท่าน
  const workers = [
    "นายรัฐภูมิ เต้าตะโร",
    "นายอนันต์สิทธิ์ บุญพรหม",
    "นายนภสินธุ์ เลาหสกุล",
    "นายราเชน เจี้ยนเซ่ง",
    "นายธีรภัทร์ ขาวหนูนา",
    "นายนาวิน แก้วล่อง",
    "นายชนัญพงศ์ อัจฉราวิริยะกุล",
    "นายพชรวัฒน์ เพชรจำรัส",
    "นายเอนกพงศ์ บุญศิริ"
  ];

  const isReady = worker !== "" && jobType !== "";

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center px-4 pt-10 font-sans overflow-x-hidden">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 p-8 space-y-10 border border-slate-100 h-fit">
        
        {/* Header ส่วนหัว */}
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-blue-50 rounded-3xl mb-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">
            บันทึกปฏิบัติงานมิเตอร์
          </h1>
          <p className="text-lg text-slate-400 font-bold">
            ระบุตัวตนและเลือกลักษณะงาน
          </p>
        </div>

        <div className="space-y-8">
          {/* ส่วนเลือกผู้ปฏิบัติงาน - ปรับฟอนต์ใหญ่พิเศษ */}
          <div className="space-y-4">
            <label className="flex items-center text-xl font-black text-slate-700 ml-2">
              <span className="mr-3 text-2xl">👷‍♂️</span> ผู้ปฏิบัติงาน
            </label>
            <div className="relative">
              <select
                value={worker}
                onChange={(e) => setWorker(e.target.value)}
                className="w-full rounded-[2rem] border-4 border-slate-100 bg-slate-50 px-6 py-6 text-xl font-black text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 transition-all outline-none appearance-none cursor-pointer shadow-inner"
              >
                <option value="">-- เลือกชื่อเจ้าหน้าที่ --</option>
                {workers.map((name, i) => (
                  <option key={i} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {/* ลักษณะงาน (Option Cards) */}
          <div className="space-y-4">
            <label className="flex items-center text-xl font-black text-slate-700 ml-2">
              <span className="mr-3 text-2xl">⚡</span> ลักษณะงานที่ปฏิบัติ
            </label>
            <div className="grid grid-cols-2 gap-5">
              
              {/* Card 1: งานแก้ไฟ */}
              <button
                type="button"
                onClick={() => setJobType("repair")}
                className={`relative flex flex-col items-center p-6 rounded-[2.5rem] border-4 transition-all duration-300 ${
                  jobType === "repair"
                    ? "border-blue-500 bg-blue-50 shadow-xl shadow-blue-100 scale-105 z-10"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="w-full h-28 relative mb-4 overflow-hidden rounded-3xl bg-white flex items-center justify-center">
                  <img
                    src="/images/car.png" 
                    alt="Repair Work"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <span className={`text-base font-black leading-tight text-center ${jobType === "repair" ? "text-blue-700" : "text-slate-600"}`}>
                  งานแก้ไฟ<br/>ขัดข้อง
                </span>
                {jobType === "repair" && (
                  <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-2 shadow-lg border-4 border-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </button>

              {/* Card 2: งานบริการลูกค้า */}
              <button
                type="button"
                onClick={() => setJobType("service")}
                className={`relative flex flex-col items-center p-6 rounded-[2.5rem] border-4 transition-all duration-300 ${
                  jobType === "service"
                    ? "border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100 scale-105 z-10"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="w-full h-28 flex items-center justify-center mb-4 bg-emerald-50 rounded-3xl">
                  <span className="text-6xl">🏢</span>
                </div>
                <span className={`text-base font-black leading-tight text-center ${jobType === "service" ? "text-emerald-700" : "text-slate-600"}`}>
                  งานแผน<br/>บริการลูกค้า
                </span>
                {jobType === "service" && (
                  <div className="absolute -top-3 -right-3 bg-emerald-600 text-white rounded-full p-2 shadow-lg border-4 border-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* ปุ่มเริ่มงาน - ใหญ่พิเศษ */}
          <button
            disabled={!isReady}
            onClick={() => {
              const jobTypeValue = jobType === "repair" ? "incident" : "service";
              localStorage.setItem(
                "worker_info",
                JSON.stringify({ worker, jobType: jobTypeValue })
              );
              router.push("/dispatch");
            }}
            className={`
              w-full rounded-[2.5rem] py-7 text-2xl font-black transition-all shadow-2xl
              ${isReady
                ? "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 active:scale-95 translate-y-0"
                : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
              }`}
          >
            เริ่มปฏิบัติงาน 🚀
          </button>
        </div>
      </div>
    </div>
  );
}