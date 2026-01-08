"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type WorkerInfo = {
  worker: string;
  jobType: "incident" | "service";
};

// 1. กำหนด Interface สำหรับ Props ของ InputGroup
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

  const [peaOld, setPeaOld] = useState("");
  const [oldUnit, setOldUnit] = useState("");
  const [peaNew, setPeaNew] = useState("");
  const [newUnit, setNewUnit] = useState("");
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
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center text-sm">
          <div>
            <p className="text-gray-500">เจ้าหน้าที่</p>
            <p className="font-bold text-blue-700">{workerInfo.worker}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">ประเภทงาน</p>
            <p className="font-bold">{workerInfo.jobType === "incident" ? "แก้ไฟขัดข้อง" : "บริการลูกค้า"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6">
        <div className="flex justify-between mb-8 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {s}
              </div>
              <span className={`text-[10px] ${step >= s ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                {s === 1 ? 'มิเตอร์เก่า' : s === 2 ? 'มิเตอร์ใหม่' : 'สรุป'}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <header className="text-center">
            <h1 className="text-xl font-bold text-gray-800">
              {step === 1 && "📌 ข้อมูลมิเตอร์เก่า"}
              {step === 2 && "📌 ข้อมูลมิเตอร์ใหม่"}
              {step === 3 && "📌 สาเหตุและรูปถ่าย"}
            </h1>
          </header>

          <div className="space-y-4">
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">สาเหตุการชำรุด</label>
                  <select 
                    value={remark || "อื่นๆ"} 
                    onChange={(e) => handleRemarkChange(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                  {remark === "" && (
                    <input 
                      type="text" 
                      placeholder="โปรดระบุสาเหตุอื่นๆ..." 
                      value={customRemark} 
                      onChange={(e) => setCustomRemark(e.target.value)}
                      className="w-full p-3 mt-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">รูปถ่ายมิเตอร์ (ถ้ามี)</label>
                  <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-gray-400">
                      <p className="text-xs">{photo ? `✅ เลือกแล้ว: ${photo.name.slice(0,20)}...` : "คลิกเพื่อถ่ายรูปหรือเลือกไฟล์"}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8 pb-10">
          <button 
            onClick={handleBack} 
            className="p-4 rounded-xl text-gray-600 font-semibold bg-white border border-gray-200 active:scale-95 transition-transform"
          >
            {step === 1 ? "กลับหน้าแรก" : "ย้อนกลับ"}
          </button>

          {step < 3 ? (
            <button 
              onClick={handleNext} 
              className="p-4 rounded-xl text-white font-semibold bg-blue-600 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
            >
              ถัดไป
            </button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={isSubmitting}
              className={`p-4 rounded-xl text-white font-bold transition-all active:scale-95 ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 shadow-lg shadow-green-200'}`}
            >
              {isSubmitting ? "กำลังบันทึก..." : "💾 บันทึกข้อมูล"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. ใช้ Interface แทน any ใน Sub-component
function InputGroup({ label, value, onChange, placeholder, type = "text" }: InputGroupProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
      />
    </div>
  );
}