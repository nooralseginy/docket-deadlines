import { createHash } from "node:crypto";
import { computeDueDateDetails } from "./rules/frcp6";
import {
  extractionSchema,
  type DocketEntry,
  type Extraction,
  type ExtractionRecord,
  type ResolvedDeadline,
} from "./schema";

export const PROMPT_VERSION = "deadlines-v2";
export function inputHash(entry: DocketEntry): string {
  return createHash("sha256")
    .update(JSON.stringify([entry.id, entry.dateFiled, entry.text]))
    .digest("hex");
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
function calendarDate(year: number, month: number, day: number): string | null {
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
}
type DateMention = { date: string; index: number; end: number };
function dateMentions(text: string): DateMention[] {
  const found: DateMention[] = [];
  const add = (match: RegExpExecArray, y: number, m: number, d: number) => {
    const date = calendarDate(y < 100 ? 2000 + y : y, m, d);
    if (date)
      found.push({
        date,
        index: match.index,
        end: match.index + match[0].length,
      });
  };
  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g))
    add(match, +match[1], +match[2], +match[3]);
  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/g))
    add(match, +match[3], +match[1], +match[2]);
  const months = MONTHS.map((m) => `${m.slice(0, 3)}(?:${m.slice(3)})?`).join(
    "|",
  );
  for (const match of text.matchAll(
    new RegExp(
      `\\b(${months})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(\\d{4})\\b`,
      "gi",
    ),
  )) {
    add(
      match,
      +match[3],
      MONTHS.findIndex((m) =>
        m.startsWith(match[1].slice(0, 3).toLowerCase()),
      ) + 1,
      +match[2],
    );
  }
  return found;
}
export function datesInText(text: string): string[] {
  return [...new Set(dateMentions(text).map((m) => m.date))];
}

const action =
  /\b(due|deadlines?|answer|respond|responses?|reply|replies|amend(?:ed)?|submit|file|filing|complet(?:e|ed|ion)|depositions?|redaction)\b/i;
function unapprovedExtension(text: string): boolean {
  return (
    /\b(?:(?:motion|request)\b[^.]{0,80}\b(?:extension|extend|additional time)|seeking\b[^.]{0,80}\b(?:extension|additional time)|extension\s+(?:request|motion))\b/i.test(
      text,
    ) &&
    !/\b(grant(?:ed|ing)?|ordered|extends?|extending|extended)\b/i.test(text)
  );
}
function explicitDeadlineDates(text: string): DateMention[] {
  const mentions = dateMentions(text).sort((a, b) => a.index - b.index);
  return mentions.filter((mention, index) => {
    const prefix = text.slice(
      index ? mentions[index - 1].end : 0,
      mention.index,
    );
    const suffix = text.slice(
      mention.end,
      mentions[index + 1]?.index ?? text.length,
    );
    const directlyAssigned =
      /\b(due(?:\s+(?:by|on))?|deadline(?:\s+(?:is|of|on))?|by|no later than|on or before|until|up to and including|set for)\s*$/i.test(
        prefix,
      );
    const leadingDate =
      /(?:^|[.;])\s*(?:by|on or before|no later than)\s*$/i.test(prefix) &&
      action.test(suffix);
    const actionDate =
      action.test(prefix) &&
      (directlyAssigned ||
        /\bto\s*$/i.test(prefix) ||
        /\b(complaint|pleading|motion|petition|reply|response|brief|discovery|answer|letter|report|plan|request|depositions?)\s*(?:on\s*)?$/i.test(
          prefix,
        ));
    return leadingDate || actionDate;
  });
}

function periodsInText(text: string) {
  return [
    ...text.matchAll(
      /\b(?:[a-z]+(?:-[a-z]+)?\s+\()?(\d+)\)?\s+(calendar\s+|business\s+)?(days?|weeks?|hours?)\b/gi,
    ),
  ].map((match) => ({
    period: +match[1],
    unit: /business/i.test(match[2] ?? "")
      ? "business-days"
      : /^week/i.test(match[3])
        ? "weeks"
        : /^hour/i.test(match[3])
          ? "hours"
          : "days",
    direction: /^\s+(before|prior\s+to)\b/i.test(
      text.slice(match.index! + match[0].length),
    )
      ? "before"
      : /^\s+(after|from|of|following)\b/i.test(
            text.slice(match.index! + match[0].length),
          )
        ? "after"
        : null,
  }));
}

export function resolveExtraction(
  entry: DocketEntry,
  raw: unknown,
): Pick<
  ExtractionRecord,
  "extraction" | "resolved" | "needsReview" | "reviewReasons"
