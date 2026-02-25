import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { imageUrl, expectedPea, expectedUnit, type } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ success: false, error: "กรุณาตั้งค่า GEMINI_API_KEY ในไฟล์ .env.local" }, { status: 500 });
        }

        if (!imageUrl || !imageUrl.startsWith("http")) {
            return NextResponse.json({ success: false, error: "ไม่พบรูปภาพ หรือรูปแบบ URL ไม่ถูกต้อง" }, { status: 400 });
        }

        // 1. Fetch the image from the Cloudinary URL
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error("ไม่สามารถดาวน์โหลดรูปภาพจาก Cloudinary ได้");

        // 2. Convert to Base64
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString("base64");
        const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

        // 3. Initialize Gemini API
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using 'gemini-2.5-flash' based on the available model list
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 4. Prompt instruction for Gemini
        const prompt = `You are an AI assistant specialized in reading electricity meters in Thailand.
Please carefully examine the attached image of a meter.
This is a verification for the ${type === "old" ? "Old Meter" : "New Meter"}.
I expect the PEA ID (รหัสเครื่องวัด) to be: "${expectedPea}"
And I expect the unit reading (หน่วย) to be: "${expectedUnit}"

Does the PEA ID and the reading in the image match the expected values?
Note that LCD screens might have glare, look carefully. The unit reading might have decimals, round down if necessary or try to match the integer part.
CRITICAL EXCEPTION: If the expected unit reading is "0" (zero) and the image shows a blank screen, a dash, or it is impossible to read any numbers (e.g., broken screen), you MUST consider the unit reading as a MATCH (treat the blank/unreadable screen as 0).

Please return ONLY a JSON object in the exact format, no markdown formatting:
{
  "isMatch": boolean,
  "confidence": number,
  "extractedPea": "string or null",
  "extractedUnit": "string or null",
  "reason": "short explanation of your finding in Thai"
}`;

        // 5. Ask Gemini
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType,
                },
            },
        ]);

        let responseText = result.response.text();

        // Clean up markdown format if Gemini included it
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        let jsonResult;
        try {
            jsonResult = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            throw new Error("ระบบ AI ไม่สามารถประมวลผลรูปแบบข้อมูลได้");
        }

        return NextResponse.json({ success: true, result: jsonResult });
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
