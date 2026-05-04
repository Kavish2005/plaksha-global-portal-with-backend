const prisma = require("./prisma");
const { PDFParse } = require("pdf-parse");
const { formatProgram, normalizeDateString } = require("./utils");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const PROGRAM_LINK_CACHE = new Map();
const PROGRAM_REVIEW_REPORT_OPEN = "[[PROGRAM_REVIEW_REPORT]]";
const PROGRAM_REVIEW_REPORT_CLOSE = "[[/PROGRAM_REVIEW_REPORT]]";
const PROGRAM_REVIEW_RESPONSE_OPEN = "[[PROGRAM_REVIEW_JSON]]";
const PROGRAM_REVIEW_RESPONSE_CLOSE = "[[/PROGRAM_REVIEW_JSON]]";

function trimSnippet(text, maxLength = 260) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJsonBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

function sanitizeJsonLikeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function safeParseJsonBlock(text) {
  return JSON.parse(sanitizeJsonLikeText(text));
}

function normalizeReviewScore(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(5, Math.round(numeric * 10) / 10));
}

function normalizeProgramReviewReport(report) {
  const categories = Array.isArray(report?.categories)
    ? report.categories
        .map((category) => ({
          name: String(category?.name || "").trim(),
          score: normalizeReviewScore(category?.score, 1),
          weightLabel: String(category?.weightLabel || "Standard").trim() || "Standard",
          rationale: trimSnippet(String(category?.rationale || "").trim(), 260),
        }))
        .filter((category) => category.name && category.rationale)
        .slice(0, 8)
    : [];

  const priorityActions = Array.isArray(report?.priorityActions)
    ? report.priorityActions
        .map((item) => ({
          action: trimSnippet(String(item?.action || "").trim(), 180),
          whyItMatters: trimSnippet(String(item?.whyItMatters || "").trim(), 220),
          urgency: String(item?.urgency || "High").trim() || "High",
        }))
        .filter((item) => item.action && item.whyItMatters)
        .slice(0, 6)
    : [];

  const strengths = Array.isArray(report?.strengths)
    ? report.strengths.map((item) => trimSnippet(String(item || "").trim(), 180)).filter(Boolean).slice(0, 6)
    : [];

  const gaps = Array.isArray(report?.gaps)
    ? report.gaps.map((item) => trimSnippet(String(item || "").trim(), 180)).filter(Boolean).slice(0, 6)
    : [];

  return {
    overallScore: normalizeReviewScore(report?.overallScore, 1),
    overallLabel: trimSnippet(String(report?.overallLabel || "Needs major work").trim(), 90),
    competitivenessVerdict: trimSnippet(String(report?.competitivenessVerdict || "").trim(), 220),
    confidenceNote: trimSnippet(String(report?.confidenceNote || "").trim(), 220),
    rubricRationale: trimSnippet(String(report?.rubricRationale || "").trim(), 240),
    categories,
    strengths,
    gaps,
    priorityActions,
    bottomLine: trimSnippet(String(report?.bottomLine || "").trim(), 280),
  };
}

