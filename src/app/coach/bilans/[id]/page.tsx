import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Bilan" };

export default function Page() {
  return <Placeholder title="Bilan" sprint={3} maquette="C5-Bilan" description="Synthèse automatique du questionnaire, tests physiques et « Convertir en coachée »." />;
}
