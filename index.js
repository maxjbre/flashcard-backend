import express from "express"; // Importing Express
import mongoose from "mongoose"; // Importing Mongoose
import bodyParser from "body-parser"; // Importing Body-Parser
import cors from "cors"; // Importing CORS
import dotenv from "dotenv"; // Importing dotenv for environment variables

// Load environment variables from .env file
dotenv.config();

import flashcardRoutes from "./routes/flashcard.js"; // Importing flashcard routes with the correct file extension
import generateFlashcardsRoutes from "./routes/generate-flashcards.js"; // Importing generate flashcards routes with the correct file extension

// Create an Express application
const app = express();

// Use middleware
app.use(bodyParser.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to enable CORS

// Connect to MongoDB using the connection string from environment variables
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true, // Use the new MongoDB URL parser
    useUnifiedTopology: true, // Use the new server discovery and monitoring engine
  })
  .then(() => console.log("Connected to MongoDB Atlas")) // Log success message on successful connection
  .catch((err) => console.error("Failed to connect to MongoDB Atlas", err)); // Log error message on failure

// Define the route handler for the root path
app.get("/", (req, res) => {
  res.send("Flashcard API is running");
});

// Use the flashcard routes for paths starting with /flashcards
app.use("/flashcards", flashcardRoutes);

// Use the generate flashcards routes for paths starting with /api
app.use("/api", generateFlashcardsRoutes);

// Define the port for the server
const port = process.env.PORT || 3001;

// Start the server and listen on the defined port
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

// import express from "express"; // Importing Express
// import mongoose from "mongoose"; // Importing Mongoose
// import bodyParser from "body-parser"; // Importing Body-Parser
// import cors from "cors"; // Importing CORS
// import dotenv from "dotenv"; // Importing dotenv for environment variables

// // Load environment variables from .env file
// dotenv.config();

// import flashcardRoutes from "./routes/flashcards.js"; // Importing the consolidated routes

// // Create an Express application
// const app = express();

// // Define the port for the server
// const port = 3001;

// // Use middleware
// app.use(bodyParser.json()); // Middleware to parse JSON bodies
// app.use(cors()); // Middleware to enable CORS

// // Connect to MongoDB using the connection string from environment variables
// mongoose
//   .connect(process.env.MONGODB_URI, {
//     useNewUrlParser: true, // Use the new MongoDB URL parser
//     useUnifiedTopology: true, // Use the new server discovery and monitoring engine
//   })
//   .then(() => console.log("Connected to MongoDB Atlas")) // Log success message on successful connection
//   .catch((err) => console.error("Failed to connect to MongoDB Atlas", err)); // Log error message on failure

// // Define the route handler for the root path
// app.get("/", (req, res) => {
//   res.send("Flashcard API is running");
// });

// // Use the flashcard routes for paths starting with /flashcards
// app.use("/flashcards", flashcardRoutes);

// // Use the generate flashcards routes for paths starting with /api
// import generateFlashcardsRoutes from "./routes/generate-flashcards.js"; // Importing generate flashcards routes with the correct file extension
// app.use("/api", generateFlashcardsRoutes);

// // Start the server and listen on the defined port
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