function buildFallbackReviewReport({ program, narrative, combinedUploads, missingRequirements }) {
  const rawNarrative = String(narrative || "").toLowerCase();
  const readableUploads = combinedUploads.filter((upload) => upload.extractedText);
  const totalRequirements = missingRequirements.length + combinedUploads.length;
  const completenessScore =
    totalRequirements > 0 ? Math.max(1, Math.min(5, (combinedUploads.length / totalRequirements) * 5)) : 3;

  let overallScore = 3;
  let overallLabel = "Needs closer review";

  if (rawNarrative.includes("not competitive") || rawNarrative.includes("cannot proceed") || rawNarrative.includes("hard requirement")) {
    overallScore = 1.8;
    overallLabel = "Not competitive yet";
  } else if (rawNarrative.includes("borderline") || rawNarrative.includes("weak") || rawNarrative.includes("incomplete")) {
    overallScore = 2.4;
    overallLabel = "Promising but incomplete";
  } else if (rawNarrative.includes("competitive")) {
    overallScore = 4;
    overallLabel = "Competitive";
  }

  const type = String(program?.type || "").toLowerCase();
  const dynamicCategories =
    type.includes("research")
      ? [
          {
            name: "Research alignment",
            score: rawNarrative.includes("research") ? Math.max(2, Math.min(5, overallScore + 0.4)) : Math.max(1, overallScore - 0.6),
            weightLabel: "High weight",
            rationale: "Estimated from how strongly the narrative links the uploaded evidence to research readiness for this program.",
          },
          {
            name: "Evidence strength",
            score: readableUploads.length > 0 ? Math.max(2, overallScore) : 1.5,
            weightLabel: "High weight",
            rationale: "Based on whether readable uploaded materials provided enough evidence for a serious evaluation.",
          },
          {
            name: "Document completeness",
            score: completenessScore,
            weightLabel: "Medium weight",
            rationale: "Based on how many currently required materials are present for this program review.",
          },
          {
            name: "Program competitiveness",
            score: overallScore,
            weightLabel: "Highest weight",
            rationale: "Reflects the candid bottom-line competitiveness described in the narrative review.",
          },
        ]
      : [
          {
            name: "Program fit",
            score: Math.max(1, Math.min(5, overallScore)),
            weightLabel: "High weight",
            rationale: "Estimated from how well the current materials appear to match the program's stated expectations.",
          },
          {
            name: "Document completeness",
            score: completenessScore,
            weightLabel: "Medium weight",
            rationale: "Based on how many currently required materials are present for this program review.",
          },
          {
            name: "Application readiness",
            score: Math.max(1, Math.min(5, (overallScore + completenessScore) / 2)),
            weightLabel: "High weight",
            rationale: "Combines current competitiveness and completeness into a practical readiness signal.",
          },
        ];

  const strengths = [];
  if (readableUploads.length > 0) {
    strengths.push(`Readable materials were uploaded, so the review could assess actual evidence instead of only file names.`);
  }
  if (rawNarrative.includes("technical") || rawNarrative.includes("project")) {
    strengths.push("The review identified at least some relevant technical or project evidence in the uploaded materials.");
  }

  const gaps = [];
  if (missingRequirements.length > 0) {
    gaps.push(
      `Missing required materials: ${missingRequirements
        .map((requirement) => requirement.requirementLabel)
        .filter(Boolean)
        .join(", ")}.`,
    );
  }
  if (rawNarrative.includes("recommendation")) {
    gaps.push("Recommendation support appears to be weak or missing for this program.");
  }
  if (rawNarrative.includes("statement") || rawNarrative.includes("sop")) {
    gaps.push("The application narrative or statement appears underdeveloped for this program.");
  }

  const priorityActions = [];
  if (missingRequirements.length > 0) {
    priorityActions.push({
      action: `Upload the missing required materials: ${missingRequirements.map((item) => item.requirementLabel).join(", ")}`,
      whyItMatters: "Incomplete required materials directly reduce application readiness and can block competitiveness.",
      urgency: "High",
    });
  }
  if (rawNarrative.includes("recommendation")) {
    priorityActions.push({
      action: "Secure and submit a strong recommendation that directly supports this program application.",
      whyItMatters: "This review specifically suggests that recommendation strength is a meaningful weakness right now.",
      urgency: "High",
    });
  }
  if (rawNarrative.includes("statement") || rawNarrative.includes("sop")) {
    priorityActions.push({
      action: "Draft a more program-specific statement that explains fit, motivation, and what you will contribute.",
      whyItMatters: "A weak or missing narrative makes even technically strong applications look less competitive.",
      urgency: "High",
    });
  }
  if (priorityActions.length === 0) {
    priorityActions.push({
      action: "Tighten the current materials so they connect more directly to this program's stated goals.",
      whyItMatters: "Even a complete application can score low if the evidence is not positioned clearly for the opportunity.",
      urgency: "Medium",
    });
  }

  const missingLabels = missingRequirements
    .map((requirement) => requirement.requirementLabel)
    .filter(Boolean);

  const competitivenessVerdictParts = [];
  if (overallLabel === "Not competitive yet") {
    competitivenessVerdictParts.push(`Your current application is not competitive yet for ${program.title}.`);
  } else if (overallLabel === "Promising but incomplete") {
    competitivenessVerdictParts.push(`Your application shows some promise, but it is still incomplete for ${program.title}.`);
  } else if (overallLabel === "Competitive") {
    competitivenessVerdictParts.push(`Your current materials look meaningfully competitive for ${program.title}, though final selection still depends on the full review context.`);
  } else {
    competitivenessVerdictParts.push(`Your current application needs closer review to determine how competitive it is for ${program.title}.`);
  }

  if (missingLabels.length > 0) {
    competitivenessVerdictParts.push(`Missing materials: ${missingLabels.join(", ")}.`);
  }
  if (rawNarrative.includes("recommendation")) {
    competitivenessVerdictParts.push("Recommendation strength appears to be a major weakness.");
  }
  if (rawNarrative.includes("statement") || rawNarrative.includes("sop")) {
    competitivenessVerdictParts.push("Your program-specific narrative still looks underdeveloped.");
  }
  if (readableUploads.length === 0) {
    competitivenessVerdictParts.push("Readable evidence from uploaded files was limited, so this score is conservative.");
  }

  const fallbackBottomLineParts = [];
  fallbackBottomLineParts.push(`Overall, this application currently looks ${overallLabel.toLowerCase()} for ${program.title}.`);
  if (priorityActions[0]?.action) {
    fallbackBottomLineParts.push(`Highest priority: ${priorityActions[0].action}.`);
  }
  if (missingLabels.length > 0) {
    fallbackBottomLineParts.push(`Until the missing requirements are addressed, the application will remain weaker than the program expects.`);
  }

  return normalizeProgramReviewReport({
    overallScore,
    overallLabel,
    competitivenessVerdict: competitivenessVerdictParts.join(" "),
    confidenceNote:
      readableUploads.length > 0
        ? "Generated from the current review narrative and the uploaded readable materials."
        : "Generated from the review narrative with limited readable evidence from uploaded files.",
    rubricRationale: `This fallback report used categories tailored to a ${program.type || "program"} so the student still gets a structured review even when the machine-readable report fails.`,
    categories: dynamicCategories,
    strengths,
    gaps,
    priorityActions,
    bottomLine: fallbackBottomLineParts.join(" "),
  });
}

