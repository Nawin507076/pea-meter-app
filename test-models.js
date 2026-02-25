require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Using an undocumented listModels method or just try standard ones
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.5-flash'
  ];
  
  for (const m of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      await model.generateContent("Hello?");
      console.log(`✅ ${m} works!`);
    } catch (e) {
      console.log(`❌ ${m} failed: ${e.message}`);
    }
  }
}
main();
