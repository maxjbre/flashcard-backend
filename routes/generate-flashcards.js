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

// Function to extract flashcards from a potentially noisy response
const extractFlashcards = (text, bookTitle) => {
  // Split the response into lines
  const lines = text.split("\n");

  // Initialize an array to hold flashcards
  const flashcards = [];

  // Initialize variables to hold current flashcard fields
  let question = "";
  let answer = "";

  // Iterate through lines to extract flashcard data
  lines.forEach((line) => {
    // Check for question
    if (line.startsWith("Question:")) {
      question = line.replace("Question:", "").trim();
    }
    // Check for answer
    else if (line.startsWith("Answer:")) {
      answer = line.replace("Answer:", "").trim();
    }

    // If both fields are filled, push the flashcard to the array
    if (question && answer) {
      flashcards.push({ question, answer, bookTitle });
      question = "";
      answer = "";
    }
  });

  // Return the extracted flashcards
  return flashcards;
};

// Route to generate flashcards using GPT-3
router.post("/generate-flashcards", async (req, res) => {
  const { title } = req.body;

  // Formulate the prompt for GPT
  const prompt = `Create flashcards for the key-insights, concepts and learnings that are explained in the book titled "${title}". Don't create general questions like the "who is the author". Each flashcard should include the fields: Question and Answer.`;

  try {
    // Make a request to the GPT API
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    console.log("GPT-3 raw response:", gptResponse.choices[0].message.content);

    // Extract flashcards from the GPT-3 response content
    const generatedFlashcards = extractFlashcards(
      gptResponse.choices[0].message.content,
      title
    );

    // Validate the generated flashcards
    if (
      !Array.isArray(generatedFlashcards) ||
      generatedFlashcards.length === 0
    ) {
      throw new Error("Invalid flashcards format: not an array or empty");
    }

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
