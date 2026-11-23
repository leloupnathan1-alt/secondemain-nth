"use client";

import Link from "next/link";
import { useState } from "react";

type Version = { titre: string; description: string; categorie: string };
type Apercu = { titre: string; categorie: string };
type Annonce = {
  objet: string;
  prix_conseille: number;
  prix_min: number;
  prix_max: number;
  prix_source: "web" | "estimation";
  vinted: Version;
  apercus: { leboncoin: Apercu; ebay: Apercu };
};

const MESSAGES_ATTENTE = [
  "On regarde ta photo…",
  "On rédige ton annonce…",
  "On compare les prix en ligne…",
  "On calcule le bon prix…",
];

async function reduirePhoto(fichier: File): Promise<{ data: string; apercu: string }> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Cette photo n'a pas pu être lue. Essaie avec une autre."));
      i.src = url;
    });
    const max = 1024;
    const ratio = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return { data: dataUrl.split(",")[1] ?? "", apercu: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const BOUTON_PRINCIPAL =
  "block w-full cursor-pointer rounded-xl bg-accent py-4 text-center text-lg font-bold text-encre shadow-[0_3px_0_#00855a] active:translate-y-[2px] active:shadow-none";

export default function Essai() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [etat, setEtat] = useState<"vide" | "attente" | "fini" | "erreur">("vide");
  const [message, setMessage] = useState(0);
  const [erreur, setErreur] = useState("");
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [copie, setCopie] = useState(false);

  async function envoyer(fichier: File | undefined) {
    if (!fichier) return;
    setEtat("attente");
    setErreur("");
    setCopie(false);
    setMessage(0);
    const minuteur = setInterval(() => setMessage((m) => (m + 1) % MESSAGES_ATTENTE.length), 2200);
    try {
      const { data, apercu } = await reduirePhoto(fichier);
      setPhoto(apercu);
      const rep = await fetch("/api/annonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, type: "image/jpeg" }),
      });
      const json = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(json.erreur ?? "Une erreur est survenue. Réessaie dans un instant.");
      setAnnonce(json as Annonce);
      setEtat("fini");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue. Réessaie dans un instant.");
      setEtat("erreur");
    } finally {
      clearInterval(minuteur);
    }
  }

  async function copier() {
    if (!annonce) return;
    const v = annonce.vinted;
    try {
      await navigator.clipboard.writeText(`${v.titre}\n\n${v.description}\n\nPrix : ${annonce.prix_conseille} €`);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  }

  const choixPhoto = (
    <label className={BOUTON_PRINCIPAL}>
      {etat === "fini" ? "Essayer avec une autre photo" : "Prendre ou choisir une photo"}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          envoyer(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );

  return (
    <main className="mx-auto max-w-md px-6 pb-16 pt-6 md:max-w-xl">
      <Link href="/" className="py-2 pr-4 text-sm font-semibold">
        ← Accueil
      </Link>

      {(etat === "vide" || etat === "erreur") && (
        <>
          <h1 className="mt-8 font-titre text-3xl font-extrabold leading-tight tracking-tight">
            Montre-nous un objet que tu veux vendre.
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-encre/70">
            Une seule photo suffit. On rédige l&apos;annonce et on te donne un prix conseillé.
          </p>

          <div className="mt-8 rounded-2xl bg-doux p-5">
            <p className="font-bold">Pour un bon résultat</p>
            <ul className="mt-2 space-y-1 leading-relaxed text-encre/80">
              <li>• L&apos;objet en entier, bien éclairé</li>
              <li>• Un fond simple (un mur, un drap)</li>
              <li>• Pas de visage ni d&apos;info personnelle sur la photo</li>
            </ul>
          </div>

          {etat === "erreur" && (
            <p role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
              {erreur}
            </p>
          )}

          <div className="mt-8">{choixPhoto}</div>
          <p className="mt-3 text-center text-sm text-encre/60">Gratuit, sans inscription</p>
        </>
      )}

      {etat === "attente" && (
        <div className="mt-10 text-center">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Ta photo" className="mx-auto max-h-64 rounded-2xl object-contain" />
          )}
          <div className="mx-auto mt-8 h-2 w-40 overflow-hidden rounded-full bg-encre/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
          </div>
          <p className="mt-4 font-titre text-xl font-extrabold tracking-tight" aria-live="polite">
            {MESSAGES_ATTENTE[message]}
          </p>
        </div>
      )}

      {etat === "fini" && annonce && (
        <>
          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-accent-fonce">Ton annonce est prête</p>
          <div className="mt-4 flex items-center gap-4">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-sm text-encre/60">Prix conseillé</p>
              <p className="font-titre text-4xl font-extrabold tracking-tight">{annonce.prix_conseille} €</p>
              <p className="text-sm text-encre/60">
                Fourchette : {annonce.prix_min} à {annonce.prix_max} €
              </p>
              <p className="mt-1 text-xs text-encre/50">
                {annonce.prix_source === "web" ? "D'après les prix trouvés en ligne" : "Estimation, à vérifier"}
              </p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border border-encre/10 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-titre text-lg font-extrabold">Vinted</h2>
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-fonce">Offert</span>
            </div>
            <p className="mt-1 text-sm text-encre/60">{annonce.vinted.categorie}</p>
            <p className="mt-4 font-bold">{annonce.vinted.titre}</p>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{annonce.vinted.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={copier} className="rounded-xl border-2 border-encre py-3 font-bold active:scale-[0.99]">
                {copie ? "Copié ✓" : "Copier"}
              </button>
              <a
                href="https://www.vinted.fr/items/new"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-encre py-3 text-center font-bold text-white"
              >
                Ouvrir Vinted
              </a>
            </div>
          </section>

          {(["leboncoin", "ebay"] as const).map((site) => (
            <section key={site} className="relative mt-4 overflow-hidden rounded-2xl border border-encre/10 p-5">
              <h2 className="font-titre text-lg font-extrabold">{site === "ebay" ? "eBay" : "Leboncoin"}</h2>
              <p className="mt-1 text-sm text-encre/60">{annonce.apercus[site].categorie}</p>
              <p className="mt-4 font-bold">{annonce.apercus[site].titre}</p>
              <div aria-hidden className="mt-2 select-none space-y-2 blur-[5px]">
                <p>Description complète adaptée au site, avec les bons mots-clés pour être trouvé.</p>
                <p>Remise en main propre possible.</p>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent px-5 pb-4 pt-16">
                <span className="text-sm font-bold">🔒 Version complète réservée aux membres</span>
              </div>
            </section>
          ))}

          <Link href="/offre" className={`mt-8 ${BOUTON_PRINCIPAL}`}>
            Débloquer Leboncoin et eBay
          </Link>
          <div className="mt-4">{choixPhoto}</div>
        </>
      )}
    </main>
  );
}
