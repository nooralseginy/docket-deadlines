import { docketSchema } from "../lib/schema";
import { writeJson } from "./io";

const arg = process.argv.find((a) => a.startsWith("--ids="));
const ids = arg?.slice(6).split(",") ?? [];
if (!ids.length || ids.some((id) => !/^\d+$/.test(id))) {
  console.error(
    "Usage: npm run fetch:dockets -- --ids=12345,67890. Supply verified CourtListener docket IDs; existing snapshots are preserved.",
  );
  process.exit(1);
}
if (!process.env.COURTLISTENER_TOKEN)
  throw new Error(
    "Set COURTLISTENER_TOKEN in .env. CourtListener v4 requires a token.",
  );
const origin = "https://www.courtlistener.com";
async function get(url: string): Promise<Record<string, any>> {
  const parsed = new URL(url, origin);
  if (parsed.origin !== origin || !parsed.pathname.startsWith("/api/rest/v4/"))
    throw new Error(
      "Unexpected API pagination URL; refusing to send credentials.",
    );
  const response = await fetch(parsed, {
    headers: { Authorization: `Token ${process.env.COURTLISTENER_TOKEN}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `CourtListener returned HTTP ${response.status}. No partial docket was saved.`,
    );
  return response.json();
}
for (const id of ids) {
  const raw = await get(`${origin}/api/rest/v4/dockets/${id}/`);
  const court =
    typeof raw.court === "string"
      ? raw.court.split("/").filter(Boolean).at(-1)
      : raw.court?.id;
  const entries = [];
  let next: string | null =
    `${origin}/api/rest/v4/docket-entries/?docket=${id}&order_by=entry_number`;
  const seen = new Set<string>();
  while (next) {
    if (seen.has(next)) throw new Error(`Pagination loop for docket ${id}`);
    seen.add(next);
    const page = await get(next);
    if (!Array.isArray(page.results))
      throw new Error("Unexpected CourtListener results shape");
    for (const e of page.results) {
      if (!e.description?.trim() || !e.date_filed) continue;
      entries.push({
        id: `cl-${e.id}`,
        entryNumber: e.entry_number ?? 0,
        dateFiled: e.date_filed.slice(0, 10),
        text: e.description,
        sourceUrl:
          new URL(raw.absolute_url, origin).href + `#entry-${e.entry_number}`,
        textIsExcerpt: false,
      });
    }
    next = page.next;
  }
  const docket = docketSchema.parse({
    id: `cl-${id}`,
    caseName: raw.case_name_full || raw.case_name,
    caseNumber: raw.docket_number,
    court,
    courtName: raw.court_name || court,
    dateFiled: raw.date_filed,
    sourceUrl: new URL(raw.absolute_url, origin).href,
    snapshotAt: new Date().toISOString(),
    textIsExcerpt: false,
    entries,
  });
  writeJson(`data/dockets/${docket.id}.json`, docket);
  console.log(`${docket.id}: ${entries.length} entries saved.`);
}
