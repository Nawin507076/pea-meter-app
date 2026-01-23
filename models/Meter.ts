import mongoose, { Schema, model, models } from 'mongoose';

const MeterSchema = new Schema({
  worker: String,
  meterIdNew: { 
    type: String, 
    ref: 'Inventory' // <--- บอกว่าเลขนี้อ้างอิงมาจาก Model ที่ชื่อ Inventory
    , index: true
  },
  jobType: String,
  meterIdOld: String,
  readingOld: Number,
  // meterIdNew: String,
  readingNew: Number,
  remark: String,
  
  // --- เพิ่ม 2 บรรทัดนี้เข้าไปครับ ---
  photoOldUrl: String, // เก็บลิงก์รูปเก่าจาก Cloudinary
  photoNewUrl: String, // เก็บลิงก์รูปใหม่จาก Cloudinary
  // ----------------------------

  location: {
    lat: String,
    lng: String
  },
  recordedAt: String,
  status: String,
}, { timestamps: true });

const Meter = models.Meter || model('Meter', MeterSchema);
export default Meter;