"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import Link from "next/link";

export default function AddInventory() {
  const router = useRouter();
  
  const staffList = [
    "นายธีรภัทร์ ขาวหนูนา",
    "นายนภสินธุ์ เลาหสกุล",
    "นายราเชน เจี้ยนเซ่ง",
    "นายนาวิน แก้วล่อง",
    "นายเอนกพงศ์ บุญศิริ"
  ];

  const [staffName, setStaffName] = useState(staffList[0]);
  const [peaList, setPeaList] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ADMIN_PASSWORD = "1234";

  const addPea = (code: string) => {
    if (!code.trim()) return;
    if (peaList.length >= 10) {
      alert("บันทึกได้สูงสุดครั้งละ 10 เครื่องครับ");
      setIsScanning(false);
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode && cleanCode.length >= 9) {
      if (peaList.includes(cleanCode)) {
        alert("เลขนี้ถูกเพิ่มไปแล้วครับ");
      } else {
        setPeaList([...peaList, cleanCode]);
        if (typeof window !== "undefined" && navigator.vibrate) {
          navigator.vibrate(100);
        }
      }
    }
    setCurrentInput("");
  };

  // --- ส่วนการสแกนบาร์โค้ดที่ปรับปรุงใหม่ ---
  useEffect(() => {
    let codeReader: BrowserMultiFormatReader | null = null;

    if (isScanning && videoRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.PURE_BARCODE, false);

      codeReader = new BrowserMultiFormatReader(hints, 300);

      const videoConstraints: MediaTrackConstraints = {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      codeReader.decodeFromConstraints(
        { video: videoConstraints },
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText().replace(/\D/g, "");
            if (text.length >= 9) {
              addPea(text);
              setIsScanning(false); // ปิดกล้องหลังสแกนติด 1 เครื่อง (หรือจะเปิดค้างไว้ก็ได้ตามต้องการ)
            }
          }
        }
      ).catch((err) => {
        console.error("Camera access error:", err);
      });
    }

    return () => {
      if (codeReader) {
        codeReader.reset();
      }
    };
  }, [isScanning]);

  // --- ฟังก์ชันยืนยันรหัสผ่าน ---
  const verifyAdmin = () => {
    const confirmCheck = window.confirm("⚠️ กรุณาตรวจสอบหมายเลข PEA ให้ถูกต้องก่อนกดบันทึกข้อมูล\n\nกด 'ตกลง' หากตรวจสอบเรียบร้อยแล้ว");
    if (!confirmCheck) return false;

    const password = window.prompt("กรุณาใส่รหัสผ่านเจ้าหน้าที่คลังเพื่อบันทึกข้อมูล:");
    if (password === null) return false;
    if (password !== ADMIN_PASSWORD) {
      alert("❌ รหัสผ่านไม่ถูกต้อง!");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!staffName || peaList.length === 0) return alert("กรุณาระบุชื่อคนเบิกและระบุมิเตอร์อย่างน้อย 1 เครื่อง");
    if (!verifyAdmin()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: peaList, staffName, status: 'no' }),
      });
      if (res.ok) {
        alert("บันทึกรายการเบิกสำเร็จ ✅");
        router.push("/dashboard");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (peaList.length === 0) return alert("กรุณาระบุมิเตอร์อย่างน้อย 1 เครื่องเพื่อคืนคลัง");
    if (!verifyAdmin()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: peaList, staffName, status: 'pullback' }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("บันทึกรายการคืนคลังสำเร็จ ✅");
        router.push("/dashboard");
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการคืนคลัง");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="w-full max-w-md mb-4 relative flex items-center">
          <Link href="/dashboard" className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 text-red-600 font-black text-sm flex items-center gap-2 active:scale-95 transition-all">
            กลับ
          </Link>
          <h1 className="text-3xl font-black text-blue-700 tracking-tight ml-4">📦 จัดการมิเตอร์</h1>
        </div>
        
        {/* Staff Selection */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl space-y-4">
          <label className="block text-sm font-bold text-slate-500 ml-2">ชื่อพนักงาน</label>
          <div className="relative">
            <select 
              value={staffName} 
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white appearance-none cursor-pointer"
            >
              {staffList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">▼</div>
          </div>
        </div>

        {/* Input & Scan Section */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl space-y-4">
          <div className="flex justify-between items-center ml-2">
             <label className="text-sm font-bold text-slate-500">เลข PEA ({peaList.length}/10)</label>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input 
                value={currentInput} 
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPea(currentInput); } }}
                placeholder="พิมพ์เลขมิเตอร์..."
                type="number"
                className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black placeholder-slate-400 outline-none focus:bg-white appearance-none"
              />
              <button onClick={() => addPea(currentInput)} className="px-6 bg-blue-100 text-blue-700 rounded-2xl font-bold active:scale-95">เพิ่ม</button>
            </div>

            <button 
              onClick={() => setIsScanning(true)} 
              disabled={peaList.length >= 10}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${peaList.length >= 10 ? 'bg-slate-200 text-slate-400' : 'bg-black text-white active:scale-95'}`}
            >
              📸 เปิดกล้องสแกนบาร์โค้ด
            </button>
          </div>

          {/* List Display */}
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pt-2 border-t border-slate-50">
            {peaList.length === 0 && <p className="text-center text-slate-300 py-4 text-sm font-bold italic">ยังไม่มีรายการที่เพิ่ม</p>}
            {peaList.map((pea, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold">
                <span>{index + 1}. {pea}</span>
                <button onClick={() => setPeaList(peaList.filter((_, i) => i !== index))} className="w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-full shadow-sm">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || peaList.length === 0}
            className={`w-full py-5 rounded-[2rem] text-xl font-black shadow-lg transition-all ${isSubmitting || peaList.length === 0 ? 'bg-slate-300 text-white shadow-none' : 'bg-blue-600 text-white shadow-blue-200 active:scale-95'}`}
          >
            {isSubmitting ? "กำลังบันทึก..." : `💾 บันทึกเบิก (${peaList.length})`}
          </button>

          <button 
            onClick={handleReturn} 
            disabled={isSubmitting || peaList.length === 0}
            className={`w-full py-5 rounded-[2rem] text-xl font-black shadow-lg transition-all ${isSubmitting || peaList.length === 0 ? 'bg-slate-300 text-white shadow-none' : 'bg-orange-500 text-white shadow-orange-100 active:scale-95'}`}
          >
            {isSubmitting ? "กำลังบันทึก..." : `🔄 คืนคลัง (${peaList.length})`}
          </button>
        </div>
      </div>

      {/* 🔴 ปรับปรุง Scanner UI ใหม่ตามโค้ดตัวอย่าง */}
      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
          <div className="relative w-full h-full">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* กรอบเล็งแนวตั้ง */}
              <div className="relative w-56 h-80 border-2 border-white/20 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] flex items-center justify-center">
                
                {/* มุมกรอบ */}
                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-[10px] border-l-[10px] border-white rounded-tl-3xl"></div>
                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-[10px] border-r-[10px] border-white rounded-tr-3xl"></div>
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[10px] border-l-[10px] border-white rounded-bl-3xl"></div>
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[10px] border-r-[10px] border-white rounded-br-3xl"></div>

                {/* เส้นเลเซอร์วิ่งซ้าย-ขวา */}
                <div className="absolute top-0 w-1.5 h-full bg-red-600 shadow-[0_0_20px_#dc2626] animate-scan-line-vertical"></div>

                {/* เส้นกลาง */}
                <div className="h-[90%] w-[2px] bg-red-500/40 shadow-[0_0_8px_#ef4444]"></div>
              </div>

              <p className="mt-12 text-white font-black text-2xl tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,1)] text-center">
                สแกนบาร์โค้ดแนวตั้ง<br/>
                <span className="text-lg font-normal opacity-80">(เอียงมิเตอร์แนวนอน)</span>
              </p>
            </div>

            <div className="absolute bottom-10 w-full px-10">
              <button 
                onClick={() => setIsScanning(false)} 
                className="w-full py-6 bg-red-600/20 backdrop-blur-xl border-2 border-red-500/50 text-white text-2xl font-black rounded-3xl active:scale-95 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan-line-vertical {
          0% { left: 5%; opacity: 0.5; }
          50% { left: 95%; opacity: 1; }
          100% { left: 5%; opacity: 0.5; }
        }
        .animate-scan-line-vertical {
          position: absolute;
          animation: scan-line-vertical 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}