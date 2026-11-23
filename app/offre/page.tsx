"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EMAIL_CONTACT, FORMULES, GARANTIE_JOURS, type Formule } from "@/lib/formules";

type StripeEmbarque = { mount: (selecteur: string) => void; destroy: () => void };
type StripeInstance = {
  initEmbeddedCheckout: (o: { fetchClientSecret: () => Promise<string> }) => Promise<StripeEmbarque>;
};
declare global {
  interface Window {
    Stripe?: (cle: string) => StripeInstance;
  }
}

function chargerStripe(): Promise<NonNullable<Window["Stripe"]>> {
  return new Promise((ok, ko) => {
    if (window.Stripe) return ok(window.Stripe);
    const existant = document.querySelector<HTMLScriptElement>("script[data-stripe]");
    const script = existant ?? document.createElement("script");
    script.addEventListener("load", () => (window.Stripe ? ok(window.Stripe) : ko(new Error("Stripe absent"))));
    script.addEventListener("error", () => ko(new Error("Le paiement n'a pas pu se charger. Vérifie ta connexion.")));
    if (!existant) {
      script.src = "https://js.stripe.com/v3/";
      script.dataset.stripe = "1";
      document.head.appendChild(script);
    }
  });
}

const QUESTIONS_FREQUENTES = [
  {
    q: "Est-ce que ça marche pour mes objets ?",
    r: "Vêtements, jeux, livres, déco, électronique, jouets… Si l'objet est reconnaissable sur la photo, l'annonce est rédigée. Tu viens d'ailleurs de le tester gratuitement sur le tien.",
  },
  {
    q: "Combien de temps ça me prend ?",
    r: "Environ 3 minutes par objet pour les trois sites : une photo, une relecture, puis copier-coller sur chaque site.",
  },
  {
    q: "Et si je veux arrêter ?",
    r: `Les abonnements sont sans engagement : un e-mail à ${EMAIL_CONTACT} suffit pour résilier, et tu ne seras plus prélevé le mois suivant. La formule à 1 € est un paiement unique, sans abonnement.`,
  },
  {
    q: "À quoi sert exactement ce que je paie ?",
    r: "À débloquer les versions Leboncoin et eBay de tes annonces (titres, descriptions et catégories adaptés à chaque site), avec le prix conseillé vérifié en ligne. Avec un abonnement, chaque nouvelle annonce arrive déjà complète.",
  },
];

type Quiz = { reponses?: { objets?: number } };
type DerniereAnnonce = { id: string | null; objet: string; prix: number };

