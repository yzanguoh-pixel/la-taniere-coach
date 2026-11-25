import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Connexions" };

export default function Page() {
  return <Placeholder title="Connexions" sprint={4} maquette="M10-Connexions" description="Objets connectés simulés ; Strava reste visible par toi seule." />;
}
