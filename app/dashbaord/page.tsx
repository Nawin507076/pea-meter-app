"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapPin,
  Search,
  Filter,
  Calendar,
  User,
  Zap,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  LayoutDashboard,
  Timer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2, // New icon for Normal
  Download
} from "lucide-react";
import * as XLSX from "xlsx";

interface MeterData {
  _id: string;
  worker: string;
  jobType: string;
  meterIdOld: string;
  readingOld: number;
  meterIdNew: string;
  readingNew: number;
  remark: string;
  photoOldUrl?: string;
  photoNewUrl?: string;
  location: { lat: string; lng: string };
  recordedAt: string;
  status?: string;
}

export default function Dashboard() {
  const [data, setData] = useState<MeterData[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterWorker, setFilterWorker] = useState("");
  const [filterOldId, setFilterOldId] = useState("");
  const [filterNewId, setFilterNewId] = useState("");
  const [filterRemark, setFilterRemark] = useState("");
  const [filterJobType, setFilterJobType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all, onsite, done

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // UI State
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);

  useEffect(() => {
    fetch("/api/mongo/get-meters")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
        setLoading(false);
      });
  }, []);

  // Calculate Stats based on Job Type
  const stats = useMemo(() => {
    // 1. Filter by Job Type first
    const dataByJob = data.filter(d => filterJobType === "all" || d.jobType === filterJobType);

    // 2. Count statuses from the filtered set
    const total = dataByJob.length;
    // Onsite: Status is empty AND meterIdNew is NOT empty (meaning a meter was swapped)
    const onsite = dataByJob.filter(d => (!d.status || d.status === "") && d.meterIdNew && d.meterIdNew !== "").length;
    const done = dataByJob.filter(d => d.status === "done").length;

    // Count "Normal/Other" (remark starts with "ปกติ" OR is "อื่นๆ") AND no new meter (meterIdNew is empty)
    const normalOther = dataByJob.filter(d =>
      ((d.remark && d.remark.startsWith("ปกติ")) || d.remark === "อื่นๆ") && (!d.meterIdNew || d.meterIdNew === "")
    ).length;

    return { total, onsite, done, normalOther };
  }, [data, filterJobType]);

  // Unique Remarks for Dropdown
  const uniqueRemarks = useMemo(() => {
    const remarks = data.map(d => {
      // Normalize "ปกติ..." to just "ปกติ"
      if (d.remark && d.remark.startsWith("ปกติ")) return "ปกติ";
      return d.remark;
    }).filter(Boolean);
    return Array.from(new Set(remarks)).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchWorker = item.worker.toLowerCase().includes(filterWorker.toLowerCase());
      const matchOldId = item.meterIdOld.includes(filterOldId);
      const matchNewId = item.meterIdNew.includes(filterNewId);
      const matchRemark = (item.remark || "").toLowerCase().includes(filterRemark.toLowerCase());
      const matchJobType = filterJobType === "all" || item.jobType === filterJobType;

      let matchStatus = true;
      if (filterStatus === "onsite") {
        matchStatus = (!item.status || item.status === "") && (!!item.meterIdNew && item.meterIdNew !== "");
      }
      if (filterStatus === "done") matchStatus = item.status === "done";
      if (filterStatus === "normal_other") {
        matchStatus = ((item.remark && item.remark.startsWith("ปกติ")) || item.remark === "อื่นๆ") && (!item.meterIdNew || item.meterIdNew === "");
      }

      let matchDate = true;
      if (filterStartDate || filterEndDate) {
        if (item.recordedAt) {
          let itemDate: Date | null = null;
          if (item.recordedAt.includes("T") || item.recordedAt.includes("-")) {
            itemDate = new Date(item.recordedAt);
          } else {
            const parts = item.recordedAt.split(" ")[0].split("/");
            if (parts.length === 3) {
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              let y = parseInt(parts[2], 10);
              if (y > 2500) y -= 543;
              itemDate = new Date(y, m, d);
            }
          }

          if (itemDate && !isNaN(itemDate.getTime())) {
            if (filterStartDate) {
              const start = new Date(filterStartDate);
              start.setHours(0, 0, 0, 0);
              if (itemDate < start) matchDate = false;
            }
            if (filterEndDate) {
              const end = new Date(filterEndDate);
              end.setHours(23, 59, 59, 999);
              if (itemDate > end) matchDate = false;
            }
          }
        }
      }

      return matchWorker && matchOldId && matchNewId && matchRemark && matchJobType && matchStatus && matchDate;
    });
  }, [data, filterWorker, filterOldId, filterNewId, filterRemark, filterJobType, filterStatus, filterStartDate, filterEndDate]);

  // Calculate Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Export to Excel function
  const handleExportExcel = () => {
    const exportData = filteredData.map((item, index) => ({
      "ลำดับ": index + 1,
      "เวลาบันทึก": item.recordedAt,
      "พนักงาน": item.worker,
      "ประเภทงาน": item.jobType === "incident" ? "แก้ไฟ" : "บริการ",
      "สาเหตุ/หมายเหตุ": item.remark || "-",
      "มิเตอร์เก่า": item.meterIdOld,
      "หน่วยเก่า": item.readingOld,
      "มิเตอร์ใหม่": item.meterIdNew,
      "หน่วยใหม่": item.readingNew,
      "ละติจูด": item.location?.lat || "",
      "ลองจิจูด": item.location?.lng || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // ตั้งชื่อไฟล์ตามเวลาที่ถูกโหลดออกมา + จำนวนเรคคอร์ด
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `PEA_Meter_Report_${dateStr}_(${filteredData.length}_records).xlsx`);
  };

  // Reset page when filter changes - REMOVED useEffect to avoid cascading renders
  // Instead, we will reset page in the event handlers directly.

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F0FF]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E0D4FC] border-t-[#742D9D]"></div>
        <p className="text-[#742D9D] font-bold animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F0FF] font-sans selection:bg-[#742D9D] selection:text-white">
      {/* Update: Navbar / Top Decoration */}
      <div className="h-2 bg-gradient-to-r from-[#5B1E7A] via-[#742D9D] to-[#9C4DCC]"></div>

      <div className="max-w-[1800px] mx-auto p-6 md:p-10">

        {/* Header Section */}
        <div className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#E0D4FC]">
                <LayoutDashboard className="w-8 h-8 text-[#742D9D]" />
              </div>
              <h1 className="text-4xl font-black text-[#3A0ca3] tracking-tight">
                PEA Meter Dashboard
              </h1>
            </div>
            <p className="text-slate-600 text-lg font-medium pl-1">
              ระบบติดตามและตรวจสอบการสับเปลี่ยนมิเตอร์อัจฉริยะ
            </p>
          </div>

          {/* Job Type Selector */}
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-[#E0D4FC]">
            {[
              { label: "ทั้งหมด", v: "all", icon: LayoutDashboard },
              { label: "แก้ไฟ", v: "incident", icon: Zap },
              { label: "บริการ", v: "service", icon: User }
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => {
                  setFilterJobType(t.v);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${filterJobType === t.v
                  ? "bg-[#742D9D] text-white shadow-md shadow-purple-200 transform scale-105"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#742D9D]"
                  }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards / Summary Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

          {/* Total */}
          <button
            onClick={() => {
              setFilterStatus("all");
              setCurrentPage(1);
            }}
            className={`text-left relative overflow-hidden group p-6 rounded-3xl transition-all duration-300 border-2 ${filterStatus === "all"
              ? "bg-gradient-to-br from-[#742D9D] to-[#5B1E7A] text-white shadow-xl shadow-purple-200 border-transparent transform scale-[1.02]"
              : "bg-white text-slate-700 hover:border-[#E0D4FC] hover:shadow-lg border-transparent"
              }`}
          >
            <div className="relative z-10">
              <p className={`text-sm font-bold mb-1 ${filterStatus === "all" ? "text-purple-200" : "text-slate-400"}`}>งานทั้งหมด</p>
              <h3 className="text-4xl font-black mb-2">{stats.total}</h3>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 ${filterStatus === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                <FileText className="w-3 h-3" /> รายการ
              </div>
            </div>
            {/* BG Icon */}
            <FileText className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.08] transform rotate-12 group-hover:scale-110 transition-transform ${filterStatus === "all" ? "text-white" : "text-[#742D9D]"}`} />
          </button>

          {/* Normal / Other */}
          <button
            onClick={() => {
              setFilterStatus("normal_other");
              setCurrentPage(1);
            }}
            className={`text-left relative overflow-hidden group p-6 rounded-3xl transition-all duration-300 border-2 ${filterStatus === "normal_other"
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-200 border-transparent transform scale-[1.02]"
              : "bg-white text-slate-700 hover:border-blue-100 hover:shadow-lg border-transparent"
              }`}
          >
            <div className="relative z-10">
              <p className={`text-sm font-bold mb-1 ${filterStatus === "normal_other" ? "text-blue-100" : "text-slate-400"}`}>ปกติ / อื่นๆ</p>
              <h3 className="text-4xl font-black mb-2">{stats.normalOther}</h3>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 ${filterStatus === "normal_other" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                <CheckCircle2 className="w-3 h-3" /> รายการ
              </div>
            </div>
            <CheckCircle2 className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.15] transform rotate-12 group-hover:scale-110 transition-transform ${filterStatus === "normal_other" ? "text-white" : "text-blue-500"}`} />
          </button>

          {/* On-site */}
          <button
            onClick={() => {
              setFilterStatus("onsite");
              setCurrentPage(1);
            }}
            className={`text-left relative overflow-hidden group p-6 rounded-3xl transition-all duration-300 border-2 ${filterStatus === "onsite"
              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-200 border-transparent transform scale-[1.02]"
              : "bg-white text-slate-700 hover:border-orange-100 hover:shadow-lg border-transparent"
              }`}
          >
            <div className="relative z-10">
              <p className={`text-sm font-bold mb-1 ${filterStatus === "onsite" ? "text-orange-100" : "text-slate-400"}`}>สับเปลี่ยนหน้างานแล้ว</p>
              <h3 className="text-4xl font-black mb-2">{stats.onsite}</h3>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 ${filterStatus === "onsite" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                <Timer className="w-3 h-3" /> รอดำเนินการ
              </div>
            </div>
            <Timer className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.15] transform rotate-12 group-hover:scale-110 transition-transform ${filterStatus === "onsite" ? "text-white" : "text-orange-500"}`} />
          </button>

          {/* Done */}
          <button
            onClick={() => {
              setFilterStatus("done");
              setCurrentPage(1);
            }}
            className={`text-left relative overflow-hidden group p-6 rounded-3xl transition-all duration-300 border-2 ${filterStatus === "done"
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-200 border-transparent transform scale-[1.02]"
              : "bg-white text-slate-700 hover:border-emerald-100 hover:shadow-lg border-transparent"
              }`}
          >
            <div className="relative z-10">
              <p className={`text-sm font-bold mb-1 ${filterStatus === "done" ? "text-emerald-100" : "text-slate-400"}`}>สับเปลี่ยนในระบบแล้ว</p>
              <h3 className="text-4xl font-black mb-2">{stats.done}</h3>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 ${filterStatus === "done" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                <Zap className="w-3 h-3" /> เสร็จสิ้น
              </div>
            </div>
            <Zap className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.15] transform rotate-12 group-hover:scale-110 transition-transform ${filterStatus === "done" ? "text-white" : "text-emerald-500"}`} />
          </button>

        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#E0D4FC] p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-[#742D9D]">
              <Filter className="w-5 h-5" />
              <h3 className="font-bold text-lg">ตัวกรองค้นหา</h3>
            </div>

            <button
              onClick={handleExportExcel}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Download className="w-5 h-5" />
              ส่งออก Excel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3 h-3" /> ช่างผู้ดำเนินการ
              </label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#742D9D] transition-colors w-5 h-5" />
                <input
                  type="text"
                  placeholder="สมาน..."
                  className="w-full bg-slate-50 p-3.5 pl-12 rounded-xl outline-none text-slate-700 font-bold border-2 border-transparent focus:bg-white focus:border-[#742D9D] transition-all shadow-sm"
                  value={filterWorker}
                  onChange={(e) => {
                    setFilterWorker(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Timer className="w-3 h-3" /> มิเตอร์เก่า
              </label>
              <input
                type="text"
                placeholder="ระบุเลข..."
                className="w-full bg-slate-50 p-3.5 px-5 rounded-xl outline-none text-slate-700 font-bold border-2 border-transparent focus:bg-white focus:border-red-500 transition-all shadow-sm"
                value={filterOldId}
                onChange={(e) => {
                  setFilterOldId(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Zap className="w-3 h-3" /> มิเตอร์ใหม่
              </label>
              <input
                type="text"
                placeholder="ระบุเลข..."
                className="w-full bg-slate-50 p-3.5 px-5 rounded-xl outline-none text-slate-700 font-bold border-2 border-transparent focus:bg-white focus:border-emerald-500 transition-all shadow-sm"
                value={filterNewId}
                onChange={(e) => {
                  setFilterNewId(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="space-y-2 relative" onBlur={(e) => {
              // Close dropdown when focus leaves the container
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsRemarkOpen(false);
              }
            }}>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3" /> สาเหตุ / หมายเหตุ
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เลือก หรือ พิมพ์ค้นหา..."
                  className="w-full bg-slate-50 p-3.5 px-5 pr-12 rounded-xl outline-none text-slate-700 font-bold border-2 border-transparent focus:bg-white focus:border-orange-500 transition-all shadow-sm"
                  value={filterRemark}
                  onChange={(e) => {
                    setFilterRemark(e.target.value);
                    setCurrentPage(1);
                    setIsRemarkOpen(true);
                  }}
                  onFocus={() => setIsRemarkOpen(true)}
                />
                <button
                  onClick={() => {
                    // If has text, clear it. If empty, toggle dropdown.
                    if (filterRemark) {
                      setFilterRemark("");
                      setCurrentPage(1);
                      setIsRemarkOpen(true); // Keep open to show full list
                    } else {
                      setIsRemarkOpen(!isRemarkOpen);
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-orange-500 transition-colors"
                >
                  {filterRemark ? (
                    // Show X if has text (Optional, but user said 'triangle' actions. I'll stick to 'triangle' that clears)
                    // Actually user said explicitly "click triangle to clear". 
                    // Let's keep it as ChevronDown but make it interactive.
                    <ChevronDown className={`w-5 h-5 transition-transform ${isRemarkOpen ? "rotate-180" : ""}`} />
                  ) : (
                    <ChevronDown className={`w-5 h-5 transition-transform ${isRemarkOpen ? "rotate-180" : ""}`} />
                  )}
                </button>
              </div>

              {/* Custom Dropdown Options */}
              {isRemarkOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                  {uniqueRemarks.filter(r => r.includes(filterRemark)).length > 0 ? (
                    uniqueRemarks.filter(r => r.includes(filterRemark)).map((remark, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFilterRemark(remark);
                          setCurrentPage(1);
                          setIsRemarkOpen(false);
                        }}
                        className="w-full text-left px-5 py-3 text-slate-600 font-bold hover:bg-orange-50 hover:text-orange-600 transition-colors border-b border-slate-50 last:border-0"
                      >
                        {remark}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
                  )}
                </div>
              )}
            </div>

            {/* Date Pickers */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> ตั้งแต่วันที่
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 p-3.5 px-5 rounded-xl outline-none text-slate-700 font-bold border-2 border-transparent focus:bg-white focus:border-[#742D9D] transition-all shadow-sm"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> ถึงวันที่
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 p-3.5 px-5 rounded-xl outline-none text-slate-700 font-bold border-2 border-transparent focus:bg-white focus:border-[#742D9D] transition-all shadow-sm"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-[#E0D4FC] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8F5FF] border-b border-[#E0D4FC]">
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-left">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> เวลาบันทึก</div>
                  </th>
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-left">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" /> พนักงาน</div>
                  </th>
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-left">ประเภทงาน</th>
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-left">สาเหตุ/หมายเหตุ</th>
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-center min-w-[200px]">มิเตอร์เก่า</th>
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-center min-w-[200px]">มิเตอร์ใหม่</th>
                  <th className="p-6 text-xs font-extrabold text-[#742D9D] uppercase tracking-wider text-center">พิกัด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6FF]">
                {paginatedData.map((item) => (
                  <tr key={item._id} className="hover:bg-[#FCFAFF] transition-colors group">
                    <td className="p-6 whitespace-nowrap text-sm font-bold text-slate-600">
                      {item.recordedAt}
                    </td>
                    <td className="p-6">
                      <div className="font-bold text-slate-900 text-lg">{item.worker}</div>
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${item.jobType === 'incident'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${item.jobType === 'incident' ? 'bg-orange-500' : 'bg-indigo-500'}`}></span>
                        {item.jobType === 'incident' ? 'แก้ไฟ' : 'บริการ'}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 inline-block min-w-[100px]">
                        {item.remark || "-"}
                      </div>
                    </td>

                    {/* มิเตอร์เก่า */}
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[14px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded mb-2 w-fit">PEA: {item.meterIdOld}</span>
                        <span className="text-[14px] font-black text-red-500 font-mono tracking-tight">หน่วย: {item.readingOld}</span>
                        {item.photoOldUrl && (
                          <div className="mt-3 relative group/img cursor-zoom-in">
                            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-200">
                              <img src={item.photoOldUrl} className="w-full h-full object-cover" alt="Old" />
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 opacity-0 pointer-events-none group-hover/img:opacity-100 group-hover/img:pointer-events-auto transition-all z-50 transform scale-95 group-hover/img:scale-100">
                              <img src={item.photoOldUrl} className="w-full rounded-xl shadow-2xl border-4 border-white" alt="Zoom Old" />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* มิเตอร์ใหม่ */}
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[14px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded mb-2 w-fit">PEA: {item.meterIdNew}</span>
                        <span className="text-[14px] font-black text-emerald-500 font-mono tracking-tight">หน่วย: {item.readingNew}</span>
                        {item.photoNewUrl && (
                          <div className="mt-3 relative group/img cursor-zoom-in">
                            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-200">
                              <img src={item.photoNewUrl} className="w-full h-full object-cover" alt="New" />
                            </div>
                            <div className="absolute top-full right-1/2 translate-x-1/2 mt-2 w-48 opacity-0 pointer-events-none group-hover/img:opacity-100 group-hover/img:pointer-events-auto transition-all z-50 transform scale-95 group-hover/img:scale-100">
                              <img src={item.photoNewUrl} className="w-full rounded-xl shadow-2xl border-4 border-white" alt="Zoom New" />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* แผนที่ */}
                    <td className="p-6 text-center">
                      <a href={`https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`} target="_blank" rel="noreferrer" className="inline-block group/map relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md group-hover/map:ring-4 ring-[#E0D4FC] transition-all">
                          <img src="https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/pass/GoogleMapTA.jpg" className="w-full h-full object-cover opacity-80 group-hover/map:opacity-100 transition-opacity" alt="Map" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover/map:bg-transparent">
                            <MapPin className="text-red-500 drop-shadow-md transform -translate-y-1 group-hover/map:-translate-y-2 transition-transform" />
                          </div>
                        </div>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="p-12 text-center text-slate-400 bg-slate-50/50">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">ไม่พบข้อมูลตามเงื่อนไข</p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="flex items-center justify-between p-6 bg-[#F8F5FF] border-t border-[#E0D4FC]">
                <p className="text-sm font-bold text-slate-500">
                  แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} จาก {filteredData.length} รายการ
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white hover:text-[#742D9D] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-black text-[#742D9D] bg-white px-4 py-2 rounded-lg shadow-sm border border-[#E0D4FC]">
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-white hover:text-[#742D9D] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}