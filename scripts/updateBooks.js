import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/book.js"; // Adjust the path to your book model
import slugify from "slugify";

dotenv.config();

console.log("Mongo URI:", process.env.MONGODB_URI);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const updateBooks = async () => {
  await connectDB();

  try {
    const books = await Book.find({});

    const updatePromises = books.map((book) => {
      book.normalizedTitle = book.title.toLowerCase();
      book.slug = slugify(`${book.normalizedTitle} by ${book.author}`, {
        lower: true,
      });

      // Check if the language field is missing and set a default value
      if (!book.language) {
        book.language = "English"; // Set a default value if language is missing
      }

      return book.save();
    });

    await Promise.all(updatePromises);
    console.log("All books updated with normalized titles and slugs");
  } catch (error) {
    console.error("Error updating books:", error);
  } finally {
    mongoose.connection.close();
  }
};

updateBooks();
