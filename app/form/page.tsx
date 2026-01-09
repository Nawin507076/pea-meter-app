"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, Result } from "@zxing/library";

// --- 1. Interfaces & Types ---
type WorkerInfo = { 
  worker: string; 
  jobType: "incident" | "service" 
};

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

interface SaveResponse {
  success: boolean;
  error?: string;
}

export default function MultiStepMeterForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [workerInfo] = useState<WorkerInfo | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("worker_info");
      try {
        return stored ? (JSON.parse(stored) as WorkerInfo) : null;
      } catch {
        return null;
      }
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
  const [location, setLocation] = useState({ lat: "", lng: "" });
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [scanning, setScanning] = useState<{ active: boolean; target: "old" | "new" }>({ 
    active: false, 
    target: "old" 
  });

  const remarkOptions: string[] = ["ไหม้ทั้งเครื่อง", "ที่ต่อสายไหม้", "น้ำเข้า", "ใช้ไฟเกิน(ct ไหม้)", "อื่นๆ"];

  // --- 2. ฟังก์ชันบีบอัดรูปภาพ ---
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas context is null"));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Blob conversion failed"));
          }, "image/jpeg", 0.7);
        };
      };
      reader.onerror = (e) => reject(e);
    });
  };

  useEffect(() => {
    if (!workerInfo) { router.push("/"); }
  }, [workerInfo, router]);

  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;
    if (scanning.active && videoRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      codeReader = new BrowserMultiFormatReader(hints);
      codeReader.decodeFromConstraints(
        { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } }, 
        videoRef.current, 
        (result: Result | null) => {
          if (result) {
            const text = result.getText().replace(/[^0-9]/g, "");
            if (scanning.target === "old") setPeaOld(text);
            else setPeaNew(text);
            if (navigator.vibrate) navigator.vibrate(100);
            setScanning(prev => ({ ...prev, active: false }));
          }
        }
      );
    }
    return () => { if (codeReader) codeReader.reset(); };
  }, [scanning.active, scanning.target]);

