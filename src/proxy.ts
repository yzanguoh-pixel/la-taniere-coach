import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Protection des espaces :
 * - /coach/* : rôle coach uniquement
 * - /app/*   : rôle coaché uniquement
 * - /decouvrir/* et / : publics
 * Le rôle est lu dans la table profiles (RLS : chaque utilisateur lit son propre profil).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needs = pathname.startsWith("/coach") ? "coach" : pathname.startsWith("/app") ? "coache" : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const preview = process.env.DEMO_PREVIEW === "1" && process.env.VERCEL !== "1";

  if (!url || !key) {
    if (needs && !preview) return NextResponse.redirect(new URL("/?erreur=config", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Rafraîchit la session à chaque requête.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!needs || preview) return response;
  if (!user) return NextResponse.redirect(new URL("/", request.url));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role as string | undefined;
  if (role !== needs) {
    const home = role === "coach" ? "/coach" : role === "coache" ? "/app" : "/";
    return NextResponse.redirect(new URL(home, request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
