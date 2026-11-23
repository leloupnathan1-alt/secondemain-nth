export const FORMULES = {
  unite: {
    nom: "Cette annonce",
    prix: 100,
    recurrent: false,
    prixAffiche: "1 €",
    parJour: null,
    detail: "Les versions Leboncoin et eBay de cet objet",
  },
  mensuel: {
    nom: "Mensuel",
    prix: 900,
    recurrent: true,
    prixAffiche: "9 €/mois",
    parJour: "0,30 € par jour",
    detail: "Jusqu'à 30 annonces par mois, sur les 3 sites",
  },
  revendeur: {
    nom: "Revendeur",
    prix: 1900,
    recurrent: true,
    prixAffiche: "19 €/mois",
    parJour: "0,63 € par jour",
    detail: "Annonces illimitées, sur les 3 sites",
  },
} as const;

export type Formule = keyof typeof FORMULES;

export const estFormule = (f: unknown): f is Formule => typeof f === "string" && f in FORMULES;

export const GARANTIE_JOURS = 14;

// À REMPLACER : l'adresse e-mail à laquelle les clients écrivent (remboursement, résiliation).
export const EMAIL_CONTACT = "[TON-EMAIL]";
