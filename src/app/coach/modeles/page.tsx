import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Modèles de programme" };

export default function Page() {
  return <Placeholder title="Modèles de programme" sprint={2} maquette="C6-Modeles" description="Modèles filtrables avec le bouton « Personnaliser pour… »." />;
}
