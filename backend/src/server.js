const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { Prisma } = require("@prisma/client");
const prisma = require("./prisma");
const {
  hasReviewerModel,
  requireAdmin,
  requireMentor,
  requireOfficeOrMentor,
  requireReviewer,
  requireStudent,
  resolveActor,
} = require("./auth");
const { createProgramAssistantReply, respond } = require("./chatService");
const { discoverOpportunities } = require("./opportunityDiscoveryService");
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
  formatReviewer,
  formatStageReviewRequest,
  formatWorkflowStage,
  getTagsJson,
  normalizeDateString,
  parseJsonArray,
  success,
} = require("./utils");

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function getAllowedOrigins() {
  const rawOrigins = [
    FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ];

  return Array.from(new Set(rawOrigins.filter(Boolean)));
}

const allowedOrigins = getAllowedOrigins();

let workflowMailerPromise = null;

function getWorkflowMailer() {
  if (workflowMailerPromise) {
    return workflowMailerPromise;
  }

  workflowMailerPromise = (async () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 0);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

    if (!host || !port || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  })();

  return workflowMailerPromise;
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "15mb" }));

app.use(async (req, _res, next) => {
  req.actor = await resolveActor(req);
  next();
});

const runtimeModels = Prisma.dmmf?.datamodel?.models || [];
const runtimeModelNames = new Set(runtimeModels.map((model) => model.name));
const applicationRuntimeFieldNames = new Set(
  (runtimeModels.find((model) => model.name === "Application")?.fields || []).map((field) => field.name),
);

function hasRuntimeModel(modelName) {
  return runtimeModelNames.has(modelName);
}

function hasApplicationRelation(fieldName) {
  return applicationRuntimeFieldNames.has(fieldName);
}

