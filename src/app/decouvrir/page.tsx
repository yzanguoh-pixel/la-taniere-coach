import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconAgenda, IconBilan, IconMessages, IconSeance } from "@/components/icons";

export const metadata: Metadata = { title: "Bienvenue à La Tanière" };

const steps = [
  { n: 1, t: "Choisissez votre créneau", d: "En visio ou en salle, sur les deux prochaines semaines." },
  { n: 2, t: "Répondez au questionnaire", d: "Objectif, niveau, disponibilités : 2 minutes." },
  { n: 3, t: "Faites le bilan avec Karim", d: "45 minutes pour faire le point et repartir avec des pistes concrètes." },
];

const after = [
  { Icon: IconSeance, t: "Un programme fait pour vous", d: "Charges calées sur votre bilan, exercices adaptés à vos douleurs." },
  { Icon: IconMessages, t: "Un coach qui lit vos retours", d: "Après chaque séance, Karim ajuste la suite si besoin." },
  { Icon: IconBilan, t: "Tout au même endroit", d: "Séances, messages et nutrition dans une seule app." },
];

/** P1-Accueil : page publique, promesse et accès à la réservation du bilan offert. */
export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5 pt-2">
        <Image src="/logo/taniere-logo.svg" alt="La Tanière" width={208} height={51} priority unoptimized />
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold text-olive-fonce">Coacher plus, gérer moins.</p>
          <h1 className="text-titre">Votre bilan offert, en 45 minutes</h1>
          <p className="text-texte-2">
            Karim fait le point avec vous sur votre objectif, votre niveau et vos contraintes, en visio ou en salle. Sans engagement.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Le bilan en bref">
          {["Offert", "45 min", "Visio ou salle"].map((t) => (
            <li key={t} className="rounded-full bg-olive-pale px-3 py-1 text-legende font-semibold text-olive-fonce">
              {t}
            </li>
          ))}
        </ul>
        <Link href="/decouvrir/creneau" className="btn-principal w-full">
          <IconAgenda width={20} height={20} />
          Réserver mon bilan offert
        </Link>
      </section>

      <section aria-labelledby="etapes" className="flex flex-col gap-3">
        <h2 id="etapes" className="text-sous-titre">Comment ça se passe</h2>
        <ol className="liste-groupee">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-4 p-4">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-olive-pale text-[15px] font-bold tabular-nums text-olive-fonce">
                {s.n}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{s.t}</span>
                <span className="text-[15px] text-texte-2">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ensuite" className="flex flex-col gap-3">
        <h2 id="ensuite" className="text-sous-titre">Si vous continuez</h2>
        <ul className="liste-groupee">
          {after.map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-4 p-4">
              <Icon width={22} height={22} className="mt-0.5 shrink-0 text-olive-fonce" />
              <span className="flex flex-col">
                <span className="font-semibold">{t}</span>
                <span className="text-[15px] text-texte-2">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center gap-3 text-center">
        <Link href="/decouvrir/creneau" className="btn-principal w-full">
          Réserver mon bilan offert
        </Link>
        <p className="text-legende text-texte-2">Où les loups se rassemblent</p>
      </section>
    </div>
  );
}
