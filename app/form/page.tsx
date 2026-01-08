"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// --- Types & Interfaces ---
type WorkerInfo = {
  worker: string;
  jobType: "incident" | "service";
};

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  type?: "text" | "number";
}

export default function MultiStepMeterForm() {
  const router = useRouter();
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);

  // Form States
  const [peaOld, setPeaOld] = useState("");
  const [oldUnit, setOldUnit] = useState("");
  const [peaNew, setPeaNew] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [remark, setRemark] = useState("ไหม้ทั้งเครื่อง");
  const [customRemark, setCustomRemark] = useState("");
  const [remarkOptions] = useState<string[]>([
    "ไหม้ทั้งเครื่อง",
    "ที่ต่อสายไหม้",
    "น้ำเข้า",
    "ใช้ไฟเกิน(ct ไหม้)",
    "อื่นๆ",
  ]);
  const [photo, setPhoto] = useState<File | null>(null);
  
  // UI States
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("worker_info");
    if (!stored) {
      router.push("/");
      return;
    }
    setWorkerInfo(JSON.parse(stored) as WorkerInfo);

    const savedStep1 = localStorage.getItem("step1");
    if (savedStep1) {
      const parsed = JSON.parse(savedStep1);
      setPeaOld(parsed.peaOld || "");
      setOldUnit(parsed.oldUnit || "");
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
    if (step === 1) localStorage.setItem("step1", JSON.stringify({ peaOld, oldUnit }));
    setStep((prev) => Math.min(prev + 1, 3));
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (step === 1) {
      router.push("/");
    } else {
      setStep((prev) => Math.max(prev - 1, 1));
    }
    window.scrollTo(0, 0);
  };

  const handleSave = async () => {
    if (!workerInfo || isSubmitting) return;
    setIsSubmitting(true);

    const finalRemark = remark || customRemark;
    const formData = new FormData();
    formData.append("worker", workerInfo.worker);
    formData.append("jobType", workerInfo.jobType);
    formData.append("peaOld", peaOld);
    formData.append("oldUnit", oldUnit);
    formData.append("peaNew", peaNew);
    formData.append("newUnit", newUnit);
    formData.append("remark", finalRemark);
    formData.append("timestamp", new Date().toLocaleString("th-TH"));
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/saveMeter", { method: "POST", body: formData });
      if (res.ok) {
        alert("บันทึกเรียบร้อย ✅");
        localStorage.removeItem("step1");
        setStep(1);
        setPeaOld(""); setOldUnit(""); setPeaNew(""); setNewUnit("");
        setRemark("ไหม้ทั้งเครื่อง"); setCustomRemark(""); setPhoto(null);
      } else {
        alert("เกิดข้อผิดพลาด ❌");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดเชื่อมต่อ ❌");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workerInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans">
      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">เจ้าหน้าที่</span>
            <span className="font-bold text-blue-700 leading-tight">{workerInfo.worker}</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">งาน</span>
            <span className="font-bold text-gray-800 leading-tight">
              {workerInfo.jobType === "incident" ? "แก้ไฟขัดข้อง" : "บริการลูกค้า"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6">
        {/* Progress Indicator */}
        <div className="flex justify-between mb-8 px-4 relative">
          <div className="absolute top-4 left-10 right-10 h-[2px] bg-gray-200 -z-0"></div>
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center flex-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 transition-all shadow-sm ${
                step >= s ? 'bg-blue-600 text-white scale-110' : 'bg-white text-gray-400 border border-gray-200'
              }`}>
                {s}
              </div>
              <span className={`text-[10px] font-medium ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'มิเตอร์เก่า' : s === 2 ? 'มิเตอร์ใหม่' : 'สรุป'}
              </span>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-6">
          <header className="text-center">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              {step === 1 && "📌 ข้อมูลมิเตอร์เก่า"}
              {step === 2 && "📌 ข้อมูลมิเตอร์ใหม่"}
              {step === 3 && "📌 สาเหตุและรูปถ่าย"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">กรุณากรอกข้อมูลให้ครบถ้วน</p>
          </header>

          <div className="space-y-5">
            {step === 1 && (
              <>
                <InputGroup label="PEA มิเตอร์เก่า" value={peaOld} onChange={setPeaOld} placeholder="ระบุเลข PEA" />
                <InputGroup label="หน่วยมิเตอร์เก่า (kWh)" value={oldUnit} onChange={setOldUnit} placeholder="0.00" type="number" />
              </>
            )}

            {step === 2 && (
              <>
                <InputGroup label="PEA มิเตอร์ใหม่" value={peaNew} onChange={setPeaNew} placeholder="ระบุเลข PEA" />
                <InputGroup label="หน่วยมิเตอร์ใหม่ (kWh)" value={newUnit} onChange={setNewUnit} placeholder="0.00" type="number" />
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">สาเหตุการชำรุด</label>
                  <div className="relative">
                    <select 
                      value={remark || "อื่นๆ"} 
                      onChange={(e) => handleRemarkChange(e.target.value)}
                      className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 text-gray-900 font-medium outline-none appearance-none transition-all"
                    >
                      {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                      ▼
                    </div>
                  </div>
                  {remark === "" && (
                    <input 
                      type="text" 
                      placeholder="โปรดระบุสาเหตุอื่นๆ..." 
                      value={customRemark} 
                      onChange={(e) => setCustomRemark(e.target.value)}
                      className="w-full p-4 mt-3 bg-white border border-gray-200 rounded-2xl outline-none focus:border-blue-500 text-gray-900 font-medium transition-all"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">รูปถ่ายมิเตอร์ (ถ้ามี)</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="mb-1 text-sm text-gray-500 font-medium">
                        {photo ? "✅ ไฟล์พร้อมแล้ว" : "📷 แตะเพื่อถ่ายรูป"}
                      </p>
                      <p className="text-xs text-gray-400 uppercase">
                        {photo ? photo.name.slice(0, 25) : "JPG, PNG ไม่เกิน 5MB"}
                      </p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8 pb-10 px-2">
          <button 
            onClick={handleBack} 
            className="py-4 rounded-2xl text-gray-600 font-bold bg-white border border-gray-200 active:bg-gray-100 active:scale-95 transition-all shadow-sm"
          >
            {step === 1 ? "ยกเลิก" : "ย้อนกลับ"}
          </button>

          {step < 3 ? (
            <button 
              onClick={handleNext} 
              className="py-4 rounded-2xl text-white font-bold bg-blue-600 shadow-lg shadow-blue-200 active:bg-blue-700 active:scale-95 transition-all"
            >
              ถัดไป
            </button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={isSubmitting}
              className={`py-4 rounded-2xl text-white font-extrabold transition-all active:scale-95 shadow-lg ${
                isSubmitting ? 'bg-gray-400 shadow-none' : 'bg-emerald-600 shadow-emerald-200 active:bg-emerald-700'
              }`}
            >
              {isSubmitting ? "กำลังส่ง..." : "💾 บันทึก"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---
function InputGroup({ label, value, onChange, placeholder, type = "text" }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        // สำคัญ: text-gray-900 และ opacity-100 แก้ปัญหาตัวหนังสือจางบน iOS
        className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-900 font-medium placeholder:text-gray-300 opacity-100 appearance-none"
      />
    </div>
  );
}