const applicationInclude = {
  student: true,
  program: {
    include: {
      deadlines: {
        orderBy: { date: "asc" },
      },
    },
  },
  approvedByAdmin: true,
  documents: {
    include: {
      deadline: true,
    },
    orderBy: { uploadedAt: "asc" },
  },
  nominations: {
    include: { admin: true },
  },
  ...(hasApplicationRelation("workflowStages") && hasRuntimeModel("ApplicationWorkflowStage")
    ? {
        workflowStages: {
          include: {
            ...(hasRuntimeModel("Reviewer") ? { reviewer: true } : {}),
            requestedByAdmin: true,
            ...(hasRuntimeModel("StageReviewRequest")
              ? { reviewRequests: { orderBy: { createdAt: "asc" } } }
              : {}),
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      }
    : {}),
  ...(hasApplicationRelation("emailLogs") && hasRuntimeModel("WorkflowEmailLog")
    ? {
        emailLogs: {
          include: {
            ...(hasRuntimeModel("ApplicationWorkflowStage") ? { workflowStage: true } : {}),
          },
          orderBy: { createdAt: "desc" },
        },
      }
    : {}),
};

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

function parseRequiredDocuments(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

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
    startDate,
    endDate,
    externalLink,
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
    startDate: startDate ? new Date(`${String(startDate).slice(0, 10)}T00:00:00.000Z`) : null,
    endDate: endDate ? new Date(`${String(endDate).slice(0, 10)}T00:00:00.000Z`) : null,
    externalLink: externalLink ? String(externalLink).trim() : null,
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
  const { programId, title, date, officialDeadline, priority, requiredDocuments } = body;
  if (!programId || !title || !date || !priority) {
    return failure("programId, title, date, and priority are required.", 400);
  }

  return {
    programId: Number(programId),
    title: String(title).trim(),
    date: new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`),
    officialDeadline: officialDeadline ? new Date(`${String(officialDeadline).slice(0, 10)}T00:00:00.000Z`) : null,
    priority: String(priority).trim(),
    requiredDocumentsJson: JSON.stringify(parseRequiredDocuments(requiredDocuments)),
  };
}

function statusFromWorkflow(stage) {
  if (!stage) return "Submitted";

  if (stage.status === "REJECTED") return "Rejected";
  if (stage.stageLabel.toLowerCase().includes("nominated")) return "Nominated";
  if (["PENDING", "ACTIVE", "FORWARDED", "APPROVED", "CHANGES_REQUESTED"].includes(stage.status)) {
    return "Under Review";
  }

  return "Submitted";
}

function getActorDisplay(actor) {
  if (!actor) return { name: "System", email: "", typeLabel: "System" };
  if (actor.type === "admin") return { name: actor.admin.name, email: actor.admin.email, typeLabel: "Global Engagement Office" };
  if (actor.type === "reviewer") {
    return {
      name: actor.reviewer.name,
      email: actor.reviewer.email,
      typeLabel: actor.reviewer.organizationLabel || "Reviewer",
    };
  }
  if (actor.type === "mentor") return { name: actor.mentor.name, email: actor.mentor.email, typeLabel: "Mentor" };
  return { name: actor.student.name, email: actor.student.email, typeLabel: "Student" };
}

async function createStudentWorkflowNotification(application, stage) {
  const message =
    stage.studentVisibleUpdate ||
    `Your application for ${application.program.title} is now at ${stage.stageLabel}.`;

  await prisma.notificationLog.create({
    data: {
      studentId: application.studentId,
      applicationId: application.id,
      workflowStageId: stage.id,
      title: `Application moved to ${stage.stageLabel}`,
      message,
    },
  });
}

async function createWorkflowEmailLog({ applicationId, workflowStageId, toEmail, subject, body }) {
  return prisma.workflowEmailLog.create({
    data: {
      applicationId,
      workflowStageId: workflowStageId || null,
      toEmail,
      subject,
      body,
      deliveryStatus: "Queued",
      direction: "outbound",
    },
  });
}

async function markWorkflowEmailLogDelivery(logId, deliveryStatus) {
  return prisma.workflowEmailLog.update({
    where: { id: logId },
    data: {
      deliveryStatus,
    },
  });
}

async function deliverWorkflowEmail({ applicationId, workflowStageId, toEmail, subject, body }) {
  const log = await createWorkflowEmailLog({
    applicationId,
    workflowStageId,
    toEmail,
    subject,
    body,
  });

  try {
    const transporter = await getWorkflowMailer();
    if (!transporter) {
      await markWorkflowEmailLogDelivery(log.id, "Simulated (SMTP not configured)");
      return {
        logId: log.id,
        deliveryStatus: "Simulated (SMTP not configured)",
      };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject,
      text: body,
    });

    await markWorkflowEmailLogDelivery(log.id, "Sent");
    return {
      logId: log.id,
      deliveryStatus: "Sent",
    };
  } catch (error) {
    console.error("Workflow email delivery failed", error);
    await markWorkflowEmailLogDelivery(log.id, "Failed");
    return {
      logId: log.id,
      deliveryStatus: "Failed",
    };
  }
}

function getLatestWorkflowStage(application) {
  const stages = (application.workflowStages || [])
    .slice()
    .sort((a, b) => {
      if (b.order !== a.order) return b.order - a.order;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  return stages[0] || null;
}

function getActiveWorkflowStage(application) {
  return (application.workflowStages || [])
    .slice()
    .sort((a, b) => {
      if (b.order !== a.order) return b.order - a.order;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    })
    .find((stage) => ["ACTIVE", "PENDING", "CHANGES_REQUESTED", "APPROVED"].includes(stage.status)) || null;
}

async function notifyStudentOfStageMovement(application, stage, senderLabel, statusLabel = "Under Review") {
  await createStudentWorkflowNotification(application, stage);
  const studentEmailPayload = buildStudentWorkflowEmail({
    application,
    stage,
    senderLabel,
    statusLabel,
  });
  await deliverWorkflowEmail({
    applicationId: application.id,
    workflowStageId: stage.id,
    toEmail: application.student.email,
    subject: studentEmailPayload.subject,
    body: studentEmailPayload.body,
  });
}

async function upsertReviewerByEmail({ email, name, organizationLabel }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const safeName = String(name || normalizedEmail.split("@")[0] || "Reviewer").trim();
  return prisma.reviewer.upsert({
    where: { email: normalizedEmail },
    update: {
      name: safeName,
      organizationLabel: organizationLabel ? String(organizationLabel).trim() : undefined,
    },
    create: {
      email: normalizedEmail,
      name: safeName,
      organizationLabel: organizationLabel ? String(organizationLabel).trim() : null,
    },
  });
}

async function createWorkflowStage({
  applicationId,
  order,
  stageLabel,
  reviewerEmail,
  reviewerName,
  reviewerRoleLabel,
  instructions,
  studentVisibleUpdate,
  requestedByAdminId,
  status,
}) {
  const reviewer = await upsertReviewerByEmail({
    email: reviewerEmail,
    name: reviewerName,
    organizationLabel: reviewerRoleLabel,
  });

  return prisma.applicationWorkflowStage.create({
    data: {
      applicationId,
      order,
      stageLabel,
      reviewerEmail: reviewer.email,
      reviewerName: reviewer.name,
      reviewerRoleLabel: reviewerRoleLabel ? String(reviewerRoleLabel).trim() : null,
      reviewerId: reviewer.id,
      instructions: String(instructions || "").trim(),
      studentVisibleUpdate: studentVisibleUpdate ? String(studentVisibleUpdate).trim() : null,
      requestedByAdminId: requestedByAdminId || null,
      status: status || "PENDING",
    },
    include: {
      reviewer: true,
      requestedByAdmin: true,
    },
  });
}

async function advanceApplicationStatusFromWorkflow(applicationId) {
  const latestStage = await prisma.applicationWorkflowStage.findFirst({
    where: { applicationId },
    orderBy: [{ order: "desc" }, { updatedAt: "desc" }],
  });

  return prisma.application.update({
    where: { id: applicationId },
    data: { status: statusFromWorkflow(latestStage) },
  });
}

function buildWorkflowEmail({ application, stage, senderLabel }) {
  const studentName = application.student?.name || "Student";
  const programTitle = application.program?.title || "Program";
  const senderName = senderLabel?.name || "Global Engagement Office";
  const senderRole = senderLabel?.typeLabel || "Global Engagement Office";

  return {
    subject: `[Global Engagement Workflow] ${studentName} • ${programTitle} • ${stage.stageLabel}`,
    body: [
      `Hello,`,
      ``,
      `${senderName} (${senderRole}) has sent the application for ${studentName} (${application.student?.email || "no email"}) to you for review.`,
      ``,
      `Program: ${programTitle}`,
      `Stage: ${stage.stageLabel}`,
      `What to review: ${stage.instructions}`,
      ``,
      `Please open the portal dashboard with your reviewer account to record your review and send your recommendation back to the Global Engagement Office.`,
      `${FRONTEND_URL}/dashboard`,
      ``,
      `Student-visible update: ${stage.studentVisibleUpdate || "No student-facing update provided yet."}`,
    ].join("\n"),
  };
}

function buildReviewRequestEmail({ application, stage, reviewRequest, senderLabel }) {
  const studentName = application.student?.name || "Student";
  const programTitle = application.program?.title || "Program";
  const senderName = senderLabel?.name || "Global Engagement Office";

  return {
    subject: `[Review Request] ${studentName} · ${programTitle} · ${stage.stageLabel}`,
    body: [
      `Hello${reviewRequest.toName ? ` ${reviewRequest.toName}` : ""},`,
      ``,
      `${senderName} (Global Engagement Office) is requesting your advisory review for the following application.`,
      ``,
      `Student: ${studentName} (${application.student?.email || ""})`,
      `Program: ${programTitle}`,
      `Review stage: ${stage.stageLabel}`,
      ``,
      `What to review:`,
      reviewRequest.instructions,
      ``,
      `Please log in to your reviewer dashboard to write your recommendation and send it back to the Global Engagement Office.`,
      `${FRONTEND_URL}/dashboard`,
      ``,
      `Note: You are an advisory reviewer. Your role is to send your recommendation back to the GEO — the GEO will decide all routing and final decisions.`,
    ].join("\n"),
  };
}

function buildReviewResponseEmail({ application, stage, reviewRequest, statusLabel, notes, ogeAdminName }) {
  const studentName = application.student?.name || "Student";
  const programTitle = application.program?.title || "Program";
  const reviewerLabel = reviewRequest.toName || reviewRequest.toRoleLabel || reviewRequest.toEmail;

  return {
    subject: `[Reviewer Response] ${studentName} · ${programTitle} · ${stage.stageLabel}`,
    body: [
      `Hello ${ogeAdminName || "Global Engagement Office"},`,
      ``,
      `${reviewerLabel} has sent their advisory review back for the following application.`,
      ``,
      `Student: ${studentName} (${application.student?.email || ""})`,
      `Program: ${programTitle}`,
      `Stage: ${stage.stageLabel}`,
      `Response: ${statusLabel}`,
      ``,
      `Notes / recommendation:`,
      notes || "No additional notes were provided.",
      ``,
      `Please open the admin workflow manager to decide the next step (keep in current stage, move to next stage, request student changes, reject, or record final nomination).`,
      `${FRONTEND_URL}/admin`,
    ].join("\n"),
  };
}

function buildStudentWorkflowEmail({ application, stage, senderLabel, statusLabel }) {
  const programTitle = application.program?.title || "Program";
  const senderName = senderLabel?.name || senderLabel?.typeLabel || "Global Engagement Office";
  return {
    subject: `[Global Engagement Update] ${programTitle} • ${stage.stageLabel}`,
    body: [
      `Hello ${application.student?.name || "Student"},`,
      ``,
      `${senderName} has updated your application for ${programTitle}.`,
      ``,
      `Current stage: ${stage.stageLabel}`,
      `Current status: ${statusLabel}`,
      ``,
      `${stage.studentVisibleUpdate || `Your application is now with ${stage.reviewerRoleLabel || stage.reviewerName || stage.reviewerEmail} for review.`}`,
      ``,
      `You can track the stage progress from your dashboard:`,
      `${FRONTEND_URL}/dashboard`,
    ].join("\n"),
  };
}

function parseApplicationUploads(input, fallbackDeadlines = []) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const deadlineId = Number(item?.deadlineId);
      const requirementLabel = String(item?.requirementLabel || "").trim();
      const fileName = String(item?.fileName || "").trim();
      const mimeType = String(item?.mimeType || "application/octet-stream").trim();
      const fileData = String(item?.fileData || "").trim();
      const matchedDeadline = fallbackDeadlines.find((deadline) => deadline.id === deadlineId);

      if (!deadlineId || !requirementLabel || !fileName || !fileData || !matchedDeadline) {
        return null;
      }

      return {
        deadlineId,
        requirementLabel,
        fileName,
        mimeType,
        fileData,
      };
    })
    .filter(Boolean);
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

function parseClockTimeToMinutes(value) {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();

  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    const meridiem = meridiemMatch[3];
    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59 || hours < 1 || hours > 12) {
      return null;
    }
    if (meridiem === "AM") {
      if (hours === 12) hours = 0;
    } else if (hours !== 12) {
      hours += 12;
    }
    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
      return null;
    }
    return hours * 60 + minutes;
  }

  return null;
}

function formatMinutesAsSlot(minutes) {
  const normalizedHours = Math.floor(minutes / 60);
  const normalizedMinutes = minutes % 60;
  const meridiem = normalizedHours >= 12 ? "PM" : "AM";
  const twelveHour = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;
  return `${String(twelveHour).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")} ${meridiem}`;
}

function parseAvailabilityBatchPayload(body) {
  const { mentorId, date, startTime, endTime, intervalMinutes = 30 } = body;
  if (!mentorId || !date || !startTime || !endTime) {
    return failure("mentorId, date, startTime, and endTime are required for batch availability.", 400);
  }

  const startMinutes = parseClockTimeToMinutes(startTime);
  const endMinutes = parseClockTimeToMinutes(endTime);
  const normalizedInterval = Number(intervalMinutes);

  if (startMinutes === null || endMinutes === null) {
    return failure("Please provide valid startTime and endTime values.", 400);
  }

  if (Number.isNaN(normalizedInterval) || normalizedInterval < 15) {
    return failure("intervalMinutes must be at least 15.", 400);
  }

  if (endMinutes <= startMinutes) {
    return failure("endTime must be later than startTime.", 400);
  }

  const slots = [];
  for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += normalizedInterval) {
    slots.push(formatMinutesAsSlot(currentMinutes));
  }

  if (slots.length === 0) {
    return failure("That batch range does not create any slots.", 400);
  }

  return {
    mentorId: Number(mentorId),
    date: new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`),
    slots,
    intervalMinutes: normalizedInterval,
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

async function requireReviewerResponse(req, res) {
  if (!requireReviewer(req.actor)) {
    sendError(res, "Reviewer access required.", 403);
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
  const [admins, mentors, reviewers] = await Promise.all([
    prisma.admin.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.mentor.findMany({
      orderBy: { name: "asc" },
    }),
    hasReviewerModel()
      ? prisma.reviewer.findMany({
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
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
      reviewers: reviewers.map(formatReviewer),
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

  if (normalizedRole === "reviewer") {
    if (!hasReviewerModel()) {
      return sendError(
        res,
        "Reviewer accounts are temporarily unavailable until the backend Prisma client is regenerated.",
        503,
      );
    }

    const reviewer = await prisma.reviewer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!reviewer) {
      return sendError(res, "Reviewer account not found for that email.", 404);
    }

    return res.json(success(formatReviewer(reviewer)));
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
      : req.actor.type === "reviewer"
        ? formatReviewer(req.actor.reviewer)
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
        include: applicationInclude,
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

app.post("/api/programs/:id/assistant", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const id = Number(req.params.id);
  const { message = "", mode = "qa", pendingUploads = [] } = req.body;

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

  const application = await prisma.application.findFirst({
    where: {
      programId: id,
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
      documents: {
        include: {
          deadline: true,
        },
        orderBy: { uploadedAt: "asc" },
      },
      nominations: {
        include: { admin: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = await createProgramAssistantReply({
    actor: req.actor,
    program,
    application,
    message: String(message || ""),
    mode: String(mode || "qa"),
    pendingUploads: Array.isArray(pendingUploads) ? pendingUploads : [],
  });

  const interaction = await prisma.chatInteraction.create({
    data: {
      studentId: req.actor.student.id,
      query: `[programId:${program.id}][program:${program.title}][mode:${String(mode || "qa")}] ${
        String(message || "").trim() || "Program assistant request"
      }`,
      response: result.storedResponse || result.response,
      mode: result.mode,
    },
  });

  res.json(
    success({
      reply: result.response,
      reviewReport: result.reviewReport || null,
      mode: result.mode,
      interaction: formatChatInteraction(interaction),
    }),
  );
});

app.get("/api/programs/:id/assistant/history", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const id = Number(req.params.id);
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!program) {
    return sendError(res, "Program not found.", 404);
  }

  const history = await prisma.chatInteraction.findMany({
    where: {
      studentId: req.actor.student.id,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const filtered = history.filter((item) => {
    const query = String(item.query || "");
    return query.includes(`[programId:${program.id}]`) || query.includes(`[program:${program.title}]`);
  });

  res.json(success(filtered.map(formatChatInteraction)));
});

app.delete("/api/programs/:id/assistant/history", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const id = Number(req.params.id);
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!program) {
    return sendError(res, "Program not found.", 404);
  }

  const history = await prisma.chatInteraction.findMany({
    where: {
      studentId: req.actor.student.id,
    },
    select: {
      id: true,
      query: true,
    },
  });

  const matchingIds = history
    .filter((item) => {
      const query = String(item.query || "");
      return query.includes(`[programId:${program.id}]`) || query.includes(`[program:${program.title}]`);
    })
    .map((item) => item.id);

  if (matchingIds.length > 0) {
    await prisma.chatInteraction.deleteMany({
      where: {
        id: {
          in: matchingIds,
        },
      },
    });
  }

  res.json(
    success({
      deletedCount: matchingIds.length,
      message: `Conversation reset for ${program.title}.`,
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
  const isBatchRequest = !req.body?.slot && (req.body?.startTime || req.body?.endTime);
  const payload = isBatchRequest ? parseAvailabilityBatchPayload(req.body) : parseAvailabilityPayload(req.body);
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

  if (isBatchRequest) {
    const existingSlots = await prisma.availability.findMany({
      where: {
        mentorId: payload.mentorId,
        date: payload.date,
      },
      select: { slot: true },
    });

    const existingSlotLabels = new Set(existingSlots.map((item) => item.slot));
    const newSlots = payload.slots.filter((slotLabel) => !existingSlotLabels.has(slotLabel));

    if (newSlots.length > 0) {
      await prisma.availability.createMany({
        data: newSlots.map((slotLabel) => ({
          mentorId: payload.mentorId,
          date: payload.date,
          slot: slotLabel,
        })),
      });
    }

    return res.status(201).json(
      success({
        createdCount: newSlots.length,
        skippedCount: payload.slots.length - newSlots.length,
        slots: newSlots,
      }),
    );
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

// Bulk recurring: all dates in one request → one DB round trip instead of N.
app.post("/api/availability/bulk-recurring", async (req, res) => {
  if (!(await requireOfficeOrMentorResponse(req, res))) return;

  const { mentorId, dates, startTime, endTime, intervalMinutes = 30 } = req.body;
  if (!mentorId || !Array.isArray(dates) || dates.length === 0 || !startTime || !endTime) {
    return sendError(res, "mentorId, dates[], startTime, and endTime are required.", 400);
  }

  const mentor = await prisma.mentor.findUnique({ where: { id: Number(mentorId) } });
  if (!mentor) return sendError(res, "Mentor not found.", 404);
  if (requireMentor(req.actor) && req.actor.mentor.id !== Number(mentorId)) {
    return sendError(res, "Mentors can only manage their own availability.", 403);
  }

  const startMinutes = parseClockTimeToMinutes(startTime);
  const endMinutes   = parseClockTimeToMinutes(endTime);
  const interval     = Number(intervalMinutes);

  if (startMinutes === null || endMinutes === null) return sendError(res, "Invalid startTime or endTime.", 400);
  if (isNaN(interval) || interval < 15) return sendError(res, "intervalMinutes must be at least 15.", 400);
  if (endMinutes <= startMinutes) return sendError(res, "endTime must be after startTime.", 400);

  const slotLabels = [];
  for (let m = startMinutes; m < endMinutes; m += interval) slotLabels.push(formatMinutesAsSlot(m));

  const parsedDates = dates.map((d) => new Date(`${String(d).slice(0, 10)}T00:00:00.000Z`));

  // Fetch all existing slots for all dates in one query.
  const existing = await prisma.availability.findMany({
    where: { mentorId: Number(mentorId), date: { in: parsedDates } },
    select: { date: true, slot: true },
  });
  const existingSet = new Set(existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.slot}`));

  const toInsert = [];
  for (const date of parsedDates) {
    const dateKey = date.toISOString().slice(0, 10);
    for (const slot of slotLabels) {
      if (!existingSet.has(`${dateKey}|${slot}`)) {
        toInsert.push({ mentorId: Number(mentorId), date, slot });
      }
    }
  }

  if (toInsert.length > 0) {
    await prisma.availability.createMany({ data: toInsert });
  }

  res.status(201).json(success({
    createdCount: toInsert.length,
    skippedCount: dates.length * slotLabels.length - toInsert.length,
    dateCount: dates.length,
  }));
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
  const { programId, statement = "", status = "Submitted", uploads = [] } = req.body;
  if (!programId) {
    return sendError(res, "programId is required.", 400);
  }

  const program = await prisma.program.findUnique({
    where: { id: Number(programId) },
    include: {
      deadlines: {
        orderBy: { date: "asc" },
      },
    },
  });
  if (!program) {
    return sendError(res, "Program not found.", 404);
  }

  const parsedUploads = parseApplicationUploads(uploads, program.deadlines);

  const created = await prisma.application.create({
    data: {
      studentId: req.actor.student.id,
      programId: Number(programId),
      statement: String(statement).trim(),
      status: String(status),
      documents: parsedUploads.length
        ? {
            create: parsedUploads,
          }
        : undefined,
    },
    include: applicationInclude,
  });

  const officeAdmin = await prisma.admin.findFirst({
    orderBy: { id: "asc" },
  });

  if (officeAdmin) {
    const initialStage = await createWorkflowStage({
      applicationId: created.id,
      order: 1,
      stageLabel: "Global Engagement initial review",
      reviewerEmail: officeAdmin.email,
      reviewerName: officeAdmin.name,
      reviewerRoleLabel: "Global Engagement Office",
      instructions: "Review the student's materials, confirm baseline fit, and decide which office should receive the next review handoff.",
      studentVisibleUpdate: "Your application is now with the Global Engagement Office for initial review.",
      requestedByAdminId: officeAdmin.id,
      status: "ACTIVE",
    });
    await createStudentWorkflowNotification(created, initialStage);
    await advanceApplicationStatusFromWorkflow(created.id);
  }

  const application = await prisma.application.findUnique({
    where: { id: created.id },
    include: applicationInclude,
  });

  res.status(201).json(success(formatApplication(application)));
});

app.get("/api/applications/me", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;

  const applications = await prisma.application.findMany({
    where: {
      studentId: req.actor.student.id,
    },
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json(success(applications.map(formatApplication)));
});

app.get("/api/applications/:id", async (req, res) => {
  const id = Number(req.params.id);
  const application = await prisma.application.findUnique({
    where: { id },
    include: applicationInclude,
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

app.put("/api/applications/:id/documents", async (req, res) => {
  if (!(await requireStudentResponse(req, res))) return;
  const id = Number(req.params.id);
  const { uploads = [] } = req.body;

  const application = await prisma.application.findUnique({
    where: { id },
    include: applicationInclude,
  });

  if (!application || application.studentId !== req.actor.student.id) {
    return sendError(res, "Application not found.", 404);
  }

  const parsedUploads = parseApplicationUploads(uploads, application.program.deadlines);
  if (parsedUploads.length === 0) {
    return sendError(res, "Please include at least one valid upload.", 400);
  }

  await prisma.$transaction(
    parsedUploads.map((upload) =>
      prisma.applicationDocument.create({
        data: {
          applicationId: application.id,
          deadlineId: upload.deadlineId,
          requirementLabel: upload.requirementLabel,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          fileData: upload.fileData,
        },
      }),
    ),
  );

  const updated = await prisma.application.findUnique({
    where: { id },
    include: applicationInclude,
  });

  res.json(success(formatApplication(updated)));
});

app.get("/api/application-documents/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return sendError(res, "Valid document id is required.", 400);
  }

  const document = await prisma.applicationDocument.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          student: true,
        },
      },
      deadline: true,
    },
  });

  if (!document) {
    return sendError(res, "Application document not found.", 404);
  }

  const isAdmin = requireAdmin(req.actor);
  const isOwnerStudent = requireStudent(req.actor) && document.application.studentId === req.actor.student.id;
  const isAssignedReviewer =
    requireReviewer(req.actor) &&
    (await prisma.applicationWorkflowStage.findFirst({
      where: {
        applicationId: document.applicationId,
        reviewerEmail: req.actor.reviewer.email,
      },
      select: { id: true },
    }));

  if (!isAdmin && !isOwnerStudent && !isAssignedReviewer) {
    return sendError(res, "You do not have access to this document.", 403);
  }

  res.json(
    success({
      id: document.id,
      applicationId: document.applicationId,
      deadlineId: document.deadlineId,
      deadlineTitle: document.deadline?.title || "",
      requirementLabel: document.requirementLabel,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileData: document.fileData,
      uploadedAt: document.uploadedAt,
      studentName: document.application.student?.name || "",
    }),
  );
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
    include: applicationInclude,
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
    include: applicationInclude,
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
    include: applicationInclude,
  });

  res.json(success(formatApplication(updated)));
});

