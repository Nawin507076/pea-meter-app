"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const workers = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  name: `เจ้าหน้าที่ ${i + 1}`,
}));

const jobTypes = [
  {
    value: "incident",
    label: "งานแก้กระแสไฟฟ้าขัดข้อง",
  },
  {
    value: "customer_service",
    label: "งานแผนบริการลูกค้า",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [worker, setWorker] = useState<{ id: number; name: string } | null>(
    null
  );
  const [jobType, setJobType] = useState<string>("");

  const canSubmit = worker && jobType;

  const handleStart = () => {
    if (!worker || !jobType) return;

    const jobTypeLabel =
      jobTypes.find((j) => j.value === jobType)?.label ?? "";

    localStorage.setItem(
      "work_context",
      JSON.stringify({
        worker_id: worker.id,
        worker_name: worker.name,
        job_type: jobType,
        job_type_label: jobTypeLabel,
      })
    );

    router.push("/form");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-center text-xl font-bold">
          เลือกผู้ออกปฏิบัติงาน
        </h1>

        {/* Worker Selector */}
        <div className="grid grid-cols-3 gap-3">
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => setWorker(w)}
              className={`rounded-xl border p-4 text-center font-medium shadow-sm transition
                ${
                  worker?.id === w.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "bg-white"
                }`}
            >
              {w.name}
            </button>
          ))}
        </div>

        {/* Job Type */}
        <div>
          <label className="mb-1 block font-medium">ลักษณะงาน</label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="w-full rounded-lg border p-3 text-base"
          >
            <option value="">-- กรุณาเลือก --</option>
            {jobTypes.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Button */}
        <button
          disabled={!canSubmit}
          onClick={handleStart}
          className={`w-full rounded-xl p-4 text-lg font-semibold transition
            ${
              canSubmit
                ? "bg-green-600 text-white active:scale-95"
                : "bg-gray-300 text-gray-500"
            }`}
        >
          เริ่มกรอกข้อมูล
        </button>
      </div>
    </main>
  );
}
