# Labels and evidence

The checked-in set has 60 selected entry excerpts from 15 real federal civil cases: nine in S.D.N.Y., four in D.N.J., and two in E.D.N.Y. It contains 31 deadline-bearing entries and 38 deadline groups, of which 33 have explicit dates. Five entries need review because a trigger is missing or the period is stated in business days.

Codex selected the excerpts and wrote the candidate labels. Noor has not reviewed them. These are provisional development labels, not an independent benchmark or a held-out test set. A score against this file measures agreement with these labels; it does not establish legal accuracy or justify a portfolio accuracy claim.

## Sources

CourtListener's REST v4 docket endpoint returned HTTP 401 without a token. Its public search was inaccessible through the available web retrieval tool. The committed examples therefore use federal court docket text mirrored by Justia. No CourtListener docket IDs or links have been invented.

Each entry has its actual source URL and `textIsExcerpt: true`. Docket IDs are local descriptive slugs. `entryNumber: 0` identifies an unnumbered text order, not ECF 0. The excerpts preserve the retrieved court text, with whitespace normalized. Surrounding Justia commentary is excluded.

The snapshots were assembled on November 19, 2026. The mirror's own last-retrieved date is stored separately; some mirrors are substantially older. Four selected entries per case omit other entries and parts of the selected entries. These snapshots cannot establish a case's current deadlines or whether a later order superseded an earlier date. The Milestone case also includes an individually indexed November 16 order, newer than the mirror docket listing.

The complete source index is [data/sources.json](../data/sources.json).

## Label policy

- Scope is party filing, response, service and discovery-action deadlines stated in the selected excerpt. A date on a completed filing is not a new deadline.
- An extension request alone does not create a new due date.
- Explicit court dates stay as written. FRCP 6 arithmetic applies only to supported relative periods.
- Use `dueDate: null` when the excerpt does not establish the trigger. Do not substitute the order's filing date for a future event.
- Exclude scheduled court appearances and automatic transcript-release dates. A hearing or conference time is not a filing or discovery-action deadline under this policy.
- Coordinated obligations sharing one clause and date may form one deadline group. Murudumbay's March 16 pretrial obligations are one such group. This convention must stay consistent between labels and scoring.

## Human review

Open every entry's source and check its text, obligation, trigger, date, and scope. Review the full docket for amendments and superseding orders. Check multi-obligation groups and the two transcript notices with missing triggers in particular. Record corrections in `labels.json` and identify the reviewer in the commit or a review log. Set the dataset's `humanReviewed` flag only after that review is complete.

Codex reopened the indexed source pages for 15 entries and recorded the comparison in [spot-checks.json](spot-checks.json). This caught two dates that had been inferred from notice-filing metadata without a trigger in the excerpt. Both labels now keep the due date null and require review. These are agent checks; the dataset remains unreviewed by a human.

Keep a separate, unseen test set before reporting model quality. Entries selected for building or debugging the extractor remain development examples. Attached PDFs and scheduling orders outside the selected entry text are not part of this evaluation.