app.post("/api/applications/:id/workflow/forward", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const applicationId = Number(req.params.id);
  const {
    stageLabel,
    reviewerEmail,
    reviewerName = "",
    reviewerRoleLabel = "",
    instructions = "",
    internalNotes = "",
    studentVisibleUpdate = "",
    moveToNextStage = false,
  } = req.body;

  if (!reviewerEmail || !instructions) {
    return sendError(res, "reviewerEmail and instructions are required.", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude,
  });

  if (!application) {
    return sendError(res, "Application not found.", 404);
  }

  const latestStage = getLatestWorkflowStage(application);
  const nextOrder = moveToNextStage
    ? Math.max(0, ...(application.workflowStages || []).map((stage) => stage.order)) + 1
    : latestStage?.order || 1;

  let nextStage;
  if (moveToNextStage || !latestStage) {
    if (moveToNextStage && latestStage && ["ACTIVE", "PENDING", "APPROVED", "CHANGES_REQUESTED"].includes(latestStage.status)) {
      await prisma.applicationWorkflowStage.update({
        where: { id: latestStage.id },
        data: {
          status: "COMPLETED",
          internalNotes: internalNotes ? String(internalNotes).trim() : latestStage.internalNotes,
          completedAt: new Date(),
        },
      });
    }
    nextStage = await createWorkflowStage({
      applicationId: application.id,
      order: nextOrder,
      stageLabel: String((stageLabel || latestStage?.stageLabel || "Global Engagement review")).trim(),
      reviewerEmail: String(reviewerEmail),
      reviewerName: reviewerName ? String(reviewerName) : null,
      reviewerRoleLabel: reviewerRoleLabel ? String(reviewerRoleLabel) : null,
      instructions: String(instructions),
      studentVisibleUpdate:
        studentVisibleUpdate ||
        `Your application is now in ${String((stageLabel || latestStage?.stageLabel || "Global Engagement review")).trim()}.`,
      requestedByAdminId: req.actor.admin.id,
      status: "ACTIVE",
    });
  } else {
    const reviewer = await upsertReviewerByEmail({
      email: reviewerEmail,
      name: reviewerName,
      organizationLabel: reviewerRoleLabel,
    });
    nextStage = await prisma.applicationWorkflowStage.update({
      where: { id: latestStage.id },
      data: {
        reviewerEmail: reviewer.email,
        reviewerName: reviewer.name,
        reviewerRoleLabel: reviewerRoleLabel ? String(reviewerRoleLabel).trim() : latestStage.reviewerRoleLabel,
        reviewerId: reviewer.id,
        instructions: String(instructions).trim(),
        internalNotes: internalNotes ? String(internalNotes).trim() : latestStage.internalNotes,
        requestedByAdminId: req.actor.admin.id,
        status: "ACTIVE",
        completedAt: null,
      },
      include: {
        reviewer: true,
        requestedByAdmin: true,
      },
    });
  }

  const senderLabel = getActorDisplay(req.actor);
  const emailPayload = buildWorkflowEmail({
    application,
    stage: nextStage,
    senderLabel,
  });

  await deliverWorkflowEmail({
    applicationId: application.id,
    workflowStageId: nextStage.id,
    toEmail: nextStage.reviewerEmail,
    subject: emailPayload.subject,
    body: emailPayload.body,
  });

  if (moveToNextStage || !latestStage) {
    await notifyStudentOfStageMovement(application, nextStage, senderLabel, "Under Review");
  }
  await advanceApplicationStatusFromWorkflow(application.id);

  const updatedApplication = await prisma.application.findUnique({
    where: { id: application.id },
    include: applicationInclude,
  });

  res.status(201).json(success(formatApplication(updatedApplication)));
});

