import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Choisir un créneau" };

export default function Page() {
  return <Placeholder title="Choisir un créneau" sprint={3} maquette="P2-Creneau" description="Format visio ou salle, jours et horaires libres." />;
}