function buildStoredReviewResponse(narrative, reviewReport) {
  return `${String(narrative || "").trim()}\n\n${PROGRAM_REVIEW_REPORT_OPEN}${JSON.stringify(reviewReport)}${PROGRAM_REVIEW_REPORT_CLOSE}`;
}

function extractReviewReportPayload(text) {
  const raw = String(text || "");
  const explicitMatch = raw.match(
    /\[\[PROGRAM_REVIEW_JSON\]\]([\s\S]*?)\[\[\/PROGRAM_REVIEW_JSON\]\]/,
  );

  if (explicitMatch?.[1]) {
    try {
      const parsed = safeParseJsonBlock(explicitMatch[1]);
      if (parsed?.structuredReport) {
        return {
          narrative: raw
            .replace(/\n?\[\[PROGRAM_REVIEW_JSON\]\][\s\S]*?\[\[\/PROGRAM_REVIEW_JSON\]\]\s*/g, "")
            .trim(),
          report: normalizeProgramReviewReport(parsed.structuredReport),
        };
      }
    } catch (_error) {
      // Fall through to legacy recovery path below.
    }
  }

  try {
    const parsedReview = safeParseJsonBlock(extractJsonBlock(raw));
    if (parsedReview?.fullNarrative && parsedReview?.structuredReport) {
      return {
        narrative: String(parsedReview.fullNarrative || "").trim(),
        report: normalizeProgramReviewReport(parsedReview.structuredReport),
      };
    }
  } catch (_error) {
    return null;
  }

  return null;
}

async function repairStructuredReviewReportJson(rawText) {
  const repairSystemPrompt = [
    "You repair malformed JSON.",
    "Return valid JSON only.",
    "Do not add markdown fences or commentary.",
    "Preserve the original meaning as closely as possible.",
  ].join(" ");

  const repairPrompt = [
    "The following text was supposed to be valid JSON for a structured review report but may be malformed.",
    "Repair it into valid JSON only.",
    "",
    String(rawText || ""),
  ].join("\n");

  const repairedText = await callAnthropicText({
    system: repairSystemPrompt,
    userPrompt: repairPrompt,
    maxTokens: 1400,
  });

  return safeParseJsonBlock(extractJsonBlock(repairedText));
}

function decodeDataUrlText(dataUrl) {
  if (!String(dataUrl || "").startsWith("data:")) return null;

  const [, meta = "", payload = ""] = String(dataUrl).match(/^data:([^,]*?),(.*)$/) || [];
  if (!payload) return null;

  try {
    const isBase64 = meta.includes(";base64");
    const decoded = isBase64
      ? Buffer.from(payload, "base64").toString("utf8")
      : decodeURIComponent(payload);
    return decoded.replace(/\0/g, " ").trim();
  } catch (_error) {
    return null;
  }
}

