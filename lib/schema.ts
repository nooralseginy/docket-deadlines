import { z } from "zod";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid calendar date");

export const entrySchema = z.object({
  id: z.string(),
  entryNumber: z.number().int(),
  entryLabel: z.string().optional(),
  dateFiled: isoDate,
  text: z.string().min(1),
  sourceUrl: z.string().url(),
  textIsExcerpt: z.boolean().optional(),
});
export const docketSchema = z.object({
  id: z.string(),
  caseName: z.string(),
  caseNumber: z.string(),
  court: z.string(),
  courtName: z.string(),
  dateFiled: isoDate,
  sourceUrl: z.string().url(),
  snapshotAt: z.string(),
  textIsExcerpt: z.boolean().optional(),
  entries: z.array(entrySchema),
});
export type DocketEntry = z.infer<typeof entrySchema>;
export type Docket = z.infer<typeof docketSchema>;

export const deadlineSchema = z.object({
  kind: z.string().min(1),
  explicitDate: isoDate.nullable(),
  trigger: z
    .object({
      event: z.string(),
      date: isoDate.nullable(),
      quote: z.string(),
    })
    .nullable(),
  periodDays: z.number().int().positive().max(3650).nullable(),
  unit: z.enum(["days", "weeks", "business-days", "hours"]).nullable(),
  direction: z.enum(["after", "before"]).nullable(),
  quote: z.string().min(1),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable(),
});
export const extractionSchema = z.object({
  isDeadline: z.boolean(),
  deadlines: z.array(deadlineSchema),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable(),
});
export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractedDeadline = z.infer<typeof deadlineSchema>;
export type ResolvedDeadline = ExtractedDeadline & {
  id: string;
  dueDate: string | null;
  status: "dated" | "review";
  calculation: string | null;
  reviewReasons: string[];
};
export type ExtractionRecord = {
  entryId: string;
  docketId: string;
  inputHash: string;
  method: "baseline" | "claude";
  model: string | null;
  promptVersion: string;
  extractedAt: string;
  extraction: Extraction;
  resolved: ResolvedDeadline[];
  needsReview: boolean;
  reviewReasons: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    durationMs: number;
  };
};
export type DocketView = Omit<Docket, "entries"> & {
  entries: (DocketEntry & { extraction: ExtractionRecord | null })[];
};
export type EvalReport = {
  schemaVersion: number;
  generatedAt: string;
  status: string;
  labelStatus: string;
  humanReviewed: boolean;
  method: string;
  model: string | null;
  entryCount: number;
  predictedEntries: number;
  labeledPositiveEntries: number;
  precision: number | null;
  recall: number | null;
  exactDateAccuracy: number | null;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  exactDates: number;
  expectedDates: number;
  extraAssertedDates: number;
  reviewCount: number;
  durationMs: number;
  costUsd: number | null;
  misses: { entryId: string; docketId: string; reason: string }[];
};
