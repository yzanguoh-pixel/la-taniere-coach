import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Séance" };

export default function Page() {
  return <Placeholder title="Séance" sprint={1} maquette="M2-Seance" description="Exercices de la séance et séries à valider." />;
}
