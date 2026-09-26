-- 비동기 대전 — 저장된 팀(스냅숏)과 겨룬 기록.
-- 쓰기는 자기 것만, 읽기는 로그인한 누구나(상대 팀을 받아 와야 하니까).

-- 감독 — auth.users 하나에 한 줄
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nick text not null check (char_length(nick) between 1 and 16),
  created_at timestamptz not null default now()
);

-- 저장된 팀 — 감독 · 모드마다 한 줄(새로 올리면 덮어쓴다)
create table if not exists public.teams (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('ranked', 'gauntlet', 'draft', 'friendly')),
  version int not null default 1,          -- payload 형식 번호
  rating int not null default 0,           -- 상대 찾기용 점수(랭크 RP 등)
  cap int,                                  -- 샐러리 캡
  ovr int,                                  -- 팀 종합
  payload jsonb not null,                   -- 엔트리 · 타순 · 작전 · 증강
  updated_at timestamptz not null default now(),
  unique (user_id, mode)
);
create index if not exists teams_mode_rating on public.teams (mode, rating);

-- 겨룬 기록 — 도전한 쪽이 올린다. 막은 쪽은 '자리 비운 사이 방어'로 읽는다
create table if not exists public.battles (
  id bigint generated always as identity primary key,
  attacker uuid not null references public.profiles (id) on delete cascade,
  defender uuid not null references public.profiles (id) on delete cascade,
  team_id bigint references public.teams (id) on delete set null,
  mode text not null,
  seed bigint not null,                     -- 같은 시드면 같은 경기(다시보기 · 검증)
  att_runs int not null,
  def_runs int not null,
  created_at timestamptz not null default now(),
  check (attacker <> defender)
);
create index if not exists battles_defender on public.battles (defender, created_at desc);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.battles enable row level security;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles own update" on public.profiles for update to authenticated using (id = (select auth.uid()));

create policy "teams read" on public.teams for select to authenticated using (true);
create policy "teams own insert" on public.teams for insert to authenticated with check (user_id = (select auth.uid()));
create policy "teams own update" on public.teams for update to authenticated using (user_id = (select auth.uid()));
create policy "teams own delete" on public.teams for delete to authenticated using (user_id = (select auth.uid()));

create policy "battles mine" on public.battles for select to authenticated
  using (attacker = (select auth.uid()) or defender = (select auth.uid()));
create policy "battles attack" on public.battles for insert to authenticated with check (attacker = (select auth.uid()));
