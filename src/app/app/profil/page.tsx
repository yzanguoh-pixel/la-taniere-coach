import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return <Placeholder title="Profil" sprint={4} maquette="M6-Profil" description="Informations personnelles et abonnement." />;
}
