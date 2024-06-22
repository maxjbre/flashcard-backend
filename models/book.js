import mongoose from "mongoose";
import slugify from "slugify";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    author: { type: String, required: true, index: true },
    slug: { type: String, unique: true, required: true, index: true },
    language: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

bookSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("title")) {
    this.slug = slugify(`${this.title} by ${this.author}`, { lower: true });
  }
  next();
});

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);
export default Book;
