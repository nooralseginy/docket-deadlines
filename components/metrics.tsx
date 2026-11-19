import type { EvalReport } from "@/lib/schema";
import { percentage } from "./format";
import Link from "next/link";

export function Metrics({ report }: { report: EvalReport }) {
  const baseline = report.method !== "claude";
  const items = [
    {
      label: "Precision",
      value: percentage(report.precision),
      detail: `${report.truePositives} of ${report.predictedEntries} flagged entries contain deadlines`,
    },
    {
      label: "Recall",
      value: percentage(report.recall),
      detail: `${report.truePositives} of ${report.labeledPositiveEntries} deadline entries found`,
    },
    {
      label: "Exact-date coverage",
      value: percentage(report.exactDateAccuracy),
      detail: `${report.exactDates} of ${report.expectedDates} labeled dates matched`,
    },
  ];
  return (
    <section className="evaluation" aria-labelledby="evaluation-title">
      <div className="evaluation-heading">
        <div>
          <span className="eyebrow" id="evaluation-title">
            Development evaluation
          </span>
          <span className="evaluation-sample">
            {report.entryCount} labeled excerpts
          </span>
        </div>
        <span className="evaluation-status">
          {baseline ? "Local baseline" : report.model || "Claude"} ·{" "}
          {report.humanReviewed ? "Reviewed labels" : "Provisional labels"}
        </span>
      </div>
      <div className="metric-grid">
        {items.map((item) => (
          <div className="metric" key={item.label}>
            <div className="metric-top">
              <h2>{item.label}</h2>
              <span className="metric-rule" />
            </div>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
      <p className="evaluation-note">
        {!report.humanReviewed
          ? "Agent-authored development labels await human review. "
          : ""}
        {baseline
          ? "The baseline was developed on these examples. A held-out evaluation and Claude run are still pending."
          : "Scores apply to these selected excerpts, not complete dockets."}{" "}
        {report.extraAssertedDates} extra dates versus labels ·{" "}
        {report.reviewCount} entries need review.
      </p>
      {report.misses.length > 0 && (
        <details className="evaluation-misses">
          <summary>
            Inspect the misses <span>{report.misses.length} findings</span>
          </summary>
          <div>
            {report.misses.map((miss, index) => (
              <div className="evaluation-miss" key={`${miss.entryId}-${index}`}>
                <Link href={`/docket/${miss.docketId}/#entry-${miss.entryId}`}>
                  {miss.entryId}
                </Link>
                <p>{miss.reason}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
