import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InterviewAnalysis from "./InterviewAnalysis";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InterviewAnalysis />} />
        <Route path="/interview-analysis" element={<InterviewAnalysis />} />
      </Routes>
    </Router>
  );
};

export default App;
