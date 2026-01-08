"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";

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
  onScanClick?: () => void;
}

export default function MultiStepMeterForm() {
  const router = useRouter();
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);

  // --- Form States ---
  const [peaOld, setPeaOld] = useState("");
  const [oldUnit, setOldUnit] = useState("");
  const [photoOld, setPhotoOld] = useState<File | null>(null);

  const [peaNew, setPeaNew] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [photoNew, setPhotoNew] = useState<File | null>(null);

  const [remark, setRemark] = useState("ไหม้ทั้งเครื่อง");
  const [customRemark, setCustomRemark] = useState("");
  const [location, setLocation] = useState({ lat: "", lng: "" });
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [scanning, setScanning] = useState<{ active: boolean; target: "old" | "new" }>({ 
    active: false, 
    target: "old" 
  });

  const [remarkOptions] = useState<string[]>([
    "ไหม้ทั้งเครื่อง", "ที่ต่อสายไหม้", "น้ำเข้า", "ใช้ไฟเกิน(ct ไหม้)", "อื่นๆ"
  ]);

  useEffect(() => {
    const stored = localStorage.getItem("worker_info");
    if (!stored) {
      router.push("/");
      return;
    }
    setWorkerInfo(JSON.parse(stored) as WorkerInfo);
  }, [router]);

  // Scanner Logic
  useEffect(() => {
    if (scanning.active) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 280, height: 150 },
        aspectRatio: 1.0 
      }, false);

      scanner.render(
        (text) => {
          if (scanning.target === "old") setPeaOld(text);
          else setPeaNew(text);
          scanner.clear();
          setScanning({ ...scanning, active: false });
        },
        () => {}
      );
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [scanning]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return alert("มือถือไม่รองรับ GPS");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
        setIsLocating(false);
      },
      () => {
        alert("ดึงพิกัดไม่สำเร็จ โปรดอนุญาตสิทธิ์ตำแหน่ง");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 3));
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (step === 1) router.push("/");
    else setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSave = async () => {
    if (!workerInfo || isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("worker", workerInfo.worker);
    formData.append("jobType", workerInfo.jobType);
    formData.append("peaOld", peaOld);
    formData.append("oldUnit", oldUnit);
    formData.append("peaNew", peaNew);
    formData.append("newUnit", newUnit);
    formData.append("remark", remark || customRemark);
    formData.append("lat", location.lat);
    formData.append("lng", location.lng);
    formData.append("timestamp", new Date().toLocaleString("th-TH"));
    
    if (photoOld) formData.append("photoOld", photoOld);
    if (photoNew) formData.append("photoNew", photoNew);

    try {
      const res = await fetch("/api/saveMeter", { method: "POST", body: formData });
      if (res.ok) {
        alert("บันทึกเรียบร้อย ✅");
        router.push("/");
      } else {
        alert("เกิดข้อผิดพลาด ❌");
      }
    } catch (error) {
      alert("เชื่อมต่อล้มเหลว ❌");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workerInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans text-gray-900">
      {/* Scanner Overlay */}
      {scanning.active && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl mb-4">
            <div id="reader"></div>
          </div>
          <p className="mb-4 font-bold">วางบาร์โค้ดให้อยู่ในกรอบสแกน</p>
          <button onClick={() => setScanning({ ...scanning, active: false })} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-bold active:scale-95 transition-all">ยกเลิก</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm p-4">
        <div className="max-w-md mx-auto flex justify-between items-center font-bold">
          <div className="flex flex-col"><span className="text-[14px] text-gray-400 uppercase">เจ้าหน้าที่</span><span className="text-blue-700">{workerInfo.worker}</span></div>
          <div className="text-right flex flex-col"><span className="text-[14px] text-gray-400 uppercase">งาน</span><span>{workerInfo.jobType === "incident" ? "แก้ไฟ" : "บริการ"}</span></div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
          <h2 className="text-xl font-extrabold text-center">
            {step === 1 ? "📌 มิเตอร์เก่า" : step === 2 ? "📌 มิเตอร์ใหม่" : "📌 สรุปงาน"}
          </h2>

          <div className="space-y-5">
            {step === 1 && (
              <>
                <InputGroup label="เลข PEA เก่า" value={peaOld} onChange={setPeaOld} placeholder="สแกนบาร์โค้ด..." onScanClick={() => setScanning({ active: true, target: "old" })} />
                <InputGroup label="หน่วย (kWh)" value={oldUnit} onChange={setOldUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายภาพมิเตอร์เก่า" photo={photoOld} onPhotoChange={setPhotoOld} />
              </>
            )}

            {step === 2 && (
              <>
                <InputGroup label="เลข PEA ใหม่" value={peaNew} onChange={setPeaNew} placeholder="สแกนบาร์โค้ด..." onScanClick={() => setScanning({ active: true, target: "new" })} />
                <InputGroup label="หน่วย (kWh)" value={newUnit} onChange={setNewUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายภาพมิเตอร์ใหม่" photo={photoNew} onPhotoChange={setPhotoNew} />
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">พิกัดสถานที่</label>
                  <button onClick={getCurrentLocation} disabled={isLocating} className="w-full p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
                    📍 {isLocating ? "กำลังดึงตำแหน่ง..." : location.lat ? "อัปเดตตำแหน่งแล้ว" : "กดเพื่อดึงพิกัด GPS"}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">สาเหตุการเปลี่ยน</label>
                  <select value={remark || "อื่นๆ"} onChange={(e) => setRemark(e.target.value === "อื่นๆ" ? "" : e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-gray-900 font-medium appearance-none">
                    {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                  {!remark && <input type="text" placeholder="ระบุสาเหตุเพิ่มเติม..." value={customRemark} onChange={(e) => setCustomRemark(e.target.value)} className="w-full p-4 mt-2 border border-gray-200 rounded-2xl text-gray-900 opacity-100" />}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8 pb-10 px-2">
          <button onClick={handleBack} className="py-4 bg-white border rounded-2xl font-bold text-gray-500 active:bg-gray-50 transition-all">{step === 1 ? "ยกเลิก" : "ย้อนกลับ"}</button>
          {step < 3 ? (
            <button onClick={handleNext} className="py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg active:bg-blue-700">ถัดไป</button>
          ) : (
            <button onClick={handleSave} disabled={isSubmitting} className={`py-4 rounded-2xl text-white font-extrabold shadow-lg ${isSubmitting ? 'bg-gray-400' : 'bg-emerald-600 active:bg-emerald-700'}`}>
              {isSubmitting ? "ส่งข้อมูล..." : "💾 บันทึกงาน"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function InputGroup({ label, value, onChange, placeholder, type = "text", onScanClick }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
      <div className="flex gap-2">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl text-gray-900 font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all opacity-100" />
        {onScanClick && (
          <button onClick={onScanClick} className="px-3 bg-blue-600 text-white rounded-2xl active:scale-90 transition-all shadow-md flex flex-col items-center justify-center min-w-[70px]">
            {/* SVG QR Code Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
              <line x1="7" y1="7" x2="7" y2="7"></line>
              <line x1="17" y1="7" x2="17" y2="7"></line>
              <line x1="17" y1="17" x2="17" y2="17"></line>
              <line x1="7" y1="17" x2="7" y2="17"></line>
            </svg>
            <span className="text-[10px] mt-0.5 font-bold">สแกน</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoUpload({ label, photo, onPhotoChange }: { label: string; photo: File | null; onPhotoChange: (f: File | null) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer bg-white active:bg-gray-50 transition-all shadow-sm">
        <span className="text-sm font-bold text-gray-500">{photo ? `✅ ${photo.name.slice(0, 15)}...` : "📸 ถ่ายรูป"}</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}