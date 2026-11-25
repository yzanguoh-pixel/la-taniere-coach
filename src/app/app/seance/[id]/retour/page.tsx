import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Retour de séance" };

export default function Page() {
  return <Placeholder title="Retour de séance" sprint={1} maquette="M3-Retour" description="RPE de 1 à 10, ressenti, zone de douleur et un mot pour Karim." />;
}
