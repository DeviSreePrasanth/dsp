import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaMicrophone,
  FaFileAudio,
  FaClipboardCheck,
  FaTrophy,
  FaChartLine,
  FaLightbulb,
  FaCopy,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearch,
  FaRocket,
} from "react-icons/fa";
import { MdCloudUpload, MdRefresh, MdPlayArrow } from "react-icons/md";
import { IoMdDocument, IoMdSettings } from "react-icons/io";
import { AiFillQuestionCircle } from "react-icons/ai";
import { BiAnalyse } from "react-icons/bi";
import { HiExclamationCircle } from "react-icons/hi";
import { downloadProfessionalPdfReport } from "./pdfGenerator";

const InterviewAnalysis = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [extractingQA, setExtractingQA] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [hoveredScore, setHoveredScore] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleDownloadPDF = () => {
    // Generate professional PDF report
    downloadProfessionalPdfReport({
      filename: `Interview_Analysis_Report_${Date.now()}.pdf`,
      candidate: {
        name: "Candidate",
        college: "Not Specified",
        department: "Not Specified",
      },
      groupName: "Technical Interview",
      evaluation: results,
    });
  };

  // Simulate progress for loading states
  useEffect(() => {
    let interval;
    if (transcribing || extractingQA || loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
      }, 500);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [transcribing, extractingQA, loading]);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setError("Audio file must be less than 25MB");
        return;
      }
      setAudioFile(file);
      setError("");
      // Switch to transcription tab
      setActiveTab("transcribe");
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioFile) {
      setError("Please upload an audio file first");
      return;
    }

    setTranscribing(true);
    setError("");
    setTranscription("");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const response = await axios.post(
        "https://backend-rho-hazel.vercel.app/transcribe-audio",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setTranscription(response.data.transcription);
      // Auto-extract Q/A after transcription
      await handleExtractQA(response.data.transcription);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to transcribe audio. Make sure the server is running."
      );
    } finally {
      setTranscribing(false);
    }
  };

  const handleExtractQA = async (transcriptionText) => {
    setExtractingQA(true);
    setError("");

    try {
      const response = await axios.post("https://backend-rho-hazel.vercel.app/extract-qa", {
        transcription: transcriptionText || transcription,
      });

      if (response.data.qaItems && response.data.qaItems.length > 0) {
        setJsonInput(JSON.stringify(response.data.qaItems, null, 2));
        setActiveTab("evaluate");
      } else {
        setError("No Q/A pairs found in the transcription");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to extract Q/A pairs from transcription"
      );
    } finally {
      setExtractingQA(false);
    }
  };

  const handleEvaluate = async () => {
    setError("");
    setResults(null);

    try {
      const qaItems = JSON.parse(jsonInput);

      if (!Array.isArray(qaItems)) {
        setError("Input must be an array of Q&A objects");
        return;
      }

      setLoading(true);
      const response = await axios.post(
        "https://backend-rho-hazel.vercel.app/evaluate-interview",
        {
          qaItems,
        }
      );

      setResults(response.data);
      setActiveTab("results");
    } catch (err) {
      console.error("Evaluation error:", err);
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your input.");
      } else if (err.response) {
        const errorMsg =
          err.response.data?.error || "Failed to evaluate interview";
        const errorDetails = err.response.data?.details;
        setError(errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg);
      } else if (err.request) {
        setError(
          "Cannot connect to server. Please ensure the backend is running on port 5000."
        );
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return "from-green-500 to-emerald-400";
    if (score >= 6) return "from-yellow-500 to-orange-400";
    return "from-red-500 to-pink-400";
  };

  const getScoreTextColor = (score) => {
    if (score >= 8) return "text-white";
    if (score >= 6) return "text-white";
    return "text-white";
  };

  const getScoreGradient = (score) => {
    if (score >= 8)
      return "bg-gradient-to-br from-green-500 via-emerald-500 to-green-600";
    if (score >= 6)
      return "bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600";
    return "bg-gradient-to-br from-red-500 via-rose-500 to-red-600";
  };

  const ScoreMeter = ({ score, label, size = "medium" }) => {
    const sizeClasses = {
      small: "w-12 h-12 text-lg",
      medium: "w-16 h-16 text-xl",
      large: "w-32 h-32 text-4xl",
    };

    const getBorderColor = (score) => {
      if (score >= 8) return "border-green-400";
      if (score >= 6) return "border-orange-400";
      return "border-red-400";
    };

    return (
      <div className="relative">
        <div className="relative">
          {/* Main circle */}
          <div
            className={`${sizeClasses[size]} rounded-full ${getScoreGradient(
              score
            )} flex items-center justify-center relative overflow-hidden shadow-lg border-4 ${getBorderColor(
              score
            )}`}
          >
            {/* Shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent"></div>

            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>

            {/* Score text */}
            <span
              className={`relative z-10 font-black ${getScoreTextColor(
                score
              )} drop-shadow-lg`}
            >
              {score.toFixed(1)}
            </span>
          </div>
          {label && (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-gray-400 font-medium">
              {label}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ProgressBar = ({
    progress,
    color = "from-purple-600 to-indigo-600",
  }) => (
    <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} transition-all duration-500 ease-out`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f172a] to-gray-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 px-2">
          <div className="inline-block p-2 sm:p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl mb-4 sm:mb-6 border border-white/10">
            <FaMicrophone className="text-purple-400" size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4 px-4">
            AI Interview Analysis Suite
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
            Transform interviews into actionable insights with AI-powered
            transcription, Q/A extraction, and performance evaluation
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto px-2">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-1.5 sm:p-2 inline-flex border border-white/10 min-w-max">
            {["upload", "transcribe", "evaluate", "results"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={tab === "results" && !results}
                className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
          {/* Progress Indicator */}
          {(transcribing || extractingQA || loading) && (
            <div className="absolute top-0 left-0 w-full h-1">
              <ProgressBar progress={progress} />
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                  Upload Interview Recording
                </h2>
                <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 px-2">
                  Start by uploading your interview audio file. We support MP3,
                  WAV, M4A, and more.
                </p>
              </div>

              <div
                className={`border-3 border-dashed rounded-2xl p-6 sm:p-8 md:p-12 text-center transition-all duration-300 cursor-pointer group ${
                  audioFile
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-gray-600 hover:border-purple-500/50 bg-gray-800/30"
                }`}
                onClick={() => document.getElementById("audio-upload").click()}
              >
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*,video/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <div className="space-y-6">
                  <div className="flex justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    {audioFile ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-500/30 blur-2xl rounded-full"></div>
                        <FaCheckCircle
                          className="text-green-400 relative z-10 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]"
                          size={80}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full animate-pulse"></div>
                        <div className="relative z-10 bg-gradient-to-br from-purple-600 to-blue-600 p-4 sm:p-6 rounded-full shadow-2xl border-4 border-purple-400/30">
                          <FaMicrophone
                            className="text-white drop-shadow-lg"
                            size={window.innerWidth < 640 ? 32 : 48}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-2">
                    <p className="text-base sm:text-xl font-semibold text-white mb-2 break-words">
                      {audioFile ? audioFile.name : "Drop your audio file here"}
                    </p>
                    <p className="text-sm sm:text-base text-gray-400">
                      {audioFile
                        ? "Click to change file"
                        : "or click to browse (max 25MB)"}
                    </p>
                  </div>
                  {audioFile && (
                    <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
                      <span>✓</span>
                      <span>File ready for transcription</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transcribe Tab */}
          {activeTab === "transcribe" && audioFile && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Transcribe Audio
                  </h2>
                  <p className="text-sm sm:text-base text-gray-400">
                    Convert speech to text and extract Q/A pairs
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-400">
                    File uploaded
                  </p>
                  <p className="text-sm sm:text-base text-white font-medium truncate max-w-[200px] sm:max-w-xs">
                    {audioFile.name}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      Transcription Status
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      Ready to process your audio file
                    </p>
                  </div>
                  <button
                    onClick={handleTranscribeAudio}
                    disabled={transcribing || extractingQA}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    {transcribing ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        Transcribing...
                      </span>
                    ) : extractingQA ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        Extracting Q/A...
                      </span>
                    ) : (
                      "Start Processing"
                    )}
                  </button>
                </div>

                {transcribing && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Processing audio file...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar progress={progress} />
                    <p className="text-gray-400 text-sm">
                      This may take a moment depending on file size
                    </p>
                  </div>
                )}

                {transcription && (
                  <div className="mt-6 bg-gray-900/50 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <IoMdDocument className="text-blue-400" size={24} />
                      Transcription Preview
                    </h3>
                    <div className="text-gray-300 text-sm max-h-60 overflow-y-auto leading-relaxed bg-gray-800/30 rounded-lg p-4">
                      {transcription}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evaluate Tab */}
          {activeTab === "evaluate" && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Evaluate Interview Responses
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Review extracted Q/A pairs and run AI evaluation
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 border border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      Extracted Questions & Answers
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      Edit the JSON below if needed, then evaluate
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => setActiveTab("transcribe")}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-white/5 transition-colors text-sm sm:text-base"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleEvaluate}
                      disabled={loading || !jsonInput.trim()}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <MdRefresh className="animate-spin" size={20} />
                          Evaluating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FaRocket size={18} /> Run Evaluation
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <div className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full">
                      {JSON.parse(jsonInput || "[]").length} Q/A pairs
                    </div>
                  </div>
                  <textarea
                    className="w-full bg-gray-900/70 text-gray-300 p-6 rounded-xl border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm leading-relaxed resize-none"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={16}
                    placeholder={
                      '[\n  {\n    "question": "Tell me about yourself",\n    "answer": "I am a software engineer with 5 years of experience..."\n  }\n]'
                    }
                  />
                </div>

                {loading && (
                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Analyzing responses...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar
                      progress={progress}
                      color="from-green-600 to-emerald-600"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === "results" && results && (
            <div className="space-y-8 animate-fadeIn">
              {/* Overall Performance */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                      Interview Performance Report
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400">
                      Comprehensive analysis of candidate responses
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <FaClipboardCheck size={20} /> Download Report
                  </button>
                </div>

                <div>
                  {/* Overall Score */}
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                      <div className="flex-shrink-0">
                        <ScoreMeter
                          score={results.overall_score}
                          size="large"
                        />
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                          Overall Score
                        </h3>
                        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                          {results.summary}
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-gray-800/30 rounded-xl p-3 sm:p-4 border border-white/5">
                        <p className="text-gray-400 text-xs sm:text-sm mb-1">
                          Questions
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          {results.results?.length}
                        </p>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-3 sm:p-4 border border-white/5">
                        <p className="text-gray-400 text-xs sm:text-sm mb-1">
                          Avg. Technical
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-400">
                          {(
                            results.results?.reduce(
                              (a, b) => a + b.technical_depth,
                              0
                            ) / results.results?.length
                          ).toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-white/5">
                        <p className="text-gray-400 text-sm mb-1">
                          Avg. Communication
                        </p>
                        <p className="text-2xl font-bold text-purple-400">
                          {(
                            results.results?.reduce(
                              (a, b) => a + b.communication,
                              0
                            ) / results.results?.length
                          ).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">
                  Detailed Question Analysis
                </h2>

                <div className="space-y-6">
                  {results.results?.map((item, index) => (
                    <div
                      key={index}
                      className={`bg-gray-800/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] ${
                        hoveredScore === index
                          ? "border-purple-500/50"
                          : "border-white/5"
                      }`}
                      onMouseEnter={() => setHoveredScore(index)}
                      onMouseLeave={() => setHoveredScore(null)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                              <AiFillQuestionCircle
                                className="text-purple-400"
                                size={window.innerWidth < 640 ? 22 : 28}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <h3 className="text-lg sm:text-xl font-semibold text-white">
                                  Question {index + 1}
                                </h3>
                                {item.excluded && (
                                  <span className="px-3 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full border border-gray-600">
                                    Non-Technical
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-sm">
                                {item.excluded ? (
                                  <span className="text-gray-500">
                                    {item.exclusion_reason ||
                                      "Administrative question - not scored"}
                                  </span>
                                ) : (
                                  `Final Score: ${item.final_score.toFixed(
                                    1
                                  )}/10`
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-gray-400 text-sm mb-2">
                                Question:
                              </p>
                              <p className="text-white bg-gray-900/50 rounded-lg p-4 border border-white/5">
                                {item.question}
                              </p>
                            </div>
                          </div>
                        </div>

                        {!item.excluded && (
                          <div className="lg:w-48">
                            <ScoreMeter
                              score={item.final_score}
                              label="Final Score"
                            />
                          </div>
                        )}
                      </div>

                      {/* Metrics */}
                      {!item.excluded && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                          <div className="space-y-3 group">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                Technical Depth
                              </span>
                              <span className="text-blue-300 font-bold text-base">
                                {item.technical_depth}/10
                              </span>
                            </div>
                            <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden shadow-inner border border-gray-700/50">
                              <div
                                className="absolute h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-lg group-hover:shadow-blue-500/50"
                                style={{
                                  width: `${item.technical_depth * 10}%`,
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 group">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                                Communication
                              </span>
                              <span className="text-purple-300 font-bold text-base">
                                {item.communication}/10
                              </span>
                            </div>
                            <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden shadow-inner border border-gray-700/50">
                              <div
                                className="absolute h-full bg-gradient-to-r from-purple-600 via-purple-400 to-pink-400 rounded-full transition-all duration-700 ease-out shadow-lg group-hover:shadow-purple-500/50"
                                style={{ width: `${item.communication * 10}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 group">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                Confidence
                              </span>
                              <span className="text-green-300 font-bold text-base">
                                {item.confidence}/10
                              </span>
                            </div>
                            <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden shadow-inner border border-gray-700/50">
                              <div
                                className="absolute h-full bg-gradient-to-r from-green-600 via-green-400 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-lg group-hover:shadow-green-500/50"
                                style={{ width: `${item.confidence * 10}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {!item.excluded && (
                        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-5 border border-white/5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">
                              <FaLightbulb
                                className="text-yellow-400"
                                size={24}
                              />
                            </div>
                            <h4 className="text-lg font-semibold text-white">
                              AI Feedback
                            </h4>
                          </div>
                          <p className="text-gray-300 leading-relaxed">
                            {item.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <HiExclamationCircle className="text-red-400" size={28} />
                <h3 className="text-lg font-semibold text-white">Error</h3>
              </div>
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewAnalysis;
