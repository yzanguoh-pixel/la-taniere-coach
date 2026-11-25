import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { coachSupabase } from "@/lib/coach/supabase";
import { getUpcomingRequests, getWeek } from "@/lib/agenda/queries";
import { isIsoDate, mondayOf, parisDate } from "@/lib/agenda/week";
import { BookingRequests } from "@/components/agenda/BookingRequests";
import { BookingLink } from "@/components/agenda/BookingLink";
import { AddSlotForm } from "@/components/agenda/AddSlotForm";
import { WeekNav, WeekView } from "@/components/agenda/WeekView";

export const metadata: Metadata = { title: "Agenda" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** US07 — Agenda de Karim : semaine (créneaux, bilans, séances), demandes de bilan, lien de réservation. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section className="flex flex-col gap-6 md:gap-8">
      <Suspense fallback={<AgendaSkeleton />}>
        <Agenda searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** URL publique de réservation, construite depuis l'en-tête Host de la requête. */
async function bookingUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "localhost:3000";
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  return `${proto}://${host}/decouvrir`;
}

async function Agenda({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const url = await bookingUrl();
  const supabase = await coachSupabase();
  if (!supabase) {
    return (
      <>
        <Header />
        <p className="liste-groupee p-5 text-texte-2">Supabase n’est pas configuré : l’agenda ne peut pas être chargé.</p>
      </>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <>
        <Header />
        <p className="liste-groupee p-5 text-texte-2">Session expirée : reconnecte-toi pour voir ton agenda.</p>
      </>
    );
  }

  const now = new Date();
  const today = parisDate(now);
  const currentMonday = mondayOf(today);
  const asked = typeof sp.semaine === "string" ? sp.semaine : "";
  const monday = isIsoDate(asked) ? mondayOf(asked) : currentMonday;

  const [week, requests] = await Promise.all([getWeek(supabase, user.id, monday), getUpcomingRequests(supabase, user.id, now)]);
  // Date proposée pour un nouveau créneau : aujourd'hui, ou le lundi de la semaine affichée si elle est à venir.
  const defaultDate = monday > today ? monday : today;

  return (
    <>
      <Header />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <BookingRequests items={requests} />
        <aside aria-label="Réservation et disponibilités" className="flex flex-col gap-6">
          <BookingLink url={url} />
          <AddSlotForm defaultDate={defaultDate} minDate={today} />
        </aside>
      </div>
      <div className="flex flex-col gap-4">
        <WeekNav monday={monday} currentMonday={currentMonday} />
        <WeekView monday={monday} today={today} data={week} nowIso={now.toISOString()} />
      </div>
    </>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-titre">Agenda</h1>
      <p className="mt-1 text-texte-2">Tes séances encadrées à la salle, les bilans offerts réservés et tes créneaux libres. Les séances en autonomie sont suivies à distance.</p>
    </header>
  );
}

function AgendaSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de l’agenda" className="flex flex-col gap-6 md:gap-8">
      <Header />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="liste-groupee h-72 animate-pulse" />
        <div className="liste-groupee h-72 animate-pulse" />
      </div>
      <div className="liste-groupee h-96 animate-pulse" />
    </div>
  );
}
