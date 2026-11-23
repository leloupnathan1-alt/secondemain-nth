// Accès à la base Supabase côté serveur uniquement (clé secrète, jamais envoyée au navigateur).

export const supabaseConfigure = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

async function requete(chemin: string, methode: string, corps?: unknown, prefer?: string) {
  const cle = process.env.SUPABASE_SECRET_KEY ?? "";
  const entetes: Record<string, string> = { apikey: cle, "Content-Type": "application/json" };
  if (cle.startsWith("eyJ")) entetes.Authorization = `Bearer ${cle}`;
  if (prefer) entetes.Prefer = prefer;
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const rep = await fetch(`${base}/rest/v1/${chemin}`, {
    method: methode,
    headers: entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
    cache: "no-store",
  });
  if (!rep.ok) throw new Error(`Supabase ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
  const texte = await rep.text();
  return texte ? JSON.parse(texte) : null;
}

export async function inserer<T>(table: string, ligne: Record<string, unknown>): Promise<T> {
  const r = (await requete(table, "POST", ligne, "return=representation")) as T[];
  return r[0];
}

export async function upsert(table: string, ligne: Record<string, unknown>) {
  await requete(table, "POST", ligne, "resolution=merge-duplicates,return=minimal");
}

export async function lire<T>(table: string, filtre: string): Promise<T[]> {
  return ((await requete(`${table}?${filtre}`, "GET")) as T[]) ?? [];
}

export async function modifier(table: string, filtre: string, valeurs: Record<string, unknown>) {
  await requete(`${table}?${filtre}`, "PATCH", valeurs, "return=minimal");
}

export type Paiement = {
  session_id: string;
  formule: "unite" | "mensuel" | "revendeur";
  annonce_id: string | null;
  actif: boolean;
};
