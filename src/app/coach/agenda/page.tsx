import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return <Placeholder title="Agenda" sprint={3} maquette="C4-Agenda" description="Agenda de la semaine, demandes de bilan et lien de réservation à copier." />;
}
