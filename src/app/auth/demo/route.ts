import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoCredentials, type DemoRole } from "@/lib/env";

/** Connexion automatique aux comptes de démo, faite côté serveur avec les identifiants d'environnement. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const role = form.get("role") === "coache" ? "coache" : ("coach" as DemoRole);
  const back = (erreur: string) => NextResponse.redirect(new URL(`/?erreur=${erreur}`, request.url), 303);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return back("config");
  const creds = demoCredentials(role);
  if (!creds) return back("identifiants");

  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return back("connexion");
  return NextResponse.redirect(new URL(role === "coach" ? "/coach" : "/app", request.url), 303);
}
