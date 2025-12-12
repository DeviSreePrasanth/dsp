const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const Groq = require("groq-sdk");

const app = express();

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://interview-ten-pink.vercel.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

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

// Audio Upload and Transcription Endpoint (Using Groq - FREE!)
app.post("/transcribe-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    console.log(
      `Transcribing: ${req.file.originalname} (${req.file.size} bytes)`
    );

    // Rename the temp file to include the original extension for Groq
    const fileExtension = path.extname(req.file.originalname);
    const tempFilePath = req.file.path + fileExtension;
    fs.renameSync(req.file.path, tempFilePath);

    // Transcribe audio using Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3-turbo",
      response_format: "text",
      language: "en",
      temperature: 0.0,
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    console.log("Transcription completed successfully");

    res.json({
      success: true,
      transcription: transcription,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error.message);

    // Clean up files if they exist
    if (req.file) {
      const fileExtension = path.extname(req.file.originalname);
      const tempFilePath = req.file.path + fileExtension;

      [req.file.path, tempFilePath].forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.warn("Cleanup failed:", cleanupError.message);
          }
        }
      });
    }

    res.status(500).json({
      error: "Failed to transcribe audio",
      details: error.message,
    });
  }
});

// Extract Q/A from Transcription Endpoint
app.post("/extract-qa", async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: "No transcription provided" });
    }

    console.log(`Extracting Q/A (${transcription.length} chars)...`);

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

    let qaData = JSON.parse(completion.choices[0].message.content);

    // Handle different response formats
    let qaItems = qaData.qa_pairs || qaData.questions || qaData.items || qaData;

    if (!Array.isArray(qaItems)) {
      qaItems = Object.values(qaData).find((val) => Array.isArray(val)) || [];
    }

    console.log(`Extracted ${qaItems.length} Q/A pairs`);

    if (qaItems.length === 0) {
      return res.status(400).json({
        error: "No Q/A pairs found in transcription",
      });
    }

    res.json({
      success: true,
      qaItems: qaItems,
      count: qaItems.length,
    });
  } catch (error) {
    console.error("Error extracting Q/A:", error.message);
    res.status(500).json({
      error: "Failed to extract Q/A",
      details: error.message,
    });
  }
});

// AI Interview Analysis Endpoint
app.post("/evaluate-interview", async (req, res) => {
  try {
    const { qaItems } = req.body;

    if (!qaItems || !Array.isArray(qaItems) || qaItems.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid input. Provide qaItems array." });
    }

    console.log(`Evaluating ${qaItems.length} Q/A pairs...`);

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

    let evaluationResult = JSON.parse(completion.choices[0].message.content);
    console.log("Evaluation completed successfully");

    res.json(evaluationResult);
  } catch (error) {
    console.error("Error evaluating interview:", error.message);
    res.status(500).json({
      error: "Failed to evaluate interview",
      details: error.message,
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
