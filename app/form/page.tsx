"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type WorkerInfo = {
  worker: string;
  jobType: "incident" | "service";
};

export default function MultiStepMeterForm() {
  const router = useRouter();
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);

  // Step 1
  const [peaOld, setPeaOld] = useState("");
  const [oldUnit, setOldUnit] = useState("");

  // Step 2
  const [peaNew, setPeaNew] = useState("");
  const [newUnit, setNewUnit] = useState("");

  // Step 3
  const [remark, setRemark] = useState("ไหม้ทั้งเครื่อง");
  const [customRemark, setCustomRemark] = useState("");
  const [remarkOptions, setRemarkOptions] = useState<string[]>([
    "ไหม้ทั้งเครื่อง",
    "ที่ต่อสายไหม้",
    "น้ำเข้า",
    "ใช้ไฟเกิน(ct ไหม้)",
    "อื่นๆ",
  ]);
  const [photo, setPhoto] = useState<File | null>(null);

  const [step, setStep] = useState(1);

  // โหลดข้อมูล worker และ Step1
  useEffect(() => {
    const stored = localStorage.getItem("worker_info");
    if (!stored) {
      router.push("/");
      return;
    }
    queueMicrotask(() => {
      setWorkerInfo(JSON.parse(stored) as WorkerInfo);
    });

    const savedStep1 = localStorage.getItem("step1");
    if (savedStep1) {
      queueMicrotask(() => {
        const parsed = JSON.parse(savedStep1);
        setPeaOld(parsed.peaOld || "");
        setOldUnit(parsed.oldUnit || "");
      });
    }
  }, [router]);

  const handleRemarkChange = (value: string) => {
    if (value === "อื่นๆ") {
      setRemark("");
    } else {
      setRemark(value);
      setCustomRemark("");
    }
  };

  const handleNext = () => {
    if (step === 1) {
      localStorage.setItem("step1", JSON.stringify({ peaOld, oldUnit }));
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    if (step === 1) {
      localStorage.setItem("step1", JSON.stringify({ peaOld, oldUnit }));
      router.push("/"); // กลับไปหน้าเลือกผู้ปฏิบัติงาน
    } else {
      setStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleSave = async () => {
    if (!workerInfo) return;
    const finalRemark = remark || customRemark;

    if (customRemark && !remarkOptions.includes(customRemark)) {
      setRemarkOptions([...remarkOptions.slice(0, -1), customRemark, "อื่นๆ"]);
    }

    const formData = new FormData();
    formData.append("worker", workerInfo.worker);
    formData.append("jobType", workerInfo.jobType);
    formData.append("peaOld", peaOld);
    formData.append("oldUnit", oldUnit);
    formData.append("peaNew", peaNew);
    formData.append("newUnit", newUnit);
    formData.append("remark", finalRemark);
    formData.append("timestamp", new Date().toISOString());
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/saveMeter", { method: "POST", body: formData });
      if (res.ok) {
        alert("บันทึกเรียบร้อย ✅");
        setStep(1);
        setPeaOld(""); setOldUnit(""); setPeaNew(""); setNewUnit("");
        setRemark("ไหม้ทั้งเครื่อง"); setCustomRemark(""); setPhoto(null);
        localStorage.removeItem("step1");
      } else {
        alert("เกิดข้อผิดพลาด ❌");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดเชื่อมต่อ ❌");
    }
  };

  if (!workerInfo) return null;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="p-4 bg-gray-100 rounded-xl shadow">
        <p className="text-lg">👷 เจ้าหน้าที่: <strong>{workerInfo.worker}</strong></p>
        <p className="text-lg">🧰 ลักษณะงาน: <strong>{workerInfo.jobType === "incident" ? "งานแก้กระแสไฟฟ้าขัดข้อง" : "งานแผนบริการลูกค้า"}</strong></p>
      </div>

      {/* Step Header */}
      {step === 1 && <h1 className="text-2xl text-center font-bold mb-4">📌 มิเตอร์ชำรุด (เก่า)</h1>}
      {step === 2 && <h1 className="text-2xl text-center font-bold mb-4">📌 มิเตอร์ติดตั้งทดแทน (ใหม่)</h1>}
      {step === 3 && <h1 className="text-2xl text-center font-bold mb-4">📌 ใส่สาเหตุ + ถ่ายรูป</h1>}

      {/* Step Content */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block mb-2 font-semibold text-lg">PEA มิเตอร์เก่า</label>
            <input type="text" placeholder="ใส่ PEA มิเตอร์เก่า" value={peaOld} onChange={(e) => setPeaOld(e.target.value)} className="border p-3 rounded-lg w-full text-lg"/>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-lg">หน่วยมิเตอร์เก่า (kWh)</label>
            <input type="number" placeholder="ใส่หน่วยมิเตอร์เก่า" value={oldUnit} onChange={(e) => setOldUnit(e.target.value)} className="border p-3 rounded-lg w-full text-lg"/>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block mb-2 font-semibold text-lg">PEA มิเตอร์ใหม่</label>
            <input type="text" placeholder="ใส่ PEA มิเตอร์ใหม่" value={peaNew} onChange={(e) => setPeaNew(e.target.value)} className="border p-3 rounded-lg w-full text-lg"/>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-lg">หน่วยมิเตอร์ใหม่ (kWh)</label>
            <input type="number" placeholder="ใส่หน่วยมิเตอร์ใหม่" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="border p-3 rounded-lg w-full text-lg"/>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block mb-2 font-semibold text-lg">สาเหตุชำรุด (ถ้ามี)</label>
            <select value={remark || "อื่นๆ"} onChange={(e) => handleRemarkChange(e.target.value)} className="border p-3 rounded-lg w-full text-lg">
              {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            {remark === "" && (
              <input type="text" placeholder="ระบุสาเหตุอื่นๆ" value={customRemark} onChange={(e) => setCustomRemark(e.target.value)} className="border p-3 rounded-lg w-full text-lg mt-2"/>
            )}
          </div>

          <div>
            <label className="block mb-2 font-semibold text-lg">ถ่ายรูป (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="border p-3 rounded-lg w-full"/>
            {photo && <p className="text-sm mt-1 text-gray-600 text-center">ไฟล์ที่เลือก: {photo.name}</p>}
          </div>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={handleBack} className="px-5 py-3 bg-gray-300 rounded-lg text-lg font-semibold">
          {step === 1 ? "กลับไปหน้าเลือกผู้ปฏิบัติงาน" : "ย้อนกลับ"}
        </button>
        {step < 3 ? (
          <button onClick={handleNext} className="px-5 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold">ถัดไป</button>
        ) : (
          <button onClick={handleSave} className="px-5 py-3 bg-purple-600 text-white rounded-lg text-lg font-bold">💾 บันทึก</button>
        )}
      </div>
    </div>
  );
}
