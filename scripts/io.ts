import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { docketSchema, type Docket } from "../lib/schema";

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8"));
}
export function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${file}.tmp`, file);
}
export function readDockets(): Docket[] {
  return readdirSync("data/dockets")
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => docketSchema.parse(readJson(`data/dockets/${f}`)));
}
