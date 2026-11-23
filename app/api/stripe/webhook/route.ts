import { NextResponse } from "next/server";
import { signatureValide } from "@/lib/stripe";
import { modifier, upsert } from "@/lib/supabase";
import { estFormule } from "@/lib/formules";

export const runtime = "nodejs";

// Seule source de vérité pour les paiements : Stripe nous prévient ici, signature vérifiée.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ erreur: "Webhook non configuré" }, { status: 500 });

  const corps = await req.text();
  if (!signatureValide(corps, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 400 });
  }

  const evenement = JSON.parse(corps) as { type: string; data: { object: Record<string, unknown> } };
  const objet = evenement.data.object;

  try {
    if (
      evenement.type === "checkout.session.completed" ||
      evenement.type === "checkout.session.async_payment_succeeded"
    ) {
      if (objet.payment_status !== "paid") return NextResponse.json({ recu: true });
      const meta = (objet.metadata ?? {}) as Record<string, string>;
      const details = (objet.customer_details ?? {}) as { email?: string };
      await upsert("paiements", {
        session_id: objet.id,
        formule: estFormule(meta.formule) ? meta.formule : "unite",
        annonce_id: meta.annonce_id || null,
        email: details.email ?? null,
        customer_id: typeof objet.customer === "string" ? objet.customer : null,
        subscription_id: typeof objet.subscription === "string" ? objet.subscription : null,
        actif: true,
      });
    }

    if (evenement.type === "customer.subscription.deleted" && typeof objet.id === "string") {
      await modifier("paiements", `subscription_id=eq.${encodeURIComponent(objet.id)}`, { actif: false });
    }
  } catch (e) {
    console.error(e);
    // Stripe renverra l'événement plus tard.
    return NextResponse.json({ erreur: "Enregistrement impossible" }, { status: 500 });
  }

  return NextResponse.json({ recu: true });
}
