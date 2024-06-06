import express from "express";
import OpenAI from "openai"; // Import the OpenAI library
import Flashcard from "../models/flashcard.js"; // Adjust the path as necessary
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const router = express.Router();

// Initialize OpenAI with configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to sanitize and normalize text
const sanitizeText = (text) => {
  return text.replace(/^(.*?)Answer: /i, "").trim();
};

// Function to extract flashcards from a JSON response
const extractFlashcards = (jsonString, bookTitle) => {
  let flashcards;

  try {
    // Parse the JSON string into an array of flashcards
    flashcards = JSON.parse(jsonString);

    // Validate the parsed flashcards
    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error("Invalid flashcards format: not an array or empty");
    }

    // Add bookTitle to each flashcard and sanitize data
    flashcards = flashcards.map((flashcard) => ({
      question: sanitizeText(flashcard.question),
      answer: sanitizeText(flashcard.answer),
      bookTitle,
    }));
  } catch (error) {
    throw new Error("Failed to parse flashcards JSON: " + error.message);
  }

  return flashcards;
};

// Route to generate flashcards using GPT-3
router.post("/generate-flashcards", async (req, res) => {
  const { title } = req.body;

  // Formulate the prompt for GPT
  const prompt = `Create flashcards for the key concepts explained in the book titled "${title}". Don't create basic questions like about the title or author. Create flashcards for concrete concepts from the book. Format each flashcard in JSON with the fields: "question", "answer" and "author". Example: [{ "question": "What is Hedonic Adaption?", "answer": "The process of...", "author": "Max Brenner"}]`;

  try {
    // Make a request to the GPT API
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const responseContent = gptResponse.choices[0].message.content;
    console.log("GPT raw response:", responseContent);

    // Extract flashcards from the GPT-3 response content
    const generatedFlashcards = extractFlashcards(responseContent, title);

    // Validate the generated flashcards
    generatedFlashcards.forEach((flashcard) => {
      if (!flashcard.question || !flashcard.answer || !flashcard.bookTitle) {
        throw new Error("Invalid flashcard format: missing fields");
      }
    });

    // Save the generated flashcards to the database
    const savedFlashcards = await Flashcard.insertMany(generatedFlashcards);

    // Return the generated flashcards to the frontend
    res.status(200).json({ flashcards: savedFlashcards });
  } catch (error) {
    console.error(
      "Error generating flashcards:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Failed to generate flashcards",
      details: error.response?.data || error.message,
    });
  }
});

export default router;
