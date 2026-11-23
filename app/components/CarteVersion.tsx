"use client";

import { useState } from "react";

export type Version = { titre: string; description: string; categorie: string };

const LIENS = {
  vinted: { nom: "Vinted", url: "https://www.vinted.fr/items/new" },
  leboncoin: { nom: "Leboncoin", url: "https://www.leboncoin.fr/deposer-une-annonce" },
  ebay: { nom: "eBay", url: "https://www.ebay.fr/sl/sell" },
} as const;

export type Site = keyof typeof LIENS;

export default function CarteVersion({
  site,
  version,
  prix,
  badge,
}: {
  site: Site;
  version: Version;
  prix: number;
  badge?: string;
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(`${version.titre}\n\n${version.description}\n\nPrix : ${prix} €`);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-encre/10 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-titre text-lg font-extrabold">{LIENS[site].nom}</h2>
        {badge && (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-fonce">{badge}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-encre/60">{version.categorie}</p>
      <p className="mt-4 font-bold">{version.titre}</p>
      <p className="mt-2 whitespace-pre-line leading-relaxed">{version.description}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={copier} className="rounded-xl border-2 border-encre py-3 font-bold active:scale-[0.99]">
          {copie ? "Copié ✓" : "Copier"}
        </button>
        <a
          href={LIENS[site].url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-encre py-3 text-center font-bold text-white"
        >
          Ouvrir {LIENS[site].nom}
        </a>
      </div>
    </section>
  );
}