app.post("/api/applications/:id/workflow/start", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const applicationId = Number(req.params.id);
  const {
    stageLabel = "Global Engagement review",
    reviewerEmail = req.actor.admin.email,
    reviewerName = req.actor.admin.name,
    reviewerRoleLabel = "Global Engagement Office",
    instructions = "Review the application, add notes, and either make a decision or forward it to the next stakeholder.",
    studentVisibleUpdate = "Your application is now with the Global Engagement Office for the next review step.",
  } = req.body || {};

  if (!stageLabel || !reviewerEmail || !instructions) {
    return sendError(res, "stageLabel, reviewerEmail, and instructions are required.", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude,
  });

  if (!application) {
    return sendError(res, "Application not found.", 404);
  }

  const activeStage = (application.workflowStages || [])
    .slice()
    .sort((a, b) => b.order - a.order)
    .find((stage) => ["ACTIVE", "PENDING", "CHANGES_REQUESTED"].includes(stage.status));

  if (activeStage) {
    return sendError(res, "This application already has an active workflow stage.", 400);
  }

  const nextOrder = Math.max(0, ...(application.workflowStages || []).map((stage) => stage.order)) + 1;
  const nextStage = await createWorkflowStage({
    applicationId: application.id,
    order: nextOrder,
    stageLabel: String(stageLabel),
    reviewerEmail: String(reviewerEmail),
    reviewerName: reviewerName ? String(reviewerName) : null,
    reviewerRoleLabel: reviewerRoleLabel ? String(reviewerRoleLabel) : null,
    instructions: String(instructions),
    studentVisibleUpdate: String(studentVisibleUpdate),
    requestedByAdminId: req.actor.admin.id,
    status: "ACTIVE",
  });

  const senderLabel = getActorDisplay(req.actor);
  const emailPayload = buildWorkflowEmail({
    application,
    stage: nextStage,
    senderLabel,
  });

  await deliverWorkflowEmail({
    applicationId: application.id,
    workflowStageId: nextStage.id,
    toEmail: nextStage.reviewerEmail,
    subject: emailPayload.subject,
    body: emailPayload.body,
  });

  await createStudentWorkflowNotification(application, nextStage);
  const studentEmailPayload = buildStudentWorkflowEmail({
    application,
    stage: nextStage,
    senderLabel,
    statusLabel: "Under Review",
  });
  await deliverWorkflowEmail({
    applicationId: application.id,
    workflowStageId: nextStage.id,
    toEmail: application.student.email,
    subject: studentEmailPayload.subject,
    body: studentEmailPayload.body,
  });

  await advanceApplicationStatusFromWorkflow(application.id);

  const updatedApplication = await prisma.application.findUnique({
    where: { id: application.id },
    include: applicationInclude,
  });

  res.status(201).json(success(formatApplication(updatedApplication)));
});

