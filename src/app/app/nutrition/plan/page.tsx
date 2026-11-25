import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Plan du jour" };

export default function Page() {
  return <Placeholder title="Plan du jour" sprint={4} maquette="M9-Plan" description="Plan entraînement ou repos, recettes et liste de courses." />;
}
