import type { CSSProperties } from "react";

type Props = { className?: string; style?: CSSProperties };
export function DocketMark({ className }: Props) {
  return (
    <svg
      className={className}
      width="31"
      height="34"
      viewBox="0 0 31 34"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 3h14l7 7v21H5V3Z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M19 3v8h7M10 17h11M10 22h11M10 27h6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M1 9v24h20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export function ExternalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 3h6v6M17 3l-8 8M8 4H3v13h13v-5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function ReviewIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m12 3 10 18H2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v5M12 17v.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4 10 4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
