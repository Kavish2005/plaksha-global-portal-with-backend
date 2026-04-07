const express = require("express");
const cors = require("cors");
const prisma = require("./prisma");
const { requireAdmin, requireMentor, requireOfficeOrMentor, requireStudent, resolveActor } = require("./auth");
const { respond } = require("./chatService");
const {
  failure,
  formatApplication,
  formatAvailability,
  formatBooking,
  formatChatInteraction,
  formatDeadline,
  formatKnowledgeDocument,
  formatMentor,
  formatNotification,
  formatProgram,
  getTagsJson,
  normalizeDateString,
  success,
} = require("./utils");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.use(async (req, _res, next) => {
  req.actor = await resolveActor(req);
  next();
});

function sendError(res, error, status = 400, details) {
  return res.status(status).json({
    success: false,
    error,
    ...(details ? { details } : {}),
  });
}

function parseTags(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseProgramPayload(body) {
  const {
    title,
    university,
    country,
    type,
    description,
    eligibility,
    duration,
    featured,
    tags,
  } = body;

  if (!title || !university || !country || !type || !description || !eligibility || !duration) {
    return failure(
      "title, university, country, type, description, eligibility, and duration are required.",
      400,
    );
  }

  return {
    title: String(title).trim(),
    university: String(university).trim(),
    country: String(country).trim(),
    type: String(type).trim(),
    description: String(description).trim(),
    eligibility: String(eligibility).trim(),
    duration: String(duration).trim(),
    featured: Boolean(featured),
    tagsJson: getTagsJson(parseTags(tags)),
  };
}

function parseMentorPayload(body) {
  const { name, email, expertise, bio, region } = body;
  if (!name || !email || !expertise || !bio || !region) {
    return failure("name, email, expertise, bio, and region are required.", 400);
  }

  return {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    expertise: String(expertise).trim(),
    bio: String(bio).trim(),
    region: String(region).trim(),
  };
}

function parseDeadlinePayload(body) {
  const { programId, title, date, priority } = body;
  if (!programId || !title || !date || !priority) {
    return failure("programId, title, date, and priority are required.", 400);
  }

  return {
    programId: Number(programId),
    title: String(title).trim(),
    date: new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`),
    priority: String(priority).trim(),
  };
}

function parseAvailabilityPayload(body) {
  const { mentorId, date, slot } = body;
  if (!mentorId || !date || !slot) {
    return failure("mentorId, date, and slot are required.", 400);
  }

  return {
    mentorId: Number(mentorId),
    date: new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`),
    slot: String(slot).trim(),
  };
}

function parseKnowledgeDocumentPayload(body) {
  const { title, content, sourceType } = body;
  if (!title || !content) {
    return failure("title and content are required.", 400);
  }

  const normalizedContent = String(content).trim();
  if (normalizedContent.length < 20) {
    return failure("Please provide at least 20 characters of document content.", 400);
  }

  return {
    title: String(title).trim(),
    content: normalizedContent,
    sourceType: String(sourceType || "text").trim().toLowerCase(),
  };
}

async function requireAdminResponse(req, res) {
  if (!requireAdmin(req.actor)) {
    sendError(res, "Admin access required.", 403);
    return false;
  }
  return true;
}

async function requireStudentResponse(req, res) {
  if (!requireStudent(req.actor)) {
    sendError(res, "Student access required.", 403);
    return false;
  }
  return true;
}

async function requireOfficeOrMentorResponse(req, res) {
  if (!requireOfficeOrMentor(req.actor)) {
    sendError(res, "Office or mentor access required.", 403);
    return false;
  }
  return true;
}

async function createStatusNotification(application, status) {
  await prisma.notificationLog.create({
    data: {
      studentId: application.studentId,
      applicationId: application.id,
      title: `Application status updated: ${status}`,
      message: `Your application for ${application.program.title} is now marked as ${status}.`,
    },
  });
}

app.get("/api/health", async (_req, res) => {
  const studentCount = await prisma.student.count();
  const adminCount = await prisma.admin.count();
  res.json(
    success({
      ok: true,
      studentCount,
      adminCount,
    }),
  );
});

