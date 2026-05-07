/**
 * Baseline vs Agentic comparison for the Program Assistant endpoint.
 *
 * Baseline:  mode=qa  — single Claude call, only database metadata + webpage text injected
 * Agentic:   mode=review — multi-step pipeline:
 *              1. fetch + PDF-extract uploaded application documents
 *              2. scrape official program webpage
 *              3. first Claude call  → candid prose review
 *              4. second Claude call → structured JSON scorecard (dynamic rubric)
 *              5. JSON repair via third Claude call if scorecard is malformed
 *
 * Run:
 *   node evals/program-assistant/compareBaselineVsAgentic.js
 *   node evals/program-assistant/compareBaselineVsAgentic.js --program 1
 *   node evals/program-assistant/compareBaselineVsAgentic.js --judge off
 */

const fs = require("fs");
const path = require("path");

const RESULTS_DIR = path.join(__dirname, "results");
const BACKEND_ENV_PATH = path.join(__dirname, "..", "..", ".env");
const DEFAULT_BASE_URL = process.env.EVAL_BASE_URL || "http://localhost:5001/api";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

loadBackendEnv();

function loadBackendEnv() {
  if (!fs.existsSync(BACKEND_ENV_PATH)) return;
  for (const line of fs.readFileSync(BACKEND_ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    if (!key || process.env[key]) continue;
    let val = trimmed.slice(sep + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

function getArg(name, fallback) {
  const i = process.argv.findIndex((a) => a === `--${name}`);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureResultsDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const STUDENT_ACTOR = {
  role: "student",
  email: "aman@student.plaksha.edu.in",
};

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "x-demo-user-role": STUDENT_ACTOR.role,
    "x-demo-user-email": STUDENT_ACTOR.email,
  };
}

// The comparison question — the same text is sent to both modes.
// A review-oriented question makes the gap most visible: baseline
// has no document content and can only describe the program; agentic
// reads the actual uploaded files and builds a scored rubric.
const COMPARISON_QUESTION =
  "How strong is my current application for this program? What are my weaknesses and what should I do next?";

const PROGRAMS_TO_TEST = [
  { id: 1, title: "ETH Zurich Exchange" },
  { id: 5, title: "University of Toronto Research Exchange" },
];

async function callAssistant(baseUrl, programId, message, mode) {
  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/programs/${programId}/assistant`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ message, mode }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return { ...payload.data, durationMs: Date.now() - t0 };
}

async function judgeComparison(baselineAnswer, agenticAnswer, programTitle, question) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const prompt = [
    "You are judging two AI responses to the same student question about a university program application.",
    "",
    `Program: ${programTitle}`,
    `Student question: ${question}`,
    "",
    "BASELINE response (single LLM call — no document extraction, no scorecard):",
    baselineAnswer,
    "",
    "AGENTIC response (multi-step pipeline — document extraction, structured scorecard):",
    agenticAnswer,
    "",
    "Score each response on correctness, completeness, groundedness, and clarity from 1–5.",
    "Then write a 2–3 sentence verdict explaining which is more useful for a student and why.",
    "",
    "Return JSON only:",
    JSON.stringify({
      baseline: { correctness: 0, completeness: 0, groundedness: 0, clarity: 0 },
      agentic: { correctness: 0, completeness: 0, groundedness: 0, clarity: 0 },
      verdict: "",
      winner: "baseline | agentic | tie",
    }, null, 2),
  ].join("\n");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Judge API failed: ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Judge did not return JSON");
  return JSON.parse(text.slice(start, end + 1));
}

function printDivider(char = "─", width = 72) {
  console.log(char.repeat(width));
}

function printWrapped(label, text, width = 72) {
  const indent = " ".repeat(label.length + 2);
  const words = String(text || "").split(" ");
  let line = `${label}: `;
  for (const word of words) {
    if (line.length + word.length + 1 > width && line.trim() !== `${label}:`) {
      console.log(line);
      line = indent + word + " ";
    } else {
      line += word + " ";
    }
  }
  if (line.trim()) console.log(line);
}

async function runComparison(baseUrl, judgeEnabled) {
  ensureResultsDir();

  const allResults = [];

  for (const program of PROGRAMS_TO_TEST) {
    console.log("\n");
    printDivider("═");
    console.log(`  Program: ${program.title} (id: ${program.id})`);
    console.log(`  Question (same for both modes):`);
    console.log(`  "${COMPARISON_QUESTION}"`);
    printDivider("═");

    let baselineResult = null;
    let agenticResult = null;
    let judgeResult = null;

    // --- BASELINE ---
    console.log("\n[BASELINE] mode=qa — single Claude call");
    printDivider("-");
    try {
      baselineResult = await callAssistant(baseUrl, program.id, COMPARISON_QUESTION, "qa");
      console.log(`Response mode: ${baselineResult.mode}`);
      console.log(`Duration:      ${baselineResult.durationMs}ms`);
      console.log(`Has scorecard: NO (baseline never returns a scorecard)`);
      console.log(`\nAnswer:`);
      console.log(baselineResult.reply);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }

    // --- AGENTIC ---
    console.log("\n[AGENTIC] mode=review — multi-step pipeline");
    printDivider("-");
    try {
      agenticResult = await callAssistant(baseUrl, program.id, COMPARISON_QUESTION, "review");
      const report = agenticResult.reviewReport;
      console.log(`Response mode: ${agenticResult.mode}`);
      console.log(`Duration:      ${agenticResult.durationMs}ms`);
      console.log(`Has scorecard: ${report ? "YES" : "NO"}`);
      if (report) {
        console.log(`Overall score: ${report.overallScore} / 5  (${report.overallLabel})`);
        console.log(`Categories:    ${(report.categories || []).map((c) => `${c.name} ${c.score}`).join(" | ")}`);
        if (report.priorityActions?.length) {
          console.log(`Priority #1:   [${report.priorityActions[0].urgency}] ${report.priorityActions[0].action}`);
        }
      }
      console.log(`\nNarrative:`);
      console.log(agenticResult.reply);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }

    // --- JUDGE ---
    if (judgeEnabled && baselineResult && agenticResult) {
      console.log("\n[JUDGE] LLM-as-judge comparing both outputs");
      printDivider("-");
      try {
        judgeResult = await judgeComparison(
          baselineResult.reply,
          agenticResult.reply,
          program.title,
          COMPARISON_QUESTION,
        );
        console.log(`Baseline scores — correctness: ${judgeResult.baseline.correctness}  completeness: ${judgeResult.baseline.completeness}  groundedness: ${judgeResult.baseline.groundedness}  clarity: ${judgeResult.baseline.clarity}`);
        console.log(`Agentic scores  — correctness: ${judgeResult.agentic.correctness}  completeness: ${judgeResult.agentic.completeness}  groundedness: ${judgeResult.agentic.groundedness}  clarity: ${judgeResult.agentic.clarity}`);
        console.log(`Winner: ${judgeResult.winner}`);
        printWrapped("Verdict", judgeResult.verdict);
      } catch (err) {
        console.log(`Judge error: ${err.message}`);
      }
    }

    allResults.push({
      program,
      question: COMPARISON_QUESTION,
      baseline: baselineResult
        ? {
            mode: baselineResult.mode,
            durationMs: baselineResult.durationMs,
            answer: baselineResult.reply,
            hasScorecard: false,
          }
        : { error: "call failed" },
      agentic: agenticResult
        ? {
            mode: agenticResult.mode,
            durationMs: agenticResult.durationMs,
            answer: agenticResult.reply,
            hasScorecard: Boolean(agenticResult.reviewReport),
            scorecard: agenticResult.reviewReport || null,
          }
        : { error: "call failed" },
      judge: judgeResult,
    });
  }

  const outputPath = path.join(RESULTS_DIR, `baseline-vs-agentic-${timestampSlug()}.report.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), question: COMPARISON_QUESTION, results: allResults }, null, 2));

  console.log("\n");
  printDivider("═");
  console.log(`  Report written to: ${outputPath}`);
  printDivider("═");
}

async function main() {
  const baseUrl = getArg("base-url", DEFAULT_BASE_URL);
  const judgeEnabled = getArg("judge", "on") === "on";
  await runComparison(baseUrl, judgeEnabled);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
