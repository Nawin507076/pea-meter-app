"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [worker, setWorker] = useState("");
  const [jobType, setJobType] = useState("");
  const router = useRouter();

  const isReady = worker !== "" && jobType !== "";

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center px-4 pt-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">
            ข้อมูลการออกปฏิบัติงานมิเตอร์
          </h1>
          <p className="text-sm text-slate-500">
            กรุณาเลือกข้อมูลก่อนเริ่มกรอกมิเตอร์
          </p>
        </div>

        <div className="space-y-5">
          {/* ผู้ปฏิบัติงาน */}
          <div>
            <label className="block text-lg font-semibold text-slate-700 mb-2">
              ผู้ปฏิบัติงาน
            </label>
            <select
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">-- เลือกเจ้าหน้าที่ --</option>
              {Array.from({ length: 9 }).map((_, i) => (
                <option key={i} value={`เจ้าหน้าที่ ${i + 1}`}>
                  เจ้าหน้าที่ {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* ลักษณะงาน */}
          <div>
            <label className="block text-lg font-semibold text-slate-700 mb-2">
              ลักษณะงาน
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">-- เลือกลักษณะงาน --</option>
              <option value="repair">งานแก้กระแสไฟฟ้าขัดข้อง</option>
              <option value="service">งานแผนบริการลูกค้า</option>
            </select>
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
              w-full rounded-2xl py-3 text-lg font-semibold transition-all
              ${isReady
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                : "bg-blue-100 text-blue-400 cursor-not-allowed"
              }`}
          >
            เริ่มกรอกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}
