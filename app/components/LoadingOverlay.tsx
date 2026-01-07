export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Animation Area */}
      <div className="relative h-24 w-full overflow-hidden">
        <div className="absolute left-[-80px] animate-drive text-6xl">
          🚗⚡
        </div>
      </div>

      <p className="mt-6 text-lg font-semibold text-gray-700">
        กำลังออกปฏิบัติงาน...
      </p>
    </div>
  );
}
