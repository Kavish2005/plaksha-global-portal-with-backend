# Global Engagement Portal

A portfolio-grade MVP for university Global Engagement / International Programs offices.

This repo preserves the original student-facing prototype and extends it into a connected student + admin platform backed by Prisma and a shared database. Students, admins, mentors, and reviewers can operate on the same live data model when the app is deployed against one shared backend and one shared Postgres database.

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
- Database: Prisma + PostgreSQL
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

The PostgreSQL database includes these core models:

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
- `POST /api/auth/login`
- `POST /api/auth/logout`
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

Create:

- `.env.local` in the repo root
- `.env` inside `backend/`

Example root `.env.local`:

```bash
NEXT_PUBLIC_API_URL="http://localhost:5001/api"
```

Example `backend/.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/plaksha_global_portal?sslmode=require"
PORT="5001"
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-sonnet-4-5"
FRONTEND_URL="http://localhost:3000"
FRONTEND_URLS="http://localhost:3000"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
SMTP_SECURE="false"
```

Then:

```bash
npm run db:setup
```

This will:

- create / update the PostgreSQL schema
- generate the Prisma client
- seed demo data

### 3. Start frontend + backend

```bash
npm run dev:full
```

### URLs

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5001/api/health`

## Production Deployment

To make the app usable by multiple people at the same time, you need:

1. one deployed frontend
2. one deployed backend
3. one shared Postgres database

That way:

- one user can log in as student
- another as admin / OGE
- another as mentor or reviewer
- all changes are reflected everywhere because everyone is using the same backend and database

### Recommended setup

- Frontend: Vercel
- Backend: Render web service
- Database: Neon Postgres
- Email: SMTP provider (Gmail app password, SendGrid SMTP, Mailgun SMTP, etc.)

### Step 1. Create the shared Postgres database

Create a hosted Postgres database, for example on Neon.

Copy its connection string into:

- local `backend/.env`
- deployed backend environment variables

The variable must be:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/plaksha_global_portal?sslmode=require"
```

### Step 2. Push schema and seed the shared DB

Before deploying or right after first deploy:

```bash
cd backend
npx prisma db push
npx prisma generate
node prisma/seed.js
```

This seeds:

- the admin / OGE account
- reviewer accounts
- programs
- mentors
- demo students

### Step 3. Deploy the backend

Deploy the `backend` service as a Node web service.

Required environment variables:

- `DATABASE_URL`
- `PORT`
- `FRONTEND_URL`
- `FRONTEND_URLS`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`

Recommended backend commands:

- Install:

```bash
npm install
```

- Start:

```bash
npm run start
```

If the deployment service uses the repo root instead of the backend folder, use:

```bash
npm --prefix backend install
npm --prefix backend run start
```

### Step 4. Deploy the frontend

Deploy the root Next.js app to Vercel.

Set:

```bash
NEXT_PUBLIC_API_URL="https://YOUR-BACKEND-DOMAIN/api"
```

Example:

```bash
NEXT_PUBLIC_API_URL="https://plaksha-global-portal-api.onrender.com/api"
```

### Step 5. Allow the frontend origin in the backend

On the backend deployment, set:

```bash
FRONTEND_URL="https://YOUR-FRONTEND-DOMAIN"
FRONTEND_URLS="https://YOUR-FRONTEND-DOMAIN,https://YOUR-VERCEL-PREVIEW-DOMAIN"
```

The backend now enforces CORS against these origins, so this step is required.

### Step 6. Verify the shared app

After deployment:

1. log in on one machine as student
2. log in on another machine as admin / OGE
3. log in on another machine as mentor or reviewer
4. make a change in one role
5. confirm it appears for the others

That confirms everyone is using the same backend + database.

## Shared demo accounts

After seeding the shared database, these accounts should exist:

- Admin / OGE:
  - `global.office@plaksha.edu.in`
- Reviewers:
  - `studentlife@plaksha.edu.in`
  - `ugacademics@plaksha.edu.in`
  - `dean.office@plaksha.edu.in`

Students can also be created dynamically through the login flow.

## Login / Roles

The app now uses a simple role-based login flow.

- Students sign in from `/login` with name and email.
- If a student email does not exist yet, the backend creates a new student record automatically.
- Admins sign in from `/login` with an approved office account already present in the database.
- Mentors sign in from `/login` using their existing mentor account from a dropdown.

The active user is stored locally in the browser and attached to API requests so the backend can enforce student-only and admin-only routes.

Current seeded staff accounts include:

- Global Engagement Officer
- Rupsy Grewal
- Harshita Tripathi
- Ananya Mehta

## Seeded Data

The database seed includes:

- 5 programs
- 3 mentors
- seeded mentor availability
- 2 seeded students to demonstrate existing activity
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

- Student, admin, mentor, and reviewer views are synchronized through the same shared Postgres database.
- If an admin updates a program, mentor, deadline, or application, the student-facing UI will reflect it on the next fetch.
- `NEXT_PUBLIC_API_URL` can be set in `.env.local` if the frontend should talk to a different backend base URL.
- The backend defaults to port `5001` to avoid common macOS conflicts on `5000`.
- For production/shared use, all users must point to the same deployed backend and the same `DATABASE_URL`.

## Current Caveat

After changing the datasource from SQLite to PostgreSQL, the first local/prod setup run should be:

```bash
npm install
npm run db:setup
npm run dev:full
```
