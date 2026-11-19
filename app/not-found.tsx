import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="main-container not-found">
      <span className="eyebrow">Docket not found</span>
      <h1>
        This case is outside
        <br />
        the working set.
      </h1>
      <p>Return to the explorer to browse the committed docket snapshots.</p>
      <Link className="button-primary" href="/">
        Browse dockets
      </Link>
    </main>
  );
}
