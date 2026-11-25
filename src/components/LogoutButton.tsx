import { IconSortie } from "./icons";

/** Déconnexion (POST vers /auth/logout, fonctionne sans JavaScript). */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        aria-label={compact ? "Se déconnecter" : undefined}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-texte-2 transition-colors hover:bg-separateur hover:text-texte"
      >
        <IconSortie className="size-5" />
        {!compact && <span>Changer de profil</span>}
      </button>
    </form>
  );
}
