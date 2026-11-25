import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Abonnements" };

export default function Page() {
  return <Placeholder title="Abonnements" sprint={4} maquette="C8-Abonnements" description="Échéances, rappel J-7 avec bilan de progression (envoi simulé) et factures." />;
}
