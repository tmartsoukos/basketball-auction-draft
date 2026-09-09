-- Basketball Auction Draft — αρχικό schema
-- Όλη η λογική γράφεται αποκλειστικά από Edge Functions με service role key.
-- Οι clients έχουν μόνο δικαίωμα ανάγνωσης (RLS), ώστε κανείς να μην μπορεί
-- να πειράξει budget ή ρόστερ από τον browser.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  mode text not null check (mode in ('euroleague', 'nba', 'mixed')),
  starting_budget integer not null check (starting_budget between 10 and 50),
  increment integer not null check (increment between 1 and 10),
  total_rounds integer not null default 10,
  phase text not null default 'lobby' check (phase in ('lobby', 'auction', 'round_result', 'finished')),
  round integer not null default 0,
  pool text[] not null default '{}',
  current_player_id text,
  opener_seat smallint not null default 0 check (opener_seat in (0, 1)),
  turn_seat smallint not null default 0 check (turn_seat in (0, 1)),
  highest_bid integer not null default 0,
  highest_bidder_seat smallint check (highest_bidder_seat in (0, 1)),
  no_bid_passes smallint not null default 0,
  last_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  seat_index smallint not null check (seat_index in (0, 1)),
  nickname text not null,
  budget integer not null,
  roster text[] not null default '{}',
  is_ready boolean not null default false,
  created_at timestamptz not null default now(),
  unique (game_id, seat_index)
);

-- Ξεχωριστός πίνακας ώστε τα session tokens να μην είναι ποτέ αναγνώσιμα από τους clients.
create table if not exists public.game_sessions (
  game_id uuid not null references public.games(id) on delete cascade,
  seat_index smallint not null check (seat_index in (0, 1)),
  token text not null unique,
  created_at timestamptz not null default now(),
  primary key (game_id, seat_index)
);

create table if not exists public.game_pool (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id text not null,
  draw_order integer not null,
  status text not null default 'pending' check (status in ('pending', 'sold', 'unsold')),
  won_by_seat smallint check (won_by_seat in (0, 1)),
  price integer,
  primary key (game_id, player_id)
);

create table if not exists public.bid_events (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  round integer not null,
  seat_index smallint not null check (seat_index in (0, 1)),
  action text not null check (action in ('bid', 'pass')),
  amount integer,
  created_at timestamptz not null default now()
);

create index if not exists game_players_game_id_idx on public.game_players (game_id);
create index if not exists game_pool_game_id_idx on public.game_pool (game_id);
create index if not exists bid_events_game_id_idx on public.bid_events (game_id);
create index if not exists games_room_code_idx on public.games (room_code);

alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_pool enable row level security;
alter table public.bid_events enable row level security;

-- Ανάγνωση ελεύθερη: τα δεδομένα του δωματίου δεν είναι ευαίσθητα και τα χρειάζεται
-- το Realtime. Καμία πολιτική insert/update/delete => απαγορεύονται για anon.
create policy "games are readable" on public.games for select using (true);
create policy "game_players are readable" on public.game_players for select using (true);
create policy "game_pool is readable" on public.game_pool for select using (true);
create policy "bid_events are readable" on public.bid_events for select using (true);
-- Ο πίνακας game_sessions δεν έχει καμία πολιτική: προσβάσιμος μόνο με service role.

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.game_pool;
alter publication supabase_realtime add table public.bid_events;