app.get("/api/auth/options", async (_req, res) => {
  const [admins, mentors] = await Promise.all([
    prisma.admin.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.mentor.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  res.json(
    success({
      admins: admins.map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      })),
      mentors: mentors.map((mentor) => ({
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
        role: "mentor",
      })),
    }),
  );
});

app.post("/api/auth/login", async (req, res) => {
  const { role, email, name } = req.body;

  if (!role || !email) {
    return sendError(res, "role and email are required.", 400);
  }

  const normalizedRole = String(role).toLowerCase();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedName = String(name || "").trim();

  if (!normalizedEmail.includes("@")) {
    return sendError(res, "Please enter a valid email address.", 400);
  }

  if (normalizedRole === "student") {
    if (!normalizedName) {
      return sendError(res, "name is required for student login.", 400);
    }

    const student = await prisma.student.upsert({
      where: { email: normalizedEmail },
      update: {
        name: normalizedName,
      },
      create: {
        name: normalizedName,
        email: normalizedEmail,
      },
    });

    return res.json(
      success({
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      }),
    );
  }

  if (normalizedRole === "admin") {
    const admin = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      return sendError(res, "Admin account not found for that email.", 404);
    }

    return res.json(
      success({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      }),
    );
  }

  if (normalizedRole === "mentor") {
    const mentor = await prisma.mentor.findUnique({
      where: { email: normalizedEmail },
    });

    if (!mentor) {
      return sendError(res, "Mentor account not found for that email.", 404);
    }

    return res.json(
      success({
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
        role: "mentor",
      }),
    );
  }

  return sendError(res, "Unsupported login role.", 400);
});

app.post("/api/auth/logout", async (_req, res) => {
  return res.json(success({ ok: true }));
});

app.get("/api/me", async (req, res) => {
  if (!req.actor) {
    return sendError(res, "No active user.", 404);
  }

  const payload =
    req.actor.type === "admin"
      ? { id: req.actor.admin.id, name: req.actor.admin.name, email: req.actor.admin.email, role: "admin" }
      : req.actor.type === "mentor"
        ? { id: req.actor.mentor.id, name: req.actor.mentor.name, email: req.actor.mentor.email, role: "mentor" }
        : { id: req.actor.student.id, name: req.actor.student.name, email: req.actor.student.email, role: "student" };

  return res.json(success(payload));
});

app.get("/api/programs", async (req, res) => {
  const { search = "", type = "", featured, country = "", university = "" } = req.query;

  const where = {
    ...(type ? { type: { contains: String(type) } } : {}),
    ...(country ? { country: { contains: String(country) } } : {}),
    ...(university ? { university: { contains: String(university) } } : {}),
    ...(featured === "true" ? { featured: true } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: String(search) } },
            { university: { contains: String(search) } },
            { country: { contains: String(search) } },
            { tagsJson: { contains: String(search) } },
          ],
        }
      : {}),
  };

  const programs = await prisma.program.findMany({
    where,
    include: {
      deadlines: {
        orderBy: { date: "asc" },
      },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });

  res.json(success(programs.map(formatProgram)));
});

app.get("/api/programs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      deadlines: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!program) {
    return sendError(res, "Program not found.", 404);
  }

  let application = null;
  let isSaved = false;

  if (req.actor?.type === "student") {
    const [existingApplication, saved] = await Promise.all([
      prisma.application.findFirst({
        where: {
          programId: id,
          studentId: req.actor.student.id,
        },
        include: {
          student: true,
          program: { include: { deadlines: true } },
          approvedByAdmin: true,
          nominations: { include: { admin: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.savedProgram.findUnique({
        where: {
          studentId_programId: {
            studentId: req.actor.student.id,
            programId: id,
          },
        },
      }),
    ]);

    application = existingApplication ? formatApplication(existingApplication) : null;
    isSaved = Boolean(saved);
  }

  return res.json(
    success({
      ...formatProgram(program),
      myApplication: application,
      isSaved,
    }),
  );
});

app.post("/api/programs", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const payload = parseProgramPayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const program = await prisma.program.create({
    data: payload,
    include: { deadlines: true },
  });

  res.status(201).json(success(formatProgram(program)));
});

app.put("/api/programs/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const payload = parseProgramPayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const existing = await prisma.program.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, "Program not found.", 404);
  }

  const program = await prisma.program.update({
    where: { id },
    data: payload,
    include: {
      deadlines: {
        orderBy: { date: "asc" },
      },
    },
  });

  res.json(success(formatProgram(program)));
});