// OGE sends an advisory review request to a stakeholder — stays within current stage, no stage movement
app.post("/api/applications/:id/workflow/send-review-request", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const applicationId = Number(req.params.id);
  const { toEmail, toName = "", toRoleLabel = "", instructions } = req.body;

  if (!toEmail || !instructions) {
    return sendError(res, "toEmail and instructions are required.", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude,
  });

  if (!application) return sendError(res, "Application not found.", 404);

  const activeStage = getLatestWorkflowStage(application);
  if (!activeStage || !["ACTIVE", "PENDING", "CHANGES_REQUESTED"].includes(activeStage.status)) {
    return sendError(res, "No active workflow stage. Start a stage first.", 400);
  }

  const reviewRequest = await prisma.stageReviewRequest.create({
    data: {
      stageId: activeStage.id,
      applicationId: application.id,
      toEmail: String(toEmail).trim(),
      toName: toName ? String(toName).trim() : null,
      toRoleLabel: toRoleLabel ? String(toRoleLabel).trim() : null,
      instructions: String(instructions).trim(),
      status: "PENDING",
    },
  });

  // Upsert reviewer so they appear in the reviewer dashboard
  await upsertReviewerByEmail({
    email: String(toEmail).trim(),
    name: toName || "",
    organizationLabel: toRoleLabel || "",
  });

  const senderLabel = getActorDisplay(req.actor);
  const emailPayload = buildReviewRequestEmail({
    application,
    stage: activeStage,
    reviewRequest,
    senderLabel,
  });

  await deliverWorkflowEmail({
    applicationId: application.id,
    workflowStageId: activeStage.id,
    toEmail: String(toEmail).trim(),
    subject: emailPayload.subject,
    body: emailPayload.body,
  });

  const updatedApplication = await prisma.application.findUnique({
    where: { id: application.id },
    include: applicationInclude,
  });

  res.status(201).json(success(formatApplication(updatedApplication)));
});

