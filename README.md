# AI Interview Analysis Suite

An intelligent interview analysis platform powered by AI that transcribes audio interviews, extracts Q&A pairs, and provides comprehensive performance evaluation.

## Features

- 🎙️ **Audio Transcription** - Upload interview recordings and get instant transcriptions using Groq Whisper
- 🤖 **Automated Q&A Extraction** - AI extracts question-answer pairs from transcripts
- 📊 **Performance Evaluation** - Analyzes technical depth, communication skills, and confidence
- 📄 **Professional PDF Reports** - Download beautifully formatted evaluation reports
- 🎨 **Modern UI** - Dark theme with responsive design for all devices
- ⚡ **Fast Processing** - Powered by Groq's high-speed AI models

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS v4
- React Icons
- Axios
- jsPDF

### Backend
- Node.js & Express 5
- MongoDB with Mongoose
- Groq SDK (Whisper & Llama 3.3)
- Multer (file uploads)
- Nodemon

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB
- Groq API key (free tier available)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/DeviSreePrasanth/dsp.git
cd dsp
```

2. **Install frontend dependencies**
```bash
cd practice
npm install
```

3. **Install backend dependencies**
```bash
cd ../server
npm install
```

4. **Configure environment variables**

Create a `.env` file in the `server` folder:
```env
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

### Running the Application

1. **Start the backend server**
```bash
cd server
npm start
```

2. **Start the frontend development server**
```bash
cd practice
npm run dev
```

3. **Open your browser**
Navigate to `http://localhost:5173`

## Usage

1. **Upload Audio** - Upload your interview recording (MP3, WAV, M4A, etc., max 25MB)
2. **Transcribe** - Click "Start Processing" to transcribe the audio
3. **Evaluate** - AI automatically extracts Q&A pairs and evaluates responses
4. **View Results** - See detailed analysis with scores for:
   - Technical Depth (60% weight)
   - Communication (25% weight)
   - Confidence (15% weight)
5. **Download Report** - Get a professional PDF report with all scores and feedback

## Evaluation Criteria

### Technical Depth (60%)
- Knowledge demonstration
- Completeness of answers
- Technical accuracy
- Use of specific examples
- Advanced understanding

### Communication (25%)
- Grammar and sentence structure
- Clarity and fluency
- Coherent structure
- Proper English formation

### Confidence (15%)
- Delivery quality
- Assurance in responses
- Steady pace and tone

## Project Structure

```
Practice/
├── practice/          # Frontend React application
│   ├── src/
│   │   ├── App.jsx
│   │   ├── InterviewAnalysis.jsx
│   │   ├── pdfGenerator.js
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
└── server/           # Backend Express server
    ├── server.js
    ├── nodemon.json
    ├── package.json
    └── uploads/
```

## API Endpoints

### POST `/transcribe-audio`
Transcribes uploaded audio file using Groq Whisper

### POST `/extract-qa`
Extracts question-answer pairs from transcription

### POST `/evaluate-interview`
Evaluates Q&A pairs and returns scores with feedback

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Groq for providing fast AI inference
- React team for the amazing framework
- Tailwind CSS for the styling system

## Author

**Devi Sree Prasanth**
- GitHub: [@DeviSreePrasanth](https://github.com/DeviSreePrasanth)

---

Made with ❤️ by Devi Sree Prasanth
