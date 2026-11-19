import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Method } from "@/components/method";
import { Timeline } from "@/components/timeline";
import { ExternalIcon } from "@/components/icons";
import { formatDate, sourceName } from "@/components/format";
import { getDockets } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return getDockets().map((docket) => ({ id: docket.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const docket = getDockets().find((d) => d.id === id);
  return { title: docket?.caseName || "Docket not found" };
}
export default async function DocketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const docket = getDockets().find((d) => d.id === id);
  if (!docket) notFound();
  const deadlines = docket.entries.reduce(
    (n, e) => n + (e.extraction?.resolved.length || 0),
    0,
  );
  const review = docket.entries.filter((e) => e.extraction?.needsReview).length;
  return (
    <main id="main" className="main-container case-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Docket explorer</Link>
        <span>/</span>
        <span>{docket.caseNumber}</span>
      </nav>
      <section className="case-heading">
        <div className="preview-eyebrow">
          <span className="court-code">{docket.court.toUpperCase()}</span>
          <span>{docket.caseNumber}</span>
          <span className="archived-chip">Historical snapshot</span>
        </div>
        <h1>{docket.caseName}</h1>
        <p>{docket.courtName}</p>
        <a
          className="text-link"
          href={docket.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View docket on {sourceName(docket.sourceUrl)} <ExternalIcon />
        </a>
      </section>
      <div className="case-summary">
        <div>
          <strong>{deadlines}</strong>
          <span>Extracted deadlines</span>
        </div>
        <div>
          <strong>{review}</strong>
          <span>Entries need review</span>
        </div>
        <div>
          <strong>{docket.entries.length}</strong>
          <span>Selected entry excerpts</span>
        </div>
        <div className="case-snapshot">
          <span>Snapshot captured</span>
          <strong>{formatDate(docket.snapshotAt.slice(0, 10))}</strong>
        </div>
      </div>
      <div className="case-notice">
        <span className="notice-label">Read in context</span>
        <p>
          These are historical excerpts. Later entries may modify these dates.
          Attachments and the complete docket are outside this snapshot.
        </p>
      </div>
      <div className="case-timeline">
        <Timeline docket={docket} />
      </div>
      <Method />
    </main>
  );
}
