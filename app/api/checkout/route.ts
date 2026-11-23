import { NextResponse } from "next/server";
import { stripe, stripeConfigure } from "@/lib/stripe";
import { FORMULES, estFormule } from "@/lib/formules";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  if (!stripeConfigure()) {
    return NextResponse.json({ erreur: "Le paiement arrive très bientôt." }, { status: 503 });
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  const { formule, annonce_id } = (corps ?? {}) as { formule?: unknown; annonce_id?: unknown };
  if (!estFormule(formule)) {
    return NextResponse.json({ erreur: "Formule inconnue." }, { status: 400 });
  }
  const annonceId = typeof annonce_id === "string" && UUID.test(annonce_id) ? annonce_id : "";
  if (formule === "unite" && !annonceId) {
    return NextResponse.json(
      { erreur: "Crée d'abord une annonce gratuite pour pouvoir la débloquer." },
      { status: 400 },
    );
  }

  const f = FORMULES[formule];
  const origine = new URL(req.url).origin;

  try {
    const session = await stripe<{ client_secret: string }>("checkout/sessions", {
      mode: f.recurrent ? "subscription" : "payment",
      ui_mode: "embedded",
      locale: "fr",
      return_url: `${origine}/merci?session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: f.prix,
            product_data: { name: `Seconde Main — ${f.nom}` },
            ...(f.recurrent ? { recurring: { interval: "month" } } : {}),
          },
        },
      ],
      metadata: { formule, annonce_id: annonceId },
      ...(f.recurrent ? { subscription_data: { metadata: { formule } } } : { customer_creation: "always" }),
    });
    return NextResponse.json({ clientSecret: session.client_secret, cle: process.env.STRIPE_PUBLISHABLE_KEY });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erreur: "Le paiement n'a pas pu démarrer. Réessaie dans un instant." }, { status: 502 });
  }
}
