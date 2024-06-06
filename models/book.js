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

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);
export default Book;
