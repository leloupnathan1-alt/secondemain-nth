import crypto from "node:crypto";

// Appels à l'API Stripe côté serveur uniquement.

export const stripeConfigure = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);

function aplatir(valeur: unknown, prefixe: string, sortie: [string, string][]) {
  if (valeur === undefined || valeur === null) return;
  if (Array.isArray(valeur)) {
    valeur.forEach((v, i) => aplatir(v, `${prefixe}[${i}]`, sortie));
  } else if (typeof valeur === "object") {
    for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) {
      aplatir(v, prefixe ? `${prefixe}[${k}]` : k, sortie);
    }
  } else {
    sortie.push([prefixe, String(valeur)]);
  }
}

export async function stripe<T>(chemin: string, params: Record<string, unknown>): Promise<T> {
  const champs: [string, string][] = [];
  aplatir(params, "", champs);
  const rep = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: new URLSearchParams(champs).toString(),
    cache: "no-store",
  });
  const json = await rep.json();
  if (!rep.ok) throw new Error(`Stripe ${rep.status} : ${json?.error?.message ?? "erreur"}`);
  return json as T;
}

// Vérifie que l'événement vient bien de Stripe (signature du webhook).
export function signatureValide(corps: string, entete: string | null, secret: string): boolean {
  if (!entete) return false;
  const parties = Object.fromEntries(
    entete.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = Number(parties.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const attendu = crypto.createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex");
  const signatures = entete
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return signatures.some((s) => {
    const a = Buffer.from(s, "hex");
    const b = Buffer.from(attendu, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
