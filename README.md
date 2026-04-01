# Global Engagement Portal

A portfolio-grade MVP for university Global Engagement / International Programs offices.

This repo preserves the original student-facing prototype and extends it into a connected student + admin platform backed by Prisma + SQLite. Students and admins now operate on the same shared data model, so admin-side changes immediately appear across student-facing flows.

## Product Scope

### Student Side
- Discover featured and full program listings
- Filter and search programs
- Open detailed program views
- Apply to programs and track statuses
- Save programs to a dashboard
- Browse mentors and book advising sessions
- View deadlines, meetings, notifications, and chat history
- Contact the Global Engagement Office
- Use the Global Assistant chatbot

### Admin Side
- Access an internal operations dashboard
- Create, edit, and delete programs
- Create, edit, and delete mentors
- Manage mentor availability
- Create and delete deadlines
- Review applications
- Update application statuses
- Add review notes and nomination notes
- Create nominations and manage the approval queue

## Tech Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- Backend: Express
- Database: Prisma + SQLite
- Chatbot: Rule-based service with an abstraction ready for future LLM mode

## Repo Structure

```text
.
├── src/                    # Next.js frontend
│   ├── app/                # Student and admin routes
│   ├── components/         # Shared UI + app shell
│   ├── lib/                # Frontend helpers
│   ├── services/           # Axios client / API helpers
│   └── types/              # Shared TS types
├── backend/
│   ├── prisma/             # Prisma schema + seed
│   ├── src/
│   │   ├── auth.js         # Demo role/user resolution
│   │   ├── chatService.js  # Rule-based chatbot abstraction
│   │   ├── prisma.js       # Prisma client singleton
│   │   ├── server.js       # Express API layer
│   │   └── utils.js        # Response / serializer helpers
│   └── package.json
└── README.md
```

## Data Model

The SQLite database includes these core models:

- `Student`
- `Admin`
- `Program`
- `Mentor`
- `Availability`
- `Booking`
- `Application`
- `Deadline`
- `ChatInteraction`
- `ContactMessage`
- `Nomination`
- `SavedProgram`
- `NotificationLog`

## API Overview

### Shared / Auth
- `GET /api/health`
- `GET /api/auth/options`
- `GET /api/me`

### Programs
- `GET /api/programs`
- `GET /api/programs/:id`
- `POST /api/programs`
- `PUT /api/programs/:id`
- `DELETE /api/programs/:id`

### Mentors / Availability
- `GET /api/mentors`
- `GET /api/mentors/:id`
- `POST /api/mentors`
- `PUT /api/mentors/:id`
- `DELETE /api/mentors/:id`
- `GET /api/mentors/:id/availability`
- `POST /api/availability`
- `PUT /api/availability/:id`
- `DELETE /api/availability/:id`

### Student Workflows
- `POST /api/bookings`
- `GET /api/bookings/me`
- `DELETE /api/bookings/:id`
- `POST /api/applications`
- `GET /api/applications/me`
- `GET /api/applications/:id`
- `GET /api/deadlines/me`
- `GET /api/meetings/me`
- `GET /api/dashboard/me`
- `POST /api/saved-programs`
- `DELETE /api/saved-programs/:programId`
- `POST /api/contact`

### Chatbot
- `POST /api/chat`
- `GET /api/chat/history`
- `PUT /api/chat/context`

### Admin Operations
- `GET /api/admin/dashboard`
- `GET /api/admin/approval-queue`
- `GET /api/applications`
- `PUT /api/applications/:id/status`
- `PUT /api/applications/:id/review-notes`
- `POST /api/nominations`
- `GET /api/nominations`
- `POST /api/deadlines`
- `PUT /api/deadlines/:id`
- `DELETE /api/deadlines/:id`

All API responses now follow a consistent JSON envelope:

```json
{
  "success": true,
  "data": {}
}
```

or

```json
{
  "success": false,
  "error": "Something went wrong"
}
```

## Local Setup

### Requirements

- Node.js 20+ recommended
- npm 10+ recommended

### 1. Install dependencies

```bash
npm install
```

The root `postinstall` script also installs backend dependencies.

### 2. Prepare the database

```bash
npm run db:setup
```

This will:

- create / update the SQLite schema
- generate the Prisma client
- seed demo data

### 3. Start frontend + backend

```bash
npm run dev:full
```

### URLs

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5001/api/health`

## Demo Auth / Roles

This MVP uses simple seeded local role switching instead of production auth.

Use the navbar selector to switch between:

- Students:
  - `Aman Sharma`
  - `Ria Mehta`
- Admin:
  - `Global Engagement Officer`

The selected role/user is stored in local storage and sent to the backend through request headers. This keeps the demo fast while still enforcing role-based behavior in the API.

## Seeded Data

The database seed includes:

- 5 programs
- 3 mentors
- seeded mentor availability
- 2 students
- 1 admin
- seeded applications across multiple statuses
- seeded bookings
- seeded nomination and notification data
- seeded chatbot history

## Chatbot Modes

The backend chatbot is intentionally structured for future upgrades.

Current mode:
- `rule_based`

Future-ready direction:
- `llm`
  - OpenAI API
  - Claude API

Today, `backend/src/chatService.js` uses database-aware rules to answer questions about programs, deadlines, mentor booking, approvals, and nominations while storing chat history in the database.

## Notes

- Student and admin views are synchronized through the same Prisma/SQLite database.
- If an admin updates a program, mentor, deadline, or application, the student-facing UI will reflect it on the next fetch.
- `NEXT_PUBLIC_API_URL` can be set in `.env.local` if the frontend should talk to a different backend base URL.
- The backend defaults to port `5001` to avoid common macOS conflicts on `5000`.
- The backend SQLite database lives under `backend/dev.db` after setup and is ignored by git.

## Current Caveat

This workspace did not have `node` or `npm` available during implementation, so I could not run `npm install`, Prisma generation, or lint/build verification inside this environment. The codebase has been updated to be setup-ready for a normal Node environment, and the first thing to run locally is:

```bash
npm install
npm run db:setup
npm run dev:full
```
