import { jsPDF } from "jspdf";

// Helper function for overall rating description
function getOverallRating(score) {
  if (score >= 9) return "Exceptional Candidate";
  if (score >= 8) return "Excellent Performer";
  if (score >= 7) return "Strong Performer";
  if (score >= 6) return "Good Performer";
  if (score >= 5) return "Average Performer";
  return "Needs Development";
}

// Create a clean, professional PDF with sections and a simple table
export function downloadProfessionalPdfReport({
  filename,
  candidate = {},
  groupName = "Interview",
  evaluation,
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 50;
  const marginY = 60;
  let y = marginY;

  // Professional Color Palette
  const primary = "#1a365d"; // Deep blue
  const secondary = "#2d3748"; // Dark gray
  const accent = "#2b6cb0"; // Medium blue
  const success = "#38a169"; // Green
  const warning = "#d69e2e"; // Amber
  const danger = "#e53e3e"; // Red
  const lightBg = "#f7fafc"; // Very light blue-gray
  const border = "#e2e8f0"; // Light gray
  const textDark = "#1a202c"; // Near black
  const textMedium = "#4a5568"; // Medium gray
  const textLight = "#718096"; // Light gray

  // === HEADER SECTION ===
  doc.setFillColor(primary);
  doc.rect(0, 0, pageWidth, 100, "F");

  // Header content
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INTERVIEW EVALUATION REPORT", pageWidth / 2, 40, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Confidential Assessment Document", pageWidth / 2, 60, {
    align: "center",
  });

  // === CANDIDATE INFORMATION SECTION ===
  y = 120;

  // Section title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(textDark);
  doc.text("CANDIDATE INFORMATION", marginX, y);
  y += 20;

  // Candidate info box
  const infoBoxWidth = pageWidth - marginX * 2;
  const infoBoxHeight = 80;

  doc.setFillColor(lightBg);
  doc.setDrawColor(border);
  doc.rect(marginX, y, infoBoxWidth, infoBoxHeight, "FD");

  // Candidate details in two columns
  const col1 = marginX + 20;
  const col2 = pageWidth / 2 + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textMedium);
  doc.text("Name:", col1, y + 25);
  doc.text("Group:", col1, y + 45);
  doc.text("College:", col2, y + 25);
  doc.text("Department:", col2, y + 45);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark);
  doc.text(candidate.name || "Not specified", col1 + 35, y + 25);
  doc.text(groupName, col1 + 35, y + 45);
  doc.text(candidate.college || "Not specified", col2 + 50, y + 25);
  doc.text(candidate.department || "Not specified", col2 + 50, y + 45);

  y += infoBoxHeight + 30;

  // === SCORE OVERVIEW SECTION ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(textDark);
  doc.text("SCORE OVERVIEW", marginX, y);
  y += 25;

  // Compute aggregates
  const results = Array.isArray(evaluation?.results) ? evaluation.results : [];
  const included = results.filter((r) => !r.excluded);
  const avg = (arr, key) =>
    arr.length
      ? arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length
      : 0;
  const avgTech = Math.round(avg(included, "technical_depth") * 10) / 10;
  const avgComm = Math.round(avg(included, "communication") * 10) / 10;
  const avgConf = Math.round(avg(included, "confidence") * 10) / 10;
  const overall = (() => {
    const incl = included.filter((r) => typeof r.final_score === "number");
    if (!incl.length && typeof evaluation?.overall_score === "number")
      return Math.round(evaluation.overall_score * 10) / 10;
    return (
      Math.round(
        (incl.reduce((s, r) => s + r.final_score, 0) / (incl.length || 1)) * 10
      ) / 10
    );
  })();

  // Score cards
  const cardWidth = (pageWidth - marginX * 2 - 30) / 4;
  const cardHeight = 80;
  const cardGap = 10;

  const scoreCards = [
    {
      label: "OVERALL SCORE",
      value: overall,
      max: 10,
      color: overall >= 8 ? success : overall >= 6 ? warning : danger,
      description: getOverallRating(overall),
    },
    {
      label: "TECHNICAL",
      value: avgTech,
      max: 10,
      color: accent,
      description: "Technical Depth & Knowledge",
    },
    {
      label: "COMMUNICATION",
      value: avgComm,
      max: 10,
      color: accent,
      description: "Clarity & Structure",
    },
    {
      label: "CONFIDENCE",
      value: avgConf,
      max: 10,
      color: accent,
      description: "Delivery & Presence",
    },
  ];

  let cardX = marginX;
  scoreCards.forEach((card, index) => {
    // Card background
    doc.setFillColor(lightBg);
    doc.setDrawColor(border);
    doc.rect(cardX, y, cardWidth, cardHeight, "FD");

    // Score value (large)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(card.color);
    doc.text(`${card.value}/${card.max}`, cardX + cardWidth / 2, y + 30, {
      align: "center",
    });

    // Label
    doc.setFontSize(9);
    doc.setTextColor(textMedium);
    doc.text(card.label, cardX + cardWidth / 2, y + 48, { align: "center" });

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textLight);
    const descLines = doc.splitTextToSize(card.description, cardWidth - 20);
    let descY = y + 62;
    descLines.forEach((line) => {
      doc.text(line, cardX + cardWidth / 2, descY, { align: "center" });
      descY += 10;
    });

    cardX += cardWidth + cardGap;
  });

  y += cardHeight + 35;

  // === SUMMARY SECTION ===
  if (evaluation?.summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textDark);
    doc.text("EXECUTIVE SUMMARY", marginX, y);
    y += 20;

    doc.setFillColor(lightBg);
    doc.setDrawColor(border);
    doc.rect(marginX, y, pageWidth - marginX * 2, 70, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textDark);
    const summaryLines = doc.splitTextToSize(
      evaluation.summary,
      pageWidth - marginX * 2 - 20
    );

    let summaryY = y + 20;
    summaryLines.forEach((line, index) => {
      if (index < 4) {
        // Limit to 4 lines in summary box
        doc.text(line, marginX + 10, summaryY);
        summaryY += 14;
      }
    });

    y += 85;
  }

  // === DETAILED QUESTION ANALYSIS ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(textDark);
  doc.text("DETAILED QUESTION ANALYSIS", marginX, y);
  y += 25;

  // Table header
  const col = {
    number: marginX + 15,
    question: marginX + 50,
    technical: pageWidth - marginX - 180,
    communication: pageWidth - marginX - 130,
    confidence: pageWidth - marginX - 80,
    score: pageWidth - marginX - 30,
  };

  // Header background
  doc.setFillColor(primary);
  doc.rect(marginX, y, pageWidth - marginX * 2, 25, "F");

  // Header text
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("#", col.number, y + 15);
  doc.text("QUESTION", col.question, y + 15);
  doc.text("TECH", col.technical, y + 15, { align: "center" });
  doc.text("COMM", col.communication, y + 15, { align: "center" });
  doc.text("CONF", col.confidence, y + 15, { align: "center" });
  doc.text("SCORE", col.score, y + 15, { align: "center" });

  y += 25;

  // Question rows
  const rowHeight = 35;
  const maxQuestionWidth = col.technical - col.question - 20;

  results.forEach((result, index) => {
    // Check for page break
    if (y + rowHeight > pageHeight - marginY) {
      doc.addPage();
      y = marginY;

      // Redraw header on new page
      doc.setFillColor(primary);
      doc.rect(marginX, y, pageWidth - marginX * 2, 25, "F");
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("#", col.number, y + 15);
      doc.text("QUESTION", col.question, y + 15);
      doc.text("TECH", col.technical, y + 15, { align: "center" });
      doc.text("COMM", col.communication, y + 15, { align: "center" });
      doc.text("CONF", col.confidence, y + 15, { align: "center" });
      doc.text("SCORE", col.score, y + 15, { align: "center" });
      y += 25;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(lightBg);
      doc.rect(marginX, y, pageWidth - marginX * 2, rowHeight, "F");
    }

    // Row border
    doc.setDrawColor(border);
    doc.setLineWidth(0.5);
    doc.line(marginX, y + rowHeight, pageWidth - marginX, y + rowHeight);

    // Question number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(textMedium);
    doc.text(String(index + 1), col.number, y + 20);

    // Question text (truncated)
    const question = result.question || `Question ${index + 1}`;
    const questionLines = doc.splitTextToSize(question, maxQuestionWidth);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textDark);

    let questionY = y + 13;
    questionLines.forEach((line, lineIndex) => {
      if (lineIndex < 2) {
        // Max 2 lines for question
        doc.text(line, col.question, questionY);
        questionY += 10;
      }
    });

    // Scores
    const scores = [
      { value: result.technical_depth, pos: col.technical },
      { value: result.communication, pos: col.communication },
      { value: result.confidence, pos: col.confidence },
    ];

    scores.forEach((score) => {
      const displayValue = result.excluded ? "-" : score.value ?? 0;
      const color = result.excluded
        ? textLight
        : score.value >= 8
        ? success
        : score.value >= 6
        ? warning
        : danger;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(color);
      doc.text(String(displayValue), score.pos, y + 20, { align: "center" });
    });

    // Final score
    const finalScore = result.excluded ? "-" : result.final_score ?? 0;
    const finalColor = result.excluded
      ? textLight
      : result.final_score >= 8
      ? success
      : result.final_score >= 6
      ? warning
      : danger;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(finalColor);
    doc.text(String(finalScore), col.score, y + 20, { align: "center" });

    y += rowHeight;
  });

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(border);
    doc.setLineWidth(1);
    doc.line(marginX, pageHeight - 40, pageWidth - marginX, pageHeight - 40);

    // Footer text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textLight);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      marginX,
      pageHeight - 25
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 25,
      { align: "right" }
    );
    doc.text(
      "Confidential - For Internal Use Only",
      pageWidth / 2,
      pageHeight - 25,
      { align: "center" }
    );
  }

  // Save the document
  const safeFilename = (filename || "interview_evaluation_report")
    .replace(/[^a-z0-9_\-\.]+/gi, "_")
    .toLowerCase();

  const finalName = safeFilename.endsWith(".pdf")
    ? safeFilename
    : `${safeFilename}.pdf`;
  doc.save(finalName);
}

export default {
  downloadProfessionalPdfReport,
};
