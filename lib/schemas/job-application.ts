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

// --- Helpers ---
//
// Each helper preprocesses the raw input (which may be `string`, `""`, `null`,
// or `undefined`) into a normalized `string | null` BEFORE the validation runs.
// This is important because the form posts strings, but the server action
// re-validates the values that have already been transformed once on the
// client (so the server sees `null` for empty fields). Without preprocess
// the second pass would error with "expected string, received null".

const toNullableTrimmed = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const optionalString = z.preprocess(toNullableTrimmed, z.string().nullable());

const optionalDate = z.preprocess(toNullableTrimmed, z.string().nullable());

const optionalTime = z.preprocess(toNullableTrimmed, z.string().nullable());

// Auto-prepends https:// when the user types a host without a scheme
// (e.g. `linkedin.com/jobs/123` becomes `https://linkedin.com/jobs/123`).
const optionalUrl = z.preprocess(
  (v) => {
    const trimmed = toNullableTrimmed(v);
    if (trimmed === null) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  },
  z
    .string()
    .nullable()
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
    ),
);

const optionalEmail = z.preprocess(
  toNullableTrimmed,
  z
    .string()
    .nullable()
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Doesn't look like a valid email",
    }),
);

const requiredText = (label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: `${label} is required` })
      .min(1, `${label} is required`),
  );

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
