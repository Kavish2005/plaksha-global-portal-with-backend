const prisma = require("./prisma");
const { formatProgram, normalizeDateString } = require("./utils");

async function createReply(message) {
  const text = String(message).trim().toLowerCase();

  if (!text) {
    return {
      mode: "rule_based",
      response: "Please enter a message and I’ll help with programs, deadlines, mentors, or approvals.",
    };
  }

  if (text.includes("europe")) {
    const programs = await prisma.program.findMany({
      where: {
        OR: [
          { country: { contains: "Switzerland" } },
          { country: { contains: "Germany" } },
          { country: { contains: "France" } },
          { tagsJson: { contains: "Europe" } },
        ],
      },
      include: {
        deadlines: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { title: "asc" },
    });

    if (programs.length === 0) {
      return {
        mode: "rule_based",
        response: "I couldn’t find Europe-based opportunities right now, but you can browse all programs on the Programs page.",
      };
    }

    return {
      mode: "rule_based",
      response: `Europe-focused options currently include ${programs.map((program) => formatProgram(program).title).join(", ")}.`,
    };
  }

  if (text.includes("book") || text.includes("mentor")) {
    return {
      mode: "rule_based",
      response:
        "You can book a mentor from the Mentors page by choosing a mentor, selecting a date, picking an available slot, and confirming the booking.",
    };
  }

  if (text.includes("deadline")) {
    const programs = await prisma.program.findMany({
      include: {
        deadlines: {
          orderBy: { date: "asc" },
        },
      },
    });

    const matched = programs.find((program) => text.includes(program.title.toLowerCase()));
    if (matched?.deadlines?.[0]) {
      return {
        mode: "rule_based",
        response: `${matched.title} currently has ${matched.deadlines[0].title.toLowerCase()} on ${normalizeDateString(
          matched.deadlines[0].date,
        )}.`,
      };
    }

    const upcoming = programs
      .flatMap((program) =>
        program.deadlines.map((deadline) => `${program.title} on ${normalizeDateString(deadline.date)}`),
      )
      .slice(0, 3);

    return {
      mode: "rule_based",
      response: `Upcoming deadlines include ${upcoming.join(", ")}.`,
    };
  }

  if (text.includes("research")) {
    const programs = await prisma.program.findMany({
      where: {
        OR: [{ type: { contains: "Research" } }, { tagsJson: { contains: "research" } }],
      },
      include: {
        deadlines: true,
      },
      take: 3,
      orderBy: { featured: "desc" },
    });

    return {
      mode: "rule_based",
      response: `Research-oriented opportunities currently include ${programs
        .map((program) => program.title)
        .join(", ")}.`,
    };
  }

  if (text.includes("contact")) {
    return {
      mode: "rule_based",
      response:
        "You can contact the Global Engagement Office from the Contact page, or reach out to global.office@plaksha.edu.in for admin-side support.",
    };
  }

  if (text.includes("approval") || text.includes("nomination")) {
    return {
      mode: "rule_based",
      response:
        "Application statuses move through Draft, Submitted, Under Review, Approved, Rejected, and Nominated. Status updates appear automatically in the student dashboard.",
    };
  }

  return {
    mode: "rule_based",
    response:
      "I can help with programs, deadlines, mentor bookings, contact options, and application workflows. Try asking about Europe opportunities, mentor booking, or a program deadline.",
  };
}

async function respond({ message, studentId }) {
  const result = await createReply(message);

  const interaction = await prisma.chatInteraction.create({
    data: {
      studentId: studentId || null,
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
