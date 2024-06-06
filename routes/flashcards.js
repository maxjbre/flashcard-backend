import express from "express";
import OpenAI from "openai"; // Import the OpenAI library
import Book from "../models/book.js";
import Flashcard from "../models/flashcard.js";
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
const extractFlashcards = (jsonString) => {
  let flashcards;

  try {
    // Parse the JSON string into an array of flashcards
    flashcards = JSON.parse(jsonString);

    // Validate the parsed flashcards
    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error("Invalid flashcards format: not an array or empty");
    }

    // Sanitize data
    flashcards = flashcards.map((flashcard) => ({
      question: sanitizeText(flashcard.question),
      answer: sanitizeText(flashcard.answer),
    }));
  } catch (error) {
    throw new Error("Failed to parse flashcards JSON: " + error.message);
  }

  return flashcards;
};

// Route to generate flashcards using GPT-4
router.post("/generate-flashcards", async (req, res) => {
  const { title } = req.body;

  // Formulate the prompt for GPT
  const prompt = `Create flashcards for the key concepts explained in the book titled "${title}". Don't create basic questions like about the title or author. Create flashcards for concrete concepts from the book. Format each flashcard in JSON with the fields: "question" and "answer".`;

  try {
    // Make a request to the GPT API
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const responseContent = gptResponse.choices[0].message.content;
    console.log("GPT raw response:", responseContent);

    // Extract flashcards from the GPT-4 response content
    const generatedFlashcards = extractFlashcards(responseContent);

    // Check if the book already exists in the database
    let book = await Book.findOne({ title }).lean();

    // If the book does not exist, create a new book entry
    if (!book) {
      book = new Book({ title, author: "Unknown" }); // Author is unknown since the user only inputs the title
      await book.save();
    }

    // Add book reference to each flashcard and sanitize data
    const flashcardsToSave = generatedFlashcards.map((flashcard) => ({
      ...flashcard,
      bookId: book._id,
    }));

    // Save the generated flashcards to the database
    const savedFlashcards = await Flashcard.insertMany(flashcardsToSave);

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

// Route to get flashcards with pagination
router.get("/", async (req, res) => {
  const { bookId, page = 1, limit = 10 } = req.query;

  try {
    const flashcards = await Flashcard.find({ bookId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("bookId")
      .lean();

    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