app.delete("/api/programs/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const existing = await prisma.program.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, "Program not found.", 404);
  }

  await prisma.program.delete({ where: { id } });
  res.json(success({ id }));
});

app.get("/api/mentors", async (_req, res) => {
  const mentors = await prisma.mentor.findMany({
    orderBy: { name: "asc" },
  });

  res.json(success(mentors.map(formatMentor)));
});

app.get("/api/mentors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const mentor = await prisma.mentor.findUnique({
    where: { id },
  });

  if (!mentor) {
    return sendError(res, "Mentor not found.", 404);
  }

  res.json(success(formatMentor(mentor)));
});

app.post("/api/mentors", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const payload = parseMentorPayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const mentor = await prisma.mentor.create({
    data: payload,
  });

  res.status(201).json(success(formatMentor(mentor)));
});

app.put("/api/mentors/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const payload = parseMentorPayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const mentor = await prisma.mentor.findUnique({ where: { id } });
  if (!mentor) {
    return sendError(res, "Mentor not found.", 404);
  }

  const updated = await prisma.mentor.update({
    where: { id },
    data: payload,
  });

  res.json(success(formatMentor(updated)));
});

app.delete("/api/mentors/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const mentor = await prisma.mentor.findUnique({ where: { id } });
  if (!mentor) {
    return sendError(res, "Mentor not found.", 404);
  }

  await prisma.mentor.delete({ where: { id } });
  res.json(success({ id }));
});

app.get("/api/mentors/:id/availability", async (req, res) => {
  const id = Number(req.params.id);
  const { date } = req.query;

  if (!date) {
    return sendError(res, "Date is required.", 400);
  }

  const mentor = await prisma.mentor.findUnique({ where: { id } });
  if (!mentor) {
    return sendError(res, "Mentor not found.", 404);
  }

  const slots = await prisma.availability.findMany({
    where: {
      mentorId: id,
      date: new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`),
    },
    orderBy: { slot: "asc" },
  });

  res.json(
    success({
      mentorId: id,
      date: String(date),
      slots: slots.map(formatAvailability),
    }),
  );
});

app.post("/api/availability", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;
  const payload = parseAvailabilityPayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const mentor = await prisma.mentor.findUnique({ where: { id: payload.mentorId } });
  if (!mentor) {
    return sendError(res, "Mentor not found.", 404);
  }

  if (requireMentor(req.actor) && req.actor.mentor.id !== payload.mentorId) {
    return sendError(res, "Mentors can only manage their own availability.", 403);
  }

  try {
    const availability = await prisma.availability.create({
      data: payload,
    });
    res.status(201).json(success(formatAvailability(availability)));
  } catch (_error) {
    res.status(409).json({
      success: false,
      error: "That mentor slot already exists.",
    });
  }
});

app.put("/api/availability/:id", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;
  const id = Number(req.params.id);
  const payload = parseAvailabilityPayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const existing = await prisma.availability.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, "Availability slot not found.", 404);
  }

  if (requireMentor(req.actor) && req.actor.mentor.id !== existing.mentorId) {
    return sendError(res, "Mentors can only manage their own availability.", 403);
  }

  if (existing.isBooked) {
    return sendError(res, "Booked slots cannot be edited.", 409);
  }

  try {
    const updated = await prisma.availability.update({
      where: { id },
      data: payload,
    });
    res.json(success(formatAvailability(updated)));
  } catch (_error) {
    res.status(409).json({
      success: false,
      error: "That mentor slot conflicts with an existing slot.",
    });
  }
});

app.delete("/api/availability/:id", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;
  const id = Number(req.params.id);
  const existing = await prisma.availability.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, "Availability slot not found.", 404);
  }

  if (requireMentor(req.actor) && req.actor.mentor.id !== existing.mentorId) {
    return sendError(res, "Mentors can only manage their own availability.", 403);
  }

  if (existing.isBooked) {
    return sendError(res, "Booked slots cannot be deleted.", 409);
  }

  await prisma.availability.delete({ where: { id } });
  res.json(success({ id }));
});

app.post("/api/bookings", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const { mentorId, date, time, topic = "" } = req.body;
  if (!mentorId || !date || !time) {
    return sendError(res, "mentorId, date, and time are required.", 400);
  }

  const studentId = req.actor.student.id;
  const targetDate = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`);
  const mentor = await prisma.mentor.findUnique({ where: { id: Number(mentorId) } });
  if (!mentor) {
    return sendError(res, "Mentor not found.", 404);
  }

  const slot = await prisma.availability.findFirst({
    where: {
      mentorId: Number(mentorId),
      date: targetDate,
      slot: String(time),
    },
  });

  if (!slot) {
    return sendError(res, "That slot does not exist.", 404);
  }

  if (slot.isBooked) {
    return sendError(res, "That slot is no longer available.", 409);
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const freshSlot = await tx.availability.findUnique({
        where: { id: slot.id },
      });

      if (!freshSlot || freshSlot.isBooked) {
        throw new Error("SLOT_TAKEN");
      }

      await tx.availability.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });

      return tx.booking.create({
        data: {
          studentId,
          mentorId: Number(mentorId),
          availabilityId: slot.id,
          date: targetDate,
          time: String(time),
          topic: String(topic).trim(),
          status: "Confirmed",
        },
        include: {
          mentor: true,
        },
      });
    });

    return res.status(201).json(success(formatBooking(booking)));
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return sendError(res, "That slot is no longer available.", 409);
    }

    throw error;
  }
});

