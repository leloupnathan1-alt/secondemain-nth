import Link from "next/link";

export default function Offre() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12 md:max-w-xl">
      <span className="mb-6 inline-block w-fit rounded-full bg-doux px-3 py-1 text-sm font-bold">Très bientôt</span>
      <h1 className="font-titre text-3xl font-extrabold leading-tight tracking-tight">
        Les formules arrivent dans quelques jours.
      </h1>
      <p className="mt-4 text-lg leading-relaxed">
        En attendant, ton annonce Vinted est à toi : copie-la et publie-la.
      </p>
      <Link href="/essai" className="mt-10 font-semibold underline underline-offset-4">
        ← Essayer avec un autre objet
      </Link>
    </main>
  );
}
