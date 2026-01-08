"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DispatchPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/form");
    }, 6000); // ปรับเป็น 6 วินาทีเพื่อให้ดูสายไฟเพลินๆ

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-300 to-sky-100">
      
      {/* สายไฟ (Power Lines) */}
      <div className="absolute top-[30%] left-0 w-full h-[150px] z-0 opacity-60">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* สายไฟ 3 เส้นพาดผ่านหน้าจอ */}
          {[10, 30, 50].map((y, i) => (
            <path
              key={i}
              d={`M -10 ${y + 20} Q 250 ${y + 60} 500 ${y + 20} T 1000 ${y + 20}`}
              fill="transparent"
              stroke="#334155"
              strokeWidth="1.5"
              className="animate-sway"
            />
          ))}
        </svg>
      </div>

      {/* ฉากหลัง: เสาไฟฟ้า */}
      <div className="absolute inset-0 flex justify-between items-end pb-32 px-4 z-10 pointer-events-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center relative transform scale-75 sm:scale-100">
            {/* คอนมิเตอร์/หม้อแปลง (ถ้าต้องการเพิ่ม) */}
            <div className="absolute -top-4 w-12 h-1 bg-slate-800 rounded-full" />
            
            {/* ตัวเสาไฟฟ้าคอนกรีต */}
            <div className="w-4 h-[50vh] bg-gradient-to-r from-slate-400 to-slate-500 shadow-inner">
              {/* คอนรับสายไฟ (Crossarms) */}
              <div className="absolute top-8 -left-8 w-20 h-2 bg-slate-800 rounded-sm shadow-md" />
              <div className="absolute top-20 -left-8 w-20 h-2 bg-slate-800 rounded-sm shadow-md" />
              
              {/* ลูกรอกเซรามิก (Insulators) */}
              <div className="absolute top-4 -left-6 w-3 h-4 bg-slate-200 rounded-t-sm border-b-2 border-slate-600" />
              <div className="absolute top-4 left-6 w-3 h-4 bg-slate-200 rounded-t-sm border-b-2 border-slate-600" />
              <div className="absolute top-16 -left-6 w-3 h-4 bg-slate-200 rounded-t-sm border-b-2 border-slate-600" />
              <div className="absolute top-16 left-6 w-3 h-4 bg-slate-200 rounded-t-sm border-b-2 border-slate-600" />
            </div>
          </div>
        ))}
      </div>

      {/* ถนน (Responsive Height) */}
      <div className="absolute bottom-0 left-0 w-full h-32 sm:h-40 bg-slate-800 shadow-[inset_0_10px_20px_rgba(0,0,0,0.3)]">
        <div className="absolute top-1/2 left-0 w-full border-t-4 border-dashed border-slate-400/50" />
        <div className="absolute bottom-0 w-full h-2 bg-slate-900" />
      </div>

      {/* รถกระเช้า (Responsive Size) */}
      <div className="absolute bottom-4 sm:bottom-6 animate-drive z-20">
        <div className="relative group">
          <img 
            src="/images/truck2.png" 
            alt="รถกระเช้า" 
            className="h-48 sm:h-64 md:h-80 object-contain drop-shadow-2xl" 
          />
          {/* เอฟเฟกต์เงารถบนถนน */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/20 blur-xl rounded-full" />
        </div>
      </div>

      {/* ข้อความ Loading */}
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-full text-center z-30">
        <div className="bg-white/80 backdrop-blur-md py-3 px-6 rounded-full inline-block shadow-lg border border-white">
          <p className="text-lg font-bold text-slate-800 animate-pulse">
             กำลังเดินทาง...
          </p>
          <div className="flex justify-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes drive {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120vw); }
        }
        @keyframes sway {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
        .animate-drive {
          animation: drive 6s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards;
        }
        .animate-sway {
          animation: sway 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}