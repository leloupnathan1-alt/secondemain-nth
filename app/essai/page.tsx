import Link from "next/link";

export default function Essai() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12 md:max-w-xl">
      <span className="mb-6 inline-block w-fit rounded-full bg-doux px-3 py-1 font-titre text-sm font-extrabold tracking-tight text-encre">
        Très bientôt
      </span>
      <h1 className="font-titre text-3xl font-extrabold tracking-tight leading-tight text-encre">
        Ici, tu déposeras la photo d&apos;un objet.
      </h1>
      <p className="mt-4 text-lg leading-relaxed">
        Et en quelques secondes, ton annonce sera rédigée, avec un prix conseillé.
      </p>
      <Link href="/" className="mt-10 font-semibold text-encre underline underline-offset-4">
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}
