import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <Placeholder title="Messages" sprint={1} maquette="M4-Messages" description="Fil unique avec Karim, dont les messages événement (retour envoyé, programme mis à jour)." />;
}
