const fs = require("fs");
const path = require("path");

const CASES_DIR = __dirname;
const RESULTS_DIR = path.join(CASES_DIR, "results");
const BACKEND_ENV_PATH = path.join(__dirname, "..", "..", ".env");
const DEFAULT_BASE_URL = process.env.EVAL_BASE_URL || "http://localhost:5001/api";
const DEFAULT_PROVIDER = process.env.EVAL_JUDGE_PROVIDER || "anthropic";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

loadBackendEnv();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function loadBackendEnv() {
  if (!fs.existsSync(BACKEND_ENV_PATH)) {
    return;
  }

  const lines = fs.readFileSync(BACKEND_ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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

function ensureResultsDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildHeaders(actor) {
  return {
    "Content-Type": "application/json",
    "x-demo-user-role": actor.role,
    "x-demo-user-email": actor.email,
  };
}

function deterministicChecks(answer, testCase) {
  const normalized = String(answer || "").toLowerCase();
  const mustInclude = testCase.expected_facts || [];
  const mustNotInclude = testCase.must_not_include || [];

  const missing = mustInclude.filter((item) => !normalized.includes(String(item).toLowerCase()));
  const forbidden = mustNotInclude.filter((item) => normalized.includes(String(item).toLowerCase()));

  return {
    missing,
    forbidden,
    passed: missing.length === 0 && forbidden.length === 0 && normalized.trim().length > 0,
  };
}

async function callChat(baseUrl, actor, question) {
  const response = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: buildHeaders(actor),
    body: JSON.stringify({ message: question }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || `Chat request failed with status ${response.status}`);
  }

  return payload.data;
}

async function judgeWithAnthropic(promptText, testCase, answer) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const judgeInput = [
    promptText.trim(),
    "",
    "Evaluation case:",
    JSON.stringify(
      {
        id: testCase.id,
        category: testCase.category,
        question: testCase.input,
        expected_facts: testCase.expected_facts || [],
        must_not_include: testCase.must_not_include || [],
        chatbot_answer: answer,
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
      messages: [
        {
          role: "user",
          content: judgeInput,
        },
      ],
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

  if (!outputText) {
    throw new Error("Anthropic judge returned no text.");
  }

  const start = outputText.indexOf("{");
  const end = outputText.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Judge did not return JSON: ${outputText}`);
  }

  return JSON.parse(outputText.slice(start, end + 1));
}

function getSuiteConfig(suite) {
  if (suite === "admin") {
    return {
      actor: {
        role: "admin",
        email: "global.office@plaksha.edu.in",
      },
      file: path.join(CASES_DIR, "cases.admin.json"),
    };
  }

  if (suite === "student") {
    return {
      actor: {
        role: "student",
        email: "aman@student.plaksha.edu.in",
      },
      file: path.join(CASES_DIR, "cases.student.json"),
    };
  }

  if (suite === "mentor") {
    return {
      actor: {
        role: "mentor",
        email: "ananya.mehta@plaksha.edu.in",
      },
      file: path.join(CASES_DIR, "cases.mentor.json"),
    };
  }

  throw new Error(`Unknown suite "${suite}". Use --suite admin, --suite student, or --suite mentor.`);
}

async function main() {
  const suite = getArg("suite", "admin");
  const baseUrl = getArg("base-url", DEFAULT_BASE_URL);
  const judge = getArg("judge", "on");
  const provider = getArg("provider", DEFAULT_PROVIDER);

  const suiteConfig = getSuiteConfig(suite);
  const cases = readJson(suiteConfig.file);
  const judgePrompt = readText(path.join(CASES_DIR, "judgePrompt.txt"));

  ensureResultsDir();

  const results = [];

  for (const testCase of cases) {
    const startedAt = Date.now();

    try {
      const chat = await callChat(baseUrl, suiteConfig.actor, testCase.input);
      const answer = chat.reply || "";
      const checks = deterministicChecks(answer, testCase);

      let judgeResult = null;
      if (judge === "on" && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
        try {
          judgeResult = await judgeWithAnthropic(judgePrompt, testCase, answer);
        } catch (error) {
          judgeResult = {
            error: String(error.message || error),
          };
        }
      }

      results.push({
        id: testCase.id,
        category: testCase.category,
        input: testCase.input,
        mode: chat.mode,
        answer,
        deterministic: checks,
        judge: judgeResult,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        input: testCase.input,
        error: String(error.message || error),
        durationMs: Date.now() - startedAt,
      });
    }
  }

  const passedDeterministic = results.filter((item) => item.deterministic?.passed).length;
  const judgeScores = results
    .map((item) => item.judge)
    .filter((judgeResult) => judgeResult && typeof judgeResult.correctness === "number");

  const summary = {
    suite,
    actor: suiteConfig.actor,
    baseUrl,
    total: results.length,
    deterministicPassed: passedDeterministic,
    deterministicPassRate: results.length ? Number((passedDeterministic / results.length).toFixed(2)) : 0,
    averageJudgeCorrectness: judgeScores.length
      ? Number((judgeScores.reduce((sum, item) => sum + item.correctness, 0) / judgeScores.length).toFixed(2))
      : null,
    averageJudgeCompleteness: judgeScores.length
      ? Number((judgeScores.reduce((sum, item) => sum + item.completeness, 0) / judgeScores.length).toFixed(2))
      : null,
    averageJudgeGroundedness: judgeScores.length
      ? Number((judgeScores.reduce((sum, item) => sum + item.groundedness, 0) / judgeScores.length).toFixed(2))
      : null,
    averageJudgeClarity: judgeScores.length
      ? Number((judgeScores.reduce((sum, item) => sum + item.clarity, 0) / judgeScores.length).toFixed(2))
      : null,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  const outputPath = path.join(RESULTS_DIR, `chat-eval-${suite}-${timestampSlug()}.report.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`Chat eval suite: ${suite}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Deterministic pass rate: ${passedDeterministic}/${results.length}`);
  if (judgeScores.length) {
    console.log(`Average judge correctness: ${summary.averageJudgeCorrectness}`);
    console.log(`Average judge completeness: ${summary.averageJudgeCompleteness}`);
    console.log(`Average judge groundedness: ${summary.averageJudgeGroundedness}`);
    console.log(`Average judge clarity: ${summary.averageJudgeClarity}`);
  } else {
    console.log("LLM judge: skipped or unavailable");
  }
  console.log(`Report written to: ${outputPath}`);

  const failed = results.filter((item) => item.error || item.deterministic?.passed === false || item.judge?.passed === false);
  if (failed.length) {
    console.log("\nFailures / attention cases:");
    for (const item of failed) {
      console.log(`- ${item.id}: ${item.error || item.judge?.reason || "deterministic mismatch"}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