// Stakeholder responds to an advisory review request — sends recommendation back to OGE, no stage movement
app.put("/api/review-requests/:id/respond", async (req, res) => {
  if (!(await requireReviewerResponse(req, res))) return;

  const requestId = Number(req.params.id);
  const { status, reviewerNotes = "" } = req.body;

  const allowedStatuses = ["RESPONDED", "INFO_REQUESTED", "REJECTED_RECOMMENDATION"];
  if (!allowedStatuses.includes(String(status))) {
    return sendError(res, "Invalid response status. Must be RESPONDED, INFO_REQUESTED, or REJECTED_RECOMMENDATION.", 400);
  }

  const reviewRequest = await prisma.stageReviewRequest.findUnique({
    where: { id: requestId },
    include: {
      stage: { include: { requestedByAdmin: true } },
      application: { include: applicationInclude },
    },
  });

  if (!reviewRequest) return sendError(res, "Review request not found.", 404);

  if (reviewRequest.toEmail !== req.actor.reviewer.email) {
    return sendError(res, "This review request is not assigned to you.", 403);
  }

  const updated = await prisma.stageReviewRequest.update({
    where: { id: requestId },
    data: {
      status: String(status),
      reviewerNotes: String(reviewerNotes).trim(),
      respondedAt: new Date(),
    },
  });

  const ogeRecipientEmail =
    reviewRequest.stage.requestedByAdmin?.email ||
    process.env.WORKFLOW_DEFAULT_OGE_EMAIL ||
    process.env.SMTP_USER;

  if (ogeRecipientEmail) {
    const statusLabel =
      status === "RESPONDED"
        ? "Recommendation sent"
        : status === "INFO_REQUESTED"
          ? "More information requested"
          : "Rejection recommended";

    const emailPayload = buildReviewResponseEmail({
      application: reviewRequest.application,
      stage: reviewRequest.stage,
      reviewRequest,
      statusLabel,
      notes: String(reviewerNotes).trim(),
      ogeAdminName: reviewRequest.stage.requestedByAdmin?.name || "Global Engagement Office",
    });

    await deliverWorkflowEmail({
      applicationId: reviewRequest.applicationId,
      workflowStageId: reviewRequest.stageId,
      toEmail: ogeRecipientEmail,
      subject: emailPayload.subject,
      body: emailPayload.body,
    });
  }

  res.json(
    success(
      formatStageReviewRequest(updated),
    ),
  );
});

