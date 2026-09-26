-- 아이디 · 비밀번호 가입과 진행 저장.
-- 비밀번호는 Supabase Auth(auth.users)만 가진다 — 이 표들엔 없다.

-- 감독: 로그인 아이디 · 감독 이름 (둘 다 겹침 없음, 대소문자 무시)
alter table public.profiles add column if not exists login_id text;
alter table public.profiles drop constraint if exists profiles_nick_check;
alter table public.profiles add constraint profiles_nick_len check (char_length(nick) between 2 and 12);
alter table public.profiles add constraint profiles_login_fmt check (login_id is null or login_id ~ '^[a-z0-9_]{4,16}$');
create unique index if not exists profiles_login_uq on public.profiles (login_id);
create unique index if not exists profiles_nick_uq on public.profiles (lower(nick));

-- 감독 줄은 가입 트리거만 만든다 · 바꿀 수 있는 건 감독 이름뿐
drop policy if exists "profiles own insert" on public.profiles;
revoke insert, update on public.profiles from authenticated;
grant update (nick) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lid text := lower(new.raw_user_meta_data ->> 'login_id');
  nk text := btrim(new.raw_user_meta_data ->> 'nick');
begin
  if new.is_anonymous then return new; end if;
  if lid is null or lid !~ '^[a-z0-9_]{4,16}$' then raise exception 'login_id_invalid'; end if;
  if nk is null or char_length(nk) not between 2 and 12 then raise exception 'nick_invalid'; end if;
  insert into public.profiles (id, login_id, nick) values (new.id, lid, nk);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 가입 전 겹침 확인 — 로그인 전에도 부를 수 있다. 겹치는지 여부만 돌려준다
create or replace function public.account_free(p_login text, p_nick text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'login', not exists (select 1 from public.profiles where login_id = lower(p_login)),
    'nick',  not exists (select 1 from public.profiles where lower(nick) = lower(btrim(p_nick))));
$$;
revoke execute on function public.account_free(text, text) from public;
grant execute on function public.account_free(text, text) to anon, authenticated;

-- 진행 저장: 계정당 한 줄. rev 는 올릴 때마다 1씩 — 다른 기기와 엇갈렸는지 가린다
create table if not exists public.saves (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rev bigint not null default 1,
  data jsonb not null check (octet_length(data::text) < 2000000),
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
create policy "saves own read" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "saves own insert" on public.saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saves own update" on public.saves for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.saves to authenticated;

-- 올리기: 내가 받은 번호(p_base)가 서버 번호와 같을 때만 덮어쓴다.
-- 돌려주는 값 = 새 번호(성공) · 음수면 -(서버 번호)(다른 기기가 먼저 저장함)
create or replace function public.push_save(p_base bigint, p_data jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cur bigint;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  update public.saves set data = p_data, rev = rev + 1, updated_at = now()
    where user_id = uid and rev = p_base returning rev into cur;
  if found then return cur; end if;
  select rev into cur from public.saves where user_id = uid;
  if cur is null then
    insert into public.saves (user_id, rev, data) values (uid, 1, p_data);
    return 1;
  end if;
  return -cur;
end $$;
revoke execute on function public.push_save(bigint, jsonb) from public, anon;
grant execute on function public.push_save(bigint, jsonb) to authenticated;
