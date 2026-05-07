const fs = require("fs");
const path = require("path");

const CASES_FILE = path.join(__dirname, "cases.json");
const RESULTS_DIR = path.join(__dirname, "results");
const BACKEND_ENV_PATH = path.join(__dirname, "..", "..", ".env");
const DEFAULT_BASE_URL = process.env.EVAL_BASE_URL || "http://localhost:5001/api";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

loadBackendEnv();

function loadBackendEnv() {
  if (!fs.existsSync(BACKEND_ENV_PATH)) return;
  const lines = fs.readFileSync(BACKEND_ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    if (!key || process.env[key]) continue;
    let value = trimmed.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function getArg(name, fallback) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
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

function deterministicChecks(answer, reportJson, testCase) {
  const normalized = String(answer || "").toLowerCase();
  const mustInclude = testCase.expected_facts || [];
  const mustNotInclude = testCase.must_not_include || [];

  const missing = mustInclude.filter((item) => !normalized.includes(String(item).toLowerCase()));
  const forbidden = mustNotInclude.filter((item) => normalized.includes(String(item).toLowerCase()));

  let reportStructureOk = null;
  if (testCase.check_report_structure) {
    if (!reportJson) {
      reportStructureOk = false;
    } else {
      const score = reportJson.overallScore;
      reportStructureOk =
        typeof score === "number" &&
        score >= 0 &&
        score <= 5 &&
        Array.isArray(reportJson.categories) &&
        reportJson.categories.length > 0 &&
        Array.isArray(reportJson.priorityActions);
    }
  }

  return {
    missing,
    forbidden,
    reportStructureOk,
    passed:
      missing.length === 0 &&
      forbidden.length === 0 &&
      normalized.trim().length > 0 &&
      (testCase.check_report_structure ? reportStructureOk === true : true),
  };
}

async function callProgramAssistant(baseUrl, programId, message, mode) {
  const response = await fetch(`${baseUrl}/programs/${programId}/assistant`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ message, mode }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || `Program assistant request failed with status ${response.status}`);
  }

  return payload.data;
}

