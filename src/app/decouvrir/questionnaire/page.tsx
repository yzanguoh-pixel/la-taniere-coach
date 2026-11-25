import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Questionnaire" };

export default function Page() {
  return <Placeholder title="Questionnaire" sprint={3} maquette="P3-Questionnaire" description="Questionnaire en 2 minutes avant le bilan." />;
}
