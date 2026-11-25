import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Programme personnalisé" };

export default function Page() {
  return <Placeholder title="Programme personnalisé" sprint={2} maquette="C7-Editeur" description="Éditeur de la copie personnalisée, pastilles d’adaptation, bibliothèque d’exercices." />;
}