async function extractReadableUploadContent(upload) {
  const mimeType = String(upload?.mimeType || "").toLowerCase();
  const fileName = String(upload?.fileName || "");
  const pdfLikeMime = mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
  const textLikeMime =
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("csv");
  const textLikeExtension = /\.(txt|md|csv|json|xml)$/i.test(fileName);

  if (pdfLikeMime) {
    const dataUrl = String(upload?.fileData || "");
    const match = dataUrl.match(/^data:([^,]*?),(.*)$/);
    if (!match?.[2]) return null;

    try {
      const pdfBuffer = Buffer.from(match[2], "base64");
      const parser = new PDFParse({ data: pdfBuffer });
      const parsed = await parser.getText();
      await parser.destroy();
      const extractedText = String(parsed?.text || "").replace(/\s+/g, " ").trim();
      return extractedText ? trimSnippet(extractedText, 5000) : null;
    } catch (_error) {
      return null;
    }
  }

  if (!textLikeMime && !textLikeExtension) {
    return null;
  }

  const decoded = decodeDataUrlText(upload?.fileData);
  if (!decoded) return null;
  return trimSnippet(decoded, 2500);
}

async function fetchProgramLinkContext(url) {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) {
    return null;
  }

  const cached = PROGRAM_LINK_CACHE.get(normalizedUrl);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < 1000 * 60 * 60) {
    return cached.content;
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Plaksha-Global-Portal/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const stripped = trimSnippet(stripHtmlToText(html), 6000);
    if (!stripped) return null;

    PROGRAM_LINK_CACHE.set(normalizedUrl, {
      content: stripped,
      fetchedAt: now,
    });

    return stripped;
  } catch (_error) {
    return null;
  }
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
      text: `Program ${program.title} at ${program.university} in ${program.country}. Type: ${program.type}. Description: ${program.description}. Eligibility: ${program.eligibility}. Duration: ${program.duration}. Start date: ${
        program.startDate ? normalizeDateString(program.startDate) : "not listed"
      }. End date: ${program.endDate ? normalizeDateString(program.endDate) : "not listed"}. Official link: ${
        program.externalLink || "not provided"
      }. Featured: ${
        program.featured ? "yes" : "no"
      }. Tags: ${tags || "none"}.`,
      metadata: {
        programId: program.id,
        programTitle: program.title,
        university: program.university,
        country: program.country,
        type: program.type,
        startDate: program.startDate ? normalizeDateString(program.startDate) : null,
        endDate: program.endDate ? normalizeDateString(program.endDate) : null,
        externalLink: program.externalLink || null,
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

async function callAnthropicText({ system, userPrompt, maxTokens }) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
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

  return outputText;
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

function buildProgramAssistantFallback({ mode, program, application, combinedUploads, linkContext }) {
  const overview = [
    `Program: ${program.title} at ${program.university} in ${program.country}.`,
    `Type: ${program.type}.`,
    `Eligibility: ${program.eligibility}.`,
    `Duration: ${program.duration}.`,
    `Start date: ${program.startDate ? normalizeDateString(program.startDate) : "not listed"}.`,
    `End date: ${program.endDate ? normalizeDateString(program.endDate) : "not listed"}.`,
    `Deadlines: ${(program.deadlines || []).map((deadline) => `${deadline.title} on ${normalizeDateString(deadline.date)}`).join("; ") || "none listed"}.`,
  ];

  if (mode === "review") {
    const uploadSummary = combinedUploads.length
      ? combinedUploads
          .map((upload) => `${upload.requirementLabel}: ${upload.fileName}${upload.extractedText ? " (text parsed)" : " (content not text-readable)"}`)
          .join("; ")
      : "No uploaded application files found yet.";

    return {
      mode: "program_assistant_fallback",
      response: [
        `I couldn't reach Claude, so here is an honest grounded summary for ${program.title}.`,
        overview.join(" "),
        `Your current uploaded materials: ${uploadSummary}`,
        linkContext ? `Official program page reference: ${trimSnippet(linkContext, 500)}` : "The official program link could not be fetched right now.",
      ].join("\n\n"),
    };
  }

  return {
    mode: "program_assistant_fallback",
    response: [
      `I couldn't reach Claude, so here is the grounded program summary for ${program.title}.`,
      overview.join(" "),
      linkContext ? `Official program page reference: ${trimSnippet(linkContext, 500)}` : "The official program link could not be fetched right now.",
      application ? `Your current application status: ${application.status}.` : "You have not submitted an application for this program yet.",
    ].join("\n\n"),
  };
}

async function createProgramAssistantReply({ actor, program, application, message, mode, pendingUploads = [] }) {
  const normalizedMode = mode === "review" ? "review" : "qa";
  const normalizedMessage =
    String(message || "").trim() ||
    (normalizedMode === "review"
      ? "Please review my current application materials honestly and tell me how strong my application is for this program."
      : "Tell me more about this program.");

  const linkContext = await fetchProgramLinkContext(program.externalLink);

  const existingUploads = await Promise.all(
    (application?.documents || []).map(async (document) => ({
      source: "submitted",
      requirementLabel: document.requirementLabel,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileData: document.fileData,
      deadlineTitle: document.deadline?.title || "",
      extractedText: await extractReadableUploadContent(document),
    })),
  );

  const normalizedPendingUploads = await Promise.all(
    pendingUploads.map(async (upload) => ({
      source: "pending",
      requirementLabel: upload.requirementLabel,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      fileData: upload.fileData,
      deadlineTitle: program.deadlines.find((deadline) => deadline.id === upload.deadlineId)?.title || "",
      extractedText: await extractReadableUploadContent(upload),
    })),
  );

  const combinedUploads = [...existingUploads, ...normalizedPendingUploads];
  const requiredRequirements = (program.deadlines || []).flatMap((deadline) =>
    (deadline.requiredDocuments || []).map((requirementLabel) => ({
      deadlineId: deadline.id,
      deadlineTitle: deadline.title,
      requirementLabel,
      deadlineDate: normalizeDateString(deadline.date),
    })),
  );
  const fulfilledRequirementKeys = new Set(
    combinedUploads.map((upload) => `${upload.deadlineTitle}:${upload.requirementLabel}`),
  );
  const missingRequirements = requiredRequirements.filter(
    (requirement) => !fulfilledRequirementKeys.has(`${requirement.deadlineTitle}:${requirement.requirementLabel}`),
  );

  if (!process.env.ANTHROPIC_API_KEY) {
    return buildProgramAssistantFallback({
      mode: normalizedMode,
      program,
      application,
      combinedUploads,
      linkContext,
    });
  }

  const programFacts = buildProgramFacts(program).map((fact, index) => ({
    index: index + 1,
    type: fact.type,
    label: fact.label,
    text: fact.text,
  }));

  const uploadFacts = combinedUploads.map((upload, index) => ({
    index: index + 1,
    requirementLabel: upload.requirementLabel,
    fileName: upload.fileName,
    source: upload.source,
    deadlineTitle: upload.deadlineTitle,
    extractedText: upload.extractedText,
    readable: Boolean(upload.extractedText),
  }));

  const sharedPrompt = [
    `Current user: ${buildActorSummary(actor)}`,
    `Program-specific assistant mode: ${normalizedMode}`,
    `Student question: ${normalizedMessage}`,
    "",
    "Program facts from the database:",
    JSON.stringify(programFacts, null, 2),
    "",
    `Official program link: ${program.externalLink || "not provided"}`,
    `Official program page extract: ${linkContext || "Could not fetch official page content."}`,
    "",
    `Current student application status for this program: ${application?.status || "not submitted yet"}`,
    `Current application reviewer notes: ${application?.reviewerNotes || "none"}`,
    `Current application nomination notes: ${application?.nominationNotes || "none"}`,
    `Uploaded files count for this review: ${combinedUploads.length}`,
    "",
    "Uploaded application materials available for review:",
    JSON.stringify(uploadFacts, null, 2),
    "",
    "Program file requirements and what is still missing:",
    JSON.stringify(
      {
        required: requiredRequirements,
        missing: missingRequirements,
      },
      null,
      2,
    ),
    "",
    "Answer the student's program question using only the grounded information above.",
  ].join("\n");

  if (normalizedMode === "review") {
    const reviewNarrativeSystemPrompt = [
      "You are the Plaksha Global Engagement program application reviewer for a specific program.",
      "You must be brutally honest, evidence-based, and specific.",
      "Do not give generic encouragement.",
      "Do not confuse a complete application with a competitive application. A fully complete but weak application should still score low.",
      "Judge the student's current readiness against the actual program eligibility, deadlines, and official program information provided.",
      "If the uploaded files count is greater than zero, you must acknowledge that materials have been uploaded. Never say there are no uploaded materials when files are present.",
      "If uploaded files are not text-readable, say that clearly and do not pretend you reviewed their contents.",
      "Give program-specific strengths, gaps, concrete improvements, and an honest current standing.",
      "Never invent qualifications, achievements, or missing requirements.",
      "Keep feedback actionable and tied to this program only.",
      "Write a full candid narrative review in normal prose only. Do not return JSON or markdown code fences.",
    ].join(" ");

    const reviewNarrativePrompt = [
      sharedPrompt,
      "",
      "Review instructions:",
      "1. Assess current standing for this exact program.",
      "2. Identify evidence-backed strengths tied to program fit.",
      "3. Identify real gaps, weak spots, or missing support.",
      "4. Suggest concrete improvements that are program-specific, not generic.",
      "5. If document text was unavailable, say exactly what you could and could not inspect.",
      "6. If uploaded files count is above zero, explicitly state which files were uploaded and whether you could extract readable text from them.",
      "7. Do not just say the application is good. Be rigorous.",
    ].join("\n");

    const outputText = await callAnthropicText({
      system: reviewNarrativeSystemPrompt,
      userPrompt: reviewNarrativePrompt,
      maxTokens: 2600,
    });

    let reviewReport = null;

    try {
      const reviewReportSystemPrompt = [
        "You are generating a structured program application review report.",
        "You must derive the evaluation rubric dynamically from this specific program instead of using a generic fixed rubric.",
        "Choose only the score categories that genuinely matter for this program, and weight program competitiveness more heavily than mere completeness when appropriate.",
        "A complete but weak application must still score low.",
        "Be brutally honest, evidence-based, and program-specific.",
        "Return valid JSON only. Do not include markdown fences or extra commentary.",
      ].join(" ");

      const reviewReportPrompt = [
        sharedPrompt,
        "",
        "You have already written the main narrative review below. Use it as additional context but do not repeat it.",
        outputText,
        "",
        "Return JSON with exactly this shape:",
        JSON.stringify(
          {
            structuredReport: {
              overallScore: 2.4,
              overallLabel: "Promising but incomplete",
              competitivenessVerdict:
                "Direct one-paragraph verdict on how competitive the student is right now for this exact program.",
              confidenceNote:
                "Short note on what evidence was available and any limitations in the review.",
              rubricRationale:
                "Explain why these specific scoring categories matter for this program.",
              categories: [
                {
                  name: "Example category derived from the program",
                  score: 2.5,
                  weightLabel: "High weight",
                  rationale: "Why this score was given based on the student's evidence and the program.",
                },
              ],
              strengths: ["Short evidence-based strength"],
              gaps: ["Short evidence-based gap"],
              priorityActions: [
                {
                  action: "Specific next action",
                  whyItMatters: "Why this action matters for this exact program",
                  urgency: "High",
                },
              ],
              bottomLine: "Short closing judgment on current competitiveness.",
            },
          },
          null,
          2,
        ),
      ].join("\n");

      const reportText = await callAnthropicText({
        system: reviewReportSystemPrompt,
        userPrompt: reviewReportPrompt,
        maxTokens: 1600,
      });

      try {
        const parsedReport = safeParseJsonBlock(extractJsonBlock(reportText));
        if (parsedReport?.structuredReport) {
          reviewReport = normalizeProgramReviewReport(parsedReport.structuredReport);
        } else {
          const extractedReviewPayload = extractReviewReportPayload(reportText);
          reviewReport = extractedReviewPayload?.report || null;
        }
      } catch (_parseError) {
        try {
          const repairedReport = await repairStructuredReviewReportJson(reportText);
          if (repairedReport?.structuredReport) {
            reviewReport = normalizeProgramReviewReport(repairedReport.structuredReport);
          }
        } catch (_repairError) {
          reviewReport = null;
        }
      }
    } catch (error) {
      console.error("Program review report generation failed; returning narrative only.", error);
    }

    if (!reviewReport) {
      reviewReport = buildFallbackReviewReport({
        program,
        narrative: outputText,
        combinedUploads,
        missingRequirements,
      });
    }

    return {
      mode: "program_review_llm",
      response: outputText,
      storedResponse: buildStoredReviewResponse(outputText, reviewReport),
      reviewReport,
    };
  }

  const qaSystemPrompt = [
    "You are the Plaksha Global Engagement program assistant for a specific program.",
    "Answer only from the provided database facts, the official program page extract, and the student's own application context if relevant.",
    "Do not invent unsupported details.",
    "Be concise, clear, and specific to the selected program.",
  ].join(" ");

  const outputText = await callAnthropicText({
    system: qaSystemPrompt,
    userPrompt: sharedPrompt,
    maxTokens: 1000,
  });

  return {
    mode: "program_chat_llm",
    response: outputText,
    storedResponse: outputText,
  };
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
  createProgramAssistantReply,
  respond,
};
