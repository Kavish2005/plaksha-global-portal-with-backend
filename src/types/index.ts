export type Program = {
  id: number;
  title: string;
  country: string;
  type: string;
  deadline: string;
  featured: boolean;
  shortDescription: string;
  description: string;
  university: string;
};

export type Mentor = {
  id: number;
  name: string;
  expertise: string;
  email: string;
};

export type AvailabilitySlot = {
  time: string;
  available: boolean;
};

export type Booking = {
  id: number;
  mentorId: number;
  mentorName: string;
  expertise: string;
  date: string;
  time: string;
  topic: string;
  status: string;
};

export type Application = {
  id: number;
  studentId: number;
  programId: number;
  programTitle: string;
  status: string;
  deadline: string;
};

export type Deadline = {
  programId: number;
  programTitle: string;
  deadline: string;
  status: string;
};

export type DashboardSummary = {
  applicationsCount: number;
  mentorMeetingsCount: number;
  deadlinesCount: number;
};
