import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Nutrition" };

export default function Page() {
  return <Placeholder title="Nutrition" sprint={4} maquette="M7-Nutrition" description="Anneau des calories restantes, macros face aux objectifs, repas et compléments." />;
}