const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return alert("ไม่รองรับ GPS");
    
    setIsLocating(true);

    // ตั้งค่าความแม่นยำสูง
    const gpsOptions: PositionOptions = {
      enableHighAccuracy: true, 
      timeout: 15000,           
      maximumAge: 0            
    };

    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude.toString();
        const lng = pos.coords.longitude.toString();
        
        setLocation({ lat, lng });
        setIsLocating(false);

        // แสดง Alert แจ้งเตือนเมื่อสำเร็จ
        alert(`📍 ดึงพิกัดสำเร็จ!\nละติจูด: ${lat}\nลองจิจูด: ${lng}`);
      }, 
      (err) => { 
        let errorMsg = "ดึงพิกัดไม่สำเร็จ";
        if (err.code === 1) errorMsg = "กรุณาเปิดสิทธิ์เข้าถึงตำแหน่ง (Permission Denied)";
        if (err.code === 2) errorMsg = "ไม่สามารถระบุตำแหน่งได้ (Position Unavailable)";
        if (err.code === 3) errorMsg = "ค้นหาพิกัดนานเกินไป (Timeout)";
        
        alert(`❌ ${errorMsg}`); 
        setIsLocating(false); 
      }, 
      gpsOptions
    );
  }, []);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => step === 1 ? router.push("/") : setStep(s => s - 1);

  const handleSave = async () => {
    if (!workerInfo || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("worker", workerInfo.worker);
      formData.append("jobType", workerInfo.jobType);
      formData.append("peaOld", peaOld);
      formData.append("oldUnit", oldUnit);
      formData.append("peaNew", peaNew);
      formData.append("newUnit", newUnit);
      formData.append("remark", remark);
      formData.append("lat", location.lat);
      formData.append("lng", location.lng);
      formData.append("timestamp", new Date().toLocaleString("th-TH"));

      if (photoOld) {
        const compOld = await compressImage(photoOld);
        formData.append("photoOld", compOld, "old.jpg");
      }
      if (photoNew) {
        const compNew = await compressImage(photoNew);
        formData.append("photoNew", compNew, "new.jpg");
      }

      const res = await fetch("/api/saveMeter", { method: "POST", body: formData });
      const result = (await res.json()) as SaveResponse;

      if (res.ok && result.success) {
        alert("บันทึกข้อมูลเรียบร้อย ✅");
        localStorage.removeItem("worker_info"); 
        router.push("/");
      } else {
        throw new Error(result.error || "บันทึกไม่สำเร็จ");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert("❌ ล้มเหลว: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workerInfo) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10 font-sans overflow-x-hidden">
      
      {/* 🔴 Scanner UI: ปรับเส้นแดงใหญ่ และมีเส้นเล็กตรงกลาง */}
      {scanning.active && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
          <div className="relative w-full h-full">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            
            {/* Overlay Layer */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              
              {/* กรอบเล็งขนาดใหญ่ */}
              <div className="relative w-72 h-48 border-2 border-white/30 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
                
                {/* มุมกรอบสีขาวหนา */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-8 border-l-8 border-white rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-8 border-r-8 border-white rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-8 border-l-8 border-white rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-8 border-r-8 border-white rounded-br-2xl"></div>

                {/* ⚡ เส้นเลเซอร์สีแดงใหญ่ (Animation) */}
                <div className="absolute left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_#dc2626] animate-scan-line-long"></div>

                {/* ⚡ เส้นเล็กตรงกลาง (จุดเล็งถาวร) */}
                <div className="w-[90%] h-[1px] bg-red-500/80 shadow-[0_0_5px_#ef4444]"></div>
              </div>

              <p className="mt-10 text-white font-black text-xl tracking-widest drop-shadow-lg">
                วางบาร์โค้ดในกรอบ
              </p>
            </div>

            {/* ปุ่มยกเลิก */}
            <div className="absolute bottom-10 w-full px-10">
              <button 
                onClick={() => setScanning(p => ({ ...p, active: false }))} 
                className="w-full py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white text-2xl font-black rounded-3xl active:scale-95 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-5 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="flex flex-col"><span className="text-slate-400 text-[14px] font-black uppercase tracking-widest">เจ้าหน้าที่</span><span className="text-blue-600 text-xl font-black tracking-tight">{workerInfo.worker}</span></div>
        <div className="text-right flex flex-col"><span className="text-slate-400 text-[14px] font-black uppercase tracking-widest">งาน</span><span className="text-slate-700 text-lg font-black tracking-tight">{workerInfo.jobType === "incident" ? "แก้ไฟ" : "บริการ"}</span></div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
        
        {/* --- Timeline Step Indicator --- */}
        <div className="flex items-center justify-between px-6 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step >= s ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-300 border-2 border-slate-100"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-500 ${step > s ? "bg-blue-600" : "bg-slate-100"}`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 space-y-10 border border-slate-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
             <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${(step / 3) * 100}%` }}
             ></div>
          </div>

          <h2 className="text-2xl font-black text-center text-[#334155] tracking-tight bg-[#f8fafc] py-4 rounded-3xl">
             📌 {step === 1 ? "ข้อมูลมิเตอร์เก่า" : step === 2 ? "ข้อมูลมิเตอร์ใหม่" : "พิกัดปฏิบัติงาน"}
          </h2>

          <div className="space-y-8">
            {step === 1 && (
              <>
                <InputGroup label="เลข PEA เก่า (ชำรุด)" value={peaOld} onChange={setPeaOld} onScanClick={() => setScanning({ active: true, target: "old" })} placeholder="สแกน..." />
                <InputGroup label="หน่วยล่าสุด (kWh)" value={oldUnit} onChange={setOldUnit} type="number" placeholder="0.00" />
                <PhotoUpload label="ถ่ายรูปมิเตอร์เก่า" photo={photoOld} onPhotoChange={setPhotoOld} />
              </>
            )}
            {step === 2 && (
              <>
                <InputGroup label="เลข PEA ใหม่ (ติดตั้ง)" value={peaNew} onChange={setPeaNew} onScanClick={() => setScanning({ active: true, target: "new" })} placeholder="สแกน..." />
                <InputGroup label="หน่วยเริ่มต้น (kWh)" value={newUnit} onChange={setNewUnit} type="number" placeholder="0.00" />
                <PhotoUpload label="ถ่ายรูปมิเตอร์ใหม่" photo={photoNew} onPhotoChange={setPhotoNew} />
              </>
            )}
            {step === 3 && (
              <div className="space-y-8">
                <button onClick={getCurrentLocation} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all">
                  📍 {location.lat ? "อัปเดตพิกัดแล้ว" : "เช็คอินพิกัด GPS"}
                </button>
                <div className="space-y-3">
                  <label className="text-lg font-black text-slate-700 ml-2 block">สาเหตุการเปลี่ยน</label>
                  <div className="relative">
                    <select value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full p-5 bg-[#f8fafc] border border-slate-100 rounded-[2rem] text-xl font-bold text-slate-800 appearance-none outline-none focus:border-blue-400 shadow-inner">
                      {remarkOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 mt-10 px-1 pb-12">
          <button onClick={handleBack} className="py-6 bg-white border border-slate-100 rounded-[2rem] text-xl font-bold text-slate-400 shadow-sm active:scale-95 transition-all">
            ย้อนกลับ
          </button>
          {step < 3 ? (
            <button onClick={handleNext} className="py-6 bg-blue-600 text-white rounded-[2rem] text-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">
              ถัดไป
            </button>
          ) : (
            <button onClick={handleSave} disabled={isSubmitting} className="py-6 bg-emerald-500 text-white rounded-[2rem] text-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all">
              {isSubmitting ? "รอ..." : "บันทึก"}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan-line-long {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan-line-long {
          position: absolute;
          animation: scan-line-long 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder, type = "text", onScanClick }: InputGroupProps) {
  return (
    <div className="space-y-3 w-full">
      <label className="text-lg font-bold text-[#475569] ml-2 block tracking-tight">{label}</label>
      <div className="relative flex items-center">
        <input 
          type={type} value={value} onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          className="w-full p-5 bg-[#f8fafc] border border-slate-100 rounded-[1.8rem] font-bold text-lg text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50/50 transition-all placeholder:text-slate-300 shadow-inner" 
        />
        {onScanClick && (
          <button 
            onClick={onScanClick} 
            className="absolute right-2 w-14 h-14 bg-black text-white rounded-full flex flex-col items-center justify-center active:scale-90 transition-all shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
               <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 17v2a2 2 0 0 0 2 2h2"/><line x1="8" y1="12" x2="16" y2="12" stroke="#ef4444" strokeWidth="4"></line>
            </svg>
            <span className="text-[8px] mt-0.5 font-black uppercase text-white">สแกน</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoUpload({ label, photo, onPhotoChange }: PhotoUploadProps) {
  return (
    <div className="space-y-3 w-full">
      <label className="text-lg font-bold text-[#475569] ml-2 block tracking-tight">{label}</label>
      <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-200 rounded-[2.5rem] cursor-pointer bg-[#f8fafc] hover:bg-white transition-all shadow-inner">
        <div className="flex flex-col items-center text-center px-4">
          <span className="text-5xl mb-2">{photo ? "✅" : "📸"}</span>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">
            {photo ? "จัดเก็บรูปภาพแล้ว" : "ถ่ายรูปมิเตอร์"}
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