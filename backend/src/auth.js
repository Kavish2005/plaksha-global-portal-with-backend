const prisma = require("./prisma");

async function resolveActor(req) {
  const roleHeader = String(req.headers["x-demo-user-role"] || req.query.role || "student").toLowerCase();
  const emailHeader = String(req.headers["x-demo-user-email"] || "").toLowerCase();
  const studentId = Number(req.query.studentId || 0);

  if (roleHeader === "admin") {
    const admin =
      (emailHeader &&
        (await prisma.admin.findUnique({
          where: { email: emailHeader },
        }))) ||
      (await prisma.admin.findFirst({
        orderBy: { id: "asc" },
      }));

    if (!admin) {
      return null;
    }

    return {
      type: "admin",
      admin,
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
      : null) ||
    (await prisma.student.findFirst({
      orderBy: { id: "asc" },
    }));

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

module.exports = {
  requireAdmin,
  requireStudent,
  resolveActor,
};
