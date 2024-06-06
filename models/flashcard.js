import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true,
    index: true,
  },
});

const Flashcard = mongoose.model("Flashcard", flashcardSchema);
export default Flashcard;
