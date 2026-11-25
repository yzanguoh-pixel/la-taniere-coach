/** Vues du graphique par exercice (paramètre d'URL ?vue=). Module partagé serveur / client. */
export const LIFT_VIEWS = ["charge", "1rm", "volume"] as const;
export type LiftView = (typeof LIFT_VIEWS)[number];
export const VIEW_LABELS: Record<LiftView, string> = { charge: "Charge max", "1rm": "1RM estimé", volume: "Volume" };
export const parseView = (v: string | null | undefined): LiftView => (LIFT_VIEWS as readonly string[]).includes(v ?? "") ? (v as LiftView) : "charge";
