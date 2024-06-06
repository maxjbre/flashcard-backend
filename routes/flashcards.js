import express from "express";
import OpenAI from "openai";
import Book from "../models/book.js";
import Flashcard from "../models/flashcard.js";
import dotenv from "dotenv";
import connectDB from "../utils/connectDB.js";

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sanitizeText = (text) => {
  return text.replace(/^(.*?)Answer: /i, "").trim();
};

const extractFlashcards = (responseContent) => {
  let flashcards = [];
  const jsonRegex = /\{[\s\S]*?\}/g; // Match JSON objects

  let match;
  while ((match = jsonRegex.exec(responseContent)) !== null) {
    try {
      const jsonObject = JSON.parse(match[0]);
      if (jsonObject.question && jsonObject.answer) {
        flashcards.push({
          question: sanitizeText(jsonObject.question),
          answer: sanitizeText(jsonObject.answer),
        });
      }
    } catch (error) {
      console.error("Failed to parse a JSON object:", match[0]);
      console.error("Error:", error);
    }
  }

  if (flashcards.length === 0) {
    throw new Error("No valid flashcards found in the response");
  }

  return flashcards;
};

router.post("/generate-flashcards", async (req, res) => {
  const { title } = req.body;

  const prompt = `Create a JSON array of flashcards for the key concepts explained in the book titled "${title}". Each flashcard should be a JSON object with the fields: "question" and "answer". Provide only the JSON array and nothing else.`;

  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const responseContent = gptResponse.choices[0].message.content;
    console.log("GPT raw response:", responseContent);

    let generatedFlashcards;
    try {
      generatedFlashcards = extractFlashcards(responseContent);
    } catch (error) {
      console.error("Error extracting flashcards:", error);
      return res.status(500).json({
        error: "Failed to generate flashcards",
        details: error.message,
      });
    }

    let book = await Book.findOne({ title }).lean();

    if (!book) {
      book = new Book({ title, author: "Unknown" });
      await book.save();
    }

    const flashcardsToSave = generatedFlashcards.map((flashcard) => ({
      ...flashcard,
      bookId: book._id,
    }));

    const savedFlashcards = await Flashcard.insertMany(flashcardsToSave);

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

router.get("/flashcards", async (req, res) => {
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

router.get("/books", async (req, res) => {
  try {
    await connectDB();
    const books = await Book.find().lean();
    res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching books:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
