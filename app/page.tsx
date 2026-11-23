import Link from "next/link";

const benefices = [
  {
    titre: "Le texte s'écrit tout seul",
    texte: "Tu prends la photo, on rédige le titre et la description. Tu relis, c'est tout.",
  },
  {
    titre: "Le bon prix, du premier coup",
    texte: "Un prix conseillé pour vendre vite, sans brader ton objet.",
  },
  {
    titre: "Trois sites, un seul effort",
    texte: "Une version adaptée à Vinted, Leboncoin et eBay, prête à coller en un geste.",
  },
];

export default function Accueil() {
  return (
    <main className="mx-auto max-w-md px-6 pb-36 pt-8 md:max-w-xl">
      <p className="font-titre text-xl font-extrabold tracking-tight text-encre">Seconde Main<span className="text-accent">.</span></p>

      <h1 className="mt-10 font-titre text-[2.5rem] font-extrabold tracking-tight leading-[1.1] text-encre">
        Une photo.
        <br />
        Ton annonce prête pour tous les sites.
      </h1>
      <p className="mt-5 text-lg leading-relaxed">
        Arrête de rédiger trois fois la même annonce. Tu photographies, on écrit, tu publies sur Vinted,
        Leboncoin et eBay.
      </p>

      <div className="mt-10 rounded-2xl bg-doux p-5">
        <p className="text-sm font-bold uppercase tracking-wider text-accent-fonce">Le calcul qui fait mal</p>
        <p className="mt-2 font-titre text-2xl font-extrabold tracking-tight leading-snug text-encre">
          1 annonce ≈ 15 min.
          <br />× 3 sites = 45 min par objet.
        </p>
        <p className="mt-2 leading-relaxed">
          Alors l&apos;objet retourne au placard, et l&apos;argent reste dedans.
        </p>
      </div>

      <ol className="mt-12 space-y-7">
        {benefices.map((b, i) => (
          <li key={b.titre} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-titre text-lg font-bold text-encre">
              {i + 1}
            </span>
            <div>
              <h2 className="font-titre text-xl font-extrabold tracking-tight text-encre">{b.titre}</h2>
              <p className="mt-1 leading-relaxed">{b.texte}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="fixed inset-x-0 bottom-0 border-t border-encre/10 bg-white/95 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md md:max-w-xl">
          <Link
            href="/commencer"
            className="block w-full rounded-xl bg-accent py-4 text-center text-lg font-bold text-encre shadow-[0_3px_0_#00855a] active:translate-y-[2px] active:shadow-none"
          >
            Commencer, c&apos;est gratuit
          </Link>
          <p className="mt-2 text-center text-sm text-encre/60">3 questions, 1 minute, sans inscription</p>
        </div>
      </div>
    </main>
  );
}