app.get("/api/bookings/me", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const bookings = await prisma.booking.findMany({
    where: {
      studentId: req.actor.student.id,
    },
    include: {
      mentor: true,
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  res.json(success(bookings.map(formatBooking)));
});

app.delete("/api/bookings/:id", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
  });

  if (!booking || booking.studentId !== req.actor.student.id) {
    return sendError(res, "Booking not found.", 404);
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: "Cancelled" },
    }),
    ...(booking.availabilityId
      ? [
          prisma.availability.update({
            where: { id: booking.availabilityId },
            data: { isBooked: false },
          }),
        ]
      : []),
  ]);

  res.json(success({ id }));
});

app.post("/api/applications", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const { programId, statement = "", status = "Submitted" } = req.body;
  if (!programId) {
    return sendError(res, "programId is required.", 400);
  }

  const program = await prisma.program.findUnique({
    where: { id: Number(programId) },
  });
  if (!program) {
    return sendError(res, "Program not found.", 404);
  }

  const application = await prisma.application.create({
    data: {
      studentId: req.actor.student.id,
      programId: Number(programId),
      statement: String(statement).trim(),
      status: String(status),
    },
    include: {
      student: true,
      program: { include: { deadlines: true } },
      approvedByAdmin: true,
      nominations: { include: { admin: true } },
    },
  });

  res.status(201).json(success(formatApplication(application)));
});

app.get("/api/applications/me", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const applications = await prisma.application.findMany({
    where: {
      studentId: req.actor.student.id,
    },
    include: {
      student: true,
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
      approvedByAdmin: true,
      nominations: {
        include: { admin: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(success(applications.map(formatApplication)));
});

app.get("/api/applications/:id", async (req, res) => {
  const id = Number(req.params.id);
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      student: true,
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
      approvedByAdmin: true,
      nominations: {
        include: { admin: true },
      },
    },
  });

  if (!application) {
    return sendError(res, "Application not found.", 404);
  }

  if (
    req.actor?.type === "student" &&
    application.studentId !== req.actor.student.id
  ) {
    return sendError(res, "Application not found.", 404);
  }

  res.json(success(formatApplication(application)));
});

app.get("/api/applications", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const { student = "", program = "", status = "" } = req.query;

  const applications = await prisma.application.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(student
        ? {
            student: {
              OR: [
                { name: { contains: String(student) } },
                { email: { contains: String(student) } },
              ],
            },
          }
        : {}),
      ...(program
        ? {
            program: {
              title: { contains: String(program) },
            },
          }
        : {}),
    },
    include: {
      student: true,
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
      approvedByAdmin: true,
      nominations: {
        include: { admin: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json(success(applications.map(formatApplication)));
});

app.put("/api/applications/:id/status", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowedStatuses = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Nominated"];

  if (!allowedStatuses.includes(String(status))) {
    return sendError(res, "Invalid application status.", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      program: true,
    },
  });

  if (!application) {
    return sendError(res, "Application not found.", 404);
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: String(status),
      approvedByAdminId: req.actor.admin.id,
      reviewedAt: new Date(),
    },
    include: {
      student: true,
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
      approvedByAdmin: true,
      nominations: {
        include: { admin: true },
      },
    },
  });

  await createStatusNotification(updated, String(status));
  res.json(success(formatApplication(updated)));
});

