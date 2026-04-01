const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetModel(model) {
  await prisma[model].deleteMany();
}

async function main() {
  await resetModel("notificationLog");
  await resetModel("nomination");
  await resetModel("chatInteraction");
  await resetModel("contactMessage");
  await resetModel("booking");
  await resetModel("availability");
  await resetModel("deadline");
  await resetModel("application");
  await resetModel("savedProgram");
  await resetModel("mentor");
  await resetModel("program");
  await resetModel("admin");
  await resetModel("student");

  const [aman, ria] = await Promise.all([
    prisma.student.create({
      data: {
        name: "Aman Sharma",
        email: "aman@student.plaksha.edu.in",
      },
    }),
    prisma.student.create({
      data: {
        name: "Ria Mehta",
        email: "ria@student.plaksha.edu.in",
      },
    }),
  ]);

  const admin = await prisma.admin.create({
    data: {
      name: "Global Engagement Officer",
      email: "global.office@plaksha.edu.in",
    },
  });

  const programs = await Promise.all([
    prisma.program.create({
      data: {
        title: "ETH Zurich Exchange",
        university: "ETH Zurich",
        country: "Switzerland",
        type: "Exchange",
        description:
          "Spend a semester in Zurich focused on engineering, entrepreneurship, and international lab collaboration.",
        eligibility: "2nd and 3rd year undergraduate students with CGPA above 7.5.",
        duration: "1 semester",
        featured: true,
        tagsJson: JSON.stringify(["engineering", "semester exchange", "Europe"]),
      },
    }),
    prisma.program.create({
      data: {
        title: "Stanford Summer Research",
        university: "Stanford University",
        country: "USA",
        type: "Research",
        description:
          "Work on faculty-guided innovation and applied research projects across emerging technology domains.",
        eligibility: "Students with prior project or lab experience in computing, design, or engineering.",
        duration: "8 weeks",
        featured: true,
        tagsJson: JSON.stringify(["research", "summer", "innovation"]),
      },
    }),
    prisma.program.create({
      data: {
        title: "Tokyo AI Lab",
        university: "Tokyo Institute of Technology",
        country: "Japan",
        type: "Research",
        description:
          "An immersive AI research placement spanning robotics, machine learning, and international teamwork.",
        eligibility: "Students with coursework or projects in AI, data science, or robotics.",
        duration: "10 weeks",
        featured: true,
        tagsJson: JSON.stringify(["AI", "research", "Asia"]),
      },
    }),
    prisma.program.create({
      data: {
        title: "NUS Innovation Fellowship",
        university: "National University of Singapore",
        country: "Singapore",
        type: "Internship",
        description:
          "A practice-oriented global innovation experience with startup and ecosystem exposure.",
        eligibility: "Students interested in product, entrepreneurship, and international innovation ecosystems.",
        duration: "6 weeks",
        featured: false,
        tagsJson: JSON.stringify(["innovation", "internship", "startup"]),
      },
    }),
    prisma.program.create({
      data: {
        title: "University of Toronto Research Exchange",
        university: "University of Toronto",
        country: "Canada",
        type: "Summer School",
        description:
          "Participate in an interdisciplinary research exchange with faculty and peer cohorts in Toronto.",
        eligibility: "Students with strong academic standing and demonstrated research interest.",
        duration: "7 weeks",
        featured: false,
        tagsJson: JSON.stringify(["research", "summer school", "North America"]),
      },
    }),
  ]);

  await Promise.all([
    prisma.deadline.create({
      data: {
        programId: programs[0].id,
        title: "Student application deadline",
        date: new Date("2026-05-12T00:00:00.000Z"),
        priority: "High",
      },
    }),
    prisma.deadline.create({
      data: {
        programId: programs[1].id,
        title: "Faculty recommendation submission",
        date: new Date("2026-06-10T00:00:00.000Z"),
        priority: "Medium",
      },
    }),
    prisma.deadline.create({
      data: {
        programId: programs[2].id,
        title: "Research statement deadline",
        date: new Date("2026-07-01T00:00:00.000Z"),
        priority: "High",
      },
    }),
    prisma.deadline.create({
      data: {
        programId: programs[3].id,
        title: "Nomination window closes",
        date: new Date("2026-04-20T00:00:00.000Z"),
        priority: "Medium",
      },
    }),
    prisma.deadline.create({
      data: {
        programId: programs[4].id,
        title: "Summer exchange application deadline",
        date: new Date("2026-05-28T00:00:00.000Z"),
        priority: "Low",
      },
    }),
  ]);

  const mentors = await Promise.all([
    prisma.mentor.create({
      data: {
        name: "Mrs. Rupsy Grewal",
        expertise: "Global Research Programs",
        bio: "Supports research placement strategy, faculty alignment, and student readiness for lab-based opportunities.",
        region: "Research",
      },
    }),
    prisma.mentor.create({
      data: {
        name: "Mrs. Harshita Tripathi",
        expertise: "International Exchange Programs",
        bio: "Guides students through exchange partner options, academic fit, and outbound mobility requirements.",
        region: "Exchange",
      },
    }),
    prisma.mentor.create({
      data: {
        name: "Dr. Ananya Mehta",
        expertise: "Summer and Europe Mobility",
        bio: "Advises on Europe programs, summer schools, and planning strong cross-border applications.",
        region: "Europe and Summer",
      },
    }),
  ]);

  const availabilityData = [
    { mentorId: mentors[0].id, date: "2026-04-08", slots: ["10:00 AM", "11:00 AM", "2:00 PM"] },
    { mentorId: mentors[0].id, date: "2026-04-09", slots: ["10:00 AM", "1:00 PM"] },
    { mentorId: mentors[1].id, date: "2026-04-08", slots: ["9:30 AM", "11:30 AM", "4:00 PM"] },
    { mentorId: mentors[1].id, date: "2026-04-10", slots: ["10:30 AM", "2:30 PM"] },
    { mentorId: mentors[2].id, date: "2026-04-09", slots: ["10:30 AM", "12:00 PM", "3:00 PM"] },
    { mentorId: mentors[2].id, date: "2026-04-11", slots: ["11:00 AM", "1:00 PM"] },
  ];

  for (const group of availabilityData) {
    for (const slot of group.slots) {
      await prisma.availability.create({
        data: {
          mentorId: group.mentorId,
          date: new Date(`${group.date}T00:00:00.000Z`),
          slot,
        },
      });
    }
  }

  const bookedAvailability = await prisma.availability.findFirst({
    where: {
      mentorId: mentors[0].id,
      slot: "11:00 AM",
      date: new Date("2026-04-08T00:00:00.000Z"),
    },
  });

  const secondAvailability = await prisma.availability.findFirst({
    where: {
      mentorId: mentors[1].id,
      slot: "4:00 PM",
      date: new Date("2026-04-08T00:00:00.000Z"),
    },
  });

  if (bookedAvailability) {
    await prisma.booking.create({
      data: {
        studentId: aman.id,
        mentorId: mentors[0].id,
        availabilityId: bookedAvailability.id,
        date: new Date("2026-04-08T00:00:00.000Z"),
        time: "11:00 AM",
        topic: "Research pathways for summer labs",
        status: "Confirmed",
      },
    });
    await prisma.availability.update({
      where: { id: bookedAvailability.id },
      data: { isBooked: true },
    });
  }

  if (secondAvailability) {
    await prisma.booking.create({
      data: {
        studentId: aman.id,
        mentorId: mentors[1].id,
        availabilityId: secondAvailability.id,
        date: new Date("2026-04-08T00:00:00.000Z"),
        time: "4:00 PM",
        topic: "Exchange eligibility and shortlisting",
        status: "Confirmed",
      },
    });
    await prisma.availability.update({
      where: { id: secondAvailability.id },
      data: { isBooked: true },
    });
  }

  const [applicationOne, applicationTwo, applicationThree, applicationFour] = await Promise.all([
    prisma.application.create({
      data: {
        studentId: aman.id,
        programId: programs[1].id,
        status: "Submitted",
        statement: "I want to deepen my research exposure in human-centered AI and innovation systems.",
      },
    }),
    prisma.application.create({
      data: {
        studentId: aman.id,
        programId: programs[0].id,
        status: "Under Review",
        statement: "I am interested in semester-long mobility with strong technical rigor and project-based learning.",
        reviewerNotes: "Awaiting transcript validation from academics office.",
        approvedByAdminId: admin.id,
        reviewedAt: new Date("2026-03-29T10:30:00.000Z"),
      },
    }),
    prisma.application.create({
      data: {
        studentId: aman.id,
        programId: programs[2].id,
        status: "Nominated",
        statement: "I want exposure to AI labs working on robotics and cross-cultural research collaboration.",
        reviewerNotes: "Strong research fit.",
        nominationNotes: "Forwarded to partner institution with faculty endorsement.",
        approvedByAdminId: admin.id,
        reviewedAt: new Date("2026-03-30T09:00:00.000Z"),
      },
    }),
    prisma.application.create({
      data: {
        studentId: ria.id,
        programId: programs[4].id,
        status: "Approved",
        statement: "I want to build interdisciplinary research experience during the summer.",
        reviewerNotes: "Approved for next-stage documentation.",
        approvedByAdminId: admin.id,
        reviewedAt: new Date("2026-03-28T14:15:00.000Z"),
      },
    }),
  ]);

  await prisma.nomination.create({
    data: {
      applicationId: applicationThree.id,
      adminId: admin.id,
      notes: "Officially nominated after faculty panel review.",
    },
  });

  await Promise.all([
    prisma.savedProgram.create({
      data: { studentId: aman.id, programId: programs[0].id },
    }),
    prisma.savedProgram.create({
      data: { studentId: aman.id, programId: programs[4].id },
    }),
  ]);

  await Promise.all([
    prisma.notificationLog.create({
      data: {
        studentId: aman.id,
        applicationId: applicationTwo.id,
        title: "Application moved to review",
        message: "Your ETH Zurich Exchange application is under review by the Global Engagement Office.",
      },
    }),
    prisma.notificationLog.create({
      data: {
        studentId: aman.id,
        applicationId: applicationThree.id,
        title: "Nomination confirmed",
        message: "You have been nominated for Tokyo AI Lab. The partner institution has been informed.",
      },
    }),
  ]);

  await Promise.all([
    prisma.chatInteraction.create({
      data: {
        studentId: aman.id,
        query: "What programs are available in Europe?",
        response: "Europe opportunities currently include ETH Zurich Exchange and related mobility advising through the mentors team.",
        mode: "rule_based",
      },
    }),
    prisma.chatInteraction.create({
      data: {
        studentId: aman.id,
        query: "How do I book a mentor?",
        response: "Go to the Mentors page, select a mentor, choose a date, and confirm an available slot.",
        mode: "rule_based",
      },
    }),
  ]);

  console.log("Seeded database with students, admin, programs, mentors, applications, and workflow data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
