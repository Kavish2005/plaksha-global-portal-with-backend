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
    featured: program.featured,
    tags: parseJsonArray(program.tagsJson),
    deadline: primaryDeadline ? normalizeDateString(primaryDeadline) : null,
    deadlines:
      program.deadlines?.map((deadline) => ({
        id: deadline.id,
        title: deadline.title,
        date: normalizeDateString(deadline.date),
        priority: deadline.priority,
      })) || [],
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

function formatMentor(mentor) {
  return {
    id: mentor.id,
    name: mentor.name,
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

function formatApplication(application) {
  const primaryDeadline = application.program?.deadlines?.[0]?.date || null;
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
    title: deadline.title,
    date: normalizeDateString(deadline.date),
    priority: deadline.priority,
  };
}

function formatChatInteraction(item) {
  return {
    id: item.id,
    query: item.query,
    response: item.response,
    mode: item.mode,
    createdAt: item.createdAt,
  };
}

function formatNotification(item) {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    applicationId: item.applicationId,
    createdAt: item.createdAt,
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
  getTagsJson,
  normalizeDateString,
  success,
};
