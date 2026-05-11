import { JobStatus } from "@prisma/client";

export type { JobStatus };

export interface Job {
  id: string;
  userId: string;
  company: string;
  role: string;
  jobUrl: string | null;
  appliedDate: string;
  status: JobStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<JobStatus, number>;
  responseRate: number;
  recentActivity: Job[];
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  APPLIED: "bg-blue-100 text-blue-800 border-blue-200",
  SCREENING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  INTERVIEW: "bg-purple-100 text-purple-800 border-purple-200",
  OFFER: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  GHOSTED: "bg-gray-100 text-gray-700 border-gray-200",
};

export const STATUS_COLUMN_COLORS: Record<JobStatus, string> = {
  APPLIED: "border-t-blue-500",
  SCREENING: "border-t-yellow-500",
  INTERVIEW: "border-t-purple-500",
  OFFER: "border-t-green-500",
  REJECTED: "border-t-red-500",
  GHOSTED: "border-t-gray-400",
};

export const ALL_STATUSES: JobStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

// Linear pipeline — moving "backward" through this list deletes forward history
export const PIPELINE_STATUSES: JobStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
];

// Terminal statuses — at most one of these is recorded per job
export const TERMINAL_STATUSES: JobStatus[] = ["REJECTED", "GHOSTED"];

export function isTerminal(s: JobStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

export function pipelineRank(s: JobStatus): number {
  return PIPELINE_STATUSES.indexOf(s);
}
