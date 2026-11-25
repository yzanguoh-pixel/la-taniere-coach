import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Aujourd’hui" };

export default function Page() {
  return <Placeholder title="Aujourd’hui" sprint={1} maquette="M1-Accueil" description="Séance du jour et données réelles de Léa." />;
}
