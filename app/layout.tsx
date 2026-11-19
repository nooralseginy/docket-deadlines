import type { Metadata } from "next";
import { Footer, Header } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Docket Deadlines | Dates with a paper trail",
    template: "%s | Docket Deadlines",
  },
  description:
    "Explore federal civil docket excerpts, trace deadline dates to their source, and inspect a measured extraction baseline.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
