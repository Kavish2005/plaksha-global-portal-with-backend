const prisma = require("./prisma");
const { formatProgram, normalizeDateString } = require("./utils");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

function trimSnippet(text, maxLength = 260) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function splitDocumentIntoChunks(content, maxLength = 700) {
  const paragraphs = String(content || "")
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxLength) {
      current = paragraph;
    } else {
      chunks.push(paragraph.slice(0, maxLength));
      current = "";
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.slice(0, 4);
}

function buildProgramFacts(program) {
  const formatted = formatProgram(program);
  const tags = formatted.tags.join(", ");
  const deadlineFacts = (program.deadlines || []).map((deadline) => ({
    type: "deadline",
    label: `${program.title} deadline`,
    text: `Program deadline for ${program.title} at ${program.university}: ${deadline.title} on ${normalizeDateString(
      deadline.date,
    )} with priority ${deadline.priority}.`,
    metadata: {
      programId: program.id,
      programTitle: program.title,
      university: program.university,
      date: normalizeDateString(deadline.date),
    },
  }));

  return [
    {
      type: "program",
      label: program.title,
      text: `Program ${program.title} at ${program.university} in ${program.country}. Type: ${program.type}. Description: ${program.description}. Eligibility: ${program.eligibility}. Duration: ${program.duration}. Featured: ${
        program.featured ? "yes" : "no"
      }. Tags: ${tags || "none"}.`,
      metadata: {
        programId: program.id,
        programTitle: program.title,
        university: program.university,
        country: program.country,
        type: program.type,
      },
    },
    ...deadlineFacts,
  ];
}

function buildMentorFacts(mentor) {
  const openSlots = (mentor.availabilities || [])
    .filter((slot) => !slot.isBooked)
    .slice(0, 8)
    .map((slot) => `${normalizeDateString(slot.date)} ${slot.slot}`);

  return [
    {
      type: "mentor",
      label: `Mentor ${mentor.name}`,
      text: `Mentor listing. Mentor ${mentor.name}. Expertise: ${mentor.expertise}. Support area: ${mentor.region}. Bio: ${mentor.bio}. Email: ${
        mentor.email
      }. Open availability: ${openSlots.length ? openSlots.join(", ") : "no open slots listed right now"}.`,
      metadata: {
        mentorId: mentor.id,
        mentorName: mentor.name,
        expertise: mentor.expertise,
        region: mentor.region,
      },
    },
  ];
}

function buildApplicationFacts(application) {
  const deadline = application.program?.deadlines?.[0]?.date
    ? normalizeDateString(application.program.deadlines[0].date)
    : null;
  const nominations = (application.nominations || [])
    .map((nomination) => `Nomination by ${nomination.admin?.name || "office"} on ${normalizeDateString(nomination.createdAt)}.`)
    .join(" ");

  return [
    {
      type: "application",
      label: `${application.student?.name || "Student"} - ${application.program?.title || "Program"}`,
      text: `Application record. Student: ${application.student?.name || "Unknown"} (${application.student?.email || "no email"}). Program: ${
        application.program?.title || "Unknown"
      } at ${application.program?.university || "Unknown"}. Status: ${application.status}. Statement: ${
        application.statement || "not provided"
      }. Reviewer notes: ${application.reviewerNotes || "none"}. Nomination notes: ${
        application.nominationNotes || "none"
      }. Reviewed by: ${application.approvedByAdmin?.name || "not assigned"}. Reviewed at: ${
        application.reviewedAt ? normalizeDateString(application.reviewedAt) : "not reviewed"
      }. Next deadline: ${deadline || "none listed"}. ${nominations}`.trim(),
      metadata: {
        applicationId: application.id,
        programId: application.programId,
        programTitle: application.program?.title || "",
        studentId: application.studentId,
        studentName: application.student?.name || "",
        status: application.status,
      },
    },
  ];
}

function buildBookingFacts(booking) {
  return [
    {
      type: "booking",
      label: `${booking.student?.name || "Student"} with ${booking.mentor?.name || "Mentor"}`,
      text: `Mentor meeting. Student: ${booking.student?.name || "Unknown"} (${booking.student?.email || "no email"}). Mentor: ${
        booking.mentor?.name || "Unknown"
      } (${booking.mentor?.expertise || "no expertise"}). Date: ${normalizeDateString(booking.date)}. Time: ${
        booking.time
      }. Status: ${booking.status}. Topic: ${booking.topic || "not specified"}.`,
      metadata: {
        bookingId: booking.id,
        studentId: booking.studentId,
        studentName: booking.student?.name || "",
        mentorId: booking.mentorId,
        mentorName: booking.mentor?.name || "",
        status: booking.status,
      },
    },
  ];
}

function buildKnowledgeDocumentFacts(document) {
  const excerpts = splitDocumentIntoChunks(document.content);

  return excerpts.map((entry, index) => ({
    type: "document",
    label: `${document.title} ${index + 1}`,
    text: `Reference document ${document.title}. Source type: ${document.sourceType}. Uploaded by ${
      document.uploadedByAdmin?.name || document.uploadedByMentor?.name || "Global Engagement Office"
    }. Excerpt: ${trimSnippet(entry, 700)}`,
    metadata: {
      documentId: document.id,
      title: document.title,
      sourceType: document.sourceType,
    },
  }));
}

function buildActorSummary(actor) {
  if (!actor) return "Anonymous portal visitor";
  if (actor.type === "student") return `Student user: ${actor.student.name} (${actor.student.email})`;
  if (actor.type === "mentor") return `Mentor user: ${actor.mentor.name} (${actor.mentor.email})`;
  if (actor.type === "admin") return `Global Engagement Office user: ${actor.admin.name} (${actor.admin.email})`;
  return "Portal user";
}

