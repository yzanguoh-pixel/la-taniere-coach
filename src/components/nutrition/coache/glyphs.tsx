import type { SVGProps } from "react";

/** Pictogrammes propres à la nutrition coaché, même trait que src/components/icons.tsx (stroke 1,8). */
type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const GlyphCheck = (p: P) => (<svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const GlyphAdd = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const GlyphBack = (p: P) => (<svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>);
export const GlyphSearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>);
