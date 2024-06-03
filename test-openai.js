import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say this is a test!" }],
      temperature: 0.7,
    });

    console.log("GPT-3 response:", gptResponse);
  } catch (error) {
    console.error(
      "Error testing OpenAI API:",
      error.response?.data || error.message
    );
  }
}

testOpenAI();
