import { CheckIcon } from "./icons";
import { getEvaluation } from "@/lib/data";

export function Method() {
  const report = getEvaluation();
  return (
    <section className="method-section" id="method">
      <div className="method-intro">
        <span className="eyebrow">The separation that matters</span>
        <h2>
          The model reads.
          <br />
          Code counts.
        </h2>
        <p>
          Extract the obligation. Resolve the trigger. Compute the date. Keep
          the source close enough to check.
        </p>
      </div>
      <div className="method-body">
        <div className="method-step">
          <span className="method-icon">
            <CheckIcon />
          </span>
          <div>
            <h3>Ground every extraction</h3>
            <p>
              Each quoted passage must appear in the source entry. Missing
              evidence and uncertain triggers go to review.
            </p>
          </div>
        </div>
        <div className="method-step">
          <span className="method-icon">
            <CheckIcon />
          </span>
          <div>
            <h3>Count under FRCP 6(a)</h3>
            <p>
              Exclude the trigger day. Count calendar days. Roll a final weekend
              or federal holiday in the counting direction. Preserve dates
              expressly set by the court.
            </p>
          </div>
        </div>
        <details className="method-details">
          <summary>Scope, sources &amp; known limits</summary>
          <div>
            <p>
              This demo uses selected historical docket excerpts from public
              mirrors. Each entry links to its source. It does not monitor later
              orders, calculate current case obligations, or read attached PDFs.
            </p>
            <p>
              {report.method === "claude"
                ? `The bundled extraction was produced by ${report.model || "Claude"}.`
                : "The bundled extraction is a deterministic local baseline. The offline Claude pipeline is implemented separately."}{" "}
              {!report.humanReviewed &&
                "The evaluation labels are agent-authored and provisional until reviewed."}
            </p>
            <p>
              The calendar covers standard federal holidays. State holidays,
              special holidays, court closures, local rules, service extensions,
              and hours-based periods need review. This is an engineering
              demonstration, not a calendaring service.
            </p>
            <a
              href="https://www.uscourts.gov/sites/default/files/document/federal-rules-of-civil-procedure.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Read Federal Rule of Civil Procedure 6
            </a>
          </div>
        </details>
      </div>
    </section>
  );
}
