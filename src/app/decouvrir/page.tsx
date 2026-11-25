import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Bienvenue à La Tanière" };

export default function Page() {
  return <Placeholder title="Bienvenue à La Tanière" sprint={3} maquette="P1-Accueil" description="Présentation du coaching et réservation d’un bilan offert." />;
}
