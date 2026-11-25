import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Nutrition" };

export default function Page() {
  return <Placeholder title="Nutrition" sprint={4} maquette="C10-Nutrition" description="Suivi de tous les coachés, plans types personnalisables et recettes." />;
}
