import { DocketBrowser } from "@/components/docket-browser";
import { Method } from "@/components/method";
import { Metrics } from "@/components/metrics";
import { getDockets, getEvaluation } from "@/lib/data";

export default function HomePage() {
  const dockets = getDockets();
  const report = getEvaluation();
  const count = dockets.reduce((n, d) => n + d.entries.length, 0);
  const districts = new Set(dockets.map((d) => d.court)).size;
  return (
    <main id="main" className="main-container">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-rule" /> Federal civil docket explorer
          </span>
          <h1>
            A deadline. A date.
            <br />
            <em>The source to back it up.</em>
          </h1>
          <p>
            Trace the obligation, inspect the date, and read the evidence. A
            small, measured build with its uncertainty left in.
          </p>
        </div>
        <div className="hero-aside">
          <span className="hero-aside-label">The principle</span>
          <p>
            The model reads.
            <br />
            Code counts.
          </p>
          <div className="hero-aside-bottom">
            <span>{dockets.length} public dockets</span>
            <span>{count} entry excerpts</span>
            <span>{districts} districts</span>
          </div>
        </div>
      </section>
      <Metrics report={report} />
      <DocketBrowser dockets={dockets} />
      <Method />
    </main>
  );
}
