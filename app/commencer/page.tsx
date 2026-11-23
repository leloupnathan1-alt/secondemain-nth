"use client";

import Link from "next/link";
import { useState } from "react";

type Option = { label: string; valeur: number };
type Question = { id: "objets" | "minutes" | "sites"; titre: string; aide: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    id: "objets",
    titre: "Combien d'objets dorment chez toi, que tu pourrais vendre ?",
    aide: "Vêtements trop petits, déco, jouets, électronique… Compte large.",
    options: [
      { label: "1 à 5", valeur: 3 },
      { label: "6 à 15", valeur: 10 },
      { label: "16 à 40", valeur: 25 },
      { label: "Plus de 40", valeur: 50 },
    ],
  },
  {
    id: "minutes",
    titre: "Combien de temps te prend une annonce, de la photo à la publication ?",
    aide: "Photos, titre, description, prix, catégorie… tout compris.",
    options: [
      { label: "Environ 10 minutes", valeur: 10 },
      { label: "Environ 20 minutes", valeur: 20 },
      { label: "30 minutes ou plus", valeur: 30 },
      { label: "Je ne sais pas : j'abandonne avant", valeur: 20 },
    ],
  },
  {
    id: "sites",
    titre: "Sur combien de sites publies-tu tes annonces ?",
    aide: "Plus de sites, c'est plus d'acheteurs… mais autant d'annonces à refaire.",
    options: [
      { label: "Aucun pour l'instant", valeur: 0 },
      { label: "Un seul", valeur: 1 },
      { label: "Deux", valeur: 2 },
      { label: "Trois ou plus", valeur: 3 },
    ],
  },
];

const PRIX_MOYEN = 15; // € par objet, hypothèse affichée à l'utilisateur
const MINUTES_AVEC_NOUS = 3; // par objet, pour les 3 sites

type Reponses = Partial<Record<Question["id"], number>>;

const euros = (n: number) => n.toLocaleString("fr-FR") + " €";

function heures(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = Math.round((minutes / 60) * 2) / 2;
  return `${h.toLocaleString("fr-FR")} h`;
}

