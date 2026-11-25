import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function Page() {
  return <Placeholder title="Tableau de bord" sprint={1} maquette="C1-Dashboard" description="Retours de séance triés par urgence : douleur, puis charge trop haute, puis à monter, puis conforme." />;
}
