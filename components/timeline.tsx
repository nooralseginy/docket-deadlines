"use client";

import { useState } from "react";
import type { DocketView } from "@/lib/schema";
import { CalendarIcon, ExternalIcon, ReviewIcon } from "./icons";
import { formatDate, sourceName } from "./format";

type Entry = DocketView["entries"][number];
export function EntryCard({
  entry,
  excerpt = false,
}: {
  entry: Entry;
  excerpt?: boolean;
}) {
  const record = entry.extraction;
  const label = entry.entryNumber
    ? `ECF ${entry.entryNumber}`
    : entry.entryLabel || "Text order";
  const review = record?.needsReview;
  return (
    <article
      className={`entry-card ${review ? "entry-review" : ""}`}
      id={`entry-${entry.id}`}
    >
      <div className="entry-meta">
        <span className="entry-number">{label}</span>
        <time dateTime={entry.dateFiled}>{formatDate(entry.dateFiled)}</time>
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="entry-source"
        >
          {sourceName(entry.sourceUrl)} <ExternalIcon />
        </a>
      </div>
      {record?.resolved.map((deadline) => (
        <div className="deadline-block" key={deadline.id}>
          <div className="deadline-heading">
            <h3>{deadline.kind}</h3>
            <span
              className={`status-badge ${deadline.status === "review" ? "status-review" : "status-dated"}`}
            >
              {deadline.status === "review" ? (
                <>
                  <ReviewIcon /> Needs review
                </>
              ) : (
                <>
                  <CalendarIcon /> Date extracted
                </>
              )}
            </span>
          </div>
          <div className="due-date">
            {deadline.dueDate && deadline.status === "dated" ? (
              <time dateTime={deadline.dueDate}>
                {formatDate(deadline.dueDate)}
              </time>
            ) : (
              <span className="unresolved-date">Date unresolved</span>
            )}
            {deadline.explicitDate &&
              deadline.dueDate &&
              deadline.status === "dated" && (
                <span className="date-caption">Set in entry</span>
              )}
            {!deadline.explicitDate &&
              deadline.dueDate &&
              deadline.status === "dated" && (
                <span className="date-caption">Computed · FRCP 6(a)</span>
              )}
          </div>
          <blockquote>{deadline.quote}</blockquote>
          {deadline.calculation && deadline.status === "dated" && (
            <p className="calculation">{deadline.calculation}</p>
          )}
          {deadline.reviewReasons.length > 0 && (
            <p className="review-reason">{deadline.reviewReasons.join(" ")}</p>
          )}
        </div>
      ))}
      {(!record || record.resolved.length === 0) && (
        <div className="entry-neutral">
          <h3>
            {record?.extraction.isDeadline
              ? "Potential deadline"
              : "Docket entry"}
          </h3>
          <p>
            {record?.extraction.isDeadline
              ? "A filing obligation was detected; the date needs review."
              : "No deadline extracted."}
          </p>
        </div>
      )}
      {review && record.resolved.length === 0 && (
        <p className="review-reason">
          {record.reviewReasons.join(" ") || "This entry needs human review."}
        </p>
      )}
      <details
        className="source-text"
        open={excerpt && !record?.resolved.length}
      >
        <summary>
          Read source {entry.textIsExcerpt ? "excerpt" : "text"}
        </summary>
        <p>{entry.text}</p>
      </details>
    </article>
  );
}

export function Timeline({
  docket,
  compact = false,
}: {
  docket: DocketView;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState(compact ? "deadlines" : "all");
  const dated = docket.entries.filter(
    (e) => e.extraction?.extraction.isDeadline,
  );
  const review = docket.entries.filter((e) => e.extraction?.needsReview);
  const entries =
    filter === "all" ? docket.entries : filter === "review" ? review : dated;
  const sorted = [...entries].sort(
    (a, b) =>
      a.dateFiled.localeCompare(b.dateFiled) || a.entryNumber - b.entryNumber,
  );
  const shown = compact ? sorted.slice(0, 3) : sorted;
  const options = [
    { key: "deadlines", label: "Deadlines", count: dated.length },
    { key: "review", label: "Needs review", count: review.length },
    { key: "all", label: "All entries", count: docket.entries.length },
  ];
  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <div
          className="segmented"
          role="group"
          aria-label="Filter docket entries"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={filter === option.key}
              className={filter === option.key ? "active" : ""}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
              <span>{option.count}</span>
            </button>
          ))}
        </div>
        <span className="timeline-order">Filing order</span>
      </div>
      <div className="entries" aria-live="polite">
        {shown.length ? (
          shown.map((entry) => <EntryCard entry={entry} key={entry.id} />)
        ) : (
          <div className="empty-state">
            <CalendarIcon />
            <h3>
              {filter === "review"
                ? "No entries flagged for review"
                : "No deadlines in these excerpts"}
            </h3>
            <p>
              {filter === "review"
                ? "You can inspect every source from All entries."
                : "Switch to All entries to inspect the source text."}
            </p>
          </div>
        )}
      </div>
      {compact && sorted.length > shown.length && (
        <p className="more-entries">
          Showing {shown.length} of {sorted.length} entries in this view.
        </p>
      )}
    </div>
  );
}