> {
  const extraction = extractionSchema.parse(raw);
  const entryReasons: string[] = [];
  if (extraction.needsReview)
    entryReasons.push(extraction.reviewReason || "Extraction requires review.");
  if (extraction.isDeadline !== extraction.deadlines.length > 0)
    entryReasons.push("Deadline classification and extracted items disagree.");
  const resolved: ResolvedDeadline[] = extraction.deadlines.map(
    (deadline, index) => {
      const reasons: string[] = [];
      let dueDate: string | null = null;
      let calculation: string | null = null;
      if (!entry.text.includes(deadline.quote))
        reasons.push(
          "The supporting quote is not an exact substring of the entry.",
        );
      if (unapprovedExtension(deadline.quote))
        reasons.push(
          "An extension request alone does not establish a new due date.",
        );
      if (extraction.isDeadline !== extraction.deadlines.length > 0)
        reasons.push("Deadline classification and extracted items disagree.");
      if (deadline.confidence < 0.85)
        reasons.push("Extraction confidence is below 0.85.");
      if (deadline.needsReview)
        reasons.push(
          deadline.reviewReason || "The extracted deadline needs review.",
        );
      if (deadline.explicitDate) {
        if (
          !explicitDeadlineDates(deadline.quote).some(
            (m) => m.date === deadline.explicitDate,
          )
        )
          reasons.push(
            "The explicit date is not supported as a deadline by the quoted text.",
          );
        else {
          dueDate = deadline.explicitDate;
          calculation = "Date stated in the entry. Preserved as ordered.";
        }
      } else if (deadline.trigger && deadline.periodDays) {
        const { trigger } = deadline;
        if (!trigger.quote || !entry.text.includes(trigger.quote))
          reasons.push("The trigger quote is not supported by the entry.");
        if (!trigger.date || !datesInText(trigger.quote).includes(trigger.date))
          reasons.push(
            "The trigger date is not stated in the trigger quote. Filing is not proof of service.",
          );
        if (deadline.unit !== "days" && deadline.unit !== "weeks")
          reasons.push("Only calendar-day and week periods are supported.");
        if (!deadline.direction)
          reasons.push("The counting direction is missing.");
        if (
          !periodsInText(deadline.quote).some(
            (p) =>
              p.period === deadline.periodDays &&
              p.unit === deadline.unit &&
              p.direction === deadline.direction,
          )
        )
          reasons.push(
            "The period, unit, and counting direction are not supported by the quote.",
          );
        if (
          !reasons.length &&
          trigger.date &&
          (deadline.unit === "days" || deadline.unit === "weeks") &&
          deadline.direction
        ) {
          try {
            const result = computeDueDateDetails(
              trigger.date,
              deadline.periodDays,
              deadline.unit,
              deadline.direction,
            );
            dueDate = result.dueDate;
            if (
              explicitDeadlineDates(deadline.quote).some(
                (m) => m.date !== dueDate,
              )
            )
              reasons.push(
                "The quoted entry states a due date that conflicts with the relative calculation.",
              );
            calculation = `${trigger.date} + ${deadline.periodDays} ${deadline.unit} ${deadline.direction === "before" ? "counted backward" : "counted forward"}; trigger excluded, intervening weekends included.${result.adjustments.length ? ` Final day rolled from ${result.nominalDate}: ${result.adjustments.map((a) => a.reason).join(", ")}.` : " No final-day adjustment."}`;
          } catch (error) {
            reasons.push((error as Error).message);
          }
        }
      } else
        reasons.push(
          "No supported explicit date or confirmed trigger and period.",
        );
      if (extraction.needsReview)
        reasons.push(extraction.reviewReason || "The entry requires review.");
      if (reasons.length) dueDate = null;
      return {
        ...deadline,
        id: `${entry.id}-${index + 1}`,
        dueDate,
        calculation: dueDate ? calculation : null,
        status: reasons.length ? "review" : "dated",
        reviewReasons: [...new Set(reasons)],
      };
    },
  );
  return {
    extraction,
    resolved,
    needsReview:
      entryReasons.length > 0 || resolved.some((d) => d.status === "review"),
    reviewReasons: [...new Set(entryReasons)],
  };
}

// An offline comparator, deliberately separate from the Claude extraction path.
export function baselineExtraction(entry: DocketEntry): Extraction {
  if (unapprovedExtension(entry.text))
    return {
      isDeadline: false,
      deadlines: [],
      needsReview: false,
      reviewReason: null,
    };
  const deadlines: Extraction["deadlines"] = [];
  const clauses = entry.text.split(/(?<=;)\s+|(?<=\.)\s+(?!\d)/);
  for (const clause of clauses) {
    if (!action.test(clause)) continue;
    const dates = explicitDeadlineDates(clause);
    for (const mention of dates) {
      const kind = /reply|replies/i.test(clause)
        ? "Reply"
        : /answer/i.test(clause)
          ? "Answer"
          : /discovery|depositions/i.test(clause)
            ? "Discovery"
            : /response|respond|opposition/i.test(clause)
              ? "Response"
              : /amend/i.test(clause)
                ? "Amended pleading"
                : "Filing";
      deadlines.push({
        kind,
        explicitDate: mention.date,
        trigger: null,
        periodDays: null,
        unit: null,
        direction: null,
        quote: clause,
        confidence: 0.9,
        needsReview: false,
        reviewReason: null,
      });
    }
    const period = periodsInText(clause)[0];
    if (!dates.length && period) {
      deadlines.push({
        kind: "Relative deadline",
        explicitDate: null,
        trigger: {
          event: "Trigger requires confirmation",
          date: null,
          quote: clause,
        },
        periodDays: period.period,
        unit: period.unit as Extraction["deadlines"][number]["unit"],
        direction: period.direction as "before" | "after" | null,
        quote: clause,
        confidence: 0.7,
        needsReview: true,
        reviewReason:
          "Local baseline cannot confirm the triggering event or date.",
      });
    }
  }
  const pdfOnly =
    !deadlines.length &&
    /\b(scheduling|schedule|deadlines?)\b/i.test(entry.text) &&
    /\b(attached|attachment|order|document|pdf)\b/i.test(entry.text);
  return {
    isDeadline: deadlines.length > 0,
    deadlines,
    needsReview: pdfOnly,
    reviewReason: pdfOnly
      ? "Deadlines may be in an attached document. Attachments are outside this snapshot."
      : null,
  };
}
