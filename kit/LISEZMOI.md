# Kit Claude Code : La Tanière Coach

- `CLAUDE.md` : le contexte du projet. Claude Code le lit tout seul à chaque session.
- `PROMPTS.md` : les 6 prompts à coller dans l'ordre (sprint 0 à jour J).
- `maquettes/` : les 39 écrans validés (dont l'espace coach en version téléphone) et les 3 composants (CoachNav, TabBar, CoachTabs), qui servent de référence visuelle.
- `assets/` : le logo complet et le symbole seul, en SVG.

## Démarrer

1. Dézippe ce dossier à l'endroit où tu veux créer l'app, par exemple `~/Projets/la-taniere-coach`.
2. Ouvre un terminal dans ce dossier et lance `claude`.
3. Colle le **Prompt 0** de `PROMPTS.md`, puis suis ce que Claude Code te demande (création du projet Supabase, variables d'environnement, compte Vercel).
4. Teste avec `npm run dev`, puis passe au prompt suivant, un sprint à la fois.

Ton app perso (le tracker et le projet Supabase `coaching-hub`) reste intacte : on crée un projet séparé.
