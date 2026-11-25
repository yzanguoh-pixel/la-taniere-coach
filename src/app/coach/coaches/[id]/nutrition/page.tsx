import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Nutrition du coaché" };

export default function Page() {
  return <Placeholder title="Nutrition du coaché" sprint={4} maquette="C9-FicheNutrition" description="Objectifs par type de jour, semaine face à l’objectif, journal du jour et plan type adapté." />;
}
