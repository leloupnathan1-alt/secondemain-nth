import Link from "next/link";

export default function Essai() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12 md:max-w-xl">
      <span className="mb-6 inline-block w-fit -rotate-2 rounded-sm border-2 border-dashed border-sapin px-3 py-1 font-titre text-sm font-semibold text-sapin">
        Très bientôt
      </span>
      <h1 className="font-titre text-3xl font-semibold leading-tight text-sapin">
        Ici, tu déposeras la photo d&apos;un objet.
      </h1>
      <p className="mt-4 text-lg leading-relaxed">
        Et en quelques secondes, ton annonce sera rédigée, avec un prix conseillé.
      </p>
      <Link href="/" className="mt-10 font-semibold text-sapin underline underline-offset-4">
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}