app.put("/api/workflow-stages/:id", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const stageId = Number(req.params.id);
  const { status, internalNotes = "", studentVisibleUpdate = "" } = req.body;
  const allowedStatuses = ["PENDING", "ACTIVE", "FORWARDED", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "COMPLETED"];

  if (status && !allowedStatuses.includes(String(status))) {
    return sendError(res, "Invalid workflow stage status.", 400);
  }

  const stage = await prisma.applicationWorkflowStage.findUnique({
    where: { id: stageId },
    include: {
      reviewer: true,
      requestedByAdmin: true,
      application: {
        include: applicationInclude,
      },
    },
  });

  if (!stage) {
    return sendError(res, "Workflow stage not found.", 404);
  }

  const nextStatus = status ? String(status) : stage.status;
  const updatedStage = await prisma.applicationWorkflowStage.update({
    where: { id: stage.id },
    data: {
      status: nextStatus,
      internalNotes: String(internalNotes),
      studentVisibleUpdate: String(studentVisibleUpdate),
      completedAt: ["APPROVED", "REJECTED", "COMPLETED", "FORWARDED", "CHANGES_REQUESTED"].includes(nextStatus) ? new Date() : null,
    },
    include: {
      reviewer: true,
      requestedByAdmin: true,
    },
  });

  if (nextStatus === "CHANGES_REQUESTED" || nextStatus === "REJECTED") {
    const senderLabel = getActorDisplay(req.actor);
    await notifyStudentOfStageMovement(stage.application, {
      ...updatedStage,
      reviewerEmail: updatedStage.reviewerEmail || stage.reviewerEmail,
      reviewerName: updatedStage.reviewerName || stage.reviewerName,
      reviewerRoleLabel: updatedStage.reviewerRoleLabel || stage.reviewerRoleLabel,
      studentVisibleUpdate:
        studentVisibleUpdate ||
        (nextStatus === "REJECTED"
          ? `Your application for ${stage.application.program.title} is no longer moving forward.`
          : `Your application needs updates before it can continue to the next review step.`),
    }, senderLabel, nextStatus === "REJECTED" ? "Rejected" : "Changes Requested");
  }

  await advanceApplicationStatusFromWorkflow(stage.applicationId);

  const updatedApplication = await prisma.application.findUnique({
    where: { id: stage.applicationId },
    include: applicationInclude,
  });

  res.json(
    success({
      stage: formatWorkflowStage(updatedStage),
      application: formatApplication(updatedApplication),
    }),
  );
});

