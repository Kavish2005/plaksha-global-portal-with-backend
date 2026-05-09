const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetModel(model) {
  await prisma[model].deleteMany();
}

async function main() {
  await resetModel("workflowEmailLog");
  await resetModel("notificationLog");
  await resetModel("nomination");
  await resetModel("knowledgeDocument");
  await resetModel("chatInteraction");
  await resetModel("contactMessage");
  await resetModel("booking");
  await resetModel("availability");
  await resetModel("applicationDocument");
  await resetModel("stageReviewRequest");
  await resetModel("applicationWorkflowStage");
  await resetModel("deadline");
  await resetModel("application");
  await resetModel("savedProgram");
  await resetModel("reviewer");
  await resetModel("mentor");
  await resetModel("program");
  await resetModel("admin");
  await resetModel("student");

  // ── Students ──────────────────────────────────────────────────────────────
  const [aman, ria, priya, arjun, kavya] = await Promise.all([
    prisma.student.create({ data: { name: "Aman Sharma",  email: "aman@student.plaksha.edu.in"  } }),
    prisma.student.create({ data: { name: "Ria Mehta",   email: "ria@student.plaksha.edu.in"   } }),
    prisma.student.create({ data: { name: "Priya Nair",  email: "priya@student.plaksha.edu.in" } }),
    prisma.student.create({ data: { name: "Arjun Singh", email: "arjun@student.plaksha.edu.in" } }),
    prisma.student.create({ data: { name: "Kavya Reddy", email: "kavya@student.plaksha.edu.in" } }),
  ]);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const admin = await prisma.admin.create({
    data: { name: "Global Engagement Officer", email: "global.office@plaksha.edu.in" },
  });

  // ── Reviewers ─────────────────────────────────────────────────────────────
  const [studentLifeReviewer, ugAcademicsReviewer, deanReviewer] = await Promise.all([
    prisma.reviewer.create({ data: { name: "Student Life Office",  email: "studentlife@plaksha.edu.in",  organizationLabel: "Student Life"    } }),
    prisma.reviewer.create({ data: { name: "UG Academics Office",  email: "ugacademics@plaksha.edu.in",  organizationLabel: "UG Academics"    } }),
    prisma.reviewer.create({ data: { name: "Dean Office",          email: "dean.office@plaksha.edu.in",  organizationLabel: "Dean's Office"   } }),
  ]);

  // ── Real Programs ─────────────────────────────────────────────────────────
  const [
    ethZurich,
    stanford,
    daadRise,
    mitacs,
    cmuRiss,
    caltechSurf,
    epflSummer,
    edinburgh,
  ] = await Promise.all([
    // 0 — ETH Zurich Exchange (semester)
    prisma.program.create({
      data: {
        title: "ETH Zurich Exchange",
        university: "ETH Zurich",
        country: "Switzerland",
        type: "Exchange",
        description:
          "Spend a semester at one of Europe's top engineering universities. ETH Zurich hosts visiting students in engineering, computer science, and natural sciences with full course access and research lab exposure.",
        eligibility: "2nd or 3rd year undergraduate students with a minimum CGPA of 7.5. Strong academic record in engineering or sciences required.",
        duration: "1 semester (September – February or February – August)",
        startDate: new Date("2026-09-14T00:00:00.000Z"),
        endDate:   new Date("2027-02-06T00:00:00.000Z"),
        externalLink: "https://ethz.ch/en/studies/non-degree-courses/exchange-and-visiting-studies.html",
        featured: true,
        tagsJson: JSON.stringify(["engineering", "semester exchange", "Europe", "Switzerland"]),
      },
    }),

    // 1 — Stanford Summer Research (kept exactly as the user entered)
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
        startDate: new Date("2026-06-24T00:00:00.000Z"),
        endDate:   new Date("2026-08-20T00:00:00.000Z"),
        externalLink: "https://summer.stanford.edu/programs/research",
        featured: true,
        tagsJson: JSON.stringify(["research", "summer", "innovation"]),
      },
    }),

    // 2 — DAAD RISE Germany
    prisma.program.create({
      data: {
        title: "DAAD RISE Germany Research Internship",
        university: "DAAD / German Universities",
        country: "Germany",
        type: "Research",
        description:
          "DAAD RISE (Research Internships in Science and Engineering) places undergraduate students from the US, UK, Canada, and select partner countries in research labs at top German universities and research institutes for 2–3 months. Projects span chemistry, physics, biology, engineering, earth sciences, and computer science.",
        eligibility: "Undergraduate students in natural sciences, engineering, or computer science. Must have completed at least 2 years of study. Indian students eligible via the DAAD RISE Worldwide track.",
        duration: "2–3 months (June – August)",
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate:   new Date("2026-08-31T00:00:00.000Z"),
        externalLink: "https://www.daad.de/rise/en/rise-germany/",
        featured: true,
        tagsJson: JSON.stringify(["research", "DAAD", "Germany", "Europe", "funded", "summer"]),
      },
    }),

    // 3 — Mitacs Globalink Research Internship
    prisma.program.create({
      data: {
        title: "Mitacs Globalink Research Internship",
        university: "Canadian Universities (via Mitacs)",
        country: "Canada",
        type: "Research",
        description:
          "Mitacs Globalink connects undergraduate students from partner countries with 12-week research internships at Canadian universities. Students work directly with a Canadian professor on cutting-edge projects in science, technology, engineering, and mathematics. Stipend and travel support provided.",
        eligibility: "Undergraduate students in their penultimate or final year. Minimum 70% aggregate. Open to Indian students through the Mitacs–DST bilateral agreement.",
        duration: "12 weeks (May – August)",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate:   new Date("2026-08-31T00:00:00.000Z"),
        externalLink: "https://www.mitacs.ca/our-programs/globalink-research-internship-students/",
        featured: true,
        tagsJson: JSON.stringify(["research", "Mitacs", "Canada", "funded", "stipend"]),
      },
    }),

    // 4 — CMU Robotics Institute Summer Scholars (RISS)
    prisma.program.create({
      data: {
        title: "CMU Robotics Institute Summer Scholars (RISS)",
        university: "Carnegie Mellon University",
        country: "USA",
        type: "Research",
        description:
          "RISS is a competitive 12-week summer research program at Carnegie Mellon's Robotics Institute. Scholars work one-on-one with CMU faculty on projects in robotics, computer vision, machine learning, and AI. Includes a weekly seminar series and a final symposium. Stipend and housing provided.",
        eligibility: "Undergraduate students with strong programming skills and interest in robotics, AI, or computer vision. International students eligible. GPA 3.5+ preferred.",
        duration: "12 weeks (May – August)",
        startDate: new Date("2026-05-18T00:00:00.000Z"),
        endDate:   new Date("2026-08-07T00:00:00.000Z"),
        externalLink: "https://riss.ri.cmu.edu/",
        featured: true,
        tagsJson: JSON.stringify(["robotics", "AI", "research", "CMU", "USA", "summer", "funded"]),
      },
    }),

    // 5 — Caltech SURF
    prisma.program.create({
      data: {
        title: "Caltech Summer Undergraduate Research Fellowships (SURF)",
        university: "California Institute of Technology (Caltech)",
        country: "USA",
        type: "Research",
        description:
          "The SURF program at Caltech gives undergraduates a chance to conduct research with Caltech faculty mentors. International students may apply through the SURF Amgen program or directly through faculty sponsorship. Research areas include physics, chemistry, biology, engineering, and computing.",
        eligibility: "Undergraduate students with junior standing or above. International applicants are eligible. Strong GPA and demonstrated research interest required.",
        duration: "10 weeks (June – August)",
        startDate: new Date("2026-06-15T00:00:00.000Z"),
        endDate:   new Date("2026-08-21T00:00:00.000Z"),
        externalLink: "https://sfp.caltech.edu/undergraduate-research/programs/surf",
        featured: false,
        tagsJson: JSON.stringify(["research", "Caltech", "USA", "summer", "science"]),
      },
    }),

    // 6 — EPFL Summer Research Programme
    prisma.program.create({
      data: {
        title: "EPFL Summer Research Programme (E3)",
        university: "EPFL (École Polytechnique Fédérale de Lausanne)",
        country: "Switzerland",
        type: "Research",
        description:
          "EPFL's E3 program brings undergraduate students from top global universities to conduct research at EPFL labs in Lausanne for 8–12 weeks. Students are integrated into research groups in areas including computer science, data science, life sciences, physics, and engineering. Stipend and housing subsidy provided.",
        eligibility: "Undergraduate students from partner universities with excellent academic records. Open to international students. Minimum CGPA equivalent to 8.0/10.",
        duration: "8–12 weeks (June – August)",
        startDate: new Date("2026-06-08T00:00:00.000Z"),
        endDate:   new Date("2026-08-28T00:00:00.000Z"),
        externalLink: "https://esl.epfl.ch/e3-epfl-excellence-in-engineering/",
        featured: false,
        tagsJson: JSON.stringify(["research", "EPFL", "Switzerland", "Europe", "funded", "engineering"]),
      },
    }),

    // 7 — University of Edinburgh Summer School
    prisma.program.create({
      data: {
        title: "University of Edinburgh Summer School",
        university: "University of Edinburgh",
        country: "United Kingdom",
        type: "Summer School",
        description:
          "One of the world's largest university summer schools, Edinburgh offers 5-week courses in law, business, literature, social sciences, and computing to international students. Students earn academic credits transferable to home institutions and experience life at a Russell Group university.",
        eligibility: "Undergraduate students who have completed at least one year of study. Open to all nationalities. No minimum GPA requirement, though competitive programs may have prerequisites.",
        duration: "5 weeks (July – August)",
        startDate: new Date("2026-07-06T00:00:00.000Z"),
        endDate:   new Date("2026-08-07T00:00:00.000Z"),
        externalLink: "https://www.ed.ac.uk/summer-school",
        featured: false,
        tagsJson: JSON.stringify(["summer school", "UK", "Europe", "liberal arts", "credits"]),
      },
    }),
  ]);

  const programs = [ethZurich, stanford, daadRise, mitacs, cmuRiss, caltechSurf, epflSummer, edinburgh];

  // ── Deadlines ─────────────────────────────────────────────────────────────
  // Plaksha deadlines are internal submission cutoffs (before the university deadline).
  // officialDeadline is the actual program deadline published by the institution.
  // All dates are for the upcoming cycle (2026–2027) and are after 9 May 2026.
  await Promise.all([
    // ETH Zurich — Spring 2027 semester exchange; ETH nominates by Nov, internal Plaksha cutoff Sep
    prisma.deadline.create({ data: { programId: ethZurich.id,   title: "ETH Zurich Spring 2027 exchange application",  date: new Date("2026-09-30T00:00:00.000Z"), officialDeadline: new Date("2026-10-15T00:00:00.000Z"), priority: "High",   requiredDocumentsJson: JSON.stringify(["Transcript", "Statement of Purpose", "Resume", "LOR"]) } }),
    // Stanford — Summer 2026 (still open); faculty recs due mid-June
    prisma.deadline.create({ data: { programId: stanford.id,    title: "Stanford Summer Research faculty recommendation", date: new Date("2026-06-10T00:00:00.000Z"), officialDeadline: new Date("2026-06-20T00:00:00.000Z"), priority: "Medium", requiredDocumentsJson: JSON.stringify(["LOR", "Resume"]) } }),
    // DAAD RISE — 2027 cycle; DAAD Worldwide deadline is typically 15 Jan; Plaksha cutoff Dec
    prisma.deadline.create({ data: { programId: daadRise.id,    title: "DAAD RISE Worldwide 2027 application",          date: new Date("2026-12-15T00:00:00.000Z"), officialDeadline: new Date("2027-01-15T00:00:00.000Z"), priority: "High",   requiredDocumentsJson: JSON.stringify(["Transcript", "Resume", "Statement of Purpose", "English proficiency"]) } }),
    // Mitacs Globalink — 2027 cycle; Mitacs opens applications ~Sep and closes ~Oct 31
    prisma.deadline.create({ data: { programId: mitacs.id,      title: "Mitacs Globalink 2027 application",             date: new Date("2026-10-15T00:00:00.000Z"), officialDeadline: new Date("2026-10-31T00:00:00.000Z"), priority: "High",   requiredDocumentsJson: JSON.stringify(["Transcript", "Resume", "Research proposal"]) } }),
    // CMU RISS — 2027 cycle; RISS deadline typically 15 Jan; Plaksha cutoff Dec 20
    prisma.deadline.create({ data: { programId: cmuRiss.id,     title: "CMU RISS 2027 application",                     date: new Date("2026-12-20T00:00:00.000Z"), officialDeadline: new Date("2027-01-15T00:00:00.000Z"), priority: "High",   requiredDocumentsJson: JSON.stringify(["Transcript", "Resume", "Personal statement", "LOR"]) } }),
    // Caltech SURF — 2027 cycle; SURF deadline typically 22 Feb; Plaksha cutoff Feb 8
    prisma.deadline.create({ data: { programId: caltechSurf.id, title: "Caltech SURF 2027 application",                 date: new Date("2027-02-08T00:00:00.000Z"), officialDeadline: new Date("2027-02-22T00:00:00.000Z"), priority: "Medium", requiredDocumentsJson: JSON.stringify(["Transcript", "Resume", "Statement of Purpose"]) } }),
    // EPFL E3 — 2027 cycle; E3 deadline typically 31 Jan; Plaksha cutoff Jan 15
    prisma.deadline.create({ data: { programId: epflSummer.id,  title: "EPFL E3 Summer Research 2027 application",      date: new Date("2027-01-15T00:00:00.000Z"), officialDeadline: new Date("2027-01-31T00:00:00.000Z"), priority: "High",   requiredDocumentsJson: JSON.stringify(["Transcript", "Resume", "Motivation letter"]) } }),
    // Edinburgh — Summer 2026 (still enrolling); university enrolment closes mid-June
    prisma.deadline.create({ data: { programId: edinburgh.id,   title: "Edinburgh Summer School 2026 enrolment",        date: new Date("2026-05-25T00:00:00.000Z"), officialDeadline: new Date("2026-06-13T00:00:00.000Z"), priority: "Low",    requiredDocumentsJson: JSON.stringify(["Transcript", "Resume"]) } }),
  ]);

  // ── Mentors ───────────────────────────────────────────────────────────────
  const [mentorRupsy, mentorHarshita, mentorAnanya] = await Promise.all([
    prisma.mentor.create({ data: { name: "Mrs. Rupsy Grewal",     email: "rupsy.grewal@plaksha.edu.in",     expertise: "Global Research Programs",        bio: "Supports research placement strategy, faculty alignment, and student readiness for lab-based opportunities.", region: "Research"        } }),
    prisma.mentor.create({ data: { name: "Mrs. Harshita Tripathi", email: "harshita.tripathi@plaksha.edu.in", expertise: "International Exchange Programs",  bio: "Guides students through exchange partner options, academic fit, and outbound mobility requirements.",           region: "Exchange"        } }),
    prisma.mentor.create({ data: { name: "Dr. Ananya Mehta",      email: "ananya.mehta@plaksha.edu.in",     expertise: "Summer and Europe Mobility",       bio: "Advises on Europe programs, summer schools, and planning strong cross-border applications.",                    region: "Europe and Summer" } }),
  ]);

  // ── Availability ──────────────────────────────────────────────────────────
  const availabilityData = [
    { mentorId: mentorRupsy.id,    date: "2026-05-12", slots: ["10:00 AM", "11:00 AM", "2:00 PM"]  },
    { mentorId: mentorRupsy.id,    date: "2026-05-13", slots: ["10:00 AM", "1:00 PM"]              },
    { mentorId: mentorHarshita.id, date: "2026-05-12", slots: ["9:30 AM", "11:30 AM", "4:00 PM"]  },
    { mentorId: mentorHarshita.id, date: "2026-05-14", slots: ["10:30 AM", "2:30 PM"]             },
    { mentorId: mentorAnanya.id,   date: "2026-05-13", slots: ["10:30 AM", "12:00 PM", "3:00 PM"] },
    { mentorId: mentorAnanya.id,   date: "2026-05-15", slots: ["11:00 AM", "1:00 PM"]             },
  ];

  for (const group of availabilityData) {
    for (const slot of group.slots) {
      await prisma.availability.create({
        data: { mentorId: group.mentorId, date: new Date(`${group.date}T00:00:00.000Z`), slot },
      });
    }
  }

  // Book two slots
  const bookedSlot1 = await prisma.availability.findFirst({ where: { mentorId: mentorRupsy.id,    slot: "11:00 AM", date: new Date("2026-05-12T00:00:00.000Z") } });
  const bookedSlot2 = await prisma.availability.findFirst({ where: { mentorId: mentorHarshita.id, slot: "4:00 PM",  date: new Date("2026-05-12T00:00:00.000Z") } });
  const bookedSlot3 = await prisma.availability.findFirst({ where: { mentorId: mentorAnanya.id,   slot: "3:00 PM",  date: new Date("2026-05-13T00:00:00.000Z") } });

  if (bookedSlot1) {
    await prisma.booking.create({ data: { studentId: aman.id, mentorId: mentorRupsy.id, availabilityId: bookedSlot1.id, date: new Date("2026-05-12T00:00:00.000Z"), time: "11:00 AM", topic: "Research pathways for summer labs", status: "Confirmed" } });
    await prisma.availability.update({ where: { id: bookedSlot1.id }, data: { isBooked: true } });
  }
  if (bookedSlot2) {
    await prisma.booking.create({ data: { studentId: priya.id, mentorId: mentorHarshita.id, availabilityId: bookedSlot2.id, date: new Date("2026-05-12T00:00:00.000Z"), time: "4:00 PM", topic: "CMU RISS vs EPFL — which is a better fit?", status: "Confirmed" } });
    await prisma.availability.update({ where: { id: bookedSlot2.id }, data: { isBooked: true } });
  }
  if (bookedSlot3) {
    await prisma.booking.create({ data: { studentId: arjun.id, mentorId: mentorAnanya.id, availabilityId: bookedSlot3.id, date: new Date("2026-05-13T00:00:00.000Z"), time: "3:00 PM", topic: "Post-nomination next steps for Mitacs", status: "Pending" } });
    await prisma.availability.update({ where: { id: bookedSlot3.id }, data: { isBooked: true } });
  }

  // ── Applications ──────────────────────────────────────────────────────────
  //
  // Aman Sharma:
  //   A1 — DAAD RISE       → Stage 1 (GEO): ACTIVE  (just entered review)
  //   A2 — EPFL Summer     → Stage 1: FORWARDED → Stage 2 (UG Academics): FORWARDED → Stage 3 (Dean): APPROVED → Nominated
  //   A3 — ETH Zurich      → Stage 1 (GEO): CHANGES_REQUESTED
  //
  // Ria Mehta:
  //   R1 — Caltech SURF    → Stage 1 (GEO): FORWARDED → Stage 2 (UG Academics): ACTIVE
  //   R2 — Mitacs          → Stage 1 (GEO): ACTIVE
  //
  // Priya Nair:
  //   P1 — CMU RISS        → Stage 1 (GEO): ACTIVE
  //   P2 — Edinburgh       → Submitted, no stages yet
  //
  // Arjun Singh:
  //   J1 — Mitacs          → Fully approved & Nominated (all 3 stages APPROVED)
  //   J2 — DAAD RISE       → Stage 1 (GEO): REJECTED
  //
  // Kavya Reddy:
  //   K1 — Edinburgh       → Stage 1 (GEO): ACTIVE (first-ever application)

  const [appA1, appA2, appA3, appR1, appR2, appP1, appP2, appJ1, appJ2, appK1] = await Promise.all([
    // Aman
    prisma.application.create({ data: { studentId: aman.id,  programId: daadRise.id,   status: "Under Review",      statement: "I want to work on applied machine learning research in a German lab environment. DAAD RISE aligns perfectly with my third-year AI coursework and long-term goals of a research career." } }),
    prisma.application.create({ data: { studentId: aman.id,  programId: epflSummer.id, status: "Nominated",          statement: "EPFL's research environment in engineering and data science is unmatched in Europe. I am applying to contribute to ongoing work in distributed systems or computer vision.", reviewerNotes: "Excellent academic fit. Dean has signed off.", nominationNotes: "Nominated after full three-stage internal review. Partner institution notified.", approvedByAdminId: admin.id, reviewedAt: new Date("2026-04-15T09:00:00.000Z") } }),
    prisma.application.create({ data: { studentId: aman.id,  programId: ethZurich.id,  status: "Changes Requested",  statement: "I am interested in spending a semester at ETH Zurich focusing on robotics and computational engineering." } }),
    // Ria
    prisma.application.create({ data: { studentId: ria.id,   programId: caltechSurf.id, status: "Under Review",     statement: "I want to pursue undergraduate research in chemistry or bioengineering at Caltech. My coursework in materials science makes SURF a strong fit." } }),
    prisma.application.create({ data: { studentId: ria.id,   programId: mitacs.id,      status: "Under Review",     statement: "Mitacs Globalink would let me work with a Canadian professor on environmental data science, which I have been pursuing independently for the past year." } }),
    // Priya
    prisma.application.create({ data: { studentId: priya.id, programId: cmuRiss.id,     status: "Under Review",     statement: "CMU RISS is my top choice for robotics research. I have completed two semesters of ROS-based projects and am eager to work alongside CMU faculty in the summer." } }),
    prisma.application.create({ data: { studentId: priya.id, programId: edinburgh.id,   status: "Submitted",        statement: "The Edinburgh Summer School would let me take advanced courses in philosophy of AI and social sciences alongside my engineering degree." } }),
    // Arjun
    prisma.application.create({ data: { studentId: arjun.id, programId: mitacs.id,      status: "Nominated",        statement: "I am applying to Mitacs Globalink to work with a Toronto professor on climate modelling using machine learning. This is a direct extension of my final-year thesis work.", reviewerNotes: "Outstanding candidate. Full support from all offices.", nominationNotes: "Nominated unanimously. Mitacs informed of Plaksha's nomination.", approvedByAdminId: admin.id, reviewedAt: new Date("2026-04-10T11:00:00.000Z") } }),
    prisma.application.create({ data: { studentId: arjun.id, programId: daadRise.id,    status: "Rejected",         statement: "I want to explore bioinformatics research in Germany through DAAD RISE Worldwide.", reviewerNotes: "Application did not meet the minimum research experience threshold for this cycle." } }),
    // Kavya
    prisma.application.create({ data: { studentId: kavya.id, programId: edinburgh.id,   status: "Under Review",     statement: "The Edinburgh Summer School would be my first international academic experience. I am particularly interested in the computing and AI elective track." } }),
  ]);

  // ── Nominations ───────────────────────────────────────────────────────────
  await Promise.all([
    prisma.nomination.create({ data: { applicationId: appA2.id, adminId: admin.id, notes: "Nominated following dean approval. EPFL partner coordinator has been notified via email." } }),
    prisma.nomination.create({ data: { applicationId: appJ1.id, adminId: admin.id, notes: "Nominated after unanimous three-stage review. Mitacs liaison confirmed receipt." } }),
  ]);

  // ── Saved programs ────────────────────────────────────────────────────────
  await Promise.all([
    prisma.savedProgram.create({ data: { studentId: aman.id,  programId: cmuRiss.id    } }),
    prisma.savedProgram.create({ data: { studentId: aman.id,  programId: mitacs.id     } }),
    prisma.savedProgram.create({ data: { studentId: ria.id,   programId: epflSummer.id } }),
    prisma.savedProgram.create({ data: { studentId: priya.id, programId: stanford.id   } }),
    prisma.savedProgram.create({ data: { studentId: arjun.id, programId: caltechSurf.id} }),
    prisma.savedProgram.create({ data: { studentId: kavya.id, programId: daadRise.id   } }),
  ]);

  // ── Workflow stages ───────────────────────────────────────────────────────

  // A1 — Aman / DAAD RISE — Stage 1 ACTIVE
  const stageA1_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appA1.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "ACTIVE",
    instructions: "Review the DAAD RISE application for research fit, academic eligibility, and completeness before deciding the next routing step.",
    studentVisibleUpdate: "Your DAAD RISE application is under initial review by the Global Engagement Office.",
    requestedByAdminId: admin.id,
  }});

  // A2 — Aman / EPFL — Stage 1 FORWARDED → Stage 2 FORWARDED → Stage 3 APPROVED
  const stageA2_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appA2.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "FORWARDED",
    instructions: "Verify EPFL eligibility requirements and forward to UG Academics for transcript review.",
    internalNotes: "Strong candidate — CGPA 8.8, research project experience. Forwarding immediately.",
    studentVisibleUpdate: "Your EPFL application has cleared the initial Global Engagement review.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-01T10:00:00.000Z"),
  }});
  const stageA2_2 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appA2.id, order: 2,
    stageLabel: "UG Academics review",
    reviewerEmail: ugAcademicsReviewer.email, reviewerName: ugAcademicsReviewer.name, reviewerRoleLabel: "UG Academics",
    reviewerId: ugAcademicsReviewer.id,
    status: "FORWARDED",
    instructions: "Confirm transcript validity, credit standing, and that EPFL credit transfer aligns with degree requirements.",
    studentVisibleUpdate: "UG Academics has verified your transcript and credit standing. Application is moving forward.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-08T11:00:00.000Z"),
  }});
  const stageA2_3 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appA2.id, order: 3,
    stageLabel: "Dean's Office final approval",
    reviewerEmail: deanReviewer.email, reviewerName: deanReviewer.name, reviewerRoleLabel: "Dean's Office",
    reviewerId: deanReviewer.id,
    status: "APPROVED",
    instructions: "Make the final nomination decision for Aman Sharma's EPFL Summer Research application.",
    studentVisibleUpdate: "The Dean's Office has approved your nomination for the EPFL Summer Research Programme.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-15T09:00:00.000Z"),
  }});

  // A3 — Aman / ETH Zurich — Stage 1 CHANGES_REQUESTED
  const stageA3_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appA3.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "CHANGES_REQUESTED",
    instructions: "Review ETH Zurich application. Transcript and SoP submitted but LOR is missing — request it from the student.",
    internalNotes: "LOR not uploaded. Application is otherwise strong. Returning for completion.",
    studentVisibleUpdate: "Your ETH Zurich application needs one update: please upload your Letter of Recommendation before the office can proceed.",
    requestedByAdminId: admin.id,
  }});

  // R1 — Ria / Caltech SURF — Stage 1 FORWARDED → Stage 2 ACTIVE
  const stageR1_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appR1.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "FORWARDED",
    instructions: "Assess Caltech SURF eligibility and academic fit, then route to UG Academics for GPA verification.",
    studentVisibleUpdate: "Your Caltech SURF application has passed the initial review and is now with UG Academics.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-05T14:00:00.000Z"),
  }});
  const stageR1_2 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appR1.id, order: 2,
    stageLabel: "UG Academics review",
    reviewerEmail: ugAcademicsReviewer.email, reviewerName: ugAcademicsReviewer.name, reviewerRoleLabel: "UG Academics",
    reviewerId: ugAcademicsReviewer.id,
    status: "ACTIVE",
    instructions: "Verify Ria Mehta's GPA and confirm she meets Caltech's minimum academic standards for international applicants.",
    studentVisibleUpdate: "Your application is with UG Academics for academic eligibility verification.",
    requestedByAdminId: admin.id,
  }});

  // R2 — Ria / Mitacs — Stage 1 ACTIVE
  const stageR2_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appR2.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "ACTIVE",
    instructions: "Review the Mitacs Globalink application. Check research proposal quality and academic eligibility.",
    studentVisibleUpdate: "Your Mitacs Globalink application is under review by the Global Engagement Office.",
    requestedByAdminId: admin.id,
  }});

  // P1 — Priya / CMU RISS — Stage 1 ACTIVE
  const stageP1_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appP1.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "ACTIVE",
    instructions: "Review Priya Nair's CMU RISS application for robotics research fit, technical skills, and completeness.",
    studentVisibleUpdate: "Your CMU RISS application is under review by the Global Engagement Office.",
    requestedByAdminId: admin.id,
  }});

  // J1 — Arjun / Mitacs — Fully APPROVED through all 3 stages
  const stageJ1_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appJ1.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "FORWARDED",
    instructions: "Assess Mitacs Globalink application and forward for further internal review.",
    internalNotes: "Exceptional research proposal. CGPA 9.1. Fast-tracking.",
    studentVisibleUpdate: "Your Mitacs application cleared the Global Engagement initial review.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-03-28T09:00:00.000Z"),
  }});
  const stageJ1_2 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appJ1.id, order: 2,
    stageLabel: "Student Life review",
    reviewerEmail: studentLifeReviewer.email, reviewerName: studentLifeReviewer.name, reviewerRoleLabel: "Student Life",
    reviewerId: studentLifeReviewer.id,
    status: "FORWARDED",
    instructions: "Confirm student conduct record and readiness for a 12-week international placement.",
    studentVisibleUpdate: "Student Life has cleared your application. Moving to Dean's review.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-02T10:30:00.000Z"),
  }});
  const stageJ1_3 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appJ1.id, order: 3,
    stageLabel: "Dean's Office final approval",
    reviewerEmail: deanReviewer.email, reviewerName: deanReviewer.name, reviewerRoleLabel: "Dean's Office",
    reviewerId: deanReviewer.id,
    status: "APPROVED",
    instructions: "Make the final nomination decision for Arjun Singh's Mitacs Globalink application.",
    studentVisibleUpdate: "The Dean's Office has approved your nomination for Mitacs Globalink. Congratulations!",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-10T11:00:00.000Z"),
  }});

  // J2 — Arjun / DAAD — Stage 1 REJECTED
  const stageJ2_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appJ2.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "REJECTED",
    instructions: "Assess DAAD RISE Worldwide application for research experience and eligibility.",
    internalNotes: "Applicant does not have sufficient wet-lab or bioinformatics research experience for DAAD RISE Worldwide this cycle. Recommend applying next year after thesis project completion.",
    studentVisibleUpdate: "Your DAAD RISE application was not approved for this cycle. The office will share feedback — please book a session with your advisor to discuss reapplication for the next cycle.",
    requestedByAdminId: admin.id, completedAt: new Date("2026-04-12T15:00:00.000Z"),
  }});

  // K1 — Kavya / Edinburgh — Stage 1 ACTIVE (first application)
  const stageK1_1 = await prisma.applicationWorkflowStage.create({ data: {
    applicationId: appK1.id, order: 1,
    stageLabel: "Global Engagement initial review",
    reviewerEmail: admin.email, reviewerName: admin.name, reviewerRoleLabel: "Global Engagement Office",
    status: "ACTIVE",
    instructions: "Review Kavya Reddy's Edinburgh Summer School application. Verify basic eligibility and confirm the chosen course track is available.",
    studentVisibleUpdate: "Your Edinburgh Summer School application is under review by the Global Engagement Office.",
    requestedByAdminId: admin.id,
  }});

  // ── Notifications ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.notificationLog.create({ data: { studentId: aman.id,  applicationId: appA2.id, workflowStageId: stageA2_3.id, title: "Nominated for EPFL Summer Research",   message: "Congratulations — you have been nominated for the EPFL Summer Research Programme. The Global Engagement Office will share next steps with you shortly." } }),
    prisma.notificationLog.create({ data: { studentId: aman.id,  applicationId: appA3.id, workflowStageId: stageA3_1.id, title: "Action required: ETH Zurich application", message: "Your ETH Zurich Exchange application requires one update. Please upload your Letter of Recommendation before the review can continue." } }),
    prisma.notificationLog.create({ data: { studentId: aman.id,  applicationId: appA1.id, workflowStageId: stageA1_1.id, title: "DAAD RISE application received",         message: "Your DAAD RISE Germany application is now under review by the Global Engagement Office." } }),
    prisma.notificationLog.create({ data: { studentId: ria.id,   applicationId: appR1.id, workflowStageId: stageR1_2.id, title: "Caltech SURF moved to academics review",  message: "Your Caltech SURF application has passed the initial review and is now with the UG Academics Office for GPA verification." } }),
    prisma.notificationLog.create({ data: { studentId: arjun.id, applicationId: appJ1.id, workflowStageId: stageJ1_3.id, title: "Nominated for Mitacs Globalink",         message: "Congratulations — the Dean's Office has approved your Mitacs Globalink nomination. You will be contacted with further instructions." } }),
    prisma.notificationLog.create({ data: { studentId: arjun.id, applicationId: appJ2.id, workflowStageId: stageJ2_1.id, title: "DAAD RISE application not approved",     message: "Your DAAD RISE application was not selected for this cycle. Please book a mentor session for feedback and guidance on next steps." } }),
    prisma.notificationLog.create({ data: { studentId: kavya.id, applicationId: appK1.id, workflowStageId: stageK1_1.id, title: "Edinburgh application under review",      message: "Your Edinburgh Summer School application has been received and is under review by the Global Engagement Office." } }),
    prisma.notificationLog.create({ data: { studentId: priya.id, applicationId: appP1.id, workflowStageId: stageP1_1.id, title: "CMU RISS application under review",       message: "Your CMU RISS application is under review by the Global Engagement Office." } }),
  ]);

  // ── Knowledge documents ───────────────────────────────────────────────────
  await Promise.all([
    prisma.knowledgeDocument.create({ data: {
      title: "Outbound Exchange Preparation Guide",
      sourceType: "markdown",
      content: "Students applying for semester exchange should shortlist programs with academic fit, review credit transfer expectations early, and prepare a clear academic rationale. Faculty recommendation letters are usually expected before nomination windows close. ETH Zurich and EPFL both require transcripts certified by the academic registrar.",
      uploadedByAdminId: admin.id,
    }}),
    prisma.knowledgeDocument.create({ data: {
      title: "Research Internship Programs — Overview",
      sourceType: "text",
      content: "Top funded research internship programs for Plaksha students include: DAAD RISE Germany (chemistry, physics, engineering), Mitacs Globalink Canada (all STEM fields), CMU RISS (robotics, AI, CV), Caltech SURF (science and engineering), and EPFL Summer Research. All require strong academic standing and a research statement. Applications typically open in October–January for summer placements.",
      uploadedByAdminId: admin.id,
    }}),
    prisma.knowledgeDocument.create({ data: {
      title: "Europe Mobility Advising Notes",
      sourceType: "text",
      content: "Europe-focused advising should highlight semester planning, visa timelines, accommodation lead times, and scholarship conversations. ETH Zurich and EPFL are the top-tier Swiss options. DAAD-funded programs in Germany cover living costs. UK summer schools at Edinburgh and UCL offer credit-bearing short courses. Schengen visa processing takes 4–6 weeks — students should start early.",
      uploadedByMentorId: mentorAnanya.id,
    }}),
    prisma.knowledgeDocument.create({ data: {
      title: "Application Workflow — Student Guide",
      sourceType: "process",
      content: "When you submit an application via the portal, it enters the Global Engagement Office review queue. The office may forward it to UG Academics (for transcript checks), Student Life (for conduct clearance), or the Dean's Office (for final nomination approval). You will receive a notification at each stage. If changes are requested, upload the missing documents and the review resumes automatically.",
      uploadedByAdminId: admin.id,
    }}),
  ]);

  // ── Email logs ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.workflowEmailLog.create({ data: { applicationId: appA2.id, workflowStageId: stageA2_2.id, toEmail: ugAcademicsReviewer.email, subject: "Review request: Aman Sharma — EPFL Summer Research (UG Academics)", body: "Please verify Aman Sharma's transcript and confirm credit-transfer eligibility for the EPFL Summer Research Programme.", deliveryStatus: "Sent" } }),
    prisma.workflowEmailLog.create({ data: { applicationId: appA2.id, workflowStageId: stageA2_3.id, toEmail: deanReviewer.email,         subject: "Review request: Aman Sharma — EPFL Summer Research (Dean's approval)", body: "Please make the final nomination decision for Aman Sharma's EPFL Summer Research application.", deliveryStatus: "Sent" } }),
    prisma.workflowEmailLog.create({ data: { applicationId: appJ1.id, workflowStageId: stageJ1_2.id, toEmail: studentLifeReviewer.email,  subject: "Review request: Arjun Singh — Mitacs Globalink (Student Life clearance)", body: "Please confirm Arjun Singh's conduct record and readiness for a 12-week international placement.", deliveryStatus: "Sent" } }),
    prisma.workflowEmailLog.create({ data: { applicationId: appJ1.id, workflowStageId: stageJ1_3.id, toEmail: deanReviewer.email,         subject: "Review request: Arjun Singh — Mitacs Globalink (Dean's approval)", body: "Please make the final nomination decision for Arjun Singh's Mitacs Globalink application.", deliveryStatus: "Sent" } }),
    prisma.workflowEmailLog.create({ data: { applicationId: appR1.id, workflowStageId: stageR1_2.id, toEmail: ugAcademicsReviewer.email,  subject: "Review request: Ria Mehta — Caltech SURF (UG Academics)", body: "Please verify Ria Mehta's GPA and academic eligibility for the Caltech SURF programme.", deliveryStatus: "Sent" } }),
  ]);

  // ── Chat interactions ─────────────────────────────────────────────────────
  await Promise.all([
    prisma.chatInteraction.create({ data: { studentId: aman.id,  query: "What research programs are available in Europe?", response: "Europe-focused research options include ETH Zurich Exchange (semester), EPFL Summer Research Programme (8–12 weeks, funded), and DAAD RISE Germany (2–3 months in German labs). EPFL and ETH Zurich are particularly strong for engineering and CS. All require a transcript and statement of purpose.", mode: "knowledge_base" } }),
    prisma.chatInteraction.create({ data: { studentId: ria.id,   query: "How competitive is Caltech SURF for international students?", response: "Caltech SURF is highly competitive. International students are eligible, and the programme values strong GPAs and research experience. Prepare a compelling statement of purpose and secure a strong LOR. The application window typically opens in October.", mode: "knowledge_base" } }),
    prisma.chatInteraction.create({ data: { studentId: priya.id, query: "What is the CMU RISS programme about?", response: "CMU RISS (Robotics Institute Summer Scholars) is a 12-week summer research programme at Carnegie Mellon. Scholars work directly with CMU faculty on robotics, CV, and AI projects. It includes seminars and a final symposium. International students are eligible. Applications are usually due in January.", mode: "knowledge_base" } }),
    prisma.chatInteraction.create({ data: { studentId: kavya.id, query: "How do I book a mentor session?", response: "Go to the Mentors page, choose an advisor based on their expertise and region focus, then select an available date and time slot. Your booking is confirmed instantly. You can add a topic to help the mentor prepare.", mode: "knowledge_base" } }),
  ]);

  console.log("✓ Seeded: 5 students, 8 real programs, 10 applications across all workflow stages, mentors, availability, bookings, notifications, and knowledge documents.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
