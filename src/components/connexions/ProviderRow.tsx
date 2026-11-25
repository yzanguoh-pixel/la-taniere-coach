"use client";

import { startTransition, useActionState, useState } from "react";
import { IconAbonnements, IconAgenda, IconConnexions, IconMessages, IconProgression } from "@/components/icons";
import type { ConnexionState } from "@/lib/connexions/actions";
import type { IconKind } from "@/lib/connexions/providers";

type Act = (prev: ConnexionState) => Promise<ConnexionState>;
type Kind = "connect" | "disconnect" | "sync";

const ICONS: Record<IconKind, typeof IconConnexions> = {
  connexion: IconConnexions,
  agenda: IconAgenda,
  paiement: IconAbonnements,
  notifications: IconMessages,
  progression: IconProgression,
};

const initial: ConnexionState = { status: "idle" };

/**
 * Une ligne de service simulé : icône générique + nom, statut, état de synchronisation,
 * et confirmation explicite avant de connecter ou de déconnecter.
 */
export function ProviderRow(props: {
  name: string;
  description: string;
  icon: IconKind;
  connected: boolean;
  syncText: string;
  confirmConnect: string;
  confirmDisconnect: string;
  /** Mention affichée sous le nom (ex. « visible par toi seule (règles Strava) »). */
  badge?: string;
  /** Détail des données importées, quand connecté. */
  detail?: string;
  connect: Act;
  disconnect: Act;
  sync?: Act;
}) {
  const { name, description, connected } = props;
  const [confirming, setConfirming] = useState<Exclude<Kind, "sync"> | null>(null);
  const [lastKind, setLastKind] = useState<Kind | null>(null);
  const [state, dispatch, pending] = useActionState(async (prev: ConnexionState, kind: Kind) => {
    if (kind === "connect") return props.connect(prev);
    if (kind === "disconnect") return props.disconnect(prev);
    return props.sync ? props.sync(prev) : prev;
  }, initial);

  const run = (kind: Kind) => {
    setConfirming(null);
    setLastKind(kind);
    startTransition(() => dispatch(kind));
  };

  const Icon = ICONS[props.icon];
  const pendingLabel = lastKind === "connect" ? "Connexion et synchronisation…" : lastKind === "disconnect" ? "Déconnexion…" : "Synchronisation…";
  const titleId = `svc-${name.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="flex flex-col gap-3 px-4 py-4" aria-labelledby={titleId}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-olive-pale text-olive-fonce">
          <Icon width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={titleId} className="font-semibold">
              {name}
            </h3>
            <span
              className={
                connected
                  ? "rounded-full bg-olive-pale px-2 py-0.5 text-legende font-semibold text-olive-fonce"
                  : "rounded-full bg-separateur px-2 py-0.5 text-legende font-semibold text-texte-2"
              }
            >
              {connected ? "Connecté" : "Non connecté"}
            </span>
          </div>
          <p className="text-[15px] text-texte-2">{description}</p>
          {props.badge && <p className="mt-1 text-legende font-semibold text-lavande-fonce">{props.badge}</p>}
          <p className="mt-1 text-legende text-texte-2 tabular-nums" aria-live="polite">
            {pending ? pendingLabel : connected ? props.syncText : "Aucune synchronisation"}
            {connected && props.detail && !pending ? ` · ${props.detail}` : ""}
          </p>
        </div>
      </div>

      {confirming ? (
        <div role="group" aria-label={`Confirmer ${confirming === "connect" ? "la connexion" : "la déconnexion"} de ${name}`} className="rounded-[16px] bg-fond p-3">
          <p className="text-[15px]">{confirming === "connect" ? props.confirmConnect : props.confirmDisconnect}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-principal" onClick={() => run(confirming)}>
              {confirming === "connect" ? `Connecter ${name}` : "Déconnecter"}
            </button>
            <button type="button" className="btn-secondaire" onClick={() => setConfirming(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              {props.sync && (
                <button type="button" className="btn-secondaire" disabled={pending} onClick={() => run("sync")}>
                  Synchroniser
                </button>
              )}
              <button type="button" className="btn-secondaire" disabled={pending} onClick={() => setConfirming("disconnect")}>
                Déconnecter
              </button>
            </>
          ) : (
            <button type="button" className="btn-principal" disabled={pending} onClick={() => setConfirming("connect")}>
              Connecter
            </button>
          )}
        </div>
      )}

      {!pending && state.status !== "idle" && state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-legende font-semibold text-peche-fonce" : "text-legende font-semibold text-olive-fonce"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
