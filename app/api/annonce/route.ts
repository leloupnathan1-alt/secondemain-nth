import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_BASE64 = 3_000_000; // ~2,2 Mo d'image

// Modèles gratuits essayés dans l'ordre (le premier disponible répond).
const MODELES = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"].filter(
  (m): m is string => Boolean(m),
);

const CONSIGNE = `Tu es un expert de la revente d'objets d'occasion en France.
Regarde la photo et rédige une annonce pour trois sites : Vinted, Leboncoin et eBay.

Règles :
- Français impeccable, ton simple et honnête, pas de majuscules partout, pas d'emojis.
- N'invente rien qui ne se voit pas (marque, taille, matière) : si c'est incertain, écris "à préciser".
- Mentionne l'état apparent, en restant prudent.
- Vinted : titre court (60 caractères max), description de 3 à 5 lignes.
- Leboncoin : titre de 50 caractères max, description un peu plus détaillée, termine par "Remise en main propre possible".
- eBay : titre riche en mots-clés (80 caractères max), description structurée.
- Catégorie : la catégorie la plus probable sur chaque site, sous la forme "Catégorie > Sous-catégorie".
- Prix : estime le prix de revente réaliste en euros sur le marché de l'occasion français, pour vendre en moins de deux semaines.

Si la photo ne montre pas un objet à vendre, réponds uniquement {"erreur": "explication courte"}.

Sinon, réponds uniquement avec ce JSON :
{"objet": "nom court de l'objet",
 "prix_conseille": nombre, "prix_min": nombre, "prix_max": nombre,
 "vinted": {"titre": "", "description": "", "categorie": ""},
 "leboncoin": {"titre": "", "description": "", "categorie": ""},
 "ebay": {"titre": "", "description": "", "categorie": ""}}`;

type Version = { titre: string; description: string; categorie: string };

function estVersion(v: unknown): v is Version {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.titre === "string" && typeof o.description === "string" && typeof o.categorie === "string";
}

const nombre = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? Math.round(v) : null);

export async function POST(req: Request) {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) {
    return NextResponse.json(
      { erreur: "Le service n'est pas encore branché. Reviens dans un instant !" },
      { status: 503 },
    );
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  const { image, type } = (corps ?? {}) as { image?: unknown; type?: unknown };
  if (typeof image !== "string" || typeof type !== "string" || !TYPES_AUTORISES.includes(type)) {
    return NextResponse.json({ erreur: "Envoie une photo au format JPG, PNG ou WebP." }, { status: 400 });
  }
  if (image.length > TAILLE_MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return NextResponse.json({ erreur: "Cette photo est trop lourde. Essaie avec une autre." }, { status: 400 });
  }

  const requete = {
    contents: [{ parts: [{ inline_data: { mime_type: type, data: image } }, { text: CONSIGNE }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  };

  let texte: string | null = null;
  for (const modele of MODELES) {
    try {
      const rep = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
          body: JSON.stringify(requete),
        },
      );
      if (!rep.ok) {
        console.error("Gemini", modele, rep.status, (await rep.text()).slice(0, 300));
        continue;
      }
      const data = (await rep.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      texte = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
      if (texte) break;
    } catch (e) {
      console.error("Gemini", modele, e);
    }
  }

  if (!texte) {
    return NextResponse.json(
      { erreur: "L'IA est très demandée en ce moment. Réessaie dans une minute." },
      { status: 502 },
    );
  }

  let res: Record<string, unknown>;
  try {
    res = JSON.parse(texte.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return NextResponse.json({ erreur: "La rédaction a échoué. Réessaie avec la même photo." }, { status: 502 });
  }

  if (typeof res.erreur === "string") {
    return NextResponse.json({ erreur: `On n'a pas reconnu d'objet à vendre : ${res.erreur}` }, { status: 422 });
  }

  const prix = nombre(res.prix_conseille);
  const vinted = res.vinted;
  const leboncoin = res.leboncoin;
  const ebay = res.ebay;
  if (!estVersion(vinted) || !estVersion(leboncoin) || !estVersion(ebay) || prix === null) {
    return NextResponse.json({ erreur: "La rédaction a échoué. Réessaie avec la même photo." }, { status: 502 });
  }

  // Avant-goût : Vinted en entier, Leboncoin et eBay seulement en aperçu (le reste est débloqué après paiement).
  return NextResponse.json({
    objet: typeof res.objet === "string" ? res.objet : "",
    prix_conseille: prix,
    prix_min: nombre(res.prix_min) ?? prix,
    prix_max: nombre(res.prix_max) ?? prix,
    vinted,
    apercus: {
      leboncoin: { titre: leboncoin.titre, categorie: leboncoin.categorie },
      ebay: { titre: ebay.titre, categorie: ebay.categorie },
    },
  });
}
