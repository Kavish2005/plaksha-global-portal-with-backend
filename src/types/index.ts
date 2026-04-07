export type DemoRole = "student" | "admin" | "mentor";

export type DemoUser = {
  id: number;
  name: string;
  email: string;
  role: DemoRole;
};

export type Deadline = {
  id: number;
  programId: number;
  programTitle: string;
  title: string;
  date: string;
  priority: string;
};

export type Program = {
  id: number;
  title: string;
  university: string;
  country: string;
  type: string;
  description: string;
  eligibility: string;
  duration: string;
  featured: boolean;
  tags: string[];
  deadline: string | null;
  deadlines: Deadline[];
  createdAt: string;
  updatedAt: string;
  myApplication?: Application | null;
  isSaved?: boolean;
};

export type Mentor = {
  id: number;
  name: string;
  email: string;
  expertise: string;
  bio: string;
  region: string;
  createdAt: string;
  updatedAt: string;
};

export type AvailabilitySlot = {
  id: number;
  mentorId: number;
  date: string;
  time: string;
  available: boolean;
  isBooked: boolean;
};

export type Booking = {
  id: number;
  studentId: number;
  mentorId: number;
  mentorName: string;
  expertise: string;
  studentName?: string;
  studentEmail?: string;
  date: string;
  time: string;
  topic: string;
  status: string;
  createdAt: string;
};

export type ApplicationStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Nominated";

export type Nomination = {
  id: number;
  applicationId: number;
  adminId: number;
  adminName: string;
  notes: string;
  createdAt: string;
  application?: {
    id: number;
    status: string;
    studentName: string;
    programTitle: string;
  };
};

export type Application = {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  programId: number;
  programTitle: string;
  programUniversity: string;
  status: ApplicationStatus;
  statement: string;
  reviewerNotes: string;
  nominationNotes: string;
  approvedByAdminId: number | null;
  approvedByAdminName: string;
  reviewedAt: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  nominations: Nomination[];
};

export type ChatInteraction = {
  id: number;
  query: string;
  response: string;
  mode: string;
  createdAt: string;
};

export type KnowledgeDocument = {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  sourceType: string;
  uploadedByRole: "admin" | "mentor" | "office";
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
  canManage: boolean;
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  applicationId: number | null;
  createdAt: string;
};

export type DashboardSummary = {
  applicationsCount: number;
  mentorMeetingsCount: number;
  deadlinesCount: number;
  savedProgramsCount: number;
};

export type StudentDashboard = {
  summary: DashboardSummary;
  applications: Application[];
  deadlines: Deadline[];
  meetings: Booking[];
  savedPrograms: Program[];
  chatHistory: ChatInteraction[];
  notifications: NotificationItem[];
};

export type AdminDashboard = {
  totalPrograms: number;
  totalMentors: number;
  totalApplications: number;
  pendingReviews: number;
  upcomingDeadlines: Deadline[];
  approvalQueue: Application[];
};

export type ApprovalQueue = {
  submitted: Application[];
  underReview: Application[];
  approved: Application[];
  nominated: Application[];
  rejected: Application[];
};

export type AuthOptions = {
  admins: DemoUser[];
  mentors: DemoUser[];
};
