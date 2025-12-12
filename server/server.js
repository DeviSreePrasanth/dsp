const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const Groq = require("groq-sdk");

const app = express();

// CORS configuration - MUST be before other middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://interview-ten-pink.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure Groq (Free alternative to OpenAI)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Configure multer for file uploads (use /tmp for Vercel)
const upload = multer({
  dest: process.env.VERCEL ? "/tmp/" : "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|webm|mp4|mpeg|mpga|ogg|flac/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid audio file format"));
  },
});

// Create uploads directory if it doesn't exist (skip on Vercel)
if (!process.env.VERCEL) {
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }
}

// MongoDB connection (optional - not used in main functionality)
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDb Connected"))
    .catch((err) => console.log("MongoDB connection optional:", err.message));
}
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", UserSchema);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ username });
  if (existing) return res.json({ message: "User already exisits" });

  await User.create({ username, password });
  res.json({ message: "User Created succesfully" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (!user) return res.json({ message: "Invalid Credentials" });

  res.json({ message: "Login Successful" });
});

// Audio Upload and Transcription Endpoint (Using Groq - FREE!)
app.post("/transcribe-audio", upload.single("audio"), async (req, res) => {
  try {
    console.log("Transcribe endpoint hit");
    console.log("Request headers:", req.headers);
    console.log("File present:", !!req.file);

    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    console.log("Transcribing audio file:", req.file.originalname);
    console.log("File path:", req.file.path);
    console.log("File size:", req.file.size);

    // Read the file and create a File-like object for Groq
    const fileBuffer = fs.readFileSync(req.file.path);
    console.log("File read successfully, buffer size:", fileBuffer.length);

    const fileBlob = new Blob([fileBuffer], {
      type: req.file.mimetype || "audio/mpeg",
    });

    // Create a File object
    const file = new File([fileBlob], req.file.originalname, {
      type: req.file.mimetype || "audio/mpeg",
    });

    console.log("Sending to Groq for transcription...");

    // Transcribe audio using Groq Whisper (Free!)
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      response_format: "text",
      language: "en",
      temperature: 0.0,
    });

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
      console.log("Temp file cleaned up");
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp file:", cleanupError.message);
    }

    console.log("Transcription completed successfully");

    res.json({
      success: true,
      transcription: transcription,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error.message);
    console.error("Full error:", error);
    console.error("Error stack:", error.stack);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn(
          "Failed to cleanup file after error:",
          cleanupError.message
        );
      }
    }
    res.status(500).json({
      error: "Failed to transcribe audio",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Extract Q/A from Transcription Endpoint (Using Groq - FREE!)
app.post("/extract-qa", async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: "No transcription provided" });
    }

    console.log("Extracting Q/A from transcription...");
    console.log("Transcription length:", transcription.length);

    // Use Groq to extract Q/A pairs (Free!)
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing interview transcripts. Extract all question-answer pairs from the interview transcript.
Rules:
- Identify questions asked by the interviewer
- Identify answers given by the candidate
- Return ONLY a valid JSON object with a "qa_pairs" array containing objects with "question" and "answer" fields
- Clean up any filler words but preserve the meaning
- If multiple related answers, combine them into one
- Do NOT include any markdown, explanations, or text outside the JSON
- Output format: {"qa_pairs": [{"question": "...", "answer": "..."}]}`,
        },
        {
          role: "user",
          content: `Extract question-answer pairs from this interview transcript:\n\n${transcription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    console.log("Raw Groq response:", completion.choices[0].message.content);

    let qaData = JSON.parse(completion.choices[0].message.content);
    console.log("Parsed QA data:", JSON.stringify(qaData, null, 2));

    // Handle different response formats
    let qaItems = qaData.qa_pairs || qaData.questions || qaData.items || qaData;

    // If it's not an array, try to extract array from object
    if (!Array.isArray(qaItems)) {
      qaItems = Object.values(qaData).find((val) => Array.isArray(val)) || [];
    }

    console.log(`Extracted ${qaItems.length} Q/A pairs`);

    if (qaItems.length === 0) {
      return res.status(400).json({
        error: "No Q/A pairs found in transcription",
        details:
          "The AI could not identify any question-answer pairs in the transcript",
      });
    }

    res.json({
      success: true,
      qaItems: qaItems,
      count: qaItems.length,
    });
  } catch (error) {
    console.error("Error extracting Q/A:", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      error: "Failed to extract Q/A",
      details: error.message,
    });
  }
});

// AI Interview Analysis Endpoint (Using Groq - FAST & FREE!)
app.post("/evaluate-interview", async (req, res) => {
  try {
    const { qaItems } = req.body;

    if (!qaItems || !Array.isArray(qaItems) || qaItems.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid input. Provide qaItems array." });
    }

    console.log(`Evaluating ${qaItems.length} Q/A pairs with Groq...`);

    const systemPrompt = `You are an expert technical interviewer. Evaluate candidate answers for each Q&A pair.

IMPORTANT - Handle Non-Technical Questions:
- First identify if a question is administrative/introductory (e.g., "introduce yourself", "are you ready", "tell me about yourself", "how are you", etc.)
- For administrative questions: Set excluded=true, and provide exclusion_reason. Do NOT include in overall_score calculation.
- For technical questions: Evaluate normally with all scores.

Rules for Technical Questions:
- Score technical_depth (0-10), communication (0-10), confidence (0-10).
- communication must assess proper English sentence formation: grammar, clear sentence boundaries and punctuation, coherent structure, fluency, and clarity. Do NOT award communication points for technical jargon or keywords.
- If an answer is highly technical but poorly structured, set communication ≤ 5.
- Weighted final_score = technical*0.6 + communication*0.25 + confidence*0.15 (round to 2 decimals).
- Produce a concise feedback sentence per item.

Output Format:
- Return strictly valid JSON: { results: Array<{question, technical_depth, communication, confidence, final_score, feedback, excluded?, exclusion_reason?}>, overall_score: number, summary: string }
- overall_score must be the average of final_score for ONLY non-excluded items (technical questions only).
- results.length must equal the number of input qaItems.
- For excluded items: still include question and provide exclusion_reason, but set excluded=true and scores can be 0.

IMPORTANT: Output ONLY JSON with no markdown, no backticks.`;

    // Use Groq for fast evaluation (Free & much faster than Ollama!)
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Evaluate these Q&A pairs:\n\n${JSON.stringify(
            qaItems,
            null,
            2
          )}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    console.log("Received response from Groq");
    let evaluationResult = JSON.parse(completion.choices[0].message.content);
    console.log("Successfully parsed evaluation response");

    res.json(evaluationResult);
  } catch (error) {
    console.error("Error evaluating interview:", error.message);
    console.error("Full error stack:", error.stack);
    res.status(500).json({
      error: "Failed to evaluate interview",
      details: error.message || "Unknown error occurred",
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Interview Analysis API is running",
    endpoints: ["/transcribe-audio", "/extract-qa", "/evaluate-interview"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

// For Vercel serverless deployment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`Server Started on port ${PORT}`));
}
