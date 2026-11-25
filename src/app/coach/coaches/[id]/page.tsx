import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Fiche coaché" };

export default function Page() {
  return <Placeholder title="Fiche coaché" sprint={1} maquette="C3-Fiche" description="Dernier retour, prévu / réalisé et ajustement de charge par pas de 2,5 kg avec « Appliquer et prévenir »." />;
}
