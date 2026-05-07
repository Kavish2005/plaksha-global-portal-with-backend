# Plaksha Global Engagement Portal — Feature Reference

A full-stack portal for Plaksha University's Global Engagement Office (OGE), enabling students to discover, apply for, and track international opportunities, while mentors, reviewers, and admins manage the end-to-end application workflow.

---

## Table of Contents

1. [Authentication & Role-Based Access](#1-authentication--role-based-access)
2. [Student Dashboard](#2-student-dashboard)
3. [Program Browser & Discovery](#3-program-browser--discovery)
4. [AI Opportunity Discovery](#4-ai-opportunity-discovery)
5. [Program Assistant AI](#5-program-assistant-ai)
6. [Application Submission & Tracking](#6-application-submission--tracking)
7. [Mentor Booking](#7-mentor-booking)
8. [Admin Workflow Manager](#8-admin-workflow-manager)
9. [Reviewer Dashboard](#9-reviewer-dashboard)
10. [Global Knowledge Base](#10-global-knowledge-base)
11. [Notifications](#11-notifications)
12. [AI Evaluation Framework](#12-ai-evaluation-framework)

---

## 1. Authentication & Role-Based Access

The portal supports four roles with fully separate dashboards and data access:

| Role | Email pattern | What they see |
|------|--------------|---------------|
| **Student** | `@student.plaksha.edu.in` | Dashboard, programs, applications, mentor booking, assistant |
| **Admin (OGE)** | `global.office@plaksha.edu.in` | All applications, workflow management, program CRUD, mentor CRUD |
| **Mentor** | `@plaksha.edu.in` (mentor) | Availability management, student bookings, knowledge base |
| **Reviewer** | external emails | Only their assigned review requests from OGE |

Authentication uses demo header-based auth (`x-demo-user-email`, `x-demo-user-role`) for development, with role enforcement on every API route.

> [Screenshot: Login page with role selector showing Student / Admin / Mentor / Reviewer tiles]

---

## 2. Student Dashboard

The student home screen aggregates all activity into one view.

**Summary metrics** — four stat cards at the top:
- Applications submitted
- Upcoming deadlines
- Mentor meetings booked
- Programs saved

**Quick-access tabs:**
- **My Applications** — status badges (Draft → Submitted → Under Review → Approved/Nominated/Rejected), expandable per-application detail with review progress
- **Upcoming Deadlines** — sorted by date with priority colour-coding and required documents per deadline
- **My Meetings** — upcoming mentor bookings with mentor name, expertise, date and time
- **Saved Programs** — bookmarked programs for later

> [Screenshot: Student dashboard overview with metric cards and application cards]

---

## 3. Program Browser & Discovery

Browse the full catalog of international exchange and research programs.

**Features:**
- Filter by country, type (Exchange / Research / Fellowship), and tags
- Full-text search
- Program detail sheet with eligibility, duration, start/end dates, external link, and all deadlines
- Save/unsave programs (persisted to student profile)
- Start application directly from the program page

> [Screenshot: Program grid with filter sidebar, one card expanded showing deadlines and Apply button]

---

## 4. AI Opportunity Discovery

**Endpoint:** `POST /api/chat/discover-opportunities`

**Powered by:** Claude (Anthropic) with real-time web search and structured extraction

Students describe what they are looking for in plain language (e.g. "AI internship in Europe, Summer 2025, no IELTS required"). The system:

1. Normalises the natural-language request
2. Generates targeted search queries
3. Scrapes and parses web results
4. Ranks matches by confidence tier (`best_match`, `strong_match`, `needs_manual_review`)
5. Returns structured opportunity cards with fit rationale, eligibility summary, timing, deadline, and source link

Each result card includes a **"Save to Portal"** action that drafts the program into the admin program database for OGE to confirm.

> [Screenshot: Opportunity Discovery chat input and result cards with confidence tier badges]

---

## 5. Program Assistant AI

**Endpoint:** `POST /api/programs/:id/assistant`

A per-program conversational assistant with two modes:

### 5.1 QA Mode (`mode=qa`)

**Architecture:** Single Claude call (grounded)

Students ask program-specific questions. The assistant:
- Retrieves database facts for the program (eligibility, deadlines, documents required)
- Fetches the official program webpage via `externalLink` for live content
- Injects all facts into a single prompt and returns a grounded answer

### 5.2 Review Mode (`mode=review`)

**Architecture:** Multi-step agentic pipeline

Students request a readiness assessment. The system:

1. Fetches the student's submitted application documents from the database
2. Extracts readable text from PDFs and plain-text uploads
3. Scrapes the official program webpage for current eligibility requirements
4. Builds a structured prompt with all gathered evidence
5. **First Claude call** — generates a candid narrative review (strengths, gaps, missing requirements)
6. **Second Claude call** — generates a structured JSON scorecard with dynamic rubric derived from the program, category scores, and priority actions
7. Falls back to JSON repair via a third Claude call if the scorecard is malformed

The response includes both the narrative text and a rendered scorecard card with overall score, category breakdown, and priority action list.

> [Screenshot: Program assistant in review mode — narrative on left, scorecard card on right with score gauge]

---

## 6. Application Submission & Tracking

### Student side

- Draft application with personal statement
- Upload documents per deadline requirement (PDF, Word, plain text)
- Submit when ready
- View review progress as a stage-by-stage timeline
- Receive real-time notifications when OGE updates their stage

### Student Application Detail

Progress is shown as a clean stage list (no reviewer identities exposed):
- Each stage shows its status badge: Pending / Active / Approved / Changes Requested / Rejected
- Student-visible update messages from OGE shown per stage
- "Your application is currently under review by the Global Engagement Office" — reviewer identities are never surfaced to students

> [Screenshot: Student application detail with stage progress timeline]

---

## 7. Mentor Booking

Students can browse the mentor directory and book one-on-one sessions.

**Features:**
- Mentor cards with expertise, bio, and region
- Availability calendar — only open slots are shown
- Book a slot with a topic/agenda
- View and cancel upcoming bookings from the dashboard
- Mentors see all their upcoming student bookings

> [Screenshot: Mentor availability calendar with booked slot highlighted]

---

## 8. Admin Workflow Manager

The OGE admin panel is the core operations hub.

### Program Management
- Create, edit, and delete programs
- Set deadlines with required documents and priorities
- Feature/unfeature programs in the student-facing catalog

### Mentor Management
- Add and edit mentor profiles (name, bio, expertise, region)
- Manage availability slots
- View upcoming and past bookings across all mentors

### Application Workflow

Each application card in the workflow manager shows:

**Tabbed action panel:**
- **Notes & Update** tab — write internal notes and a student-facing update for the current stage
- **Send Request** tab — send an advisory communication request to an external reviewer or stakeholder (does not move the stage; recipient responds back to OGE only)
- **Decisions** tab — move the application to a new stage (with custom label and assigned reviewer), approve, nominate, or reject

**Stage timeline** (slim right column):
- Chronological list of all stages with status badges
- Nominations block showing who nominated and when

**OGE as sole controller:** Only OGE creates stages, moves applications, and makes final decisions. External reviewers are advisory only.

> [Screenshot: Admin application card with tabbed action panel — Decisions tab open with stage form]

### Approval Queue
- Tabs: Submitted / Under Review / Approved / Nominated / Rejected
- Bulk view of all applications per status

---

## 9. Reviewer Dashboard

External reviewers receive advisory requests from OGE. Their dashboard is intentionally simple:

- Shows each assigned review request with OGE's instructions
- Lists the student's uploaded documents for that application
- Response panel with free-text notes
- Three response actions: **Responded** / **Info Requested** / **Rejected Recommendation**
- Responses are sent back to OGE only — reviewers never move the application themselves

> [Screenshot: Reviewer task card showing instructions, document list, and response buttons]

---

## 10. Global Knowledge Base

Admins and mentors can upload reference documents (PDF or plain text) that the chatbot uses as grounded context.

- **Admins** can manage all documents
- **Mentors** can manage only documents they uploaded
- Documents are tagged with source type and uploader role
- The chatbot retrieves relevant documents using keyword matching and injects excerpts into every chat prompt

> [Screenshot: Knowledge base list with upload button and manage/delete per document]

---

## 11. Notifications

Students receive in-app notifications when OGE updates their application stage with a student-visible message.

- Notification bell in the nav with unread count
- Notification items link to the relevant application
- Notifications persist per student

> [Screenshot: Notification dropdown with unread badge]

---

## 12. AI Evaluation Framework

### 12.1 General Chat Eval (`backend/evals/chat/`)

Tests the `POST /api/chat` grounded chatbot across three actor types:

| Suite | Actor | Cases | Deterministic pass | Avg judge score |
|-------|-------|-------|-------------------|----------------|
| student | aman@student.plaksha.edu.in | 10 | 9/10 | 4.7 / 5 |
| admin | global.office@plaksha.edu.in | 10 | 8/10 | 4.8 / 5 |
| mentor | ananya.mehta@plaksha.edu.in | 10 | — | — |

**Run:**
```bash
cd backend
node evals/chat/runEval.js --suite student
node evals/chat/runEval.js --suite admin
node evals/chat/runEval.js --suite mentor
```

### 12.2 Program Assistant Eval (`backend/evals/program-assistant/`)

Tests `POST /api/programs/:id/assistant` in both QA and Review modes.

Covers: program facts accuracy, missing document detection, scorecard structure validation, hallucination prevention.

**Run:**
```bash
cd backend
node evals/program-assistant/runEval.js
node evals/program-assistant/runEval.js --mode review
```

See [`backend/evals/program-assistant/BASELINE_VS_AGENTIC.md`](backend/evals/program-assistant/BASELINE_VS_AGENTIC.md) for a full comparison of the single-prompt baseline vs the multi-step agentic pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | SQLite via Prisma ORM |
| AI | Anthropic Claude (claude-sonnet-4-5) |
| Auth | Demo header-based (role + email headers) |