app.post("/api/nominations", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const { applicationId, notes = "" } = req.body;
  if (!applicationId) {
    return sendError(res, "applicationId is required.", 400);
  }

  const application = await prisma.application.findUnique({
    where: { id: Number(applicationId) },
    include: { program: true, student: true },
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

  const existingStages = await prisma.applicationWorkflowStage.findMany({
    where: { applicationId: Number(applicationId) },
    orderBy: [{ order: "desc" }, { createdAt: "desc" }],
  });
  const finalStage = await createWorkflowStage({
    applicationId: Number(applicationId),
    order: Math.max(0, ...existingStages.map((stage) => stage.order)) + 1,
    stageLabel: "Nominated",
    reviewerEmail: req.actor.admin.email,
    reviewerName: req.actor.admin.name,
    reviewerRoleLabel: "Global Engagement Office",
    instructions: "Final nomination decision recorded by the Global Engagement Office.",
    studentVisibleUpdate: `Your application for ${application.program.title} has been nominated by the Global Engagement Office.`,
    requestedByAdminId: req.actor.admin.id,
    status: "COMPLETED",
  });

  await notifyStudentOfStageMovement(
    { ...application, student: { name: application.student?.name || "", email: application.student?.email || "" }, program: application.program },
    finalStage,
    { name: req.actor.admin.name, typeLabel: "Global Engagement Office" },
    "Nominated",
  );

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
      include: applicationInclude,
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlines = applications
    .flatMap((application) => {
      const uploadedLabelsByDeadline = application.documents.reduce((map, document) => {
        const key = document.deadlineId;
        if (!map.has(key)) {
          map.set(key, new Set());
        }
        map.get(key).add(document.requirementLabel);
        return map;
      }, new Map());

      return (application.program?.deadlines || []).flatMap((deadline) => {
        const deadlineDate = new Date(deadline.date);
        if (deadlineDate < today) {
          return [];
        }

        const requiredDocuments = parseRequiredDocuments(deadline.requiredDocumentsJson);
        const uploadedLabels = uploadedLabelsByDeadline.get(deadline.id) || new Set();

        if (requiredDocuments.length > 0) {
          return requiredDocuments
            .filter((label) => !uploadedLabels.has(label))
            .map((label) => ({
              id: deadline.id,
              programId: application.programId,
              programTitle: application.program?.title || "",
              programUniversity: application.program?.university || "",
              title: deadline.title,
              date: normalizeDateString(deadline.date),
              priority: deadline.priority,
              requiredDocuments,
              requirementLabel: label,
              isSubmitted: false,
            }));
        }

        return [
          {
            id: deadline.id,
            programId: application.programId,
            programTitle: application.program?.title || "",
            programUniversity: application.program?.university || "",
            title: deadline.title,
            date: normalizeDateString(deadline.date),
            priority: deadline.priority,
            requiredDocuments: [],
            requirementLabel: null,
            isSubmitted: false,
          },
        ];
      });
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      const programCompare = a.programTitle.localeCompare(b.programTitle);
      if (programCompare !== 0) return programCompare;
      return (a.requirementLabel || a.title).localeCompare(b.requirementLabel || b.title);
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
      deadlines,
      meetings: meetings.map(formatBooking),
      savedPrograms: savedPrograms.map((item) => formatProgram(item.program)),
      chatHistory: chatHistory.map(formatChatInteraction),
      notifications: notifications.map(formatNotification),
    }),
  );
});

app.get("/api/reviewer/tasks", async (req, res) => {
  if (!(await requireReviewerResponse(req, res))) return;

  // Reviewers see pending StageReviewRequests addressed to their email.
  // They are advisory only — they respond back to OGE and do not control routing.
  const reviewRequests = await prisma.stageReviewRequest.findMany({
    where: {
      toEmail: req.actor.reviewer.email,
      status: "PENDING",
    },
    include: {
      stage: {
        include: {
          requestedByAdmin: true,
          reviewRequests: { orderBy: { createdAt: "asc" } },
        },
      },
      application: {
        include: applicationInclude,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    success({
      reviewer: formatReviewer(req.actor.reviewer),
      tasks: reviewRequests.map((reviewRequest) => ({
        reviewRequest: formatStageReviewRequest(reviewRequest),
        stage: formatWorkflowStage(reviewRequest.stage),
        application: formatApplication(reviewRequest.application),
      })),
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

  const globalHistory = history.filter((item) => {
    const query = String(item.query || "");
    return !query.includes("[programId:") && !query.includes("[program:");
  });

  res.json(success(globalHistory.map(formatChatInteraction)));
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

// Merged dashboard + approval-queue: single DB query for applications shared by both.
app.get("/api/admin/dashboard", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const [programsCount, mentorsCount, applications, deadlines] = await Promise.all([
    prisma.program.count(),
    prisma.mentor.count(),
    prisma.application.findMany({
      include: applicationInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.deadline.findMany({
      include: { program: true },
      orderBy: { date: "asc" },
      take: 6,
    }),
  ]);

  const nonDraft = applications.filter((a) =>
    ["Submitted", "Under Review", "Approved", "Nominated", "Rejected"].includes(a.status),
  );
  const formatted = nonDraft.map(formatApplication);

  res.json(
    success({
      totalPrograms: programsCount,
      totalMentors: mentorsCount,
      totalApplications: applications.length,
      pendingReviews: applications.filter((a) => a.status === "Submitted" || a.status === "Under Review").length,
      upcomingDeadlines: deadlines.map(formatDeadline),
      // overview card (backwards-compatible)
      approvalQueue: formatted.filter((a) => a.status === "Submitted" || a.status === "Under Review"),
      // full queue grouped by status (replaces separate /approval-queue call)
      queue: {
        submitted:  formatted.filter((a) => a.status === "Submitted"),
        underReview: formatted.filter((a) => a.status === "Under Review"),
        approved:   formatted.filter((a) => a.status === "Approved"),
        nominated:  formatted.filter((a) => a.status === "Nominated"),
        rejected:   formatted.filter((a) => a.status === "Rejected"),
      },
      // all applications for the applications list section
      allApplications: applications.map(formatApplication),
    }),
  );
});

// Keep the old endpoint alive so existing code doesn't break during transition.
app.get("/api/admin/approval-queue", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;
  const applications = await prisma.application.findMany({
    where: { status: { in: ["Submitted", "Under Review", "Approved", "Nominated", "Rejected"] } },
    include: applicationInclude,
    orderBy: { updatedAt: "desc" },
  });
  res.json(success({
    submitted:  applications.filter((a) => a.status === "Submitted").map(formatApplication),
    underReview: applications.filter((a) => a.status === "Under Review").map(formatApplication),
    approved:   applications.filter((a) => a.status === "Approved").map(formatApplication),
    nominated:  applications.filter((a) => a.status === "Nominated").map(formatApplication),
    rejected:   applications.filter((a) => a.status === "Rejected").map(formatApplication),
  }));
});

app.post("/api/admin/opportunity-discovery", async (req, res) => {
  if (!(await requireAdminResponse(req, res))) return;

  const normalizedRequest = String(req.body?.query || "").trim();
  if (!normalizedRequest) {
    return sendError(res, "Please describe the kind of opportunity you want to discover.", 400);
  }

  try {
    const discovery = await discoverOpportunities(normalizedRequest);
    res.json(success(discovery));
  } catch (error) {
    console.error("Opportunity discovery failed.", error);
    sendError(res, error.message || "Opportunity discovery failed.", 500);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Allowed frontend origins: ${allowedOrigins.join(", ") || "any"}`);
});
