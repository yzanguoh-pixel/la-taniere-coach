"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { reserveBilan } from "@/lib/decouvrir/actions";
import { NIVEAUX, REQUIRED_FIELDS, type BilanFormat, type FieldName, type ReserveState, type ReserveValues } from "@/lib/decouvrir/format";

type Slot = { id: string; dateLabel: string; time: string; format: BilanFormat; formatLabel: string };

const inputCls = (invalid: boolean) =>
  `min-h-11 w-full rounded-xl border bg-carte px-4 py-2.5 text-[17px] text-texte placeholder:text-texte-2/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-fonce ${
    invalid ? "border-peche-fonce" : "border-bordure"
  }`;

const ErrorText = ({ id, children }: { id: string; children?: string }) =>
  children ? (
    <p id={id} className="mt-2 text-[15px] font-medium text-peche-fonce">
      {children}
    </p>
  ) : null;

type FieldDef = { name: FieldName; label: string; hint?: string; placeholder?: string; type?: string; autoComplete?: string; inputMode?: "tel" | "email" | "text"; multiline?: boolean };

const contact: FieldDef[] = [
  { name: "full_name", label: "Prénom et nom", autoComplete: "name", placeholder: "Ex. Nora Benali" },
  { name: "phone", label: "Téléphone", type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "06 12 34 56 78", hint: "Karim vous confirme le rendez-vous par SMS." },
  { name: "email", label: "E-mail (facultatif)", type: "email", inputMode: "email", autoComplete: "email", placeholder: "prenom@exemple.fr" },
];

const intake: FieldDef[] = [
  { name: "objectif", label: "Votre objectif", placeholder: "Ex. perdre 5 kg et renforcer le dos", multiline: true },
  { name: "disponibilites", label: "Vos disponibilités pour vous entraîner", placeholder: "Ex. 2 soirs par semaine et le samedi matin" },
  { name: "experience", label: "Votre expérience du sport (facultatif)", placeholder: "Ex. salle il y a 3 ans, course de temps en temps" },
  { name: "douleurs", label: "Douleurs ou blessures", placeholder: "Ex. douleur lombaire en fin de journée", hint: "Écrivez « Aucune » si rien à signaler." },
  { name: "alimentation", label: "Votre alimentation (facultatif)", placeholder: "Ex. grignotage le soir" },
  { name: "sommeil", label: "Votre sommeil (facultatif)", placeholder: "Ex. 6 h par nuit" },
];

/** P3-Questionnaire : coordonnées et questionnaire en 2 minutes, puis réservation du créneau. */
export function IntakeForm({ slot }: { slot: Slot }) {
  const [state, action, pending] = useActionState<ReserveState, FormData>(reserveBilan.bind(null, slot.id, slot.format), {});
  const [values, setValues] = useState<ReserveValues>({});
  const e = state.errors ?? {};
  const fieldErrors = Object.keys(e).filter((k) => k !== "form" && k !== "slot").length;
  const set = (name: FieldName) => (ev: { target: { value: string } }) => setValues((v) => ({ ...v, [name]: ev.target.value }));

  const field = (f: FieldDef) => {
    const err = e[f.name];
    const describedBy = [err ? `err-${f.name}` : null, f.hint ? `hint-${f.name}` : null].filter(Boolean).join(" ") || undefined;
    const common = {
      id: f.name,
      name: f.name,
      value: values[f.name] ?? "",
      onChange: set(f.name),
      placeholder: f.placeholder,
      "aria-invalid": err ? true : undefined,
      "aria-describedby": describedBy,
      "aria-required": REQUIRED_FIELDS.includes(f.name) || undefined,
      maxLength: 500,
      className: inputCls(Boolean(err)),
    };
    return (
      <div key={f.name}>
        <label htmlFor={f.name} className="mb-2 block font-semibold">
          {f.label}
        </label>
        {f.multiline ? <textarea {...common} rows={2} /> : <input {...common} type={f.type ?? "text"} inputMode={f.inputMode} autoComplete={f.autoComplete} />}
        {f.hint && !err && (
          <p id={`hint-${f.name}`} className="mt-2 text-legende text-texte-2">
            {f.hint}
          </p>
        )}
        <ErrorText id={`err-${f.name}`}>{err}</ErrorText>
      </div>
    );
  };

  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      {(fieldErrors > 0 || e.form) && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {e.form ?? (fieldErrors === 1 ? "Un champ est à corriger." : `${fieldErrors} champs sont à corriger.`)}
        </p>
      )}

      <section aria-labelledby="rdv" className="flex flex-col gap-2">
        <h2 id="rdv" className="sr-only">
          Votre créneau
        </h2>
        <div className={`liste-groupee flex items-center justify-between gap-3 p-4 ${e.slot ? "ring-2 ring-peche-fonce" : ""}`} aria-describedby={e.slot ? "err-slot" : undefined}>
          <span className="flex flex-col">
            <span className="font-semibold">{slot.dateLabel}</span>
            <span className="text-[15px] tabular-nums text-texte-2">
              {slot.time} · 45 min · {slot.formatLabel}
            </span>
          </span>
          <Link href={`/decouvrir/creneau?format=${slot.format}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-olive-fonce">
            Modifier
          </Link>
        </div>
        {e.slot && (
          <div role="alert">
            <ErrorText id="err-slot">{e.slot}</ErrorText>
            <Link href={`/decouvrir/creneau?format=${slot.format}`} className="btn-secondaire mt-3 w-full">
              Choisir un autre créneau
            </Link>
          </div>
        )}
      </section>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 text-sous-titre">Vos coordonnées</legend>
        {contact.map(field)}
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 text-sous-titre">Questionnaire</legend>
        <p className="-mt-2 text-[15px] text-texte-2">2 minutes pour que Karim prépare votre bilan. Tous les champs sont obligatoires, sauf mention « facultatif ».</p>
        {intake.slice(0, 2).map(field)}

        <fieldset aria-describedby={e.niveau ? "err-niveau" : undefined} aria-invalid={e.niveau ? true : undefined}>
          <legend className="mb-2 font-semibold">Votre niveau</legend>
          <div className="grid grid-cols-3 gap-2">
            {NIVEAUX.map((n) => (
              <label key={n.value} className="relative">
                <input type="radio" name="niveau" value={n.value} checked={values.niveau === n.value} onChange={set("niveau")} className="peer sr-only" />
                <span
                  className={`grid min-h-11 cursor-pointer place-items-center rounded-xl border px-1 text-[15px] font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
                    values.niveau === n.value
                      ? "border-olive-fonce bg-olive-fonce text-white"
                      : e.niveau
                        ? "border-peche-fonce bg-carte text-texte"
                        : "border-bordure bg-carte text-texte hover:bg-olive-pale"
                  }`}
                >
                  {n.label}
                </span>
              </label>
            ))}
          </div>
          <ErrorText id="err-niveau">{e.niveau}</ErrorText>
        </fieldset>

        {intake.slice(2).map(field)}
      </fieldset>

      <button type="submit" disabled={pending} className="btn-principal w-full">
        {pending ? "Réservation…" : "Réserver mon bilan offert"}
      </button>
    </form>
  );
}
