import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, type Labels } from "./evaluation";
import {
  baselineExtraction,
  inputHash,
  PROMPT_VERSION,
  resolveExtraction,
} from "./extraction";
import type { Docket, DocketEntry, ExtractionRecord } from "./schema";

function fixture(text = "Response due 12/4/2026. Reply due 12/11/2026.") {
  const entry: DocketEntry = {
    id: "entry-1",
    entryNumber: 1,
    dateFiled: "2026-11-12",
    text,
    sourceUrl: "https://example.com/docket",
  };
  const docket: Docket = {
    id: "docket-1",
    caseName: "Test case",
    caseNumber: "1:26-cv-1",
    court: "nysd",
    courtName: "S.D.N.Y.",
    dateFiled: "2026-11-12",
    sourceUrl: entry.sourceUrl,
    snapshotAt: "2026-11-19T00:00:00Z",
    entries: [entry],
  };
  const record: ExtractionRecord = {
    entryId: entry.id,
    docketId: docket.id,
    inputHash: inputHash(entry),
    method: "baseline",
    model: null,
    promptVersion: PROMPT_VERSION,
    extractedAt: "2026-11-19T00:00:00Z",
    ...resolveExtraction(entry, baselineExtraction(entry)),
    usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 10 },
  };
  const labels: Labels = {
    schemaVersion: 1,
    status: "provisional",
    authoredBy: "test",
    humanReviewed: false,
    description: "Independent test fixture",
    entries: [
      {
        entryId: entry.id,
        docketId: docket.id,
        isDeadline: true,
        deadlines: [
          {
            kind: "Response",
            dueDate: "2026-12-04",
            quote: "Response due 12/4/2026.",
          },
          {
            kind: "Reply",
            dueDate: "2026-12-11",
            quote: "Reply due 12/11/2026.",
          },
        ],
        reviewRequired: false,
      },
    ],
  };
  const records = new Map([[entry.id, record]]);
  return { entry, docket, record, records, labels };
}

test("date denominator counts every labeled date, including dates withheld for review", () => {
  const { docket, record, records, labels } = fixture();
  record.extraction.deadlines[1].needsReview = true;
  record.extraction.deadlines[1].reviewReason = "Ambiguous obligation";
  Object.assign(
    record,
    resolveExtraction(docket.entries[0], record.extraction),
  );
  const report = evaluate([docket], labels, records);
  assert.equal(report.exactDates, 1);
  assert.equal(report.expectedDates, 2);
  assert.equal(report.exactDateAccuracy, 0.5);
  assert.equal(report.recall, 1);
  assert.equal(report.status, "provisional");
});

test("an asserted date is consumed at most once for coordinated obligations", () => {
  const { docket, records, labels } = fixture("Response due 12/4/2026.");
  labels.entries[0].deadlines = [
    { kind: "Response", dueDate: "2026-12-04", quote: docket.entries[0].text },
    {
      kind: "Another obligation",
      dueDate: "2026-12-04",
      quote: docket.entries[0].text,
    },
  ];
  assert.equal(evaluate([docket], labels, records).exactDateAccuracy, 0.5);
});

test("extra asserted dates are reported separately from expected-date coverage", () => {
  const { docket, records, labels } = fixture();
  labels.entries[0].deadlines.pop();
  const report = evaluate([docket], labels, records);
  assert.equal(report.exactDateAccuracy, 1);
  assert.equal(report.extraAssertedDates, 1);
  assert.match(report.misses[0].reason, /Extra asserted date 2026-12-11/);
});

test("missing-trigger labels do not create a date denominator", () => {
  const { docket, record, records, labels } = fixture(
    "Response due within 14 days of service.",
  );
  labels.entries[0].deadlines = [
    { kind: "Response", dueDate: null, quote: docket.entries[0].text },
  ];
  labels.entries[0].reviewRequired = true;
  assert.equal(record.needsReview, true);
  const report = evaluate([docket], labels, records);
  assert.equal(report.expectedDates, 0);
  assert.equal(report.exactDateAccuracy, null);
});

test("rejects stale source hashes, versions, and derived resolution", () => {
  for (const mutate of [
    (r: ExtractionRecord) => {
      r.inputHash = "old";
    },
    (r: ExtractionRecord) => {
      r.promptVersion = "old";
    },
    (r: ExtractionRecord) => {
      r.resolved[0].dueDate = "2026-12-31";
    },
  ]) {
    const { docket, record, records, labels } = fixture();
    mutate(record);
    assert.throws(() => evaluate([docket], labels, records), /Stale|Outdated/);
  }
});

test("rejects missing extractions, duplicate labels and unquoted label evidence", () => {
  const a = fixture();
  a.records.clear();
  assert.throws(
    () => evaluate([a.docket], a.labels, a.records),
    /Missing extraction/,
  );
  const b = fixture();
  b.labels.entries.push(b.labels.entries[0]);
  assert.throws(
    () => evaluate([b.docket], b.labels, b.records),
    /Duplicate label/,
  );
  const c = fixture();
  c.labels.entries[0].deadlines[0].quote = "Invented evidence";
  assert.throws(
    () => evaluate([c.docket], c.labels, c.records),
    /Unquoted label evidence/,
  );
});

test("requires a model name for Claude and null for the local baseline", () => {
  for (const method of ["baseline", "claude"] as const) {
    const { docket, record, records, labels } = fixture();
    record.method = method;
    record.model = method === "claude" ? null : "fake-model";
    assert.throws(
      () => evaluate([docket], labels, records),
      /Invalid extraction method\/model/,
    );
  }
});
