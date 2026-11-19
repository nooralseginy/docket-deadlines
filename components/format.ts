export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
export function percentage(value: number | null): string {
  return value === null ? "—" : `${Math.floor(value * 1000) / 10}%`;
}
export function sourceName(url: string): string {
  const host = new URL(url).hostname;
  if (host.endsWith("courtlistener.com")) return "CourtListener";
  if (host.endsWith("justia.com")) return "Justia";
  return host.replace(/^www\./, "");
}
