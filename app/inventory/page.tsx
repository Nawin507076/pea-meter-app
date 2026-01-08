"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function AddInventory() {
  const router = useRouter();
  const [staffName, setStaffName] = useState("");
  const [peaList, setPeaList] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ฟังก์ชันเพิ่มเลข (ใช้ทั้งพิมพ์มือ และ สแกน)
  const addPea = (code: string) => {
    if (!code.trim()) return; // ถ้าว่างไม่ต้องเพิ่ม
    if (peaList.length >= 10) {
      alert("บันทึกได้สูงสุดครั้งละ 10 เครื่องครับ");
      setIsScanning(false);
      return;
    }

    const cleanCode = code.trim().replace(/[^0-9]/g, "");
    if (cleanCode) {
      if (peaList.includes(cleanCode)) {
        alert("เลขนี้ถูกเพิ่มไปแล้วครับ");
      } else {
        setPeaList([...peaList, cleanCode]);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }
    setCurrentInput(""); // ล้างช่องพิมพ์หลังเพิ่มสำเร็จ
  };

  // ระบบสแกนเนอร์
  useEffect(() => {
    let reader: BrowserMultiFormatReader | null = null;
    if (isScanning && videoRef.current) {
      reader = new BrowserMultiFormatReader();
      reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result) => {
        if (result) {
          addPea(result.getText());
          setIsScanning(false); 
        }
      });
    }
    return () => reader?.reset();
  }, [isScanning]);

  const handleSubmit = async () => {
    if (!staffName || peaList.length === 0) return alert("กรุณาระบุชื่อคนเบิกและระบุมิเตอร์อย่างน้อย 1 เครื่อง");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: peaList, staffName }),
      });
      if (res.ok) {
        alert("บันทึกรายการเบิกสำเร็จ ✅");
        router.push("/");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-black text-blue-700 tracking-tight">📦 เบิกมิเตอร์ใหม่</h1>
        
        {/* ชื่อคนเบิก */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl space-y-4">
          <label className="block text-sm font-bold text-slate-500 ml-2">ชื่อพนักงานที่เบิก</label>
          <input 
            value={staffName} onChange={(e) => setStaffName(e.target.value)}
            placeholder="ระบุชื่อผู้เบิก..."
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ส่วนป้อนเลข PEA (พิมพ์มือ + สแกน) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl space-y-4">
          <div className="flex justify-between items-center ml-2">
             <label className="text-sm font-bold text-slate-500">เลข PEA ({peaList.length}/10)</label>
          </div>
          
          <div className="space-y-3">
            {/* ช่องพิมพ์มือ */}
            <div className="flex gap-2">
              <input 
                value={currentInput} 
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPea(currentInput); } }}
                placeholder="พิมพ์เลขมิเตอร์..."
                type="number"
                className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:bg-white"
              />
              <button 
                onClick={() => addPea(currentInput)}
                className="px-6 bg-blue-100 text-blue-700 rounded-2xl font-bold active:scale-95"
              >
                เพิ่ม
              </button>
            </div>

            {/* ปุ่มสแกน (แยกออกมาให้กดง่ายๆ) */}
            <button 
              onClick={() => setIsScanning(true)} 
              disabled={peaList.length >= 10}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${peaList.length >= 10 ? 'bg-slate-200 text-slate-400' : 'bg-black text-white active:scale-95'}`}
            >
              📸 เปิดกล้องสแกนบาร์โค้ด
            </button>
          </div>

          {/* รายการที่คีย์เข้าไปแล้ว */}
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pt-2 border-t border-slate-50">
            {peaList.length === 0 && <p className="text-center text-slate-300 py-4 text-sm font-bold italic">ยังไม่มีรายการที่เพิ่ม</p>}
            {peaList.map((pea, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold animate-in slide-in-from-right-5">
                <span>{index + 1}. {pea}</span>
                <button onClick={() => setPeaList(peaList.filter((_, i) => i !== index))} className="w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-full shadow-sm">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* ปุ่มบันทึกส่งไป Google Sheet */}
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || peaList.length === 0}
          className={`w-full py-6 rounded-[2rem] text-xl font-black shadow-lg transition-all ${isSubmitting || peaList.length === 0 ? 'bg-slate-300 text-white shadow-none' : 'bg-blue-600 text-white shadow-blue-200 active:scale-95'}`}
        >
          {isSubmitting ? "กำลังบันทึก..." : `💾 บันทึก ${peaList.length} เครื่องลงระบบ`}
        </button>
      </div>

      {/* 🔴 Scanner UI (เส้นแดงเหมือนเดิม) */}
      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full h-full">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="relative w-72 h-48 border-2 border-white/30 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-8 border-l-8 border-white rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-8 border-r-8 border-white rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-8 border-l-8 border-white rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-8 border-r-8 border-white rounded-br-2xl"></div>
                <div className="absolute left-0 w-full h-[6px] bg-red-600 shadow-[0_0_20px_2px_#dc2626] animate-scan-line-bold"></div>
                <div className="w-[95%] h-[2px] bg-red-400/60 shadow-[0_0_8px_#ef4444]"></div>
              </div>
            </div>
            <div className="absolute bottom-10 w-full px-10">
              <button onClick={() => setIsScanning(false)} className="w-full py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white text-2xl font-black rounded-3xl">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan-line-bold { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
        .animate-scan-line-bold { position: absolute; animation: scan-line-bold 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}