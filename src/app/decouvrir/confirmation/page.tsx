import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Rendez-vous confirmé" };

export default function Page() {
  return <Placeholder title="Rendez-vous confirmé" sprint={3} maquette="P4-Confirmation" description="Récapitulatif du rendez-vous." />;
}
