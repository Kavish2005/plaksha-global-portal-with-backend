const prisma = require("./prisma");

async function resolveActor(req) {
  const roleHeader = String(req.headers["x-demo-user-role"] || req.query.role || "").toLowerCase();
  const emailHeader = String(req.headers["x-demo-user-email"] || "").toLowerCase();
  const studentId = Number(req.query.studentId || 0);

  if (!roleHeader && !emailHeader && !studentId) {
    return null;
  }

  if (roleHeader === "admin") {
    const admin =
      (emailHeader &&
        (await prisma.admin.findUnique({
          where: { email: emailHeader },
        }))) ||
      null;

    if (!admin) {
      return null;
    }

    return {
      type: "admin",
      admin,
    };
  }

  if (roleHeader === "mentor") {
    const mentor =
      (emailHeader &&
        (await prisma.mentor.findUnique({
          where: { email: emailHeader },
        }))) ||
      null;

    if (!mentor) {
      return null;
    }

    return {
      type: "mentor",
      mentor,
    };
  }

  const student =
    (emailHeader &&
      (await prisma.student.findUnique({
        where: { email: emailHeader },
      }))) ||
    (studentId
      ? await prisma.student.findUnique({
          where: { id: studentId },
        })
      : null);

  if (!student) {
    return null;
  }

  return {
    type: "student",
    student,
  };
}

function requireAdmin(actor) {
  return actor?.type === "admin";
}

function requireStudent(actor) {
  return actor?.type === "student";
}

function requireMentor(actor) {
  return actor?.type === "mentor";
}

function requireOfficeOrMentor(actor) {
  return actor?.type === "admin" || actor?.type === "mentor";
}

module.exports = {
  requireAdmin,
  requireMentor,
  requireOfficeOrMentor,
  requireStudent,
  resolveActor,
};
