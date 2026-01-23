import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('กรุณาตั้งค่า MONGODB_URI ในไฟล์ .env.local');
}

/** * Global เป็นการเก็บค่าการเชื่อมต่อไว้ชั่วคราว 
 * เพื่อไม่ให้ Next.js สร้างการเชื่อมต่อใหม่ทุกครั้งที่มีการกด Refresh หน้าเว็บ (Hot Reload)
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;