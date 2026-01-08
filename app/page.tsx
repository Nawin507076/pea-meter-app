"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; // แนะนำให้ใช้ Image ของ Next.js

export default function Home() {
  const [worker, setWorker] = useState("");
  const [jobType, setJobType] = useState("");
  const router = useRouter();

  const isReady = worker !== "" && jobType !== "";

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center px-4 pt-10 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-8 space-y-8 border border-slate-100">
        <div className="text-center space-y-3">
          <div className="inline-block p-3 bg-blue-50 rounded-2xl mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            บันทึกปฏิบัติงานมิเตอร์
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            กรุณาระบุตัวตนและเลือกลักษณะงาน
          </p>
        </div>

        <div className="space-y-6">
          {/* ผู้ปฏิบัติงาน */}
          <div className="space-y-3">
            <label className="flex items-center text-base font-bold text-slate-700 ml-1">
              <span className="mr-2">👷‍♂️</span> ผู้ปฏิบัติงาน
            </label>
            <select
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-4 text-lg font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">-- เลือกเจ้าหน้าที่ --</option>
              {Array.from({ length: 9 }).map((_, i) => (
                <option key={i} value={`เจ้าหน้าที่ ${i + 1}`}>
                  เจ้าหน้าที่ {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* ลักษณะงาน (Option Cards) */}
          <div className="space-y-3">
            <label className="flex items-center text-base font-bold text-slate-700 ml-1">
              <span className="mr-2">⚡</span> ลักษณะงานที่ปฏิบัติ
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: งานแก้ไฟ */}
              <button
                type="button"
                onClick={() => setJobType("repair")}
                className={`relative flex flex-col items-center p-4 rounded-3xl border-2 transition-all duration-300 ${
                  jobType === "repair"
                    ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="w-full h-24 relative mb-3 overflow-hidden rounded-2xl">
                  <img
                    src="/images/car.png" 
                    alt="Repair Work"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className={`text-sm font-black leading-tight ${jobType === "repair" ? "text-blue-700" : "text-slate-600"}`}>
                  งานแก้กระแสไฟฟ้า<br/>ขัดข้อง
                </span>
                {jobType === "repair" && (
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </button>

              {/* Card 2: งานบริการลูกค้า */}
              <button
                type="button"
                onClick={() => setJobType("service")}
                className={`relative flex flex-col items-center p-4 rounded-3xl border-2 transition-all duration-300 ${
                  jobType === "service"
                    ? "border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="w-full h-24 flex items-center justify-center mb-3 bg-emerald-50 rounded-2xl">
                  <span className="text-4xl">🏢</span>
                </div>
                <span className={`text-sm font-black leading-tight ${jobType === "service" ? "text-emerald-700" : "text-slate-600"}`}>
                  งานแผนบริการ<br/>ลูกค้า
                </span>
                {jobType === "service" && (
                  <div className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full p-1 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* ปุ่มเริ่ม */}
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
              w-full rounded-[1.5rem] py-5 text-xl font-black transition-all shadow-xl
              ${isReady
                ? "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              }`}
          >
            เริ่มกรอกข้อมูล 🚀
          </button>
        </div>
      </div>
    </div>
  );
}