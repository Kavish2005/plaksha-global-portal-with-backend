export type DemoRole = "student" | "admin" | "mentor" | "reviewer";

export type DemoUser = {
  id: number;
  name: string;
  email: string;
  role: DemoRole;
  organizationLabel?: string;
};

export type Deadline = {
  id: number;
  programId: number;
  programTitle: string;
  programUniversity?: string;
  title: string;
  date: string;
  officialDeadline?: string | null;
  priority: string;
  requiredDocuments: string[];
  requirementLabel?: string | null;
  isSubmitted?: boolean;
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
  startDate: string | null;
  endDate: string | null;
  externalLink: string | null;
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

export type WorkflowStageStatus =
  | "PENDING"
  | "ACTIVE"
  | "FORWARDED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "COMPLETED";

export type StageReviewRequestStatus =
  | "PENDING"
  | "RESPONDED"
  | "INFO_REQUESTED"
  | "REJECTED_RECOMMENDATION";

export type StageReviewRequest = {
  id: number;
  stageId: number;
  applicationId: number;
  toEmail: string;
  toName: string;
  toRoleLabel: string;
  instructions: string;
  status: StageReviewRequestStatus;
  reviewerNotes: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationWorkflowStage = {
  id: number;
  applicationId: number;
  order: number;
  stageLabel: string;
  reviewerEmail: string;
  reviewerName: string;
  reviewerRoleLabel: string;
  reviewerId: number | null;
  status: WorkflowStageStatus;
  instructions: string;
  internalNotes: string;
  studentVisibleUpdate: string;
  requestedByAdminId: number | null;
  requestedByAdminName: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewRequests: StageReviewRequest[];
};

export type WorkflowEmailLog = {
  id: number;
  applicationId: number;
  workflowStageId: number | null;
  toEmail: string;
  subject: string;
  body: string;
  deliveryStatus: string;
  direction: string;
  createdAt: string;
};

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
  documents: ApplicationDocument[];
  nominations: Nomination[];
  workflowStages: ApplicationWorkflowStage[];
  currentWorkflowStage: ApplicationWorkflowStage | null;
  emailLogs: WorkflowEmailLog[];
};

export type ApplicationDocument = {
  id: number;
  deadlineId: number;
  deadlineTitle: string;
  deadlineDate: string | null;
  requirementLabel: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

export type ApplicationDocumentAsset = {
  id: number;
  applicationId: number;
  deadlineId: number;
  deadlineTitle: string;
  requirementLabel: string;
  fileName: string;
  mimeType: string;
  fileData: string;
  uploadedAt: string;
  studentName: string;
};

export type ChatInteraction = {
  id: number;
  query: string;
  cleanQuery?: string;
  response: string;
  reviewReport?: ProgramReviewReport | null;
  mode: string;
  programId?: number | null;
  programTitle?: string | null;
  assistantMode?: string | null;
  createdAt: string;
};

export type ProgramReviewCategoryScore = {
  name: string;
  score: number;
  weightLabel: string;
  rationale: string;
};

export type ProgramReviewPriorityAction = {
  action: string;
  whyItMatters: string;
  urgency: string;
};

export type ProgramReviewReport = {
  overallScore: number;
  overallLabel: string;
  competitivenessVerdict: string;
  confidenceNote: string;
  rubricRationale: string;
  categories: ProgramReviewCategoryScore[];
  strengths: string[];
  gaps: string[];
  priorityActions: ProgramReviewPriorityAction[];
  bottomLine: string;
};

export type ProgramAssistantReply = {
  reply: string;
  reviewReport?: ProgramReviewReport | null;
  mode: string;
  interaction: ChatInteraction;
};

export type OpportunityDiscoveryDraft = {
  title: string;
  university: string;
  country: string;
  type: string;
  description: string;
  eligibility: string;
  duration: string;
  startDate: string | null;
  endDate: string | null;
  externalLink: string | null;
  tags: string[];
};

export type OpportunityDiscoveryResult = {
  id: string;
  title: string;
  institution: string;
  country: string;
  confidenceTier?: "best_match" | "strong_match" | "needs_manual_review";
  confidenceLabel?: string;
  rankingScore?: number;
  opportunityType: string;
  summary: string;
  fitReason: string;
  eligibility: string;
  timing: string;
  deadline: string;
  url: string;
  sourceLabel: string;
  sourceSnippet: string;
  tags: string[];
  draftProgram: OpportunityDiscoveryDraft;
};

export type OpportunityDiscoveryResponse = {
  normalizedRequest: string;
  overview: string;
  searchedQueries: string[];
  results: OpportunityDiscoveryResult[];
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
  workflowStageId?: number | null;
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

export type ReviewerTask = {
  reviewRequest: StageReviewRequest;
  stage: ApplicationWorkflowStage;
  application: Application;
};

export type ReviewerDashboard = {
  reviewer: DemoUser;
  tasks: ReviewerTask[];
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
  reviewers: DemoUser[];
};
