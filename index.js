import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import flashcardRoutes from "./routes/flashcards.js";

const app = express(); // Initialize app before using it

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://your-production-frontend-domain.com",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(bodyParser.json());
app.use(cors(corsOptions)); // Use corsOptions after initializing app

// Set the strictQuery option for Mongoose
mongoose.set("strictQuery", true);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Failed to connect to MongoDB Atlas", err));

app.get("/", (req, res) => {
  res.send("Flashcard API is running");
});

app.use("/api", flashcardRoutes);

const port = process.env.PORT || 3001;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
