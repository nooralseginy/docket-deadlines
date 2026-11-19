import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDueDate,
  computeDueDateDetails,
  federalHolidays,
  federalHolidayName,
  isBusinessDay,
} from "./frcp6";

test("excludes the trigger day and includes intervening weekends and holidays", () => {
  assert.equal(computeDueDate("2026-11-19", 7), "2026-11-27");
  assert.equal(computeDueDate("2026-11-20", 7), "2026-11-27");
  assert.equal(computeDueDate("2026-11-23", 2), "2026-11-25");
});

test("rolls a final Saturday or Sunday to Monday", () => {
  assert.equal(computeDueDate("2026-11-20", 1), "2026-11-23");
  assert.equal(computeDueDate("2026-11-20", 2), "2026-11-23");
});

test("rolls Thanksgiving 2026 to Friday and explains the adjustment", () => {
  const result = computeDueDateDetails("2026-11-12", 14);
  assert.equal(result.nominalDate, "2026-11-26");
  assert.equal(result.dueDate, "2026-11-27");
  assert.deepEqual(result.adjustments, [
    { date: "2026-11-26", reason: "Thanksgiving Day" },
  ]);
});

test("rolls across an observed Friday holiday and the following weekend", () => {
  assert.equal(computeDueDate("2026-07-02", 1), "2026-07-06");
  assert.equal(federalHolidayName("2026-07-03"), "Independence Day");
});

test("handles New Year observed in the previous calendar year", () => {
  assert.equal(federalHolidayName("2021-12-31"), "New Year's Day");
  assert.equal(computeDueDate("2021-12-30", 1), "2022-01-03");
});

test("handles Sunday holidays observed on Monday", () => {
  assert.equal(computeDueDate("2022-12-23", 1), "2022-12-27");
  assert.equal(computeDueDate("2022-12-30", 1), "2023-01-03");
});

test("Juneteenth applies beginning in 2021", () => {
  assert.equal(computeDueDate("2020-06-18", 1), "2020-06-19");
  assert.equal(computeDueDate("2021-06-17", 1), "2021-06-21");
  assert.equal(computeDueDate("2026-06-18", 1), "2026-06-22");
});

test("matches all eleven recurring holidays on OPM's 2026 calendar", () => {
  assert.deepEqual([...federalHolidays(2026).keys()].sort(), [
    "2026-01-01",
    "2026-01-19",
    "2026-02-16",
    "2026-05-25",
    "2026-06-19",
    "2026-07-03",
    "2026-09-07",
    "2026-10-12",
    "2026-11-11",
    "2026-11-26",
    "2026-12-25",
  ]);
});

test("Memorial Day is the last Monday in May", () => {
  assert.equal(federalHolidayName("2025-05-26"), "Memorial Day");
  assert.equal(federalHolidayName("2027-05-31"), "Memorial Day");
});

test("weeks convert to seven calendar days", () => {
  assert.equal(computeDueDate("2026-11-12", 2, "weeks"), "2026-11-27");
});

test("before periods roll backward, including across a Monday holiday", () => {
  assert.equal(computeDueDate("2026-11-23", 1, "days", "before"), "2026-11-20");
  assert.equal(computeDueDate("2026-09-08", 1, "days", "before"), "2026-09-04");
});

test("calendar math survives leap days and daylight-saving transitions", () => {
  assert.equal(computeDueDate("2024-02-28", 1), "2024-02-29");
  assert.equal(computeDueDate("2026-03-06", 3), "2026-03-09");
  assert.equal(computeDueDate("2026-10-30", 3), "2026-11-02");
});

test("classifies business days without local timezone assumptions", () => {
  assert.equal(isBusinessDay("2026-11-26"), false);
  assert.equal(isBusinessDay("2026-11-27"), true);
  assert.equal(isBusinessDay("2026-11-28"), false);
});

test("rejects invalid dates, ambiguous units, and nonpositive or unsafe periods", () => {
  for (const date of [
    "2026-02-30",
    "2025-02-29",
    "11/19/2026",
    "2026-1-01",
    "2026-11-19T00:00:00Z",
  ]) {
    assert.throws(() => computeDueDate(date, 14));
  }
  for (const period of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => computeDueDate("2026-11-19", period));
  }
  assert.throws(() =>
    computeDueDate("2026-11-19", 1, "business-days" as "days"),
  );
  assert.throws(() => computeDueDate("2009-01-01", 1));
  assert.throws(() =>
    computeDueDate("2026-11-19", 1, "days", "sideways" as "after"),
  );
});
