# Docket Deadlines

Read a public federal civil docket entry, find the obligation, and show the date beside its source.

[Live demo](https://docket-deadlines.vercel.app) · [Repository](https://github.com/nooralseginy/docket-deadlines)

The split is deliberate: the model reads, code counts. Claude extracts an explicit date or a trigger and period. TypeScript applies FRCP 6(a). Quotes must match the source; unsupported dates and uncertain triggers go to review.

## Run it

Node 22.9+ and npm are required. The committed demo needs no API keys.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For the static build:

```sh
npm test
npm run eval
npm run build
npm run preview
```

The export is in `out/`. Every docket route is generated at build time. No API key or model call runs in the browser.

## What is actually measured

The committed extractions use the **local rule-based baseline**, not Claude. The data contains 60 selected excerpts from 15 real civil cases across S.D.N.Y., D.N.J., and E.D.N.Y. CourtListener requires authentication, so the initial snapshot uses court-docket text mirrored by Justia, with a source link for every entry. These are excerpts, not complete or current dockets.

The labels were drafted by Codex and **have not been reviewed by Noor**. They are development labels, not an independent benchmark. The baseline was developed on the same examples. The page says so. Do not use these scores as a human-verified Claude accuracy claim.

Current development-set agreement: **31/31 entry precision, 31/31 entry recall, 33/33 expected dates covered, zero extra asserted dates, five entries routed to review**. There is no held-out score yet.

`npm run eval` writes the actual counts, metrics, and misses to `data/eval.json`. Precision and recall are measured per entry. Exact-date coverage matches dates one-to-one within each entry against labeled dates; missing and review-withheld dates count as misses. Extra asserted dates are reported separately. Unresolved labels have no expected date. This date measure is expected-date recall. The scorer rejects missing, stale, or mixed-method extraction files. Scores on the page are truncated to one decimal place.

The baseline makes no API calls and costs $0 in model usage. Its measured extraction time is recorded in `data/eval.json`; this excludes source collection and labeling. **Claude cost and runtime are unmeasured** until an actual API pass runs. Fifteen agent source checks are recorded in `evals/spot-checks.json`; these do not replace human review.

## Refresh the pipeline

Copy `.env.example` to `.env` and supply your own tokens. Never commit `.env`.

```sh
# Use verified CourtListener docket IDs. Existing examples are preserved.
npm run fetch:dockets -- --ids=12345,67890

# Runs the official Anthropic SDK using claude-haiku-5-5.
npm run extract
npm run eval
npm run build
```

The fetcher follows all docket-entry pages and saves a docket only after validation. Live imports are not automatically added to the evaluation labels. `CLAUDE_MODEL` can select another available model. Extraction results are cached by entry ID, source hash, model, method, and prompt version. `--force` reruns them. Set the two per-million-token prices in `.env` to record estimated token cost; otherwise cost stays unreported. Usage and latency are stored with each result.

To reproduce the offline comparator explicitly:

```sh
npm run extract:baseline -- --force
npm run eval
```

After reviewing the original sources, correct `evals/labels.json` and record the reviewer. Reserve a separate, unseen test set before reporting model quality.

## Counting and review

The calculator excludes the trigger day and counts intervening calendar days, including weekends and holidays. If the final day falls on a weekend or recurring federal holiday, it rolls in the counting direction. November 12, 2026 plus 14 days reaches Thanksgiving, November 26, and rolls to November 27. A date expressly fixed by an order stays as written.

The model cannot supply a computed due date. The resolver requires a verbatim quote and a supported explicit date, or a quoted trigger date and supported period. It does not treat a filing date as proof of service. Confidence below 0.85, a missing trigger, an unsupported unit, or contradictory evidence withholds the date.

## Known limits

- Attached PDFs and scheduling orders are not read. Deadlines that appear only there are missed.
- Selected excerpts omit later amendments and superseding orders. The app cannot establish current case obligations.
- The local comparator misses some phrasing and can misclassify historical dates. Inspect the discrepancies on the page or in `data/eval.json`.
- State holidays, exceptional holidays, court closures, filing cutoffs, local rules, and FRCP 6(d) service additions are not implemented. Business-day and hour periods require review.
- This version covers party filing, response, service, and discovery obligations. Scheduled appearances and automatic transcript release dates are outside the evaluation scope.
- Labels and source transcription need human review. API authentication and Claude extraction have not been tested against live credentials in this build.

See [the label policy](evals/README.md), [source index](data/sources.json), and [calendar rules](docs/rules.md).

## Structure

```text
app/                    Static Next.js explorer and docket routes
data/dockets/           Authentic selected source excerpts
data/extracted/         Cached extractions with provenance and usage
data/eval.json          Reproducible scores and discrepancies
evals/                  Provisional labels and source-check log
lib/rules/frcp6.ts      Date-only calendar arithmetic
lib/extraction.ts       Quote validation and conservative resolution
lib/evaluation.ts       Entry detection and exact-date scoring
scripts/                Fetch, extract, and evaluate
```

Built with Next.js, TypeScript, Tailwind, Zod, and the official Anthropic SDK. Vercel serves the `out/` export directly using the static framework preset. Redeploy with `npx vercel deploy --prod --yes --project docket-deadlines` from the authenticated account.
