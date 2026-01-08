"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DispatchPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/form");
    }, 6000); // 5 วินาที animation

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-200">
      {/* เสาไฟฟ้า */}
      <div className="absolute inset-0 flex justify-around items-end pb-32 opacity-40">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-3 h-96 bg-slate-700 relative">
            <div className="absolute top-16 -left-6 w-16 h-1 bg-slate-700" />
            <div className="absolute top-32 -left-6 w-16 h-1 bg-slate-700" />
            <div className="absolute top-48 -left-6 w-16 h-1 bg-slate-700" />
            <div className="absolute top-16 -left-2 w-2 h-2 bg-orange-400 rounded-full" />
            <div className="absolute top-32 -left-2 w-2 h-2 bg-orange-400 rounded-full" />
            <div className="absolute top-48 -left-2 w-2 h-2 bg-orange-400 rounded-full" />
          </div>
        ))}
      </div>

      {/* ถนน */}
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gray-700" />
      <div className="absolute bottom-14 left-0 w-full border-t-4 border-dashed border-gray-300" />

      {/* รถกระเช้า */}
      <div className="absolute bottom-1 animate-drive">
        <img src="/images/truck2.png" alt="รถกระเช้า" className="h-96" />
      </div>

      {/* ข้อความ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-24 text-center">
        <p className="text-base font-medium text-slate-800">
          กำลังออกปฏิบัติงาน...
        </p>
        <p className="text-xs text-slate-600 mt-1">กรุณารอสักครู่…</p>
      </div>

      <style jsx>{`
        @keyframes drive {
          from { transform: translateX(-150%); }
          to { transform: translateX(120vw); }
        }
        .animate-drive {
          animation: drive 7s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
