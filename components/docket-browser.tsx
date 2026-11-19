"use client";

import { useState } from "react";
import Link from "next/link";
import type { DocketView } from "@/lib/schema";
import { ChevronIcon, ExternalIcon, ReviewIcon, SearchIcon } from "./icons";
import { formatDate, sourceName } from "./format";
import { EntryCard, Timeline } from "./timeline";

export function DocketBrowser({ dockets }: { dockets: DocketView[] }) {
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("all");
  const [selectedId, setSelectedId] = useState(dockets[0]?.id);
  const [view, setView] = useState("dockets");
  const courts = [...new Set(dockets.map((d) => d.court))].sort();
  const filtered = dockets.filter(
    (d) =>
      (court === "all" || court === d.court) &&
      `${d.caseName} ${d.caseNumber}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = filtered.find((d) => d.id === selectedId) || filtered[0];
  const totalReview = dockets.flatMap((d) =>
    d.entries.filter((e) => e.extraction?.needsReview),
  ).length;
  const queue = filtered.flatMap((d) =>
    d.entries
      .filter((e) => e.extraction?.needsReview)
      .map((entry) => ({ docket: d, entry })),
  );
  return (
    <section
      className="explorer"
      id="explorer"
      aria-labelledby="explorer-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">The working set</span>
          <h2 id="explorer-title">Explore the dockets</h2>
        </div>
        <span className="snapshot-label">
          <span /> Historical snapshots
        </span>
      </div>
      <div className="explorer-controls">
        <div
          className="workspace-tabs"
          role="group"
          aria-label="Workspace view"
        >
          <button
            type="button"
            onClick={() => setView("dockets")}
            aria-pressed={view === "dockets"}
            className={view === "dockets" ? "active" : ""}
          >
            Dockets <span>{dockets.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setView("review")}
            aria-pressed={view === "review"}
            className={view === "review" ? "active" : ""}
          >
            Review queue{" "}
            <span className={totalReview ? "review-count" : ""}>
              {totalReview}
            </span>
          </button>
        </div>
        <div className="search-controls">
          <label className="search-field">
            <SearchIcon />
            <span className="sr-only">Search case name or number</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search case name or number"
              type="search"
            />
          </label>
          <label className="court-select">
            <span className="sr-only">Filter district court</span>
            <select
              value={court}
              onChange={(event) => setCourt(event.target.value)}
            >
              <option value="all">All districts</option>
              {courts.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </label>
        </div>
      </div>
      {view === "dockets" ? (
        <div className="docket-workspace">
          <aside className="docket-list" aria-label="Select a docket">
            <div className="docket-list-heading">
              <span>
                {filtered.length} {filtered.length === 1 ? "case" : "cases"}
              </span>
              <span>Selected excerpts</span>
            </div>
            {filtered.length ? (
              filtered.map((docket) => {
                const deadlines = docket.entries.reduce(
                  (count, e) => count + (e.extraction?.resolved.length || 0),
                  0,
                );
                const needsReview = docket.entries.filter(
                  (e) => e.extraction?.needsReview,
                ).length;
                return (
                  <button
                    type="button"
                    className={`docket-list-item ${selected?.id === docket.id ? "selected" : ""}`}
                    key={docket.id}
                    onClick={() => setSelectedId(docket.id)}
                    aria-pressed={selected?.id === docket.id}
                  >
                    <div className="docket-list-meta">
                      <span className="court-code">
                        {docket.court.toUpperCase()}
                      </span>
                      <span>{docket.caseNumber}</span>
                    </div>
                    <h3>{docket.caseName}</h3>
                    <div className="docket-item-counts">
                      <span>
                        {deadlines} {deadlines === 1 ? "deadline" : "deadlines"}
                      </span>
                      {needsReview > 0 && (
                        <span className="review-small">
                          <ReviewIcon />
                          {needsReview} review
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="list-empty">
                No cases match. Try another name or district.
              </div>
            )}
          </aside>
          <div className="docket-preview" aria-live="polite">
            {selected ? (
              <>
                <div className="preview-heading">
                  <div className="preview-eyebrow">
                    <span className="court-code">
                      {selected.court.toUpperCase()}
                    </span>
                    <span>{selected.caseNumber}</span>
                  </div>
                  <h3>{selected.caseName}</h3>
                  <p>{selected.courtName}</p>
                  <div className="preview-links">
                    <Link
                      className="button-primary"
                      href={`/docket/${selected.id}/`}
                    >
                      Open full timeline
                    </Link>
                    <a
                      className="text-link"
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on {sourceName(selected.sourceUrl)} <ExternalIcon />
                    </a>
                  </div>
                  <div className="snapshot-note">
                    {selected.entries.length} selected entries · Snapshot{" "}
                    {formatDate(selected.snapshotAt.slice(0, 10))}
                  </div>
                </div>
                <Timeline key={selected.id} docket={selected} compact />
              </>
            ) : (
              <div className="empty-state">
                <SearchIcon />
                <h3>No matching dockets</h3>
                <p>Clear your search or choose another district.</p>
                <button
                  className="button-secondary"
                  onClick={() => {
                    setQuery("");
                    setCourt("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="review-queue">
          <div className="review-queue-intro">
            <ReviewIcon />
            <div>
              <h3>Uncertainty stays visible.</h3>
              <p>
                These entries need a closer look before any date can be relied
                on.
              </p>
            </div>
          </div>
          {queue.length ? (
            queue.map(({ docket, entry }) => (
              <div className="queue-item" key={entry.id}>
                <div className="queue-case">
                  <span className="court-code">
                    {docket.court.toUpperCase()}
                  </span>
                  <Link href={`/docket/${docket.id}/#entry-${entry.id}`}>
                    {docket.caseName}
                  </Link>
                </div>
                <EntryCard entry={entry} />
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>No review entries match</h3>
              <p>Choose another district or clear your search.</p>
            </div>
          )}
        </div>
      )}
      <div className="explorer-footnote">
        <span>Source text is preserved with every extraction.</span>
        <span>Selected excerpts · Attachments excluded</span>
      </div>
    </section>
  );
}
