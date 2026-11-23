-- Seconde Main : schéma minimal (à coller dans Supabase > SQL Editor > Run)

create table if not exists annonces (
  id uuid primary key default gen_random_uuid(),
  contenu jsonb not null,
  acces text,                     -- session de paiement de l'abonné qui l'a créée (sinon vide)
  created_at timestamptz not null default now()
);

create table if not exists paiements (
  session_id text primary key,    -- identifiant de la session Stripe Checkout
  formule text not null check (formule in ('unite', 'mensuel', 'revendeur')),
  annonce_id uuid references annonces(id) on delete set null,
  email text,
  customer_id text,
  subscription_id text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists annonces_acces_idx on annonces (acces, created_at);
create index if not exists paiements_subscription_idx on paiements (subscription_id);

-- Sécurité : aucune lecture ni écriture possible depuis le navigateur.
-- Seul le serveur (clé secrète) peut accéder aux tables.
alter table annonces enable row level security;
alter table paiements enable row level security;
