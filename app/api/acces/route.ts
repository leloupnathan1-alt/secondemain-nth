import { NextResponse } from "next/server";
import { lire, supabaseConfigure, type Paiement } from "@/lib/supabase";

export const runtime = "nodejs";

// Après le paiement : on ne fait confiance qu'au paiement enregistré par le webhook.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id) || !supabaseConfigure()) {
    return NextResponse.json({ statut: "inconnu" }, { status: 400 });
  }

  try {
    const [paiement] = await lire<Paiement>("paiements", `session_id=eq.${id}&select=*`);
    if (!paiement) return NextResponse.json({ statut: "attente" });
    if (!paiement.actif) return NextResponse.json({ statut: "inactif" });

    let annonce: unknown = null;
    if (paiement.annonce_id) {
      const [ligne] = await lire<{ contenu: unknown }>(
        "annonces",
        `id=eq.${paiement.annonce_id}&select=contenu`,
      );
      annonce = ligne?.contenu ?? null;
    }

    const rep = NextResponse.json({ statut: "ok", formule: paiement.formule, annonce });
    if (paiement.formule !== "unite") {
      rep.cookies.set("sm_acces", id, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return rep;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ statut: "attente" });
  }
}
