import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import flashcardRoutes from "./routes/flashcards.js";

const app = express();

app.use(bodyParser.json());
app.use(cors());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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
