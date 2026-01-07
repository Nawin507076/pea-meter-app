// "use client";
// import { useState } from "react";

// export default function MeterForm({ workerInfo }: any) {
//   const [peaOld, setPeaOld] = useState("");
//   const [peaNew, setPeaNew] = useState("");
//   const [oldUnit, setOldUnit] = useState("");
//   const [newUnit, setNewUnit] = useState("");
//   const [barcode, setBarcode] = useState("");
//   const [remark, setRemark] = useState("");

//   const handleSubmit = async () => {
//     const res = await fetch("/api/saveMeter", {
//       method: "POST",
//       body: JSON.stringify({
//         worker_id: workerInfo.worker_id,
//         worker_name: `เจ้าหน้าที่ ${workerInfo.worker_id}`,
//         job_type: workerInfo.job_type,
//         pea_old: peaOld,
//         pea_new: peaNew,
//         meter_old_unit: oldUnit,
//         meter_new_unit: newUnit,
//         barcode_value: barcode,
//         remark,
//       }),
//       headers: { "Content-Type": "application/json" },
//     });

//     if (res.ok) {
//       alert("บันทึกเรียบร้อยแล้ว");
//       setPeaOld(""); setPeaNew(""); setOldUnit(""); setNewUnit(""); setBarcode(""); setRemark("");
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <input type="text" placeholder="เลข PEA มิเตอร์เก่า" value={peaOld} onChange={e => setPeaOld(e.target.value)} className="border p-2 rounded w-full" />
//       <input type="text" placeholder="เลข PEA มิเตอร์ใหม่" value={peaNew} onChange={e => setPeaNew(e.target.value)} className="border p-2 rounded w-full" />
//       <input type="number" placeholder="หน่วยมิเตอร์เก่า" value={oldUnit} onChange={e => setOldUnit(e.target.value)} className="border p-2 rounded w-full" />
//       <input type="number" placeholder="หน่วยมิเตอร์ใหม่" value={newUnit} onChange={e => setNewUnit(e.target.value)} className="border p-2 rounded w-full" />
//       <input type="text" placeholder="Barcode" value={barcode} onChange={e => setBarcode(e.target.value)} className="border p-2 rounded w-full" />
//       <input type="text" placeholder="หมายเหตุ (optional)" value={remark} onChange={e => setRemark(e.target.value)} className="border p-2 rounded w-full" />

//       <button onClick={handleSubmit} className="w-full bg-purple-500 text-white p-3 rounded">บันทึก</button>
//     </div>
//   );
// }
