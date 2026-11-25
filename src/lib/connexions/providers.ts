/** Catalogue des connexions simulées (US35). Aucun logo de marque : icône générique + nom du service. */

export type CoacheProvider = "strava" | "withings" | "garmin" | "apple_sante" | "health_connect" | "whoop";
export type CoachProvider = "google_agenda" | "outlook" | "ics" | "paiement" | "notifications";
export type IconKind = "connexion" | "agenda" | "paiement" | "notifications" | "progression";

export type ProviderInfo<P extends string> = {
  key: P;
  name: string;
  /** Ce que la connexion apporte, en une phrase. */
  description: string;
  /** Texte de la confirmation avant connexion. */
  confirm: string;
  /** Texte de la confirmation avant déconnexion (ce que deviennent les données). */
  disconnectNote: string;
  icon: IconKind;
  /** Strava : jamais partagé avec le coach (règles Strava). */
  privateToCoache?: boolean;
};

export const COACHE_PROVIDERS: ProviderInfo<CoacheProvider>[] = [
  {
    key: "withings",
    name: "Withings",
    description: "Tes pesées arrivent seules dans ton suivi. Karim les voit.",
    confirm: "La Tanière va importer tes pesées des 6 dernières semaines (données d’exemple) et les partager avec ton coach.",
    disconnectNote: "Les pesées déjà importées restent dans ton historique ; plus aucune nouvelle pesée n’arrivera.",
    icon: "progression",
  },
  {
    key: "garmin",
    name: "Garmin",
    description: "Tes activités (course, vélo, natation) remontent dans ton suivi. Karim les voit.",
    confirm: "La Tanière va importer tes 5 dernières activités (données d’exemple) et les partager avec ton coach.",
    disconnectNote: "Les activités déjà importées restent dans ton historique ; plus aucune nouvelle activité n’arrivera.",
    icon: "connexion",
  },
  {
    key: "strava",
    name: "Strava",
    description: "Tes sorties Strava, visibles par toi seule (règles Strava) : Karim ne les voit jamais.",
    confirm: "La Tanière va importer tes 3 dernières sorties (données d’exemple). Elles resteront visibles par toi seule.",
    disconnectNote: "Tes sorties Strava importées seront supprimées de La Tanière, comme l’exigent les règles Strava.",
    icon: "connexion",
    privateToCoache: true,
  },
  {
    key: "apple_sante",
    name: "Apple Santé",
    description: "Pas, sommeil et fréquence cardiaque depuis ton iPhone.",
    confirm: "La Tanière va se connecter à Apple Santé (simulation : aucune donnée importée dans la démo).",
    disconnectNote: "La connexion sera coupée. Aucune donnée n’a été importée dans la démo.",
    icon: "connexion",
  },
  {
    key: "health_connect",
    name: "Health Connect",
    description: "Pas, sommeil et fréquence cardiaque depuis ton téléphone Android.",
    confirm: "La Tanière va se connecter à Health Connect (simulation : aucune donnée importée dans la démo).",
    disconnectNote: "La connexion sera coupée. Aucune donnée n’a été importée dans la démo.",
    icon: "connexion",
  },
  {
    key: "whoop",
    name: "Whoop",
    description: "Récupération et charge d’entraînement quotidiennes.",
    confirm: "La Tanière va se connecter à Whoop (simulation : aucune donnée importée dans la démo).",
    disconnectNote: "La connexion sera coupée. Aucune donnée n’a été importée dans la démo.",
    icon: "connexion",
  },
];

export const COACH_SECTIONS: { title: string; providers: ProviderInfo<CoachProvider>[] }[] = [
  {
    title: "Agenda",
    providers: [
      {
        key: "google_agenda",
        name: "Google Agenda",
        description: "Tes séances et bilans apparaissent dans ton agenda Google.",
        confirm: "La Tanière va synchroniser tes séances et bilans avec Google Agenda (simulation).",
        disconnectNote: "Les événements déjà créés restent dans ton agenda ; plus rien ne sera ajouté.",
        icon: "agenda",
      },
      {
        key: "outlook",
        name: "Outlook",
        description: "Tes séances et bilans apparaissent dans ton calendrier Outlook.",
        confirm: "La Tanière va synchroniser tes séances et bilans avec Outlook (simulation).",
        disconnectNote: "Les événements déjà créés restent dans ton calendrier ; plus rien ne sera ajouté.",
        icon: "agenda",
      },
      {
        key: "ics",
        name: "Lien ICS",
        description: "Un lien d’abonnement en lecture seule, pour n’importe quel calendrier.",
        confirm: "La Tanière va générer ton lien d’abonnement ICS (simulation).",
        disconnectNote: "Le lien sera désactivé : les calendriers abonnés ne se mettront plus à jour.",
        icon: "agenda",
      },
    ],
  },
  {
    title: "Paiement",
    providers: [
      {
        key: "paiement",
        name: "Paiement en ligne",
        description: "Encaisse les abonnements de tes coachés par carte et prélèvement.",
        confirm: "La Tanière va activer l’encaissement en ligne (simulation : aucun paiement réel).",
        disconnectNote: "Les encaissements en ligne seront suspendus ; les factures existantes restent.",
        icon: "paiement",
      },
    ],
  },
  {
    title: "Notifications",
    providers: [
      {
        key: "notifications",
        name: "Notifications",
        description: "Une alerte à chaque retour de séance, message ou réservation de bilan.",
        confirm: "La Tanière va activer les notifications sur cet appareil (simulation).",
        disconnectNote: "Tu ne recevras plus d’alerte ; tout reste visible dans l’application.",
        icon: "notifications",
      },
    ],
  },
];

export const COACHE_KEYS = COACHE_PROVIDERS.map((p) => p.key);
export const COACH_KEYS = COACH_SECTIONS.flatMap((s) => s.providers.map((p) => p.key));

/** Fournisseurs dont le coach voit les données (jamais Strava). */
export const COACH_VISIBLE_DEVICES = ["withings", "garmin"] as const;

export const SOURCE_LABELS: Record<string, string> = {
  withings: "Withings",
  garmin: "Garmin",
  strava: "Strava",
  manuel: "Saisie manuelle",
};

/** Date et heure de synchronisation, en clair (fuseau Paris). */
export function syncLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Jamais synchronisé";
  const d = new Date(iso);
  const day = (x: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(x);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d);
  const minutes = Math.round((now.getTime() - d.getTime()) / 60000);
  if (minutes >= 0 && minutes < 1) return "Synchronisé à l’instant";
  if (minutes >= 0 && minutes < 60) return `Synchronisé il y a ${minutes} min`;
  if (day(d) === day(now)) return `Synchronisé aujourd’hui à ${time}`;
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(d);
  return `Synchronisé le ${date} à ${time}`;
}

export function shortDateFr(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" }).format(d);
}

export const kgFr = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
export const kmFr = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
