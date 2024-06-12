import express from "express";
import OpenAI from "openai";
import Book from "../models/book.js";
import Flashcard from "../models/flashcard.js";
import dotenv from "dotenv";
import connectDB from "../utils/connectDB.js";
import slugify from "slugify";

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sanitizeText = (text) => {
  return text.replace(/^(.*?)Answer: /i, "").trim();
};

const extractBookInfoAndFlashcards = (responseContent) => {
  const cleanedContent = responseContent.replace(/```json|```/g, "").trim();

  try {
    const jsonResponse = JSON.parse(cleanedContent);
    const { title, author, flashcards } = jsonResponse;

    if (!Array.isArray(flashcards)) {
      throw new Error("Invalid flashcards format: not an array");
    }

    const sanitizedFlashcards = flashcards.map((flashcard) => ({
      question: sanitizeText(flashcard.question),
      answer: sanitizeText(flashcard.answer),
    }));

    return { title, author, flashcards: sanitizedFlashcards };
  } catch (error) {
    console.error("Error parsing JSON content:", error);
    throw new Error("Failed to parse JSON from OpenAI response");
  }
};

router.post("/generate-flashcards", async (req, res) => {
  const { title } = req.body;

  const prompt = `Provide the correct spelling and capitalization of the book title and the author's name for the book titled "${title}". Then create a JSON array of flashcards for the key concepts explained in the book. Each flashcard should be a JSON object with the fields: "question" and "answer". Provide only the book information and JSON array and nothing else. Format:
  {
    "title": "<Correct Title>",
    "author": "<Correct Author>",
    "flashcards": [
      {"question": "Question 1", "answer": "Answer 1"},
      {"question": "Question 2", "answer": "Answer 2"},
      ...
    ]
  }`;

  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const responseContent = gptResponse.choices[0].message.content;
    console.log("GPT raw response:", responseContent);

    let bookInfo;
    let generatedFlashcards;
    try {
      const {
        title: bookTitle,
        author,
        flashcards,
      } = extractBookInfoAndFlashcards(responseContent);
      bookInfo = { title: bookTitle, author };
      generatedFlashcards = flashcards;
    } catch (error) {
      console.error("Error extracting book info or flashcards:", error);
      return res.status(500).json({
        error: "Failed to generate flashcards",
        details: error.message,
      });
    }

    let book = await Book.findOne({ title: bookInfo.title });

    if (!book) {
      book = new Book({
        title: bookInfo.title,
        author: bookInfo.author,
        slug: slugify(`${bookInfo.title} by ${bookInfo.author}`, {
          lower: true,
        }),
      });
      await book.save();
    } else {
      if (!book.slug) {
        book.slug = slugify(`${book.title} by ${book.author}`, { lower: true });
        await book.save();
      }
    }

    console.log("Book ID:", book._id);

    const flashcardsToSave = generatedFlashcards.map((flashcard) => ({
      ...flashcard,
      bookId: book._id,
    }));

    const savedFlashcards = await Flashcard.insertMany(flashcardsToSave);

    res.status(200).json({ flashcards: savedFlashcards, slug: book.slug }); // Return the book slug
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

  console.log(`Received bookId: ${bookId}`);

  if (!bookId) {
    return res.status(400).json({ error: "Missing bookId parameter" });
  }

  try {
    const flashcards = await Flashcard.find({ bookId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("bookId")
      .lean();

    console.log(`Flashcards found: ${flashcards.length}`);
    res.status(200).json(flashcards);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/book", async (req, res) => {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: "Missing slug parameter" });
  }

  try {
    console.log(`Fetching book with slug: ${slug}`);
    const book = await Book.findOne({ slug }).lean();
    if (!book) {
      console.log(`Book not found for slug: ${slug}`);
      return res.status(404).json({ error: "Book not found" });
    }
    res.status(200).json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

router.get("/books", async (req, res) => {
  const { limit = 100, page = 1 } = req.query;
  const queryPage = parseInt(page);

  try {
    const books = await Book.find()
      .sort({ createdAt: -1 }) // Ensure sorting by creation date
      .skip((queryPage - 1) * queryLimit)
      .limit(queryLimit)
      .lean();
    console.log("Books found:", books.length); // Log number of books found
    res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching books:", error.message);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// New route to get random books
router.get("/random-books", async (req, res) => {
  const { count = 3 } = req.query;
  const countInt = parseInt(count);

  try {
    const randomBooks = await Book.aggregate([{ $sample: { size: countInt } }]);
    res.status(200).json(randomBooks);
  } catch (error) {
    console.error("Error fetching random books:", error.message);
    res.status(500).json({ error: "Failed to fetch random books" });
  }
});

export default router;
