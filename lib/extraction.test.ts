import test from "node:test";
import assert from "node:assert/strict";
import {
  baselineExtraction,
  datesInText,
  resolveExtraction,
} from "./extraction";
import type { DocketEntry, Extraction } from "./schema";

const entry: DocketEntry = {
  id: "test",
  entryNumber: 1,
  dateFiled: "2026-11-12",
  text: "Response due 14 days after service on November 12, 2026.",
  sourceUrl: "https://www.courtlistener.com/",
};
const raw = (): Extraction => ({
  isDeadline: true,
  needsReview: false,
  reviewReason: null,
  deadlines: [
    {
      kind: "Response",
      explicitDate: null,
      trigger: {
        event: "Service",
        date: "2026-11-12",
        quote: "service on November 12, 2026",
      },
      periodDays: 14,
      unit: "days",
      direction: "after",
      quote: entry.text,
      confidence: 0.95,
      needsReview: false,
      reviewReason: null,
    },
  ],
});
test("recognizes stated calendar dates without date rollover", () => {
  assert.deepEqual(datesInText("2/30/2026, Nov. 26th, 2026 and 2026-12-04"), [
    "2026-12-04",
    "2026-11-26",
  ]);
  assert.deepEqual(datesInText("by November 26"), []);
});
test("code computes a quoted relative date and explains the holiday roll", () => {
  const result = resolveExtraction(entry, raw()).resolved[0];
  assert.equal(result.dueDate, "2026-11-27");
  assert.match(result.calculation!, /Thanksgiving/);
});
test("an explicit court date stays as ordered on Thanksgiving", () => {
  const ordered = {
    ...entry,
    text: "Response due 11/26/2026, 14 days after service on November 12, 2026.",
  };
  const extraction = raw();
  extraction.deadlines[0].quote = ordered.text;
  extraction.deadlines[0].explicitDate = "2026-11-26";
  assert.equal(
    resolveExtraction(ordered, extraction).resolved[0].dueDate,
    "2026-11-26",
  );
});
test("invented quote, date, low confidence, or missing trigger all withhold a date", () => {
  const mutations = [
    (e: Extraction) => {
      e.deadlines[0].quote = "not in the source";
    },
    (e: Extraction) => {
      e.deadlines[0].explicitDate = "2026-12-31";
    },
    (e: Extraction) => {
      e.deadlines[0].confidence = 0.5;
    },
    (e: Extraction) => {
      e.deadlines[0].trigger!.date = null;
    },
    (e: Extraction) => {
      e.deadlines[0].unit = "business-days";
    },
  ];
  for (const mutate of mutations) {
    const extraction = raw();
    mutate(extraction);
    const result = resolveExtraction(entry, extraction);
    assert.equal(result.needsReview, true);
    assert.equal(result.resolved[0].dueDate, null);
  }
});
test("baseline keeps multiple explicit dates and routes unsupported relative text to review", () => {
  const multiple = {
    ...entry,
    text: "Responses due 12/4/2026. Replies due 12/11/2026.",
  };
  assert.equal(baselineExtraction(multiple).deadlines.length, 2);
  const relative = {
    ...entry,
    text: "Response due within 14 days of service.",
  };
  assert.equal(
    resolveExtraction(relative, baselineExtraction(relative)).resolved[0]
      .status,
    "review",
  );
});

test("baseline supports parenthesized periods and never invents a trigger date", () => {
  for (const text of [
    "The parties have seven (7) calendar days to file a notice.",
    "The parties shall respond within thirty (30) days of service.",
    "No later than five (5) business days before the conference, the parties shall submit a plan.",
  ]) {
    const source = { ...entry, text };
    const result = resolveExtraction(source, baselineExtraction(source));
    assert.equal(result.extraction.isDeadline, true);
    assert.equal(result.resolved[0].status, "review");
    assert.equal(result.resolved[0].dueDate, null);
  }
});

test("baseline excludes service dates, historical reference dates, and court appearances", () => {
  const summons = {
    ...entry,
    text: "Defendant served on 7/23/2026, answer due 8/13/2026.",
  };
  assert.deepEqual(
    baselineExtraction(summons).deadlines.map((d) => d.explicitDate),
    ["2026-08-13"],
  );
  const reference = {
    ...entry,
    text: "By March 24, 2026, Plaintiff shall respond to Defendant's February 11, 2026 pre-motion letter.",
  };
  assert.deepEqual(
    baselineExtraction(reference).deadlines.map((d) => d.explicitDate),
    ["2026-03-24"],
  );
  for (const text of [
    "A hearing is set for December 4, 2026.",
    "An initial discovery conference is scheduled for December 4, 2026.",
  ]) {
    assert.equal(baselineExtraction({ ...entry, text }).isDeadline, false);
  }
});

test("resolver withholds trigger dates mislabeled as explicit due dates", () => {
  const extraction = raw();
  extraction.deadlines[0].explicitDate = "2026-11-12";
  const result = resolveExtraction(entry, extraction).resolved[0];
  assert.equal(result.status, "review");
  assert.equal(result.dueDate, null);
});

test("resolver grounds the period, unit and direction before computing", () => {
  for (const mutate of [
    (e: Extraction) => {
      e.deadlines[0].periodDays = 30;
    },
    (e: Extraction) => {
      e.deadlines[0].unit = "weeks";
    },
    (e: Extraction) => {
      e.deadlines[0].direction = "before";
    },
    (e: Extraction) => {
      e.isDeadline = false;
    },
  ]) {
    const extraction = raw();
    mutate(extraction);
    assert.equal(
      resolveExtraction(entry, extraction).resolved[0].dueDate,
      null,
    );
  }
});

test("resolver withholds a relative calculation that conflicts with a stated due date", () => {
  const source = {
    ...entry,
    text: "Response due 11/26/2026, 14 days after service on November 12, 2026.",
  };
  const extraction = raw();
  extraction.deadlines[0].quote = source.text;
  const result = resolveExtraction(source, extraction).resolved[0];
  assert.equal(result.status, "review");
  assert.equal(result.dueDate, null);
  assert.match(result.reviewReasons.join(" "), /conflicts/);
});

test("an extension request does not establish a new due date", () => {
  const source = {
    ...entry,
    text: "LETTER MOTION for extension of the response deadline to December 4, 2026.",
  };
  assert.equal(baselineExtraction(source).isDeadline, false);
  const extraction = raw();
  extraction.deadlines[0].quote = source.text;
  extraction.deadlines[0].explicitDate = "2026-12-04";
  assert.equal(resolveExtraction(source, extraction).resolved[0].dueDate, null);
  const granted = {
    ...entry,
    text: "ORDER granting the request for additional time to respond to December 4, 2026.",
  };
  assert.equal(
    resolveExtraction(granted, baselineExtraction(granted)).resolved[0].dueDate,
    "2026-12-04",
  );
});
