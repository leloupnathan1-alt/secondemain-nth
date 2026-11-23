import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_BASE64 = 3_000_000; // ~2,2 Mo d'image

// Modèles gratuits essayés dans l'ordre (le premier disponible répond).
const MODELES = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"].filter(
  (m): m is string => Boolean(m),
);

// La recherche Google gratuite est disponible sur ces modèles.
const MODELES_RECHERCHE = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.5-flash"];

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
{"objet": "nom précis de l'objet : marque, modèle, édition, plateforme, format (ex. code de téléchargement), taille",
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

  const texte = await appelerGemini(cle, MODELES, {
    contents: [{ parts: [{ inline_data: { mime_type: type, data: image } }, { text: CONSIGNE }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });

  if (!texte) {
    return NextResponse.json(
      { erreur: "L'IA est très demandée en ce moment. Réessaie dans une minute." },
      { status: 502 },
    );
  }

  const res = lireJson(texte);
  if (!res) {
    return NextResponse.json({ erreur: "La rédaction a échoué. Réessaie avec la même photo." }, { status: 502 });
  }

  if (typeof res.erreur === "string") {
    return NextResponse.json({ erreur: `On n'a pas reconnu d'objet à vendre : ${res.erreur}` }, { status: 422 });
  }

  const vinted = res.vinted;
  const leboncoin = res.leboncoin;
  const ebay = res.ebay;
  const objet = typeof res.objet === "string" ? res.objet.slice(0, 200) : "";
  let prix = nombre(res.prix_conseille);
  let prixMin = nombre(res.prix_min);
  let prixMax = nombre(res.prix_max);
  if (!estVersion(vinted) || !estVersion(leboncoin) || !estVersion(ebay) || prix === null) {
    return NextResponse.json({ erreur: "La rédaction a échoué. Réessaie avec la même photo." }, { status: 502 });
  }

  // Prix vérifié sur le web (recherche Google) ; à défaut, on garde l'estimation de l'IA.
  let source: "web" | "estimation" = "estimation";
  if (objet) {
    const web = await prixDepuisLeWeb(cle, objet);
    if (web) {
      prix = web.prix;
      prixMin = web.min;
      prixMax = web.max;
      source = "web";
    }
  }

  // Avant-goût : Vinted en entier, Leboncoin et eBay seulement en aperçu (le reste est débloqué après paiement).
  return NextResponse.json({
    objet,
    prix_conseille: prix,
    prix_min: prixMin ?? prix,
    prix_max: prixMax ?? prix,
    prix_source: source,
    vinted,
    apercus: {
      leboncoin: { titre: leboncoin.titre, categorie: leboncoin.categorie },
      ebay: { titre: ebay.titre, categorie: ebay.categorie },
    },
  });
}

function lireJson(texte: string): Record<string, unknown> | null {
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut === -1 || fin <= debut) return null;
  try {
    const v = JSON.parse(texte.slice(debut, fin + 1));
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function appelerGemini(cle: string, modeles: string[], requete: unknown): Promise<string | null> {
  for (const modele of modeles) {
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
      const texte = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
      if (texte) return texte;
    } catch (e) {
      console.error("Gemini", modele, e);
    }
  }
  return null;
}

async function prixDepuisLeWeb(cle: string, objet: string) {
  const consigne = `Objet à vendre d'occasion en France : "${objet}".
Cherche sur le web les prix actuels de cet objet exact (même édition, même plateforme, même format) :
annonces d'occasion sur Vinted, Leboncoin, eBay, Rakuten, Back Market, et le prix neuf actuel.
Donne un prix de revente réaliste pour vendre en moins de deux semaines, inférieur au prix neuf.
Réponds uniquement avec ce JSON : {"prix_conseille": nombre, "prix_min": nombre, "prix_max": nombre}`;
  const texte = await appelerGemini(cle, MODELES_RECHERCHE, {
    contents: [{ parts: [{ text: consigne }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  });
  if (!texte) return null;
  const r = lireJson(texte);
  const prix = r ? nombre(r.prix_conseille) : null;
  if (!r || !prix) return null;
  const min = nombre(r.prix_min) ?? prix;
  const max = nombre(r.prix_max) ?? prix;
  return { prix, min: Math.min(min, prix), max: Math.max(max, prix) };
}
