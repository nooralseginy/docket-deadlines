import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  docketSchema,
  type DocketView,
  type ExtractionRecord,
  type EvalReport,
} from "./schema";
import { inputHash, PROMPT_VERSION, resolveExtraction } from "./extraction";

export function getDockets(): DocketView[] {
  const dir = path.join(process.cwd(), "data/dockets");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      const docket = docketSchema.parse(
        JSON.parse(readFileSync(path.join(dir, file), "utf8")),
      );
      return {
        ...docket,
        entries: docket.entries.map((entry) => {
          const file = path.join(
            process.cwd(),
            "data/extracted",
            `${entry.id}.json`,
          );
          let extraction: ExtractionRecord | null = null;
          try {
            extraction = JSON.parse(readFileSync(file, "utf8"));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
          if (extraction) {
            if (
              extraction.inputHash !== inputHash(entry) ||
              extraction.entryId !== entry.id ||
              extraction.docketId !== docket.id ||
              extraction.promptVersion !== PROMPT_VERSION
            ) {
              throw new Error(
                `Stale extraction for ${entry.id}. Re-run extraction and evaluation before building.`,
              );
            }
            extraction = {
              ...extraction,
              ...resolveExtraction(entry, extraction.extraction),
            };
          }
          return { ...entry, extraction };
        }),
      };
    });
}
export function getEvaluation(): EvalReport {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "data/eval.json"), "utf8"),
  );
}
export { formatDate } from "./format";
