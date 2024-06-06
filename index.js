import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import flashcardRoutes from "./routes/flashcards.js";

// Create an Express application
const app = express();

// Use middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB using the connection string from environment variables
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Failed to connect to MongoDB Atlas", err));

// Define the route handler for the root path
app.get("/", (req, res) => {
  res.send("Flashcard API is running");
});

// Use the flashcard routes for paths starting with /api
app.use("/api", flashcardRoutes);

// Define the port for the server
const port = process.env.PORT || 3001;

// Start the server and listen on the defined port
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