export default function Offre() {
  const [formule, setFormule] = useState<Formule>("mensuel");
  const [annonceId, setAnnonceId] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const [derniere, setDerniere] = useState<DerniereAnnonce | null>(null);
  const [objets, setObjets] = useState<number | null>(null);
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("annonce");
    setAnnonceId(id);
    try {
      const q = JSON.parse(localStorage.getItem("sm_quiz") ?? "null") as Quiz | null;
      if (q?.reponses?.objets) setObjets(q.reponses.objets);
      const a = JSON.parse(sessionStorage.getItem("sm_annonce") ?? "null") as DerniereAnnonce | null;
      if (a && (!id || a.id === id)) setDerniere(a);
    } catch {
      /* sans conséquence */
    }
    setPret(true);
  }, []);

  useEffect(() => {
    if (!pret) return;
    let annule = false;
    let instance: StripeEmbarque | null = null;
    setEtat("chargement");
    setErreur("");

    (async () => {
      if (formule === "unite" && !annonceId) {
        throw new Error("Pour cette formule, crée d'abord ton annonce gratuite.");
      }
      const rep = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formule, annonce_id: annonceId }),
      });
      const json = (await rep.json().catch(() => ({}))) as { clientSecret?: string; cle?: string; erreur?: string };
      if (!rep.ok || !json.clientSecret || !json.cle) throw new Error(json.erreur ?? "Le paiement n'a pas pu démarrer.");
      const StripeFn = await chargerStripe();
      const secret = json.clientSecret;
      const embarque = await StripeFn(json.cle).initEmbeddedCheckout({ fetchClientSecret: async () => secret });
      if (annule) {
        embarque.destroy();
        return;
      }
      instance = embarque;
      embarque.mount("#paiement");
      setEtat("pret");
    })().catch((e: unknown) => {
      if (annule) return;
      setErreur(e instanceof Error ? e.message : "Le paiement n'a pas pu démarrer.");
      setEtat("erreur");
    });

    return () => {
      annule = true;
      instance?.destroy();
    };
  }, [formule, annonceId, pret]);

  const valeur = objets ? objets * 15 : null;
  const prixAnnonce = derniere?.prix ?? null;
  const f = FORMULES[formule];

  return (
    <main className="mx-auto max-w-md px-6 pb-16 pt-6 md:max-w-xl">
      <Link href="/essai" className="py-2 pr-4 text-sm font-semibold">
        ← Retour
      </Link>

      {/* 1. Ce qui a déjà été fait */}
      <h1 className="mt-6 font-titre text-3xl font-extrabold leading-tight tracking-tight">
        Voilà ton annonce, prête.
      </h1>
      <p className="mt-2 text-lg leading-relaxed text-encre/80">
        {derniere?.objet ? <>« {derniere.objet} » : </> : null}
        la version Vinted est à toi. Garde aussi celles pour Leboncoin et eBay.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-accent-fonce">Vinted ✓</span>
        <span className="rounded-full bg-encre/5 px-3 py-1">Leboncoin 🔒</span>
        <span className="rounded-full bg-encre/5 px-3 py-1">eBay 🔒</span>
      </div>
      <p className="mt-4 rounded-xl bg-doux px-4 py-3 text-sm font-semibold">
        ✓ Satisfait ou remboursé pendant {GARANTIE_JOURS} jours, sur simple e-mail.
      </p>

      {/* 2. Ce que ça rapporte, comparé au prix */}
      <section className="mt-8 rounded-2xl border border-encre/10 p-5">
        {prixAnnonce ? (
          <p className="leading-relaxed">
            Ton objet vaut environ <strong className="font-titre text-2xl">{prixAnnonce} €</strong>.
            {valeur ? (
              <>
                {" "}
                Et tes placards, environ <strong>{valeur} €</strong>.
              </>
            ) : null}
          </p>
        ) : valeur ? (
          <p className="leading-relaxed">
            Tes objets valent environ <strong className="font-titre text-2xl">{valeur} €</strong>.
          </p>
        ) : (
          <p className="leading-relaxed">Une seule vente rembourse largement ton mois.</p>
        )}
        <p className="mt-2 leading-relaxed text-encre/70">
          Seconde Main, c&apos;est <strong className="text-encre">{f.prixAffiche}</strong>
          {f.parJour ? <> (soit {f.parJour})</> : null}. Publié sur 3 sites au lieu d&apos;un, ton objet est vu par
          bien plus d&apos;acheteurs.
        </p>
      </section>

      {/* 3. Les formules */}
      <h2 className="mt-10 font-titre text-xl font-extrabold">Choisis ta formule</h2>
      <div className="mt-4 space-y-3" role="radiogroup" aria-label="Formules">
        {(Object.keys(FORMULES) as Formule[]).map((cle) => {
          const x = FORMULES[cle];
          const choisie = formule === cle;
          return (
            <button
              key={cle}
              role="radio"
              aria-checked={choisie}
              onClick={() => setFormule(cle)}
              className={`relative block w-full rounded-2xl border-2 p-4 text-left transition ${
                choisie ? "border-accent bg-accent/10" : "border-encre/15 bg-white"
              }`}
            >
              {cle === "mensuel" && (
                <span className="absolute -top-3 right-4 rounded-full bg-accent px-3 py-0.5 text-xs font-bold">
                  Recommandé
                </span>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-titre text-lg font-extrabold">{x.nom}</span>
                <span className="font-titre text-lg font-extrabold">{x.prixAffiche}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 text-sm text-encre/70">
                <span>{x.detail}</span>
                {x.parJour && <span className="shrink-0">{x.parJour}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. La garantie */}
      <section className="mt-8 rounded-2xl bg-doux p-5">
        <h2 className="font-bold">Satisfait ou remboursé, {GARANTIE_JOURS} jours</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Si Seconde Main ne te convient pas, écris à <strong>{EMAIL_CONTACT}</strong> dans les {GARANTIE_JOURS}{" "}
          jours qui suivent ton paiement. Pas de justification à donner : tu es remboursé sur ta carte sous 5 jours
          ouvrés.
        </p>
      </section>

      {/* 5 et 6. Le paiement, sur le même écran */}
      <section className="mt-8">
        <p className="text-center text-sm font-bold">
          {f.recurrent ? "Sans engagement, résiliable à tout moment" : "Paiement unique, sans abonnement"}
        </p>
        <div className="mt-3 min-h-40 rounded-2xl border border-encre/10 p-2">
          {etat === "chargement" && <p className="p-6 text-center text-encre/60">Chargement du paiement sécurisé…</p>}
          {etat === "erreur" && (
            <div role="alert" className="p-6 text-center">
              <p>{erreur}</p>
              {formule === "unite" && !annonceId && (
                <Link href="/essai" className="mt-3 block font-bold underline underline-offset-4">
                  Créer mon annonce gratuite
                </Link>
              )}
            </div>
          )}
          <div id="paiement" />
        </div>
        <p className="mt-3 text-center text-xs text-encre/50">
          Paiement sécurisé par Stripe. Ta carte ne nous est jamais transmise.
        </p>
      </section>

      {/* 7. Questions fréquentes */}
      <h2 className="mt-12 font-titre text-xl font-extrabold">Questions fréquentes</h2>
      <div className="mt-4 divide-y divide-encre/10 border-y border-encre/10">
        {QUESTIONS_FREQUENTES.map(({ q, r }) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {q}
              <span className="text-accent-fonce transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 leading-relaxed text-encre/80">{r}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
