export type Role = "admin" | "employee";

export type EventType = "login" | "break_start" | "break_end" | "logout";

export type JobStatus =
  | "applied"
  | "interview_scheduled"
  | "interviewed"
  | "offered"
  | "hired"
  | "rejected"
  | "no_response";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface TimeEvent {
  id: string;
  employee_id: string;
  event_type: EventType;
  occurred_at: string;
}

export interface JobApplication {
  id: string;
  employee_id: string;
  applied_date: string;
  platform: string | null;
  country: string | null;
  city: string | null;
  company: string | null;
  job_nature: string | null;
  company_link: string | null;
  job_title: string | null;
  job_link: string | null;
  client_name: string | null;
  position: string | null;
  contact_email: string | null;
  status: JobStatus;
  interview_date: string | null;
  interview_time: string | null;
  feedback: string | null;
  comments: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}