export default function Commencer() {
  const [etape, setEtape] = useState(0);
  const [reponses, setReponses] = useState<Reponses>({});
  const [labels, setLabels] = useState<Partial<Record<Question["id"], string>>>({});

  function choisir(q: Question, o: Option) {
    const r = { ...reponses, [q.id]: o.valeur };
    const l = { ...labels, [q.id]: o.label };
    setReponses(r);
    setLabels(l);
    if (etape === QUESTIONS.length - 1) {
      try {
        localStorage.setItem("sm_quiz", JSON.stringify({ reponses: r, labels: l }));
      } catch {
        /* stockage indisponible : sans conséquence */
      }
    }
    setEtape(etape + 1);
    window.scrollTo({ top: 0 });
  }

  if (etape >= QUESTIONS.length) {
    return <Resultat reponses={reponses} labels={labels} onRecommencer={() => setEtape(0)} />;
  }

  const q = QUESTIONS[etape];
  const progression = ((etape + 1) / QUESTIONS.length) * 100;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-6 md:max-w-xl">
      <div className="flex items-center justify-between text-sm">
        {etape > 0 ? (
          <button onClick={() => setEtape(etape - 1)} className="py-2 pr-4 font-semibold text-encre">
            ← Retour
          </button>
        ) : (
          <Link href="/" className="py-2 pr-4 font-semibold text-encre">
            ← Accueil
          </Link>
        )}
        <span className="text-encre/60">
          Question {etape + 1} sur {QUESTIONS.length}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-encre/10" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progression}%` }} />
      </div>

      <h1 className="mt-10 font-titre text-3xl font-extrabold tracking-tight leading-tight text-encre">{q.titre}</h1>
      <p className="mt-3 leading-relaxed text-encre/70">{q.aide}</p>

      <div className="mt-auto space-y-3 pt-10">
        {q.options.map((o) => (
          <button
            key={o.label}
            onClick={() => choisir(q, o)}
            className={`block w-full rounded-xl border-2 px-5 py-4 text-left text-lg font-semibold transition active:scale-[0.99] ${
              labels[q.id] === o.label
                ? "border-accent bg-accent/10 text-encre"
                : "border-encre/15 bg-white text-encre"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </main>
  );
}

function Resultat({
  reponses,
  labels,
  onRecommencer,
}: {
  reponses: Reponses;
  labels: Partial<Record<Question["id"], string>>;
  onRecommencer: () => void;
}) {
  const objets = reponses.objets ?? 10;
  const minutes = reponses.minutes ?? 20;
  const sites = reponses.sites ?? 1;

  const valeur = objets * PRIX_MOYEN;
  const tempsAujourdhui = objets * minutes * 3;
  const tempsAvecNous = objets * MINUTES_AVEC_NOUS;
  const abandonne = labels.minutes?.startsWith("Je ne sais pas");

  let phraseSites: string;
  if (sites === 0) phraseSites = "Aujourd'hui, tu ne publies nulle part : tes objets n'ont aucun acheteur.";
  else if (sites < 3)
    phraseSites = `Aujourd'hui, tu publies sur ${sites === 1 ? "un seul site" : "deux sites"} : tu passes à côté des acheteurs ${sites === 1 ? "des deux autres" : "du troisième"}.`;
  else phraseSites = "Tu publies déjà partout : tu sais ce que ça coûte en temps.";

  return (
    <main className="mx-auto max-w-md px-6 pb-36 pt-8 md:max-w-xl">
      <p className="text-sm font-bold uppercase tracking-wider text-accent-fonce">Ton résultat</p>
      <h1 className="mt-3 font-titre text-3xl font-extrabold tracking-tight leading-tight text-encre">
        Tu as environ {euros(valeur)} qui dorment dans tes placards.
      </h1>
      <p className="mt-4 leading-relaxed">
        Tu nous as dit avoir <strong>{labels.objets?.toLowerCase()} objets</strong> à vendre. À {PRIX_MOYEN} € en
        moyenne par objet, ça fait <strong>{euros(valeur)}</strong>.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-encre/10 p-4">
          <p className="text-sm text-encre/60">Aujourd&apos;hui</p>
          <p className="mt-1 font-titre text-3xl font-extrabold tracking-tight text-encre">{heures(tempsAujourdhui)}</p>
          <p className="mt-1 text-sm leading-snug text-encre/70">pour tout publier sur 3 sites</p>
        </div>
        <div className="rounded-2xl bg-accent p-4 text-encre">
          <p className="text-sm text-encre/70">Avec Seconde Main</p>
          <p className="mt-1 font-titre text-3xl font-extrabold tracking-tight">{heures(tempsAvecNous)}</p>
          <p className="mt-1 text-sm leading-snug text-encre/70">pour les mêmes annonces</p>
        </div>
      </div>

      <ul className="mt-8 space-y-3 leading-relaxed">
        <li>
          • {abandonne ? "Tu abandonnes avant de finir une annonce" : `Une annonce te prend ${labels.minutes?.toLowerCase()}`}
          {" "}: on rédige à ta place, tu n&apos;as plus qu&apos;à relire.
        </li>
        <li>• {phraseSites}</li>
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-encre/50">
        Estimation : {PRIX_MOYEN} € par objet en moyenne et 3 minutes par objet avec Seconde Main. Tes chiffres réels
        dépendent de tes objets.
      </p>

      <button onClick={onRecommencer} className="mt-6 text-sm font-semibold text-encre underline underline-offset-4">
        Modifier mes réponses
      </button>

      <div className="fixed inset-x-0 bottom-0 border-t border-encre/10 bg-white/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md md:max-w-xl">
          <Link
            href="/essai"
            className="block w-full rounded-xl bg-accent py-4 text-center text-lg font-bold text-encre shadow-[0_3px_0_#00855a] active:translate-y-[2px] active:shadow-none"
          >
            Essayer gratuitement sur un objet
          </Link>
          <p className="mt-2 text-center text-sm text-encre/60">Une photo suffit, sans inscription</p>
        </div>
      </div>
    </main>
  );
}
