"use client";

/**
 * Choix de portée d'une modification de copie :
 *  - « Seulement pour <prénom> » / « Mettre aussi à jour le modèle » ;
 *  - « Appliquer aussi aux semaines suivantes » (séances de même lettre encore à faire).
 */
export function ScopeFields({
  firstName,
  canUpdateTemplate,
  scope,
  onScope,
  following,
  onFollowing,
  followingLabel = "Appliquer aussi aux semaines suivantes",
  error,
}: {
  firstName: string;
  canUpdateTemplate: boolean;
  scope: "copie" | "modele";
  onScope: (s: "copie" | "modele") => void;
  following: boolean;
  onFollowing: (v: boolean) => void;
  followingLabel?: string;
  error?: string;
}) {
  const radio = "size-5 shrink-0 accent-olive-fonce";
  const row = "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2.5 has-[:checked]:bg-olive-pale";
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" name="following" value="1" checked={following} onChange={(e) => onFollowing(e.target.checked)} className={radio} />
        <span>{followingLabel}</span>
      </label>
      <fieldset aria-describedby={error ? "scope-err" : undefined}>
        <legend className="mb-2 font-semibold">Appliquer la modification</legend>
        <div className="liste-groupee">
          <label className={row}>
            <input type="radio" name="scope" value="copie" checked={scope === "copie"} onChange={() => onScope("copie")} className={radio} />
            <span>Seulement pour {firstName}</span>
          </label>
          <label className={`${row} ${canUpdateTemplate ? "" : "cursor-not-allowed opacity-60"}`}>
            <input type="radio" name="scope" value="modele" checked={scope === "modele"} disabled={!canUpdateTemplate} onChange={() => onScope("modele")} className={radio} />
            <span className="flex flex-col">
              <span>Mettre aussi à jour le modèle</span>
              <span className="text-legende text-texte-2">
                {canUpdateTemplate ? "Le modèle d’origine reçoit la même modification. Les autres copies ne changent pas." : "Le modèle d’origine n’existe plus."}
              </span>
            </span>
          </label>
        </div>
        {error && (
          <p id="scope-err" className="mt-1.5 text-legende font-medium text-peche-fonce">
            {error}
          </p>
        )}
      </fieldset>
    </div>
  );
}
