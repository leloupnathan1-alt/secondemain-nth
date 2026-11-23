export default function Accueil() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <span className="mb-6 inline-block w-fit -rotate-2 rounded-sm border-2 border-dashed border-sapin px-3 py-1 font-titre text-sm font-semibold text-sapin">
        Bientôt ici
      </span>
      <h1 className="font-titre text-4xl font-semibold leading-tight text-sapin">
        Ton placard vaut de l&apos;argent.
      </h1>
      <p className="mt-4 text-lg leading-relaxed">
        Une photo, et ton annonce est prête pour Vinted, Leboncoin et eBay.
      </p>
      <p className="mt-10 text-sm text-encre/60">Seconde Main — en construction.</p>
    </main>
  );
}