async function loadPortalData(actor) {
  const programQuery = prisma.program.findMany({
    include: {
      deadlines: {
        orderBy: { date: "asc" },
      },
    },
    orderBy: [{ featured: "desc" }, { title: "asc" }],
  });

  const mentorQuery = prisma.mentor.findMany({
    include: {
      availabilities: {
        orderBy: [{ date: "asc" }, { slot: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  const documentQuery = prisma.knowledgeDocument.findMany({
    include: {
      uploadedByAdmin: true,
      uploadedByMentor: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const applicationQuery =
    actor?.type === "student"
      ? prisma.application.findMany({
          where: { studentId: actor.student.id },
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
        })
      : actor?.type === "admin"
        ? prisma.application.findMany({
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
          })
        : Promise.resolve([]);

  const bookingQuery =
    actor?.type === "student"
      ? prisma.booking.findMany({
          where: { studentId: actor.student.id },
          include: {
            student: true,
            mentor: true,
          },
          orderBy: [{ date: "asc" }, { time: "asc" }],
        })
      : actor?.type === "mentor"
        ? prisma.booking.findMany({
            where: { mentorId: actor.mentor.id },
            include: {
              student: true,
              mentor: true,
            },
            orderBy: [{ date: "asc" }, { time: "asc" }],
          })
        : actor?.type === "admin"
          ? prisma.booking.findMany({
              include: {
                student: true,
                mentor: true,
              },
              orderBy: [{ date: "asc" }, { time: "asc" }],
            })
          : Promise.resolve([]);

  const [programs, mentors, documents, applications, bookings] = await Promise.all([
    programQuery,
    mentorQuery,
    documentQuery,
    applicationQuery,
    bookingQuery,
  ]);

  return { programs, mentors, documents, applications, bookings };
}

function buildFactCorpus({ programs, mentors, documents, applications, bookings }) {
  return [
    ...programs.flatMap(buildProgramFacts),
    ...mentors.flatMap(buildMentorFacts),
    ...applications.flatMap(buildApplicationFacts),
    ...bookings.flatMap(buildBookingFacts),
    ...documents.flatMap((document) => buildKnowledgeDocumentFacts(document)),
  ];
}

function buildGroundedContext(question, actor, data) {
  const facts = buildFactCorpus(data);
  const topFacts = facts.slice(0, 80);

  return {
    actorSummary: buildActorSummary(actor),
    facts: topFacts,
    allFactCount: facts.length,
    question,
  };
}

function buildKnowledgeBaseFallback(question, context) {
  if (!context.facts.length) {
    return {
      mode: "knowledge_base",
      response:
        "I couldn’t find a matching answer in the portal database or uploaded reference documents. Try asking with a program, mentor, student, or policy name.",
    };
  }

  const lines = context.facts.slice(0, 6).map((fact) => `- ${trimSnippet(fact.text, 220)}`);
  return {
    mode: "knowledge_base",
    response: `Here are the most relevant facts I found for "${question}":\n${lines.join("\n")}`,
  };
}

async function generateLlmReply({ message, actor, context }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const groundedFacts = context.facts.map((fact, index) => ({
    index: index + 1,
    type: fact.type,
    label: fact.label,
    text: fact.text,
    metadata: fact.metadata,
  }));

  const systemPrompt = [
    "You are the Plaksha Global Engagement assistant.",
    "Answer only from the grounded facts provided from the portal database and uploaded reference documents.",
    "Never claim you cannot access the database if relevant facts are present in the grounded facts.",
    "Do not invent programs, mentors, students, deadlines, statuses, or policies.",
    "If the answer is not supported by the grounded facts, say that clearly.",
    "When listing results, include names and statuses exactly as given.",
    "Respond naturally and concisely.",
  ].join(" ");

  const userPrompt = [
    `Current user: ${context.actorSummary}`,
    `User question: ${message}`,
    "",
    `Grounded fact count provided: ${groundedFacts.length} out of ${context.allFactCount} total portal facts.`,
    "Grounded facts from the live portal database and uploaded documents:",
    JSON.stringify(groundedFacts, null, 2),
    "",
    "Find the relevant facts yourself and answer the user's question using these facts only.",
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
      max_tokens: 700,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic request failed with ${response.status}: ${errorBody}`);
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
    throw new Error("Anthropic response did not include text content.");
  }

  return {
    mode: "llm",
    response: outputText,
  };
}

async function createReply({ message, actor }) {
  const rawMessage = String(message || "").trim();

  if (!rawMessage) {
    return {
      mode: process.env.ANTHROPIC_API_KEY ? "llm" : "knowledge_base",
      response: "Please enter a message and I’ll help with programs, mentors, deadlines, applications, meetings, or uploaded office guidance.",
    };
  }

  const data = await loadPortalData(actor);
  const context = buildGroundedContext(rawMessage, actor, data);

  try {
    const llmReply = await generateLlmReply({ message: rawMessage, actor, context });
    if (llmReply) {
      return llmReply;
    }
  } catch (error) {
    console.error("Anthropic chat generation failed, falling back to knowledge-base reply.", error);
  }

  return buildKnowledgeBaseFallback(rawMessage, context);
}

async function respond({ message, actor }) {
  const result = await createReply({ message, actor });

  const interaction = await prisma.chatInteraction.create({
    data: {
      studentId: actor?.type === "student" ? actor.student.id : null,
      query: message,
      response: result.response,
      mode: result.mode,
    },
  });

  return {
    ...result,
    interaction,
  };
}

module.exports = {
  respond,
};
