import mongoose, { Schema, model, models } from 'mongoose';

const InventorySchema = new Schema({
  // เพิ่ม index: true เพื่อให้ค้นหาเลข PEA ได้เร็วขึ้นมาก
  pea_new: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, 
  staff_name: { type: String, index: true }, // เพิ่ม index เผื่อค้นหาตามชื่อพนักงาน
  withdraw_date: String,   
  
  // สถานะการติดตั้ง: 'no' (ยังไม่ติด), 'yes' (ติดตั้งแล้ว), 'pullback' (คืนคลัง)
  inst_flag: { 
    type: String, 
    default: "no",
    index: true 
  }, 
  
  installed_date: { type: String, default: "" }, 

  // --- ฟิลด์ที่เพิ่มใหม่สำหรับระบบคืนคลัง ---
  return_date: { type: String, default: "" } 
  
}, { timestamps: true });

const Inventory = models.Inventory || model('Inventory', InventorySchema);
export default Inventory;