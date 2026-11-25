import type { Metadata } from "next";
import { EditorPage } from "../_page";

export const metadata: Metadata = { title: "Programme personnalisé" };

/** US14 — Éditeur de la copie personnalisée d'un coaché (client_programs.id). */
export default function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ semaine?: string | string[] }> }) {
  const args = Promise.all([params, searchParams]).then(([{ id }, sp]) => ({ id, week: typeof sp.semaine === "string" ? sp.semaine : undefined }));
  return <EditorPage mode="copie" args={args} />;
}
