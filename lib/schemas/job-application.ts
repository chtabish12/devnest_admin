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

// --- Per-field helpers ---

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

// Auto-prepends https:// when the user types a host without a scheme
// (e.g. `linkedin.com/jobs/123` becomes `https://linkedin.com/jobs/123`).
// Empty values pass through as null.
const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v || v.length === 0) return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  })
  .refine(
    (v) => {
      if (v === null) return true;
      try {
        const parsed = new URL(v);
        return Boolean(parsed.hostname && parsed.hostname.includes("."));
      } catch {
        return false;
      }
    },
    { message: "Doesn't look like a valid web address" },
  );

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalTime = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Doesn't look like a valid email",
  });

const requiredText = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

// --- Schema ---
// Required: applied_date, company, job_title, status. Everything else optional.

export const jobApplicationSchema = z.object({
  applied_date: requiredText("Date applied"),
  company: requiredText("Company"),
  job_title: requiredText("Job title"),
  status: z.enum(JOB_STATUSES, {
    required_error: "Status is required",
    invalid_type_error: "Pick a status from the list",
  }),

  platform: optionalString,
  country: optionalString,
  city: optionalString,
  job_nature: optionalString,
  company_link: optionalUrl,
  job_link: optionalUrl,
  client_name: optionalString,
  position: optionalString,
  contact_email: optionalEmail,
  interview_date: optionalDate,
  interview_time: optionalTime,
  feedback: optionalString,
  comments: optionalString,
  follow_up_date: optionalDate,
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
