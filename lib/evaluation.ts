import { z } from "zod";
import { inputHash, PROMPT_VERSION, resolveExtraction } from "./extraction";
import {
  isoDate,
  type Docket,
  type EvalReport,
  type ExtractionRecord,
} from "./schema";

export const labelsSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.string(),
  authoredBy: z.string(),
  humanReviewed: z.boolean(),
  description: z.string(),
  entries: z
    .array(
      z.object({
        entryId: z.string(),
        docketId: z.string(),
        isDeadline: z.boolean(),
        deadlines: z.array(
          z.object({
            kind: z.string(),
            dueDate: isoDate.nullable(),
            quote: z.string().min(1),
          }),
        ),
        reviewRequired: z.boolean(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});
export type Labels = z.infer<typeof labelsSchema>;
const ratio = (n: number, d: number) => (d ? n / d : null);

export function evaluate(
  dockets: Docket[],
  labels: Labels,
  records: Map<string, ExtractionRecord>,
): EvalReport {
  const entries = new Map(
    dockets.flatMap((d) =>
      d.entries.map((e) => [e.id, { ...e, docketId: d.id }] as const),
    ),
  );
  if (entries.size !== dockets.reduce((n, d) => n + d.entries.length, 0))
    throw new Error("Duplicate source entry IDs");
  const seen = new Set<string>();
  let truePositives = 0,
    falsePositives = 0,
    falseNegatives = 0,
    exactDates = 0,
    expectedDates = 0,
    extraAssertedDates = 0,
    reviewCount = 0,
    durationMs = 0;
  let costUsd: number | null = 0;
  const methods = new Set<string>(),
    models = new Set<string>();
  const misses: EvalReport["misses"] = [];
  for (const label of labels.entries) {
    if (seen.has(label.entryId))
      throw new Error(`Duplicate label: ${label.entryId}`);
    seen.add(label.entryId);
    const entry = entries.get(label.entryId);
    const record = records.get(label.entryId);
    if (!entry || entry.docketId !== label.docketId)
      throw new Error(
        `Label points to missing or wrong docket: ${label.entryId}`,
      );
    if (!record)
      throw new Error(
        `Missing extraction: ${label.entryId}. Run npm run extract or npm run extract:baseline.`,
      );
    if (
      record.entryId !== entry.id ||
      record.docketId !== entry.docketId ||
      record.inputHash !== inputHash(entry)
    )
      throw new Error(`Stale or mismatched extraction: ${entry.id}`);
    if (record.promptVersion !== PROMPT_VERSION)
      throw new Error(
        `Stale extraction version: ${entry.id}. Regenerate extractions.`,
      );
    if (
      (record.method !== "baseline" && record.method !== "claude") ||
      (record.method === "baseline" && record.model !== null) ||
      (record.method === "claude" && !record.model?.trim())
    )
      throw new Error(`Invalid extraction method/model: ${entry.id}`);
    const current = resolveExtraction(entry, record.extraction);
    if (
      JSON.stringify(current.resolved) !== JSON.stringify(record.resolved) ||
      current.needsReview !== record.needsReview
    )
      throw new Error(
        `Outdated deadline resolution: ${entry.id}. Regenerate extractions.`,
      );
    if (label.isDeadline !== label.deadlines.length > 0)
      throw new Error(`Inconsistent label: ${entry.id}`);
    for (const expected of label.deadlines)
      if (!entry.text.includes(expected.quote))
        throw new Error(`Unquoted label evidence: ${entry.id}`);
    methods.add(record.method);
    if (record.model) models.add(record.model);
    durationMs += record.usage.durationMs;
    costUsd =
      costUsd !== null && record.usage.costUsd !== null
        ? costUsd + record.usage.costUsd
        : null;
    if (record.needsReview) reviewCount++;
    const predicted = record.extraction.isDeadline;
    if (predicted && label.isDeadline) truePositives++;
    if (predicted && !label.isDeadline) {
      falsePositives++;
      misses.push({
        entryId: entry.id,
        docketId: entry.docketId,
        reason: "Deadline detected in an entry labeled negative.",
      });
    }
    if (!predicted && label.isDeadline) {
      falseNegatives++;
      misses.push({
        entryId: entry.id,
        docketId: entry.docketId,
        reason: "Labeled deadline was not detected.",
      });
    }
    const available = record.resolved
      .filter((d) => d.status === "dated" && d.dueDate !== null)
      .map((d) => d.dueDate);
    for (const expected of label.deadlines) {
      if (!expected.dueDate) continue;
      expectedDates++;
      const index = available.indexOf(expected.dueDate);
      if (index >= 0) {
        exactDates++;
        available.splice(index, 1);
      } else
        misses.push({
          entryId: entry.id,
          docketId: entry.docketId,
          reason: `Expected ${expected.dueDate}; no matching supported date. Review-withheld dates count as misses.`,
        });
    }
    extraAssertedDates += available.length;
    for (const date of available)
      misses.push({
        entryId: entry.id,
        docketId: entry.docketId,
        reason: `Extra asserted date ${date} has no matching labeled deadline date.`,
      });
  }
  if (methods.size !== 1 || models.size > 1)
    throw new Error(
      "Mixed extraction methods or models. Run a single full extraction pass before comparing scores.",
    );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: labels.humanReviewed ? "development" : "provisional",
    labelStatus: labels.status,
    humanReviewed: labels.humanReviewed,
    method: [...methods][0],
    model: [...models][0] ?? null,
    entryCount: seen.size,
    predictedEntries: truePositives + falsePositives,
    labeledPositiveEntries: truePositives + falseNegatives,
    precision: ratio(truePositives, truePositives + falsePositives),
    recall: ratio(truePositives, truePositives + falseNegatives),
    exactDateAccuracy: ratio(exactDates, expectedDates),
    truePositives,
    falsePositives,
    falseNegatives,
    exactDates,
    expectedDates,
    extraAssertedDates,
    reviewCount,
    durationMs,
    costUsd,
    misses,
  };
}
