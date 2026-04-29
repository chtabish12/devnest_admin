import { z } from "zod";

export const JOB_STATUSES = [
  "applied",
  "interview_scheduled",
  "interviewed",
  "offered",
  "hired",
  "rejected",
  "no_response",
] as const;

export const JOB_STATUS_LABELS: Record<(typeof JOB_STATUSES)[number], string> = {
  applied: "Applied",
  interview_scheduled: "Interview Scheduled",
  interviewed: "Interviewed",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  no_response: "No Response",
};

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: "Must be a valid URL starting with http:// or https://",
  });

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /.+@.+\..+/.test(v), {
    message: "Must be a valid email",
  });

export const jobApplicationSchema = z.object({
  applied_date: z.string().min(1, "Date is required"),
  platform: optionalString,
  country: optionalString,
  city: optionalString,
  company: optionalString,
  job_nature: optionalString,
  company_link: optionalUrl,
  job_title: optionalString,
  job_link: optionalUrl,
  client_name: optionalString,
  position: optionalString,
  contact_email: optionalEmail,
  status: z.enum(JOB_STATUSES),
  interview_date: optionalDate,
  interview_time: optionalString,
  feedback: optionalString,
  comments: optionalString,
  follow_up_date: optionalDate,
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
