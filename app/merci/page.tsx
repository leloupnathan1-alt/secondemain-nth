"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CarteVersion, { type Version } from "@/app/components/CarteVersion";
import { EMAIL_CONTACT } from "@/lib/formules";

type Contenu = {
  objet: string;
  prix_conseille: number;
  vinted: Version;
  leboncoin: Version;
  ebay: Version;
};
type Reponse = { statut: string; formule?: string; annonce?: Contenu | null };

export default function Merci() {
  const [etat, setEtat] = useState<"attente" | "ok" | "long" | "erreur">("attente");
  const [donnees, setDonnees] = useState<Reponse | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) {
      setEtat("erreur");
      return;
    }
    let essais = 0;
    let arret = false;
    const verifier = async () => {
      if (arret) return;
      essais++;
      try {
        const rep = await fetch(`/api/acces?session_id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const json = (await rep.json()) as Reponse;
        if (json.statut === "ok") {
          setDonnees(json);
          setEtat("ok");
          return;
        }
      } catch {
        /* on réessaie */
      }
      if (essais >= 20) setEtat("long");
      else setTimeout(verifier, 2000);
    };
    verifier();
    return () => {
      arret = true;
    };
  }, []);

  if (etat === "attente") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-encre/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
        </div>
        <p className="mt-4 font-titre text-xl font-extrabold">On confirme ton paiement…</p>
      </main>
    );
  }

  if (etat === "long" || etat === "erreur") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <h1 className="font-titre text-3xl font-extrabold leading-tight tracking-tight">
          Ton paiement est en cours de confirmation.
        </h1>
        <p className="mt-4 text-lg leading-relaxed">
          Ça prend parfois quelques minutes. Recharge cette page dans un instant. Si rien ne change, écris-nous à{" "}
          <strong>{EMAIL_CONTACT}</strong> : on règle ça rapidement.
        </p>
        <Link href="/" className="mt-8 font-semibold underline underline-offset-4">
          ← Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const annonce = donnees?.annonce;
  const abonne = donnees?.formule && donnees.formule !== "unite";

  return (
    <main className="mx-auto max-w-md px-6 pb-16 pt-8 md:max-w-xl">
      <p className="text-sm font-bold uppercase tracking-wider text-accent-fonce">Paiement confirmé ✓</p>
      <h1 className="mt-3 font-titre text-3xl font-extrabold leading-tight tracking-tight">
        {annonce ? "Ton annonce complète est là." : "Ton accès est activé."}
      </h1>
      {abonne && (
        <p className="mt-3 leading-relaxed text-encre/80">
          Sur ce téléphone, chaque nouvelle annonce arrive maintenant complète, pour les 3 sites.
        </p>
      )}

      {annonce && (
        <>
          <CarteVersion site="vinted" version={annonce.vinted} prix={annonce.prix_conseille} />
          <CarteVersion site="leboncoin" version={annonce.leboncoin} prix={annonce.prix_conseille} />
          <CarteVersion site="ebay" version={annonce.ebay} prix={annonce.prix_conseille} />
        </>
      )}

      <Link
        href="/essai"
        className="mt-8 block w-full rounded-xl bg-accent py-4 text-center text-lg font-bold text-encre shadow-[0_3px_0_#00855a]"
      >
        Créer une autre annonce
      </Link>
    </main>
  );
}
