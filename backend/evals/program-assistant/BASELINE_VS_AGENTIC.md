# Baseline vs Agentic: Program Assistant AI

This document explains the two AI implementations behind `POST /api/programs/:id/assistant` and why the agentic pipeline produces significantly better outputs for application review.

---

## The Endpoint

```
POST /api/programs/:id/assistant
Body: { message: string, mode: "qa" | "review", pendingUploads?: [] }
Auth: student role required (x-demo-user-role, x-demo-user-email)
```

The endpoint dispatches to `createProgramAssistantReply()` in `backend/src/chatService.js`.

---

## Mode 1: QA — Single-Prompt Baseline

**Function:** `createProgramAssistantReply` with `mode="qa"`

**Architecture:** One Claude call. All known facts are injected into a single prompt.

### What happens

```
1. Load program facts from the database (title, eligibility, deadlines, required documents)
2. Fetch the official program webpage via program.externalLink
3. Build a single shared prompt:
   - Actor context (who the student is)
   - Program facts JSON
   - Official page extract (up to ~2000 chars)
   - Student's current application status and reviewer notes
   - Uploaded documents metadata
   - Missing requirements list
4. One Claude call (claude-sonnet-4-5, max 1000 tokens)
5. Return the text response
```

### Prompt structure

```
Current user: <student summary>
Program-specific assistant mode: qa
Student question: <message>

Program facts from the database: [ { index, type, label, text } ... ]

Official program link: <url>
Official program page extract: <scraped text>

Current student application status: <status or "not submitted">
Uploaded files count: <n>
Uploaded application materials: [ { requirementLabel, fileName, extractedText } ... ]
Program file requirements and what is still missing: { required: [...], missing: [...] }

Answer the student's program question using only the grounded information above.
```

### Strengths
- Fast (one round trip)
- Sufficient for factual lookups: eligibility, deadlines, document requirements, dates

### Weaknesses
- No ability to deeply reason across the document content and program requirements simultaneously
- No structured output — returns plain text only
- No rubric derivation — cannot judge application competitiveness

---

## Mode 2: Review — Multi-Step Agentic Pipeline

**Function:** `createProgramAssistantReply` with `mode="review"`

**Architecture:** Up to three Claude calls with intermediate extraction, scraping, and JSON repair steps.

### What happens

```
Step 1 — Fetch application documents
  ↓  prisma: load all documents for this student + program
  ↓  For each document: extract readable text from PDF/plain-text (via pdf-parse)

Step 2 — Merge pending uploads
  ↓  If pendingUploads[] passed in request body, extract text from those too
  ↓  Combine with submitted documents → combinedUploads

Step 3 — Scrape official program page
  ↓  HTTP fetch of program.externalLink
  ↓  Strip HTML tags, trim to ~2000 chars of readable content
  ↓  Inject as linkContext

Step 4 — Build shared evidence prompt
  ↓  Same structure as QA mode but all evidence is now richer:
     - Extracted text from actual uploaded PDF content
     - Live webpage content from the official program page

Step 5 — First Claude call: Narrative review (max 2600 tokens)
  System prompt: "Be brutally honest, evidence-based, program-specific.
                  Do not confuse completeness with competitiveness."
  Returns: Full prose review with strengths, gaps, evidence-backed assessment

Step 6 — Second Claude call: Structured scorecard (max 1600 tokens)
  System prompt: "Generate a dynamic rubric for this specific program.
                  Do not use a fixed generic rubric."
  Input: The shared evidence prompt + the narrative from Step 5
  Returns: JSON scorecard with:
    - overallScore (0–5)
    - overallLabel
    - competitivenessVerdict
    - categories[] with per-category scores and rationale
    - strengths[], gaps[]
    - priorityActions[] with urgency ratings
    - bottomLine

Step 7 — JSON parse + fallback repair (optional third Claude call)
  If Step 6 JSON is malformed:
    → Try extractJsonBlock() + safeParseJsonBlock() repair
    → If still invalid: repairStructuredReviewReportJson() — third Claude call
       that receives the broken JSON and returns a corrected version
  If repair also fails: buildFallbackReviewReport() generates a minimal
    score report from the narrative text alone (no fourth API call)
```

### Why this is better than single-prompt

| Dimension | Baseline (QA / single call) | Agentic (Review / multi-call) |
|-----------|----------------------------|-------------------------------|
| Document content | Only filename and mimeType | Actual extracted PDF text |
| Program page | Fetched once and injected | Fetched once and injected |
| Output format | Plain text | Plain text + structured JSON scorecard |
| Rubric | Generic | Derived dynamically per program |
| Honesty enforcement | Basic system prompt | Dedicated system prompt with specific "completeness ≠ competitiveness" rule |
| Robustness | No fallback | JSON repair → third Claude call → heuristic fallback |
| Token budget | 1000 tokens | 2600 (narrative) + 1600 (scorecard) |

### Evidence from eval results

The review mode produces:
- Structured scorecards with 3–6 program-specific rubric categories
- Priority actions tied to actual program requirements
- Explicit acknowledgement of which documents were readable vs binary-only
- Differentiated verdicts (a student with all documents submitted but weak research background still scores 2.1/5)

The QA baseline with the same question would return a paragraph answer with no numeric score, no per-category breakdown, and no priority action structure.

---

## Running the Eval

```bash
cd backend

# Run all cases (QA + Review)
node evals/program-assistant/runEval.js

# Run only QA cases
node evals/program-assistant/runEval.js --mode qa

# Run only Review cases
node evals/program-assistant/runEval.js --mode review

# Point at a different server
node evals/program-assistant/runEval.js --base-url http://localhost:5001/api

# Skip LLM judge (deterministic checks only)
node evals/program-assistant/runEval.js --judge off
```

Results are written to `evals/program-assistant/results/` as JSON reports.

---

## Eval Metrics

### Deterministic checks
For each case: `expected_facts` must appear in the answer, `must_not_include` must not appear. For review cases with `check_report_structure: true`, the JSON scorecard must be present with a valid `overallScore` (0–5), non-empty `categories[]`, and `priorityActions[]`.

### LLM-as-judge
The judge prompt (`judgePrompt.txt`) scores the assistant on four dimensions (1–5):
- **Correctness** — does the answer address the right program without mixing up universities?
- **Completeness** — does it fully answer the question from available evidence?
- **Groundedness** — are all claims backed by database facts or the official page? No hallucinations?
- **Clarity** — is the response actionable and well-structured for a student?

For review mode, the judge additionally checks:
- Whether uploaded documents are acknowledged
- Whether the answer avoids conflating completeness with competitiveness
- Whether a numeric score is within valid range (awards correctness bonus)

---

## Related files

| File | Purpose |
|------|---------|
| `backend/src/chatService.js` | `createProgramAssistantReply()`, `generateLlmReply()` |
| `backend/evals/program-assistant/cases.json` | 8 eval cases (5 QA, 3 Review) |
| `backend/evals/program-assistant/judgePrompt.txt` | LLM-as-judge scoring instructions |
| `backend/evals/program-assistant/runEval.js` | Eval runner |
| `backend/evals/chat/runEval.js` | General chat eval runner (reference) |
