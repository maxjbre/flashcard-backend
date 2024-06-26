import express from "express";
import OpenAI from "openai";
import Book from "../models/book.js";
import Flashcard from "../models/flashcard.js";
import dotenv from "dotenv";
import connectDB from "../utils/connectDB.js";
import slugify from "slugify";
import rateLimit from "express-rate-limit";

dotenv.config();

const router = express.Router();

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
});

// Apply rate limiter to all routes in this file
router.use(limiter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sanitizeText = (text) => {
  return text.replace(/^(.*?)Answer: /i, "").trim();
};

const sanitizeTitle = (title) => {
  return title.replace(/[^\w\s]/gi, "").toLowerCase();
};

const extractBookInfoAndFlashcards = (responseContent) => {
  const cleanedContent = responseContent.replace(/```json|```/g, "").trim();

  try {
    const jsonResponse = JSON.parse(cleanedContent);
    const { title, author, language, flashcards } = jsonResponse;

    if (!Array.isArray(flashcards)) {
      throw new Error("Invalid flashcards format: not an array");
    }

    if (!language) {
      throw new Error("Language field is missing in the API response");
    }

    const sanitizedFlashcards = flashcards.map((flashcard) => ({
      question: sanitizeText(flashcard.question),
      answer: sanitizeText(flashcard.answer),
    }));

    console.log("Extracted data:", {
      title,
      author,
      language,
      flashcards: sanitizedFlashcards,
    });

    return { title, author, language, flashcards: sanitizedFlashcards };
  } catch (error) {
    console.error("Error parsing JSON content:", error);
    throw new Error("Failed to parse JSON from OpenAI response");
  }
};

router.post("/check-or-create-book", async (req, res) => {
  console.log("Received request to check or create book");
  const { title: requestedTitle } = req.body;

  // Input validation
  if (
    !requestedTitle ||
    typeof requestedTitle !== "string" ||
    requestedTitle.length < 3
  ) {
    console.log("Invalid book title received");
    return res.status(400).json({
      error:
        "Invalid book title. Title must be a string with at least 3 characters.",
    });
  }

  // Normalize and sanitize the title
  const normalizedTitle = sanitizeTitle(requestedTitle);

  try {
    console.log(`Checking for existing book with title: ${normalizedTitle}`);
    let book = await Book.findOne({ normalizedTitle });

    if (book) {
      console.log(`Book found: ${book.title}`);
      return res.status(200).json({ slug: book.slug });
    } else {
      console.log("Book not found. Creating new book...");
      const prompt = `Task: Generate educational flashcards based for the key concepts in the book "${requestedTitle}".

Specifics:
1. Provide the correct spelling and capitalization for the book title and the author's name.
2. Identify the language of the book based on the book title.
3. Create a JSON array of flashcards that capture key concepts from the book, ensuring each flashcard is clear, concise and relevant.
4. Ensure the flashcards match the language of the book title.
5. Provide only the book information and JSON array and nothing else. 
6. If it is a fiction book create flashcards for higher-level learnings from the book.

Format:
{
  "title": "<Correct Title>",
  "author": "<Correct Author>",
  "language": "<Language>",
  "flashcards": [
    {"question": "Question 1", "answer": "Answer 1"},
    {"question": "Question 2", "answer": "Answer 2"},
    ...
  ]
}
`;

      console.log("Sending request to OpenAI API");
      const gptResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      let responseContent = gptResponse.choices[0].message.content;
      console.log("Received response from OpenAI API:", responseContent);

      console.log("Extracting book info and flashcards");
      let extractedData;
      try {
        extractedData = extractBookInfoAndFlashcards(responseContent);
      } catch (error) {
        console.error("Error extracting book info and flashcards:", error);
        throw new Error("Failed to extract book info and flashcards");
      }

      if (!extractedData.language) {
        console.error(
          "Extracted data is missing the language field:",
          extractedData
        );
        throw new Error("Language field is missing in the extracted data");
      }

      const { title, author, language, flashcards } = extractedData;

      // Normalize and sanitize the title for saving
      const normalizedExtractedTitle = sanitizeTitle(title);
      const slug = slugify(`${normalizedExtractedTitle} by ${author}`, {
        lower: true,
      });

      book = new Book({
        title,
        author,
        slug,
        language,
        normalizedTitle: normalizedExtractedTitle,
      });

      console.log("Saving new book to database:", book);
      await book.save();

      const flashcardsToSave = flashcards.map((flashcard) => ({
        ...flashcard,
        bookId: book._id,
        language: book.language,
      }));

      console.log("Saving flashcards to database");
      await Flashcard.insertMany(flashcardsToSave);

      console.log(`New book created: ${book.title}`);
      res.status(201).json({ slug: book.slug });
    }
  } catch (error) {
    console.error("Error checking or creating book:", error);
    res.status(500).json({
      error: "An internal server error occurred. Please try again later.",
    });
  }
});

router.get("/book", async (req, res) => {
  console.log("Received request for book");
  const { slug } = req.query;

  if (!slug) {
    console.log("Missing slug parameter");
    return res.status(400).json({ error: "Missing slug parameter" });
  }

  try {
    console.log(`Fetching book with slug: ${slug}`);
    const book = await Book.findOne({ slug }).lean();
    if (!book) {
      console.log(`Book not found for slug: ${slug}`);
      return res.status(404).json({ error: "Book not found" });
    }
    console.log(`Book found: ${book.title}`);
    res.status(200).json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({
      error: "An internal server error occurred. Please try again later.",
    });
  }
});

router.get("/books", async (req, res) => {
  console.log("Received request for books");
  const { limit = 100, page = 1, lastId } = req.query;
  const queryLimit = parseInt(limit, 10);
  const queryPage = parseInt(page, 10);

  try {
    console.log(
      `Fetching books: page ${queryPage}, limit ${queryLimit}, lastId ${lastId}`
    );

    let query = {};
    if (lastId) {
      query = { _id: { $lt: lastId } };
    }

    const books = await Book.find(query)
      .sort({ _id: -1 }) // Sort by _id instead of createdAt
      .limit(queryLimit + 1) // Fetch one extra to check if there are more
      .lean();

    const hasMore = books.length > queryLimit;
    const booksToSend = hasMore ? books.slice(0, -1) : books;

    console.log("Books found:", booksToSend.length);
    res.status(200).json({
      books: booksToSend,
      hasMore,
      lastId:
        booksToSend.length > 0 ? booksToSend[booksToSend.length - 1]._id : null,
    });
  } catch (error) {
    console.error("Error fetching books:", error.message);
    res.status(500).json({
      error: "An internal server error occurred. Please try again later.",
    });
  }
});

router.get("/random-books", async (req, res) => {
  console.log("Received request for random books");
  const { count = 3 } = req.query;
  const countInt = parseInt(count);

  if (isNaN(countInt) || countInt < 1) {
    console.log("Invalid count parameter received");
    return res
      .status(400)
      .json({ error: "Invalid count parameter. Must be a positive integer." });
  }

  try {
    console.log(`Fetching ${countInt} random books`);
    const randomBooks = await Book.aggregate([{ $sample: { size: countInt } }]);
    console.log(`${randomBooks.length} random books fetched successfully`);
    res.status(200).json(randomBooks);
  } catch (error) {
    console.error("Error fetching random books:", error.message);
    res.status(500).json({
      error: "An internal server error occurred. Please try again later.",
    });
  }
});

router.get("/flashcards", async (req, res) => {
  console.log("Received request for flashcards");
  const { bookId, page = 1, limit = 50 } = req.query;

  console.log(`Received bookId: ${bookId}`);

  if (!bookId) {
    console.log("Missing bookId parameter");
    return res.status(400).json({ error: "Missing bookId parameter" });
  }

  try {
    console.log(`Fetching flashcards for bookId: ${bookId}`);
    const flashcards = await Flashcard.find({ bookId })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("bookId")
      .lean();

    console.log(`Flashcards found: ${flashcards.length}`);
    res.status(200).json(flashcards);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({
      error: "An internal server error occurred. Please try again later.",
    });
  }
});

export default router;
