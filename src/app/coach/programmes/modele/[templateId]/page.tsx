import type { Metadata } from "next";
import { EditorPage } from "../../_page";

export const metadata: Metadata = { title: "Modèle de programme" };

/** US14 — Éditeur d'un modèle (program_templates.id). Les copies déjà envoyées ne changent pas. */
export default function Page({ params }: { params: Promise<{ templateId: string }> }) {
  const args = params.then(({ templateId }) => ({ id: templateId, week: undefined }));
  return <EditorPage mode="modele" args={args} />;
}
