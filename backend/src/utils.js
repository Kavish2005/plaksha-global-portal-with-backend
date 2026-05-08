function success(data, meta) {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

function failure(error, status = 400, details) {
  return {
    status,
    body: {
      success: false,
      error,
      ...(details ? { details } : {}),
    },
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function normalizeDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatProgram(program) {
  const primaryDeadline = program.deadlines?.[0]?.date || null;

  return {
    id: program.id,
    title: program.title,
    university: program.university,
    country: program.country,
    type: program.type,
    description: program.description,
    eligibility: program.eligibility,
    duration: program.duration,
    startDate: program.startDate ? normalizeDateString(program.startDate) : null,
    endDate: program.endDate ? normalizeDateString(program.endDate) : null,
    externalLink: program.externalLink || null,
    featured: program.featured,
    tags: parseJsonArray(program.tagsJson),
    deadline: primaryDeadline ? normalizeDateString(primaryDeadline) : null,
    deadlines:
      program.deadlines?.map((deadline) => ({
        id: deadline.id,
        title: deadline.title,
        date: normalizeDateString(deadline.date),
        priority: deadline.priority,
        requiredDocuments: parseJsonArray(deadline.requiredDocumentsJson),
      })) || [],
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

function formatMentor(mentor) {
  return {
    id: mentor.id,
    name: mentor.name,
    email: mentor.email,
    expertise: mentor.expertise,
    bio: mentor.bio,
    region: mentor.region,
    createdAt: mentor.createdAt,
    updatedAt: mentor.updatedAt,
  };
}

function formatAvailability(slot) {
  return {
    id: slot.id,
    mentorId: slot.mentorId,
    date: normalizeDateString(slot.date),
    time: slot.slot,
    available: !slot.isBooked,
    isBooked: slot.isBooked,
  };
}

function formatBooking(booking) {
  return {
    id: booking.id,
    studentId: booking.studentId,
    mentorId: booking.mentorId,
    mentorName: booking.mentor?.name || "Unknown Mentor",
    expertise: booking.mentor?.expertise || "",
    date: normalizeDateString(booking.date),
    time: booking.time,
    topic: booking.topic || "",
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

function formatStageReviewRequest(item) {
  return {
    id: item.id,
    stageId: item.stageId,
    applicationId: item.applicationId,
    toEmail: item.toEmail,
    toName: item.toName || "",
    toRoleLabel: item.toRoleLabel || "",
    instructions: item.instructions || "",
    status: item.status,
    reviewerNotes: item.reviewerNotes || "",
    respondedAt: item.respondedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function formatWorkflowStage(stage) {
  return {
    id: stage.id,
    applicationId: stage.applicationId,
    order: stage.order,
    stageLabel: stage.stageLabel,
    reviewerEmail: stage.reviewerEmail,
    reviewerName: stage.reviewerName || stage.reviewer?.name || "",
    reviewerRoleLabel: stage.reviewerRoleLabel || stage.reviewer?.organizationLabel || "",
    reviewerId: stage.reviewerId || null,
    status: stage.status,
    instructions: stage.instructions || "",
    internalNotes: stage.internalNotes || "",
    studentVisibleUpdate: stage.studentVisibleUpdate || "",
    requestedByAdminId: stage.requestedByAdminId || null,
    requestedByAdminName: stage.requestedByAdmin?.name || "",
    completedAt: stage.completedAt || null,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
    reviewRequests: (stage.reviewRequests || []).map(formatStageReviewRequest),
  };
}

function formatWorkflowEmailLog(item) {
  return {
    id: item.id,
    applicationId: item.applicationId,
    workflowStageId: item.workflowStageId || null,
    toEmail: item.toEmail,
    subject: item.subject,
    body: item.body,
    deliveryStatus: item.deliveryStatus,
    direction: item.direction,
    createdAt: item.createdAt,
  };
}

function formatApplication(application) {
  const primaryDeadline = application.program?.deadlines?.[0]?.date || null;
  const workflowStages = (application.workflowStages || []).map(formatWorkflowStage).sort((a, b) => a.order - b.order);
  const currentWorkflowStage =
    workflowStages
      .slice()
      .sort((a, b) => {
        if (b.order !== a.order) return b.order - a.order;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      })[0] || null;
  return {
    id: application.id,
    studentId: application.studentId,
    studentName: application.student?.name || "",
    studentEmail: application.student?.email || "",
    programId: application.programId,
    programTitle: application.program?.title || "Unknown Program",
    programUniversity: application.program?.university || "",
    status: application.status,
    statement: application.statement || "",
    reviewerNotes: application.reviewerNotes || "",
    nominationNotes: application.nominationNotes || "",
    approvedByAdminId: application.approvedByAdminId,
    approvedByAdminName: application.approvedByAdmin?.name || "",
    reviewedAt: application.reviewedAt,
    deadline: primaryDeadline ? normalizeDateString(primaryDeadline) : null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    workflowStages,
    currentWorkflowStage,
    emailLogs: (application.emailLogs || []).map(formatWorkflowEmailLog),
    documents:
      application.documents?.map((document) => ({
        id: document.id,
        deadlineId: document.deadlineId,
        deadlineTitle: document.deadline?.title || "",
        deadlineDate: document.deadline ? normalizeDateString(document.deadline.date) : null,
        requirementLabel: document.requirementLabel,
        fileName: document.fileName,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt,
      })) || [],
    nominations:
      application.nominations?.map((nomination) => ({
        id: nomination.id,
        notes: nomination.notes,
        adminId: nomination.adminId,
        adminName: nomination.admin?.name || "",
        createdAt: nomination.createdAt,
      })) || [],
  };
}

function formatDeadline(deadline) {
  return {
    id: deadline.id,
    programId: deadline.programId,
    programTitle: deadline.program?.title || "",
    programUniversity: deadline.program?.university || "",
    title: deadline.title,
    date: normalizeDateString(deadline.date),
    officialDeadline: deadline.officialDeadline ? normalizeDateString(deadline.officialDeadline) : null,
    priority: deadline.priority,
    requiredDocuments: parseJsonArray(deadline.requiredDocumentsJson),
    requirementLabel: null,
    isSubmitted: false,
  };
}

function formatChatInteraction(item) {
  const reportMatch = String(item.response || "").match(/\[\[PROGRAM_REVIEW_REPORT\]\]([\s\S]*?)\[\[\/PROGRAM_REVIEW_REPORT\]\]/);
  let reviewReport = null;
  if (reportMatch?.[1]) {
    try {
      reviewReport = JSON.parse(reportMatch[1]);
    } catch (_error) {
      reviewReport = null;
    }
  }
  const cleanedResponse = String(item.response || "")
    .replace(/\n?\[\[PROGRAM_REVIEW_REPORT\]\][\s\S]*?\[\[\/PROGRAM_REVIEW_REPORT\]\]\s*/g, "")
    .trim();
  const programIdMatch = String(item.query || "").match(/\[programId:(\d+)\]/);
  const programTitleMatch = String(item.query || "").match(/\[program:([^\]]+)\]/);
  const assistantModeMatch = String(item.query || "").match(/\[mode:([^\]]+)\]/);
  const cleanQuery = String(item.query || "").replace(/^(?:\[[^\]]+\])+\s*/, "");

  return {
    id: item.id,
    query: item.query,
    cleanQuery,
    response: cleanedResponse,
    reviewReport,
    mode: item.mode,
    programId: programIdMatch?.[1] ? Number(programIdMatch[1]) : null,
    programTitle: programTitleMatch?.[1] || null,
    assistantMode: assistantModeMatch?.[1] || null,
    createdAt: item.createdAt,
  };
}

function formatKnowledgeDocument(item, actor) {
  const uploadedByRole = item.uploadedByAdmin ? "admin" : item.uploadedByMentor ? "mentor" : "office";
  const uploadedByName = item.uploadedByAdmin?.name || item.uploadedByMentor?.name || "Global Engagement Office";
  const canManage =
    actor?.type === "admin" ||
    (actor?.type === "mentor" && item.uploadedByMentor?.email && actor.mentor?.email === item.uploadedByMentor.email);

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    excerpt: item.content.slice(0, 220),
    sourceType: item.sourceType,
    uploadedByRole,
    uploadedByName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    canManage: Boolean(canManage),
  };
}

function formatNotification(item) {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    applicationId: item.applicationId,
    workflowStageId: item.workflowStageId || null,
    createdAt: item.createdAt,
  };
}

function formatReviewer(reviewer) {
  return {
    id: reviewer.id,
    name: reviewer.name,
    email: reviewer.email,
    role: "reviewer",
    organizationLabel: reviewer.organizationLabel || "",
    createdAt: reviewer.createdAt,
    updatedAt: reviewer.updatedAt,
  };
}

function getTagsJson(tags) {
  if (!Array.isArray(tags)) return JSON.stringify([]);
  return JSON.stringify(
    tags
      .map((tag) => String(tag).trim())
      .filter(Boolean),
  );
}

module.exports = {
  failure,
  formatApplication,
  formatAvailability,
  formatBooking,
  formatChatInteraction,
  formatDeadline,
  formatMentor,
  formatNotification,
  formatProgram,
  formatReviewer,
  formatStageReviewRequest,
  formatWorkflowEmailLog,
  formatWorkflowStage,
  formatKnowledgeDocument,
  getTagsJson,
  normalizeDateString,
  parseJsonArray,
  success,
};
