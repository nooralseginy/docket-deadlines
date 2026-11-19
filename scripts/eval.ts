import { labelsSchema, evaluate } from "../lib/evaluation";
import type { ExtractionRecord } from "../lib/schema";
import { readDockets, readJson, writeJson } from "./io";

const labels = labelsSchema.parse(readJson("evals/labels.json"));
const records = new Map(
  labels.entries.map((label) => [
    label.entryId,
    readJson<ExtractionRecord>(`data/extracted/${label.entryId}.json`),
  ]),
);
const report = evaluate(readDockets(), labels, records);
writeJson("data/eval.json", report);
const pct = (n: number | null) =>
  n === null ? "n/a" : `${Math.floor(n * 1000) / 10}%`;
console.log(
  `${report.method} · ${report.status} · ${report.entryCount} entries · human reviewed: ${report.humanReviewed}`,
);
console.log(
  `Precision ${pct(report.precision)} (${report.truePositives}/${report.predictedEntries})`,
);
console.log(
  `Recall ${pct(report.recall)} (${report.truePositives}/${report.labeledPositiveEntries})`,
);
console.log(
  `Exact-date coverage ${pct(report.exactDateAccuracy)} (${report.exactDates}/${report.expectedDates}); withheld dates count as misses.`,
);
console.log(`Extra asserted dates versus labels: ${report.extraAssertedDates}.`);
console.log(
  `Needs review: ${report.reviewCount}. ${report.misses.length} discrepancy records written to data/eval.json.`,
);
