"use client";

import { useEffect, useRef } from "react";
import { markReportRead } from "@/lib/bilans-progression/coache/actions";

/** Marque le bilan comme lu à l'ouverture, une seule fois (rendu uniquement si read_at est vide). */
export function MarkReportRead({ reportId }: { reportId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    markReportRead(reportId).catch(() => {
      // Sans conséquence pour l'affichage : le bilan restera « Nouveau » jusqu'à la prochaine ouverture.
    });
  }, [reportId]);
  return null;
}