app.put("/api/applications/:id/review-notes", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const { reviewerNotes = "", nominationNotes = "" } = req.body;

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    return sendError(res, "Application not found.", 404);
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      reviewerNotes: String(reviewerNotes),
      nominationNotes: String(nominationNotes),
      approvedByAdminId: req.actor.admin.id,
      reviewedAt: new Date(),
    },
    include: {
      student: true,
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
      approvedByAdmin: true,
      nominations: {
        include: { admin: true },
      },
    },
  });

  res.json(success(formatApplication(updated)));
});

app.post("/api/nominations", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const { applicationId, notes = "" } = req.body;
  if (!applicationId) {
    return sendError(res, "applicationId is required.", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: Number(applicationId) },
    include: { program: true },
  });
  if (!application) {
    return sendError(res, "Application not found.", 404);
  }

  const nomination = await prisma.nomination.upsert({
    where: { applicationId: Number(applicationId) },
    update: {
      notes: String(notes),
      adminId: req.actor.admin.id,
    },
    create: {
      applicationId: Number(applicationId),
      adminId: req.actor.admin.id,
      notes: String(notes),
    },
    include: {
      admin: true,
      application: true,
    },
  });

  await prisma.application.update({
    where: { id: Number(applicationId) },
    data: {
      status: "Nominated",
      nominationNotes: String(notes),
      approvedByAdminId: req.actor.admin.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.notificationLog.create({
    data: {
      studentId: application.studentId,
      applicationId: application.id,
      title: "Application nominated",
      message: `Your application for ${application.program.title} has been nominated by the Global Engagement Office.`,
    },
  });

  res.status(201).json(
    success({
      id: nomination.id,
      applicationId: nomination.applicationId,
      adminId: nomination.adminId,
      adminName: nomination.admin.name,
      notes: nomination.notes,
      createdAt: nomination.createdAt,
    }),
  );
});

app.get("/api/nominations", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const nominations = await prisma.nomination.findMany({
    include: {
      admin: true,
      application: {
        include: {
          student: true,
          program: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    success(
      nominations.map((nomination) => ({
        id: nomination.id,
        applicationId: nomination.applicationId,
        adminId: nomination.adminId,
        adminName: nomination.admin.name,
        notes: nomination.notes,
        createdAt: nomination.createdAt,
        application: {
          id: nomination.application.id,
          status: nomination.application.status,
          studentName: nomination.application.student.name,
          programTitle: nomination.application.program.title,
        },
      })),
    ),
  );
});

app.get("/api/deadlines/me", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const deadlines = await prisma.deadline.findMany({
    where: {
      program: {
        applications: {
          some: {
            studentId: req.actor.student.id,
          },
        },
      },
    },
    include: {
      program: true,
    },
    orderBy: { date: "asc" },
  });

  res.json(success(deadlines.map(formatDeadline)));
});

app.post("/api/deadlines", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const payload = parseDeadlinePayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const program = await prisma.program.findUnique({ where: { id: payload.programId } });
  if (!program) {
    return sendError(res, "Program not found.", 404);
  }

  const deadline = await prisma.deadline.create({
    data: payload,
    include: { program: true },
  });
  res.status(201).json(success(formatDeadline(deadline)));
});

app.put("/api/deadlines/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const payload = parseDeadlinePayload(req.body);
  if (payload.status) {
    return res.status(payload.status).json(payload.body);
  }

  const deadline = await prisma.deadline.findUnique({ where: { id } });
  if (!deadline) {
    return sendError(res, "Deadline not found.", 404);
  }

  const updated = await prisma.deadline.update({
    where: { id },
    data: payload,
    include: { program: true },
  });
  res.json(success(formatDeadline(updated)));
});

app.delete("/api/deadlines/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const id = Number(req.params.id);
  const deadline = await prisma.deadline.findUnique({ where: { id } });
  if (!deadline) {
    return sendError(res, "Deadline not found.", 404);
  }

  await prisma.deadline.delete({ where: { id } });
  res.json(success({ id }));
});

