"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";

// --- 1. Interfaces ---
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

  // --- 2. State Initializer (แก้ปัญหา Cascading Renders) ---
  const [workerInfo] = useState<WorkerInfo | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("worker_info");
      return stored ? (JSON.parse(stored) as WorkerInfo) : null;
    }
    return null;
  });

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

  // --- 3. ⚡ สุดยอดระบบสแกนความแม่นยำสูง (ZXing High-Res) ---
  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;

    if (scanning.active && videoRef.current) {
      const hints = new Map();
      // ระบุ Format ให้ชัดเจนเพื่อความเร็วและความแม่นยำ
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true); // สแกนละเอียดทุกเฟรมภาพ

      codeReader = new BrowserMultiFormatReader(hints);
      
      // บังคับความละเอียดสูงเพื่อให้เส้นบาร์โค้ดชัดเจน
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      codeReader.decodeFromConstraints(constraints, videoRef.current, (result) => {
        if (result) {
          const text = result.getText().replace(/[^0-9]/g, ""); // กรองเอาเฉพาะเลข
          
          if (scanning.target === "old") setPeaOld(text);
          else setPeaNew(text);

          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // สั่นเมื่อเจอ
          setScanning(prev => ({ ...prev, active: false }));
        }
      });
    }

    return () => { if (codeReader) codeReader.reset(); };
  }, [scanning.active, scanning.target]);

  // --- 4. Handlers ---
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
      alert("บันทึกเรียบร้อย ✅");
      router.push("/");
      setIsSubmitting(false);
    }, 1500);
  };

  if (!workerInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans text-gray-900">
      
      {/* 🔴 High-Precision Scanner UI */}
      {scanning.active && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          <div className="relative w-full h-[70vh]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* กรอบสแกนบาร์โค้ดแนวนอน (Barcode Focus) */}
              <div className="w-[85%] h-36 border-2 border-white/30 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                {/* Laser Line */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-red-600 shadow-[0_0_20px_#dc2626] animate-scan-line"></div>
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-8 border-l-8 border-white rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-8 border-r-8 border-white rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-8 border-l-8 border-white rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-8 border-r-8 border-white rounded-br-2xl"></div>
              </div>
            </div>
          </div>
          <button onClick={() => setScanning(p => ({ ...p, active: false }))} className="mt-8 px-16 py-5 bg-white text-black font-black rounded-3xl active:scale-95 transition-all">ยกเลิก</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm p-4 px-6 flex justify-between items-center font-black">
        <div className="flex flex-col"><span className="text-gray-400 text-[10px] uppercase">เจ้าหน้าที่</span><span className="text-blue-600 tracking-tighter">{workerInfo.worker}</span></div>
        <div className="text-right flex flex-col"><span className="text-gray-400 text-[10px] uppercase">ลักษณะงาน</span><span className="text-gray-800 tracking-tighter">{workerInfo.jobType === "incident" ? "แก้ไฟ" : "บริการ"}</span></div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 space-y-8 border border-white">
          <h2 className="text-2xl font-black text-center text-slate-800 tracking-tight">
            {step === 1 ? "📌 มิเตอร์เก่า" : step === 2 ? "📌 มิเตอร์ใหม่" : "📌 สรุปพิกัดงาน"}
          </h2>

          <div className="space-y-6">
            {step === 1 && (
              <>
                <InputGroup label="เลข PEA เก่า" value={peaOld} onChange={setPeaOld} placeholder="สแกน..." onScanClick={() => setScanning({ active: true, target: "old" })} />
                <InputGroup label="หน่วยล่าสุด" value={oldUnit} onChange={setOldUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายรูปมิเตอร์เก่า" photo={photoOld} onPhotoChange={setPhotoOld} />
              </>
            )}
            {step === 2 && (
              <>
                <InputGroup label="เลข PEA ใหม่" value={peaNew} onChange={setPeaNew} placeholder="สแกน..." onScanClick={() => setScanning({ active: true, target: "new" })} />
                <InputGroup label="หน่วยเริ่มต้น" value={newUnit} onChange={setNewUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายรูปมิเตอร์ใหม่" photo={photoNew} onPhotoChange={setPhotoNew} />
              </>
            )}
            {step === 3 && (
              <div className="space-y-6">
                <button onClick={getCurrentLocation} className="w-full py-5 bg-blue-50 text-blue-700 rounded-3xl border-2 border-blue-100 font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm">
                   📍 {isLocating ? "กำลังดึงพิกัด..." : location.lat ? "เช็คอิน GPS แล้ว" : "กดเช็คอินพิกัด GPS"}
                </button>
                <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase ml-2">สาเหตุการเปลี่ยน</label>
                  <select value={remark || "อื่นๆ"} onChange={(e) => setRemark(e.target.value === "อื่นๆ" ? "" : e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 outline-none appearance-none">
                    {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8 px-2 pb-10">
          <button onClick={handleBack} className="py-5 bg-white border-2 border-gray-100 rounded-3xl font-black text-gray-400 active:scale-95">ย้อนกลับ</button>
          {step < 3 ? (
            <button onClick={handleNext} className="py-5 bg-blue-600 text-white rounded-3xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all">ถัดไป</button>
          ) : (
            <button onClick={handleSave} disabled={isSubmitting} className="py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all">บันทึกงาน</button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-scan-line { animation: scan-line 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// --- 5. Sub-components (ธีม ขาว-ดำ-แดง) ---

function InputGroup({ label, value, onChange, placeholder, type = "text", onScanClick }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{label}</label>
      <div className="flex gap-2 items-center">
        <input 
          type={type} value={value} onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:bg-white focus:border-red-500 transition-all opacity-100 shadow-inner" 
        />
        {onScanClick && (
          <button 
            onClick={onScanClick} 
            className="h-[68px] min-w-[85px] bg-black text-white rounded-2xl shadow-xl flex flex-col items-center justify-center active:scale-90 transition-all border-b-4 border-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
               <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 17v2a2 2 0 0 0 2 2h2"/><line x1="8" y1="12" x2="16" y2="12" stroke="#ef4444" strokeWidth="3"></line>
            </svg>
            <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">สแกน</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoUpload({ label, photo, onPhotoChange }: PhotoUploadProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{label}</label>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer bg-slate-50/50 hover:bg-white active:bg-blue-50 transition-all shadow-sm">
        <span className="text-3xl mb-1">{photo ? "✅" : "📷"}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{photo ? "จัดเก็บรูปแล้ว" : "ถ่ายรูปมิเตอร์"}</span>
        <input 
          type="file" accept="image/*" capture="environment" className="hidden" 
          onChange={(e) => onPhotoChange(e.target.files ? e.target.files[0] : null)} 
        />
      </label>
    </div>
  );
}