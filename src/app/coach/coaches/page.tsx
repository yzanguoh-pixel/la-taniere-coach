import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Coachés" };

export default function Page() {
  return <Placeholder title="Coachés" sprint={2} maquette="C2-Coaches" description="Liste des coachés avec recherche, programme en cours et dernier retour." />;
}
