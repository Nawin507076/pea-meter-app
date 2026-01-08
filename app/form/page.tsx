"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";

// --- Types & Interfaces ---
type WorkerInfo = { worker: string; jobType: "incident" | "service" };

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  type?: "text" | "number";
  onScanClick?: () => void;
}

interface PhotoUploadProps {
  label: string;
  photo: File | null;
  onPhotoChange: (f: File | null) => void;
}

export default function MultiStepMeterForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  // โหลดข้อมูลเจ้าหน้าที่จาก LocalStorage
  const [workerInfo] = useState<WorkerInfo | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("worker_info");
      return stored ? (JSON.parse(stored) as WorkerInfo) : null;
    }
    return null;
  });

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

  const remarkOptions: string[] = ["ไหม้ทั้งเครื่อง", "ที่ต่อสายไหม้", "น้ำเข้า", "ใช้ไฟเกิน(ct ไหม้)", "อื่นๆ"];

  useEffect(() => {
    if (!workerInfo) { router.push("/"); }
  }, [workerInfo, router]);

  // --- Scanning Logic ---
  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;
    if (scanning.active && videoRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      codeReader = new BrowserMultiFormatReader(hints);
      const constraints: MediaStreamConstraints = {
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      codeReader.decodeFromConstraints(constraints, videoRef.current, (result) => {
        if (result) {
          const text = result.getText().replace(/[^0-9]/g, "");
          if (scanning.target === "old") setPeaOld(text);
          else setPeaNew(text);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          setScanning(prev => ({ ...prev, active: false }));
        }
      });
    }
    return () => { if (codeReader) codeReader.reset(); };
  }, [scanning.active, scanning.target]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return alert("ไม่รองรับ GPS");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
      setIsLocating(false);
    }, () => { alert("ดึงพิกัดไม่สำเร็จ"); setIsLocating(false); }, { enableHighAccuracy: true });
  }, []);

  const handleNext = () => { setStep(s => Math.min(s + 1, 3)); window.scrollTo(0, 0); };
  const handleBack = () => {
    if (step === 1) router.push("/");
    else setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSave = async () => {
    if (!workerInfo || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => {
      alert("บันทึกข้อมูลเรียบร้อย ✅");
      router.push("/");
      setIsSubmitting(false);
    }, 1500);
  };

  if (!workerInfo) return null;

  return (
    <div className="min-h-screen bg-gray-100 pb-10 font-sans text-gray-900 overflow-x-hidden">
      
      {/* 🔴 Scanner UI */}
      {scanning.active && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full h-[70vh]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
              <div className="w-full max-w-sm h-40 border-4 border-white/30 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                <div className="absolute top-0 left-0 w-full h-[5px] bg-red-600 shadow-[0_0_20px_#dc2626] animate-scan-line"></div>
                {/* corners */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-8 border-l-8 border-white rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-8 border-r-8 border-white rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-8 border-l-8 border-white rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-8 border-r-8 border-white rounded-br-xl"></div>
              </div>
            </div>
          </div>
          <button onClick={() => setScanning(p => ({ ...p, active: false }))} className="mt-8 px-16 py-5 bg-white text-black text-2xl font-black rounded-3xl active:scale-95 shadow-2xl">
            ยกเลิกสแกน
          </button>
        </div>
      )}

      {/* 🟢 Header: แก้ปัญหาข้อความยาวเกิน */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-md p-4 px-5 flex justify-between items-center w-full">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-gray-500 text-[10px] font-black uppercase tracking-tighter truncate">เจ้าหน้าที่</span>
          <span className="text-blue-700 text-xl font-black tracking-tight mt-0 truncate">{workerInfo.worker}</span>
        </div>
        <div className="text-right flex flex-col min-w-0 flex-1 ml-4">
          <span className="text-gray-500 text-[10px] font-black uppercase tracking-tighter truncate">งาน</span>
          <span className="text-gray-800 text-lg font-black tracking-tight mt-0 truncate">
            {workerInfo.jobType === "incident" ? "แก้ไฟขัดข้อง" : "บริการลูกค้า"}
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
        {/* Step Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 space-y-8 border border-white">
          <h2 className="text-2xl font-black text-center text-slate-800 tracking-tighter bg-slate-50 py-3 rounded-2xl">
            {step === 1 ? "📌 ข้อมูลมิเตอร์เก่า" : step === 2 ? "📌 ข้อมูลมิเตอร์ใหม่" : "📌 พิกัดปฏิบัติงาน"}
          </h2>

          <div className="space-y-6">
            {step === 1 && (
              <>
                <InputGroup label="เลข PEA เก่า (ชำรุด)" value={peaOld} onChange={setPeaOld} placeholder="สแกน..." onScanClick={() => setScanning({ active: true, target: "old" })} />
                <InputGroup label="หน่วยล่าสุด (kWh)" value={oldUnit} onChange={setOldUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายรูปมิเตอร์เก่า" photo={photoOld} onPhotoChange={setPhotoOld} />
              </>
            )}
            {step === 2 && (
              <>
                <InputGroup label="เลข PEA ใหม่ (ติดตั้ง)" value={peaNew} onChange={setPeaNew} placeholder="สแกน..." onScanClick={() => setScanning({ active: true, target: "new" })} />
                <InputGroup label="หน่วยเริ่มต้น (kWh)" value={newUnit} onChange={setNewUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายรูปมิเตอร์ใหม่" photo={photoNew} onPhotoChange={setPhotoNew} />
              </>
            )}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-lg font-black text-gray-700 ml-2">ตำแหน่ง GPS</label>
                  <button onClick={getCurrentLocation} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-blue-100 transition-all">
                    📍 {isLocating ? "กำลังดึงข้อมูล..." : location.lat ? "บันทึกพิกัดแล้ว" : "กดเช็คอินพิกัด"}
                  </button>
                </div>
                <div className="space-y-3">
                  <label className="text-lg font-black text-gray-700 ml-2">สาเหตุการเปลี่ยน</label>
                  <select value={remark || "อื่นๆ"} onChange={(e) => setRemark(e.target.value === "อื่นๆ" ? "" : e.target.value)} className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-[2rem] text-xl font-black text-slate-800 outline-none appearance-none">
                    {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8 px-1 pb-10">
          <button onClick={handleBack} className="py-6 bg-white border-4 border-gray-100 rounded-[2.2rem] text-xl font-black text-gray-400 active:scale-95 transition-all shadow-md">
            ย้อนกลับ
          </button>
          {step < 3 ? (
            <button onClick={handleNext} className="py-6 bg-blue-700 text-white rounded-[2.2rem] text-xl font-black shadow-xl active:scale-95 transition-all">
              ถัดไป
            </button>
          ) : (
            <button onClick={handleSave} disabled={isSubmitting} className="py-6 bg-emerald-600 text-white rounded-[2.2rem] text-xl font-black shadow-xl active:scale-95 transition-all">
              {isSubmitting ? "รอ..." : "💾 บันทึก"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-scan-line { animation: scan-line 2s linear infinite; }
      `}</style>
    </div>
  );
}

// --- Sub-components (ป้องกัน Layout เกินขอบ) ---

function InputGroup({ label, value, onChange, placeholder, type = "text", onScanClick }: InputGroupProps) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-lg font-black text-slate-600 ml-3 block tracking-tight">{label}</label>
      <div className="flex gap-2 items-stretch w-full">
        {/* min-w-0 คือคีย์หลักที่ทำให้ช่อง Input หดตัวได้ไม่ล้นขอบ */}
        <input 
          type={type} value={value} onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          className="flex-1 min-w-0 p-5 bg-slate-50 border-4 border-slate-100 rounded-[1.8rem] font-black text-xl text-slate-800 outline-none focus:bg-white focus:border-red-500 transition-all shadow-inner placeholder:text-slate-300" 
        />
        {onScanClick && (
          <button 
            onClick={onScanClick} 
            className="w-[85px] flex-shrink-0 bg-black text-white rounded-[1.8rem] shadow-xl flex flex-col items-center justify-center active:scale-90 transition-all border-b-8 border-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
               <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 17v2a2 2 0 0 0 2 2h2"/><line x1="8" y1="12" x2="16" y2="12" stroke="#ef4444" strokeWidth="4"></line>
            </svg>
            <span className="text-[10px] mt-1 font-black uppercase text-white">สแกน</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoUpload({ label, photo, onPhotoChange }: PhotoUploadProps) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-lg font-black text-slate-600 ml-3 block tracking-tight">{label}</label>
      <label className="flex flex-col items-center justify-center w-full h-36 border-4 border-dashed border-slate-200 rounded-[2.5rem] cursor-pointer bg-slate-50 hover:bg-white active:bg-blue-50 transition-all shadow-sm">
        <div className="flex flex-col items-center text-center px-4">
          <span className="text-5xl mb-1">{photo ? "✅" : "📸"}</span>
          <span className="text-sm font-black text-slate-400 uppercase tracking-tight truncate max-w-full">
            {photo ? "บันทึกรูปแล้ว" : "ถ่ายรูปมิเตอร์"}
          </span>
        </div>
        <input 
          type="file" accept="image/*" capture="environment" className="hidden" 
          onChange={(e) => onPhotoChange(e.target.files ? e.target.files[0] : null)} 
        />
      </label>
    </div>
  );
}