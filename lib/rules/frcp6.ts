export type PeriodUnit = "days" | "weeks";
export type PeriodDirection = "after" | "before";

export interface DueDateCalculation {
  triggerDate: string;
  period: number;
  unit: PeriodUnit;
  direction: PeriodDirection;
  calendarDays: number;
  nominalDate: string;
  dueDate: string;
  adjustments: { date: string; reason: string }[];
}

const DAY_MS = 86_400_000;
const holidayCache = new Map<number, ReadonlyMap<string, string>>();

function dateString(date: Date): string {
  const value = date.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Date is outside the supported four-digit year range");
  }
  return value;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("Expected a date in YYYY-MM-DD format");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (dateString(date) !== value)
    throw new RangeError(`Invalid calendar date: ${value}`);
  return date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime() + days * DAY_MS);
  if (!Number.isFinite(result.getTime()))
    throw new RangeError("Period is too large");
  dateString(result);
  return result;
}

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  occurrence: number,
): Date {
  const first = parseDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
  );
  return addDays(
    first,
    ((weekday - first.getUTCDay() + 7) % 7) + 7 * (occurrence - 1),
  );
}

function fixedHoliday(year: number, month: number, day: number): Date {
  const date = parseDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
  return addDays(
    date,
    date.getUTCDay() === 6 ? -1 : date.getUTCDay() === 0 ? 1 : 0,
  );
}

function holidaysForStatutoryYear(year: number): [Date, string][] {
  const june =
    year >= 2021
      ? [
          [
            fixedHoliday(year, 6, 19),
            "Juneteenth National Independence Day",
          ] as [Date, string],
        ]
      : [];
  const memorial = nthWeekday(year, 5, 1, 5);
  if (memorial.getUTCMonth() !== 4)
    memorial.setUTCDate(memorial.getUTCDate() - 7);
  return [
    [fixedHoliday(year, 1, 1), "New Year's Day"],
    [nthWeekday(year, 1, 1, 3), "Martin Luther King Jr.'s Birthday"],
    [nthWeekday(year, 2, 1, 3), "Washington's Birthday"],
    [memorial, "Memorial Day"],
    ...june,
    [fixedHoliday(year, 7, 4), "Independence Day"],
    [nthWeekday(year, 9, 1, 1), "Labor Day"],
    [nthWeekday(year, 10, 1, 2), "Columbus Day"],
    [fixedHoliday(year, 11, 11), "Veterans Day"],
    [nthWeekday(year, 11, 4, 4), "Thanksgiving Day"],
    [fixedHoliday(year, 12, 25), "Christmas Day"],
  ];
}

/** Recurring federal holidays observed in this calendar year, including New Year spillover. */
export function federalHolidays(year: number): ReadonlyMap<string, string> {
  if (!Number.isInteger(year) || year < 2010 || year > 9998) {
    throw new RangeError(
      "The current-rule holiday calendar supports years 2010 through 9998",
    );
  }
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const holidays = new Map<string, string>();
  for (const statutoryYear of [year - 1, year, year + 1]) {
    for (const [date, name] of holidaysForStatutoryYear(statutoryYear)) {
      if (date.getUTCFullYear() === year) holidays.set(dateString(date), name);
    }
  }
  holidayCache.set(year, holidays);
  return holidays;
}

export function federalHolidayName(value: string): string | null {
  const date = parseDate(value);
  return federalHolidays(date.getUTCFullYear()).get(value) ?? null;
}

export function isBusinessDay(value: string): boolean {
  const date = parseDate(value);
  const holiday = federalHolidayName(value);
  return date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && holiday === null;
}

/** FRCP 6(a)(1), (5): exclude the trigger, count calendar days, then roll the final day. */
export function computeDueDateDetails(
  triggerDate: string,
  period: number,
  unit: PeriodUnit = "days",
  direction: PeriodDirection = "after",
): DueDateCalculation {
  const trigger = parseDate(triggerDate);
  if (trigger.getUTCFullYear() < 2010 || trigger.getUTCFullYear() > 9998) {
    throw new RangeError(
      "The current-rule calculator supports years 2010 through 9998",
    );
  }
  if (!Number.isSafeInteger(period) || period <= 0) {
    throw new RangeError("Period must be a positive safe integer");
  }
  if (unit !== "days" && unit !== "weeks")
    throw new TypeError("Only days and weeks are supported");
  if (direction !== "after" && direction !== "before")
    throw new TypeError("Direction must be after or before");
  const calendarDays = period * (unit === "weeks" ? 7 : 1);
  if (!Number.isSafeInteger(calendarDays))
    throw new RangeError("Period is too large");
  const step = direction === "after" ? 1 : -1;
  let cursor = addDays(trigger, calendarDays * step);
  const nominalDate = dateString(cursor);
  const adjustments: DueDateCalculation["adjustments"] = [];
  while (true) {
    const value = dateString(cursor);
    const holiday = federalHolidayName(value);
    const weekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
    if (!weekend && holiday === null) break;
    adjustments.push({
      date: value,
      reason: holiday ?? (cursor.getUTCDay() === 6 ? "Saturday" : "Sunday"),
    });
    cursor = addDays(cursor, step);
  }
  return {
    triggerDate,
    period,
    unit,
    direction,
    calendarDays,
    nominalDate,
    dueDate: dateString(cursor),
    adjustments,
  };
}

export function computeDueDate(
  triggerDate: string,
  period: number,
  unit: PeriodUnit = "days",
  direction: PeriodDirection = "after",
): string {
  return computeDueDateDetails(triggerDate, period, unit, direction).dueDate;
}
