"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Tesseract from "tesseract.js";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  const [isProcessing, setIsProcessing] = useState(false);

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

  // --- OCR Scanner Logic ---
  useEffect(() => {
    if (scanning.active) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => alert("ไม่สามารถเข้าถึงกล้องได้: " + err));
    }
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [scanning.active]);

  const captureAndRead = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);

    const context = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);

    try {
      // ใช้ Tesseract อ่านเลขจากภาพ
      const result = await Tesseract.recognize(canvasRef.current, 'eng');
      const text = result.data.text;
      
      // กรองเอาเฉพาะตัวเลข (PEA ปกติมี 10 หลัก)
      const cleanedText = text.replace(/[^0-9]/g, "");
      const finalDigits = cleanedText.length > 10 ? cleanedText.substring(0, 10) : cleanedText;

      if (scanning.target === "old") setPeaOld(finalDigits);
      else setPeaNew(finalDigits);

      setScanning({ ...scanning, active: false });
    } catch (error) {
      alert("ไม่สามารถอ่านข้อมูลได้ โปรดถ่ายให้ชัดเจนขึ้น");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Form Navigation & Save ---
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return alert("มือถือไม่รองรับ GPS");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
      setIsLocating(false);
    }, () => {
      alert("ดึงพิกัดไม่สำเร็จ");
      setIsLocating(false);
    }, { enableHighAccuracy: true });
  };

  const handleNext = () => { setStep((prev) => Math.min(prev + 1, 3)); window.scrollTo(0, 0); };
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
      if (res.ok) { alert("บันทึกเรียบร้อย ✅"); router.push("/"); }
    } catch (error) { alert("ล้มเหลว ❌"); } finally { setIsSubmitting(false); }
  };

  if (!workerInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10 font-sans text-gray-900">
      {/* OCR Scanner Overlay */}
      {scanning.active && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-sm aspect-[4/3] bg-gray-900 rounded-[2rem] overflow-hidden border-4 border-blue-600 shadow-2xl">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
              <div className="w-full h-16 border-2 border-dashed border-yellow-400 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold tracking-wide">กำลังอ่านหมายเลข...</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-8 flex gap-4 w-full max-w-sm px-4">
            <button onClick={() => setScanning({ ...scanning, active: false })} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold backdrop-blur-md">ยกเลิก</button>
            <button onClick={captureAndRead} disabled={isProcessing} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/40 active:scale-95 transition-all">
              📷 กดถ่ายเพื่ออ่านเลข
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm p-4">
        <div className="max-w-md mx-auto flex justify-between items-center font-bold">
          <div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">เจ้าหน้าที่</span><span className="text-blue-700 leading-none mt-1">{workerInfo.worker}</span></div>
          <div className="text-right flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">งาน</span><span className="leading-none mt-1 text-gray-800">{workerInfo.jobType === "incident" ? "แก้ไฟ" : "บริการ"}</span></div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6">
        {/* Step Progress */}
        <div className="flex justify-between mb-8 px-8 relative">
          <div className="absolute top-4 left-10 right-10 h-[2px] bg-gray-200 -z-0" />
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 transition-all ${step >= s ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-300 border'}`}>{s}</div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl p-7 space-y-7 border border-white">
          <h2 className="text-xl font-black text-center text-slate-800">
            {step === 1 ? "📌 มิเตอร์เก่า (ชำรุด)" : step === 2 ? "📌 มิเตอร์ใหม่ (ติดตั้ง)" : "📌 สรุปพิกัดและสาเหตุ"}
          </h2>

          <div className="space-y-6">
            {step === 1 && (
              <>
                <InputGroup label="เลข PEA เก่า" value={peaOld} onChange={setPeaOld} placeholder="ถ่ายรูปสแกนเลข..." onScanClick={() => setScanning({ active: true, target: "old" })} />
                <InputGroup label="หน่วย (kWh)" value={oldUnit} onChange={setOldUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายภาพมิเตอร์เก่า" photo={photoOld} onPhotoChange={setPhotoOld} />
              </>
            )}
            {step === 2 && (
              <>
                <InputGroup label="เลข PEA ใหม่" value={peaNew} onChange={setPeaNew} placeholder="ถ่ายรูปสแกนเลข..." onScanClick={() => setScanning({ active: true, target: "new" })} />
                <InputGroup label="หน่วย (kWh)" value={newUnit} onChange={setNewUnit} placeholder="0.00" type="number" />
                <PhotoUpload label="ถ่ายภาพมิเตอร์ใหม่" photo={photoNew} onPhotoChange={setPhotoNew} />
              </>
            )}
            {step === 3 && (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-600 ml-1">พิกัดสถานที่ปฏิบัติงาน</label>
                  <button onClick={getCurrentLocation} disabled={isLocating} className="w-full p-5 bg-blue-50 text-blue-700 rounded-2xl border-2 border-blue-100 font-black active:scale-95 transition-all flex items-center justify-center gap-3">
                    📍 {isLocating ? "กำลังดึงพิกัด..." : location.lat ? "อัปเดตตำแหน่งแล้ว" : "กดเพื่อดึงพิกัด GPS"}
                  </button>
                  {location.lat && <p className="text-[10px] text-center font-mono text-slate-400">Lat: {location.lat} | Lng: {location.lng}</p>}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-600 ml-1">สาเหตุการเปลี่ยนมิเตอร์</label>
                  <select value={remark || "อื่นๆ"} onChange={(e) => setRemark(e.target.value === "อื่นๆ" ? "" : e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold appearance-none outline-none focus:border-blue-500 transition-all">
                    {remarkOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                  {!remark && <input type="text" placeholder="ระบุสาเหตุเพิ่มเติม..." value={customRemark} onChange={(e) => setCustomRemark(e.target.value)} className="w-full p-4 mt-2 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold bg-white outline-none focus:border-blue-500 transition-all opacity-100" />}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8 pb-10 px-2">
          <button onClick={handleBack} className="py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] font-bold text-slate-500 active:bg-slate-50 transition-all shadow-sm">
            {step === 1 ? "ยกเลิก" : "ย้อนกลับ"}
          </button>
          {step < 3 ? (
            <button onClick={handleNext} className="py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-200 active:bg-blue-700 active:scale-95 transition-all">ถัดไป</button>
          ) : (
            <button onClick={handleSave} disabled={isSubmitting} className={`py-5 rounded-[1.5rem] text-white font-black shadow-xl transition-all active:scale-95 ${isSubmitting ? 'bg-slate-300' : 'bg-emerald-600 shadow-emerald-200'}`}>
              {isSubmitting ? "กำลังบันทึก..." : "💾 บันทึกงาน"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components (Type-safe) ---
function InputGroup({ label, value, onChange, placeholder, type = "text", onScanClick }: InputGroupProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-bold text-slate-600 ml-1">{label}</label>
      <div className="flex gap-2">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold outline-none focus:bg-white focus:border-blue-500 transition-all opacity-100" />
        {onScanClick && (
          <button onClick={onScanClick} className="px-5 bg-blue-600 text-white rounded-2xl active:scale-90 transition-all shadow-lg shadow-blue-100 flex flex-col items-center justify-center min-w-[75px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="7" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="17" y2="7"/><line x1="17" y1="17" x2="17" y2="17"/><line x1="7" y1="17" x2="7" y2="17"/></svg>
            <span className="text-[10px] mt-1 font-black">สแกน</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoUpload({ label, photo, onPhotoChange }: { label: string; photo: File | null; onPhotoChange: (f: File | null) => void }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-bold text-slate-600 ml-1">{label}</label>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer bg-slate-50/50 hover:bg-slate-50 active:bg-blue-50 transition-all">
        <div className="flex flex-col items-center">
          <span className="text-4xl mb-1">{photo ? "📸" : "📷"}</span>
          <span className="text-xs font-bold text-slate-500">{photo ? `✅ ${photo.name.slice(0, 15)}...` : "แตะเพื่อถ่ายรูป"}</span>
        </div>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}