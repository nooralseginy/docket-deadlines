import Link from "next/link";
import { DocketMark, ExternalIcon } from "./icons";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Docket Deadlines home">
          <DocketMark />
          <span>
            Docket<span className="brand-light">Deadlines</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-explorer">
            Docket explorer
          </Link>
          <a href="/#method">The method</a>
          <span className="nav-divider" />
          <a
            className="author-link"
            href="https://alseginy.com"
            target="_blank"
            rel="noreferrer"
          >
            All apps <ExternalIcon />
          </a>
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-brand">Docket Deadlines</span>
      <p>A public experiment in traceable legal extraction.</p>
      <span>Historical excerpts. Not a live docket calendar.</span>
    </footer>
  );
}