app.get("/api/meetings/me", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const meetings = await prisma.booking.findMany({
    where: {
      studentId: req.actor.student.id,
      status: {
        not: "Cancelled",
      },
    },
    include: {
      mentor: true,
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  res.json(success(meetings.map(formatBooking)));
});

app.get("/api/mentors/me/meetings", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;

  const mentorId = requireMentor(req.actor) ? req.actor.mentor.id : Number(req.query.mentorId || 0);

  if (!mentorId) {
    return sendError(res, "mentorId is required for office access.", 400);
  }

  const meetings = await prisma.booking.findMany({
    where: {
      mentorId,
      status: {
        not: "Cancelled",
      },
    },
    include: {
      mentor: true,
      student: true,
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return res.json(
    success(
      meetings.map((meeting) => ({
        ...formatBooking(meeting),
        studentName: meeting.student?.name || "",
        studentEmail: meeting.student?.email || "",
      })),
    ),
  );
});

app.get("/api/dashboard/me", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const studentId = req.actor.student.id;

  const [applications, meetings, savedPrograms, chatHistory, notifications] = await Promise.all([
    prisma.application.findMany({
      where: { studentId },
      include: {
        student: true,
        program: {
          include: {
            deadlines: {
              orderBy: { date: "asc" },
            },
          },
        },
        approvedByAdmin: true,
        nominations: {
          include: { admin: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: {
        studentId,
        status: {
          not: "Cancelled",
        },
      },
      include: {
        mentor: true,
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    }),
    prisma.savedProgram.findMany({
      where: { studentId },
      include: {
        program: {
          include: {
            deadlines: {
              orderBy: { date: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chatInteraction.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notificationLog.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const deadlines = await prisma.deadline.findMany({
    where: {
      programId: {
        in: applications.map((item) => item.programId),
      },
    },
    include: { program: true },
    orderBy: { date: "asc" },
  });

  res.json(
    success({
      summary: {
        applicationsCount: applications.length,
        mentorMeetingsCount: meetings.length,
        deadlinesCount: deadlines.length,
        savedProgramsCount: savedPrograms.length,
      },
      applications: applications.map(formatApplication),
      deadlines: deadlines.map(formatDeadline),
      meetings: meetings.map(formatBooking),
      savedPrograms: savedPrograms.map((item) => formatProgram(item.program)),
      chatHistory: chatHistory.map(formatChatInteraction),
      notifications: notifications.map(formatNotification),
    }),
  );
});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return sendError(res, "name, email, subject, and message are required.", 400);
  }

  const contact = await prisma.contactMessage.create({
    data: {
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    },
  });

  res.status(201).json(
    success({
      id: contact.id,
      message: "Your message has been submitted to the Global Engagement Office.",
    }),
  );
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) {
    return sendError(res, "Message is required.", 400);
  }

  const result = await respond({
    message: String(message),
    actor: req.actor || null,
  });

  res.json(
    success({
      reply: result.response,
      mode: result.mode,
      interaction: formatChatInteraction(result.interaction),
    }),
  );
});

app.get("/api/chat/documents", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;

  const documents = await prisma.knowledgeDocument.findMany({
    include: {
      uploadedByAdmin: true,
      uploadedByMentor: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(success(documents.map((document) => formatKnowledgeDocument(document, req.actor))));
});

app.post("/api/chat/documents", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;

  const payload = parseKnowledgeDocumentPayload(req.body);
  if (payload?.body) {
    return sendError(res, payload.body.error, payload.status, payload.body.details);
  }

  const document = await prisma.knowledgeDocument.create({
    data: {
      ...payload,
      uploadedByAdminId: req.actor?.type === "admin" ? req.actor.admin.id : null,
      uploadedByMentorId: req.actor?.type === "mentor" ? req.actor.mentor.id : null,
    },
    include: {
      uploadedByAdmin: true,
      uploadedByMentor: true,
    },
  });

  res.status(201).json(success(formatKnowledgeDocument(document, req.actor)));
});

app.delete("/api/chat/documents/:id", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;

  const document = await prisma.knowledgeDocument.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      uploadedByAdmin: true,
      uploadedByMentor: true,
    },
  });

  if (!document) {
    return sendError(res, "Knowledge document not found.", 404);
  }

  if (
    req.actor?.type === "mentor" &&
    (!document.uploadedByMentorId || document.uploadedByMentorId !== req.actor.mentor.id)
  ) {
    return sendError(res, "Mentors can only remove documents they uploaded.", 403);
  }

  await prisma.knowledgeDocument.delete({
    where: { id: document.id },
  });

  res.json(
    success({
      id: document.id,
      message: "Knowledge document removed.",
    }),
  );
});

app.get("/api/chat/history", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const history = await prisma.chatInteraction.findMany({
    where: { studentId: req.actor.student.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  res.json(success(history.map(formatChatInteraction)));
});

app.put("/api/chat/context", async (_req, res) => {
  const count = await prisma.knowledgeDocument.count();
  res.json(
    success({
      mode: process.env.ANTHROPIC_API_KEY ? "llm" : "knowledge_base",
      message: process.env.ANTHROPIC_API_KEY
        ? "The assistant is using Claude with grounded portal and document context."
        : "Reference context is managed through uploaded knowledge documents in the office and mentor workspace. Add an Anthropic API key to enable LLM generation.",
      documentsCount: count,
    }),
  );
});

app.post("/api/saved-programs", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const { programId } = req.body;
  if (!programId) {
    return sendError(res, "programId is required.", 400);
  }

  const saved = await prisma.savedProgram.upsert({
    where: {
      studentId_programId: {
        studentId: req.actor.student.id,
        programId: Number(programId),
      },
    },
    create: {
      studentId: req.actor.student.id,
      programId: Number(programId),
    },
    update: {},
    include: {
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  res.status(201).json(success(formatProgram(saved.program)));
});

app.delete("/api/saved-programs/:programId", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const programId = Number(req.params.programId);
  const existing = await prisma.savedProgram.findUnique({
    where: {
      studentId_programId: {
        studentId: req.actor.student.id,
        programId,
      },
    },
  });

  if (!existing) {
    return sendError(res, "Saved program not found.", 404);
  }

  await prisma.savedProgram.delete({
    where: {
      studentId_programId: {
        studentId: req.actor.student.id,
        programId,
      },
    },
  });

  res.json(success({ programId }));
});

app.get("/api/admin/approval-queue", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const applications = await prisma.application.findMany({
    where: {
      status: {
        in: ["Submitted", "Under Review", "Approved", "Nominated", "Rejected"],
      },
    },
    include: {
      student: true,
      program: {
        include: {
          deadlines: {
            orderBy: { date: "asc" },
          },
        },
      },
      approvedByAdmin: true,
      nominations: {
        include: { admin: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json(
    success({
      submitted: applications.filter((item) => item.status === "Submitted").map(formatApplication),
      underReview: applications.filter((item) => item.status === "Under Review").map(formatApplication),
      approved: applications.filter((item) => item.status === "Approved").map(formatApplication),
      nominated: applications.filter((item) => item.status === "Nominated").map(formatApplication),
      rejected: applications.filter((item) => item.status === "Rejected").map(formatApplication),
    }),
  );
});

app.get("/api/admin/dashboard", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const [programsCount, mentorsCount, applications, deadlines] = await Promise.all([
    prisma.program.count(),
    prisma.mentor.count(),
    prisma.application.findMany({
      include: {
        student: true,
        program: {
          include: {
            deadlines: {
              orderBy: { date: "asc" },
            },
          },
        },
        approvedByAdmin: true,
        nominations: {
          include: { admin: true },
        },
      },
    }),
    prisma.deadline.findMany({
      include: { program: true },
      orderBy: { date: "asc" },
      take: 6,
    }),
  ]);

  res.json(
    success({
      totalPrograms: programsCount,
      totalMentors: mentorsCount,
      totalApplications: applications.length,
      pendingReviews: applications.filter((item) => item.status === "Submitted" || item.status === "Under Review")
        .length,
      upcomingDeadlines: deadlines.map(formatDeadline),
      approvalQueue: applications
        .filter((item) => item.status === "Submitted" || item.status === "Under Review")
        .map(formatApplication),
    }),
  );
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
