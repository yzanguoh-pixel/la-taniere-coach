import type { SVGProps } from "react";

/** Icônes en trait fin (stroke 1,8), sans emoji ni logo de marque. */
type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconAccueil = (p: P) => (<svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></svg>);
export const IconCoaches = (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 19.5c.8-3.2 3.2-5 6-5s5.2 1.8 6 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.6c2.2.2 3.8 1.7 4.5 4.4" /></svg>);
export const IconAgenda = (p: P) => (<svg {...base(p)}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>);
export const IconBilan = (p: P) => (<svg {...base(p)}><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 15h5" /></svg>);
export const IconModeles = (p: P) => (<svg {...base(p)}><rect x="3.5" y="4" width="7" height="7" rx="2" /><rect x="13.5" y="4" width="7" height="7" rx="2" /><rect x="3.5" y="14" width="7" height="7" rx="2" /><rect x="13.5" y="14" width="7" height="7" rx="2" /></svg>);
export const IconNutrition = (p: P) => (<svg {...base(p)}><path d="M12 7c-2.5-2.2-7-1.2-7 3.5 0 4.6 3.5 9.5 7 9.5s7-4.9 7-9.5C19 5.8 14.5 4.8 12 7Z" /><path d="M12 7c0-2 1-3.5 2.8-4" /></svg>);
export const IconConnexions = (p: P) => (<svg {...base(p)}><path d="M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" /></svg>);
export const IconAbonnements = (p: P) => (<svg {...base(p)}><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M3 10h18M7 15h4" /></svg>);
export const IconPlus = (p: P) => (<svg {...base(p)}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></svg>);
export const IconSeance = (p: P) => (<svg {...base(p)}><path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11" /></svg>);
export const IconMessages = (p: P) => (<svg {...base(p)}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5Z" /></svg>);
export const IconProgression = (p: P) => (<svg {...base(p)}><path d="M4 19V5M4 19h16" /><path d="m7.5 14.5 3.5-3.5 3 2.5 5-6" /></svg>);
export const IconProfil = (p: P) => (<svg {...base(p)}><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5" /></svg>);
export const IconChevron = (p: P) => (<svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>);
export const IconSortie = (p: P) => (<svg {...base(p)}><path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M10 8l-4 4 4 4M6 12h9" /></svg>);
export const IconDecouvrir = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></svg>);
