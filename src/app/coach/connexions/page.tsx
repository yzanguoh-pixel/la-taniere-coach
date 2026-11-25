import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Connexions et réglages" };

export default function Page() {
  return <Placeholder title="Connexions et réglages" sprint={4} maquette="C11-Connexions" description="Agenda, objets connectés, paiement et notifications simulés ; « Réinitialiser la démo »." />;
}
