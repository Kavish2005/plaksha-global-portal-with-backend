const programs = [
  {
    id: 1,
    title: "ETH Zurich Exchange",
    country: "Switzerland",
    type: "Exchange",
    deadline: "2026-05-12",
    featured: true,
    university: "ETH Zurich",
    shortDescription: "Spend a semester at one of Europe’s leading universities.",
    description:
      "A semester-long exchange focused on engineering, design, and entrepreneurship with strong lab exposure and international cohort experience.",
  },
  {
    id: 2,
    title: "Stanford Summer Research",
    country: "USA",
    type: "Research",
    deadline: "2026-06-10",
    featured: true,
    university: "Stanford University",
    shortDescription: "Collaborate with Silicon Valley innovators.",
    description:
      "A summer research pathway for students interested in innovation, labs, and faculty-guided projects in emerging technology areas.",
  },
  {
    id: 3,
    title: "Tokyo AI Lab",
    country: "Japan",
    type: "Research",
    deadline: "2026-07-01",
    featured: true,
    university: "Tokyo Institute of Technology",
    shortDescription: "Participate in cutting-edge AI research.",
    description:
      "An AI-focused international lab experience with emphasis on robotics, machine learning, and cross-cultural collaboration.",
  },
  {
    id: 4,
    title: "NUS Innovation Exchange",
    country: "Singapore",
    type: "Exchange",
    deadline: "2026-03-20",
    featured: false,
    university: "National University of Singapore",
    shortDescription: "Experience innovation ecosystems in Southeast Asia.",
    description:
      "A structured exchange program combining academic credits, startup exposure, and industry immersion in Singapore.",
  },
];

const mentors = [
  {
    id: 1,
    name: "Mrs. Rupsy Grewal",
    expertise: "Global Research Programs",
    email: "rupsy.grewal@plaksha.edu.in",
  },
  {
    id: 2,
    name: "Mrs. Harshita Tripathi",
    expertise: "International Exchange Programs",
    email: "harshita.tripathi@plaksha.edu.in",
  },
  {
    id: 3,
    name: "Dr. Ananya Mehta",
    expertise: "Europe Mobility and Semester Exchanges",
    email: "ananya.mehta@plaksha.edu.in",
  },
];

const slotTemplates = {
  1: ["10:00 AM", "11:00 AM", "1:00 PM", "3:00 PM"],
  2: ["9:30 AM", "11:30 AM", "2:00 PM", "4:00 PM"],
  3: ["10:30 AM", "12:00 PM", "2:30 PM"],
};

const applications = [
  { id: 1, studentId: 1, programId: 2, status: "Submitted" },
  { id: 2, studentId: 1, programId: 1, status: "In Review" },
  { id: 3, studentId: 1, programId: 3, status: "Draft" },
];

const bookings = [
  {
    id: 1,
    studentId: 1,
    mentorId: 1,
    date: "2026-03-10",
    time: "11:00 AM",
    topic: "Research pathways",
    status: "Confirmed",
  },
  {
    id: 2,
    studentId: 1,
    mentorId: 2,
    date: "2026-03-18",
    time: "2:00 PM",
    topic: "Exchange eligibility",
    status: "Confirmed",
  },
];

const contactMessages = [];
const chatHistory = [];

module.exports = {
  programs,
  mentors,
  slotTemplates,
  applications,
  bookings,
  contactMessages,
  chatHistory,
};