async function judgeWithAnthropic(judgePrompt, testCase, answer, reportJson) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const judgeInput = [
    judgePrompt.trim(),
    "",
    "Evaluation case:",
    JSON.stringify(
      {
        id: testCase.id,
        category: testCase.category,
        mode: testCase.mode,
        program: testCase.programTitle,
        question: testCase.input,
        expected_facts: testCase.expected_facts || [],
        must_not_include: testCase.must_not_include || [],
        check_report_structure: testCase.check_report_structure || false,
        has_review_report: Boolean(reportJson),
        review_report_overall_score: reportJson?.overallScore ?? null,
        assistant_answer: answer,
      },
      null,
      2,
    ),
  ].join("\n");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: judgeInput }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic judge failed with ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const outputText = Array.isArray(payload.content)
    ? payload.content
        .filter((item) => item?.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n")
        .trim()
    : "";

  if (!outputText) throw new Error("Anthropic judge returned no text.");

  const start = outputText.indexOf("{");
  const end = outputText.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Judge did not return JSON: ${outputText}`);

  return JSON.parse(outputText.slice(start, end + 1));
}

async function main() {
  const modeFilter = getArg("mode", "all");
  const baseUrl = getArg("base-url", DEFAULT_BASE_URL);
  const judgeEnabled = getArg("judge", "on");

  const allCases = JSON.parse(fs.readFileSync(CASES_FILE, "utf8"));
  const cases = modeFilter === "all" ? allCases : allCases.filter((c) => c.mode === modeFilter);
  const judgePrompt = fs.readFileSync(path.join(__dirname, "judgePrompt.txt"), "utf8");

  ensureResultsDir();

  console.log(`Program Assistant eval — mode filter: ${modeFilter}, cases: ${cases.length}`);
  console.log(`Base URL: ${baseUrl}`);

  const results = [];

  for (const testCase of cases) {
    const startedAt = Date.now();
    console.log(`  Running: ${testCase.id} (${testCase.mode})...`);

    try {
      const data = await callProgramAssistant(baseUrl, testCase.programId, testCase.input, testCase.mode);
      const answer = data.reply || "";
      const reportJson = data.reviewReport || null;

      const checks = deterministicChecks(answer, reportJson, testCase);

      let judgeResult = null;
      if (judgeEnabled === "on" && process.env.ANTHROPIC_API_KEY) {
        try {
          judgeResult = await judgeWithAnthropic(judgePrompt, testCase, answer, reportJson);
        } catch (error) {
          judgeResult = { error: String(error.message || error) };
        }
      }

      results.push({
        id: testCase.id,
        category: testCase.category,
        mode: testCase.mode,
        programId: testCase.programId,
        programTitle: testCase.programTitle,
        input: testCase.input,
        groundTruthLabel: testCase.ground_truth_label,
        responseMode: data.mode,
        answer,
        hasReviewReport: Boolean(reportJson),
        reviewReportScore: reportJson?.overallScore ?? null,
        reviewReportCategories: reportJson?.categories?.length ?? 0,
        deterministic: checks,
        judge: judgeResult,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        mode: testCase.mode,
        programId: testCase.programId,
        programTitle: testCase.programTitle,
        input: testCase.input,
        error: String(error.message || error),
        durationMs: Date.now() - startedAt,
      });
    }
  }

  const passedDeterministic = results.filter((r) => r.deterministic?.passed).length;
  const judgeScores = results
    .map((r) => r.judge)
    .filter((j) => j && typeof j.correctness === "number");

  const qaResults = results.filter((r) => r.mode === "qa");
  const reviewResults = results.filter((r) => r.mode === "review");
  const reviewsWithReport = reviewResults.filter((r) => r.hasReviewReport);

  const summary = {
    modeFilter,
    actor: STUDENT_ACTOR,
    baseUrl,
    total: results.length,
    qaCases: qaResults.length,
    reviewCases: reviewResults.length,
    reviewsWithStructuredReport: reviewsWithReport.length,
    deterministicPassed: passedDeterministic,
    deterministicPassRate: results.length ? Number((passedDeterministic / results.length).toFixed(2)) : 0,
    averageJudgeCorrectness: judgeScores.length
      ? Number((judgeScores.reduce((s, j) => s + j.correctness, 0) / judgeScores.length).toFixed(2))
      : null,
    averageJudgeCompleteness: judgeScores.length
      ? Number((judgeScores.reduce((s, j) => s + j.completeness, 0) / judgeScores.length).toFixed(2))
      : null,
    averageJudgeGroundedness: judgeScores.length
      ? Number((judgeScores.reduce((s, j) => s + j.groundedness, 0) / judgeScores.length).toFixed(2))
      : null,
    averageJudgeClarity: judgeScores.length
      ? Number((judgeScores.reduce((s, j) => s + j.clarity, 0) / judgeScores.length).toFixed(2))
      : null,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  const outputPath = path.join(RESULTS_DIR, `program-assistant-eval-${modeFilter}-${timestampSlug()}.report.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\nResults:`);
  console.log(`  Deterministic pass rate: ${passedDeterministic}/${results.length}`);
  console.log(`  QA cases: ${qaResults.length}, Review cases: ${reviewResults.length}`);
  console.log(`  Reviews with structured report: ${reviewsWithReport.length}/${reviewResults.length}`);
  if (judgeScores.length) {
    console.log(`  Avg judge correctness:   ${summary.averageJudgeCorrectness}`);
    console.log(`  Avg judge completeness:  ${summary.averageJudgeCompleteness}`);
    console.log(`  Avg judge groundedness:  ${summary.averageJudgeGroundedness}`);
    console.log(`  Avg judge clarity:       ${summary.averageJudgeClarity}`);
  } else {
    console.log("  LLM judge: skipped (no ANTHROPIC_API_KEY or --judge off)");
  }
  console.log(`  Report written to: ${outputPath}`);

  const failed = results.filter((r) => r.error || r.deterministic?.passed === false);
  if (failed.length) {
    console.log("\nFailures:");
    for (const r of failed) {
      console.log(`  - ${r.id}: ${r.error || "deterministic mismatch — missing: [" + (r.deterministic?.missing || []).join(", ") + "]"}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
