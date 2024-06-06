import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true,
  },
  author: {
    type: String,
    required: true,
    index: true,
  },
});

// Composite unique index to prevent duplicate books
bookSchema.index({ title: 1, author: 1 }, { unique: true });

const Book = mongoose.model("Book", bookSchema);
export default Book;
