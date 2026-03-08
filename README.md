# Plaksha Global Engagement Portal

A functional full-stack demo with a Next.js frontend and Express backend.

## What works
- Programs page with live backend data
- Mentor list and date-wise availability
- Booking a mentor meeting
- Dashboard summary, applications, deadlines, meetings
- Contact form submission
- Global Assistant chatbot replies

## Run locally

### 1) Install everything
```bash
npm install
```
This also installs backend dependencies automatically.

### 2) Start frontend + backend together
```bash
npm run dev:full
```

### App URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api/health

## Notes
- Data is stored in memory, so new bookings/messages reset when the backend restarts.
- If port 5000 is busy, edit `backend/src/server.js`.
- If you want to change the frontend API base URL, set `NEXT_PUBLIC_API_URL` in `.env.local`.
