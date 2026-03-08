const express = require("express");
const cors = require("cors");
const {
  programs,
  mentors,
  slotTemplates,
  applications,
  bookings,
  contactMessages,
  chatHistory,
} = require("./data");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const studentIdFromRequest = (req) => Number(req.query.studentId || 1);

const enrichApplication = (application) => {
  const program = programs.find((item) => item.id === application.programId);
  return {
    ...application,
    programTitle: program?.title || "Unknown Program",
    deadline: program?.deadline || null,
  };
};

const enrichBooking = (booking) => {
  const mentor = mentors.find((item) => item.id === booking.mentorId);
  return {
    ...booking,
    mentorName: mentor?.name || "Unknown Mentor",
    expertise: mentor?.expertise || "",
  };
};

const getAvailabilityForMentor = (mentorId, date) => {
  const template = slotTemplates[mentorId] || [];
  const bookedTimes = bookings
    .filter(
      (booking) => booking.mentorId === mentorId && booking.date === date && booking.status !== "Cancelled",
    )
    .map((booking) => booking.time);

  return template.map((time) => ({
    time,
    available: !bookedTimes.includes(time),
  }));
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/programs", (req, res) => {
  const { search = "", type = "", featured } = req.query;
  let results = [...programs];

  if (type) {
    results = results.filter((program) => program.type.toLowerCase() === String(type).toLowerCase());
  }

  if (search) {
    const query = String(search).toLowerCase();
    results = results.filter(
      (program) =>
        program.title.toLowerCase().includes(query) ||
        program.country.toLowerCase().includes(query) ||
        program.university.toLowerCase().includes(query),
    );
  }

  if (featured === "true") {
    results = results.filter((program) => program.featured);
  }

  res.json(results);
});

app.get("/api/programs/:id", (req, res) => {
  const program = programs.find((item) => item.id === Number(req.params.id));
  if (!program) {
    return res.status(404).json({ message: "Program not found." });
  }
  return res.json(program);
});

app.get("/api/mentors", (_req, res) => {
  res.json(mentors);
});

app.get("/api/mentors/:id", (req, res) => {
  const mentor = mentors.find((item) => item.id === Number(req.params.id));
  if (!mentor) {
    return res.status(404).json({ message: "Mentor not found." });
  }
  return res.json(mentor);
});

app.get("/api/mentors/:id/availability", (req, res) => {
  const mentorId = Number(req.params.id);
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required." });
  }

  const mentor = mentors.find((item) => item.id === mentorId);
  if (!mentor) {
    return res.status(404).json({ message: "Mentor not found." });
  }

  return res.json({
    mentorId,
    date,
    slots: getAvailabilityForMentor(mentorId, String(date)),
  });
});

app.post("/api/bookings", (req, res) => {
  const { mentorId, date, time, topic = "", studentId = 1 } = req.body;

  if (!mentorId || !date || !time) {
    return res.status(400).json({ message: "mentorId, date, and time are required." });
  }

  const mentor = mentors.find((item) => item.id === Number(mentorId));
  if (!mentor) {
    return res.status(404).json({ message: "Mentor not found." });
  }

  const availableSlots = getAvailabilityForMentor(Number(mentorId), date);
  const selectedSlot = availableSlots.find((slot) => slot.time === time);

  if (!selectedSlot || !selectedSlot.available) {
    return res.status(409).json({ message: "That slot is no longer available." });
  }

  const newBooking = {
    id: bookings.length + 1,
    mentorId: Number(mentorId),
    studentId: Number(studentId),
    date,
    time,
    topic,
    status: "Confirmed",
  };

  bookings.push(newBooking);
  return res.status(201).json(enrichBooking(newBooking));
});

app.get("/api/bookings/me", (req, res) => {
  const studentId = studentIdFromRequest(req);
  const studentBookings = bookings
    .filter((booking) => booking.studentId === studentId)
    .map(enrichBooking)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  res.json(studentBookings);
});

app.delete("/api/bookings/:id", (req, res) => {
  const booking = bookings.find((item) => item.id === Number(req.params.id));
  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }
  booking.status = "Cancelled";
  return res.json({ message: "Booking cancelled." });
});

app.get("/api/applications/me", (req, res) => {
  const studentId = studentIdFromRequest(req);
  res.json(applications.filter((item) => item.studentId === studentId).map(enrichApplication));
});

app.get("/api/deadlines/me", (req, res) => {
  const studentId = studentIdFromRequest(req);
  const results = applications
    .filter((item) => item.studentId === studentId)
    .map(enrichApplication)
    .map((item) => ({
      programId: item.programId,
      programTitle: item.programTitle,
      deadline: item.deadline,
      status: item.status,
    }))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));

  res.json(results);
});

app.get("/api/meetings/me", (req, res) => {
  const studentId = studentIdFromRequest(req);
  res.json(bookings.filter((item) => item.studentId === studentId).map(enrichBooking));
});

app.get("/api/dashboard/me", (req, res) => {
  const studentId = studentIdFromRequest(req);
  const applicationResults = applications.filter((item) => item.studentId === studentId);
  const meetingResults = bookings.filter((item) => item.studentId === studentId && item.status !== "Cancelled");
  const deadlineResults = applicationResults.map(enrichApplication);

  res.json({
    applicationsCount: applicationResults.length,
    mentorMeetingsCount: meetingResults.length,
    deadlinesCount: deadlineResults.length,
  });
});

app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: "Name, email, and message are required." });
  }

  const contactEntry = {
    id: contactMessages.length + 1,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  };
  contactMessages.push(contactEntry);

  return res.status(201).json({
    success: true,
    message: "Your message has been submitted to the Global Engagement Office.",
  });
});

app.post("/api/chat", (req, res) => {
  const { message, sessionId = "default-session" } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ message: "Message is required." });
  }

  const text = String(message).toLowerCase();
  let reply =
    "I can help you explore programs, deadlines, mentor bookings, or the contact office. Try asking about research programs, exchanges, or how to book a mentor.";

  if (text.includes("mentor") || text.includes("book")) {
    reply = "You can book a mentor by selecting a mentor, choosing a date, picking an available slot, and confirming the booking on the Mentors page.";
  } else if (text.includes("deadline")) {
    reply = "Current deadlines include ETH Zurich Exchange on 12 May 2026, Stanford Summer Research on 10 June 2026, and Tokyo AI Lab on 1 July 2026.";
  } else if (text.includes("research")) {
    reply = "Featured research-oriented options include Stanford Summer Research and Tokyo AI Lab. Both are available on the Programs page.";
  } else if (text.includes("exchange")) {
    reply = "Exchange opportunities currently include ETH Zurich Exchange and NUS Innovation Exchange.";
  } else if (text.includes("contact")) {
    reply = "You can use the Contact page to send a message to the Global Engagement Office, or call the office directly from the contact details section.";
  }

  chatHistory.push({
    id: chatHistory.length + 1,
    sessionId,
    userMessage: message,
    botMessage: reply,
    createdAt: new Date().toISOString(),
  });

  return res.json({ reply });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
