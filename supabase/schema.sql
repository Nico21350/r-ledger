-- Schéma R Ledger.
-- À coller dans Supabase → SQL Editor → Run. Peut être relancé sans erreur.

-- Une ligne par page de la base Notion.
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  notion_page_id text not null unique,          -- sert à reconnaître un trade déjà importé
  instrument text,
  direction text,                               -- BUY / SELL
  traded_at timestamptz,                        -- "Date + NY time", en UTC
  has_time boolean not null default false,      -- false si la date Notion n'a pas d'heure
  day text,
  ny_hour text,
  htf_range_tf text,
  ltf_retracement_tf text,
  fvg_against boolean not null default false,
  sl_placement text,
  tp text,
  notion_result text,                           -- "Result" tel qu'écrit dans Notion
  rr_closed numeric,
  achievable_rr_text text,                      -- "Achievable RR" tel qu'écrit dans Notion
  be_effect text,
  emotions text,
  narrative text,
  review text,                                  -- texte écrit dans le corps de la page
  notion_last_edited_at timestamptz,
  synced_at timestamptz not null default now(),

  -- Champs calculés automatiquement par la base, jamais écrits à la main.
  outcome text generated always as (
    case
      when rr_closed > 0 then 'win'
      when rr_closed < 0 then 'loss'
      when rr_closed = 0 then 'be'
    end
  ) stored,
  taken boolean generated always as (
    coalesce(notion_result, '') <> 'Not taken - data'
  ) stored,
  achievable_rr numeric generated always as (
    case
      when replace(trim(achievable_rr_text), ',', '.') ~ '^-?[0-9]+(\.[0-9]+)?$'
        then replace(trim(achievable_rr_text), ',', '.')::numeric
    end
  ) stored
);

create index if not exists trades_traded_at_idx on public.trades (traded_at);

-- Une ligne par capture, rangée dans le Storage "captures".
create table if not exists public.trade_images (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  notion_block_id text not null unique,         -- sert à ne pas retélécharger une capture
  storage_path text not null,
  position int not null default 0,              -- ordre d'apparition dans la page
  created_at timestamptz not null default now()
);

create index if not exists trade_images_trade_id_idx on public.trade_images (trade_id);

-- Sécurité : lecture seule pour l'utilisateur connecté, rien pour les visiteurs.
-- L'écriture passe uniquement par la fonction de synchronisation (clé secrète).
alter table public.trades enable row level security;
alter table public.trade_images enable row level security;

revoke all on public.trades, public.trade_images from anon;
grant select on public.trades, public.trade_images to authenticated;

drop policy if exists "Lecture connecté" on public.trades;
create policy "Lecture connecté" on public.trades
  for select to authenticated using (true);

drop policy if exists "Lecture connecté" on public.trade_images;
create policy "Lecture connecté" on public.trade_images
  for select to authenticated using (true);

-- Storage privé pour les captures.
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

drop policy if exists "Lecture captures connecté" on storage.objects;
create policy "Lecture captures connecté" on storage.objects
  for select to authenticated using (bucket_id = 'captures');

-- Visite automatique (GitHub Actions, .github/workflows/supabase-keepalive.yml) :
-- évite la mise en pause du projet gratuit. Renvoie seulement l'heure, ne lit aucune table.
create or replace function public.ping()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function public.ping() to anon, authenticated;
