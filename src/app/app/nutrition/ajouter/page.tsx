import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Ajouter un aliment" };

export default function Page() {
  return <Placeholder title="Ajouter un aliment" sprint={4} maquette="M8-Aliment" description="Recherche d’aliment, repas, quantité avec calcul en direct." />;
}
