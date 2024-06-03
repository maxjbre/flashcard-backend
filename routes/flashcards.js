import express from "express";
import Flashcard from "../models/flashcard.js"; // Import the Flashcard model

const router = express.Router();

// CRUD routes -> Create, Read, Update, and Delete

// Create a new flashcard
router.post("/", async (req, res) => {
  try {
    const flashcard = new Flashcard(req.body); // Create a new flashcard document
    const savedFlashcard = await flashcard.save(); // Save the flashcard to the database
    res.status(201).json(savedFlashcard); // Send the saved flashcard as a response
  } catch (err) {
    res.status(400).json({ message: err.message }); // Handle errors
  }
});

// Bulk upload route
router.post("/bulk-upload", async (req, res) => {
  try {
    console.log("Received request headers:", req.headers); // Log request headers
    console.log("Received request body:", req.body); // Log the entire request body

    const { flashcards } = req.body; // Extract flashcards from the request body
    if (!Array.isArray(flashcards)) {
      throw new Error("Flashcards must be an array");
    }
    await Flashcard.insertMany(flashcards); // Insert the flashcards into the database
    res.status(201).send({ message: "Flashcards uploaded successfully" }); // Send success response
  } catch (error) {
    console.error("Bulk upload error:", error.message);
    res
      .status(400)
      .send({ error: error.message || "Failed to upload flashcards" }); // Send error response if something goes wrong
  }
});

// Fetch all unique book titles
router.get("/books", async (req, res) => {
  try {
    const books = await Flashcard.distinct("bookTitle");
    res.status(200).json({ books });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Fetch flashcards by book title
router.get("/", async (req, res) => {
  const { bookTitle } = req.query;
  try {
    const flashcards = await Flashcard.find(bookTitle ? { bookTitle } : {});
    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

// Get a single flashcard by ID
router.get("/:id", async (req, res) => {
  try {
    const flashcard = await Flashcard.findById(req.params.id); // Find the flashcard by ID
    if (flashcard) {
      res.json(flashcard); // Send the flashcard as a response
    } else {
      res.status(404).json({ message: "Flashcard not found" }); // Handle flashcard not found
    }
  } catch (err) {
    res.status(500).json({ message: err.message }); // Handle errors
  }
});

// Update a flashcard
router.put("/:id", async (req, res) => {
  try {
    const flashcard = await Flashcard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ); // Find and update the flashcard by ID
    if (flashcard) {
      res.json(flashcard); // Send the updated flashcard as a response
    } else {
      res.status(404).json({ message: "Flashcard not found" }); // Handle flashcard not found
    }
  } catch (err) {
    res.status(400).json({ message: err.message }); // Handle errors
  }
});

// Delete a flashcard
router.delete("/:id", async (req, res) => {
  try {
    const flashcard = await Flashcard.findByIdAndDelete(req.params.id); // Find and delete the flashcard by ID
    if (flashcard) {
      res.json({ message: "Flashcard deleted" }); // Send a success message
    } else {
      res.status(404).json({ message: "Flashcard not found" }); // Handle flashcard not found
    }
  } catch (err) {
    res.status(500).json({ message: err.message }); // Handle errors
  }
});

export default router; // Export the router to use in the main application
