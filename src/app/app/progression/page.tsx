import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Ma progression" };

export default function Page() {
  return <Placeholder title="Ma progression" sprint={2} maquette="M5-Progression" description="Charge au squat par semaine avec ligne d’objectif, assiduité et records." />;
}
