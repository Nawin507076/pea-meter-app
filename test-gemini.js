require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello! Respond with OK");
    console.log(`✅ ${modelName} test succeeded:`, result.response.text().trim());
  } catch (err) {
    if (err.message) {
      console.error(`❌ ${modelName} test failed:`, err.message.substring(0, 150));
    } else {
      console.error(`❌ ${modelName} test failed:`, err);
    }
  }
}

async function main() {
  await testModel("gemini-1.5-flash");
  await testModel("gemini-1.5-flash-latest");
  await testModel("gemini-2.0-flash");
  await testModel("gemini-flash");
  await testModel("gemini-1.5-flash-8b");
  await testModel("gemini-1.5-pro");
}

main().catch(console.error);
