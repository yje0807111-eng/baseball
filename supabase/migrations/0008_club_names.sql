-- 구단 이름도 겹치지 않게.
-- 따로 지은 구단 이름만 서버에 둔다(비우면 감독 이름을 따라감 → null).
-- 따라가는 구단 이름 = 감독 이름이라, 감독 이름 · 구단 이름은 서로도 겹치지 않아야 한다(names_free 가 둘 다 본다).

alter table public.profiles add column if not exists club text;
alter table public.profiles drop constraint if exists profiles_club_len;
alter table public.profiles add constraint profiles_club_len check (club is null or char_length(club) between 1 and 12);

-- 이미 있는 계정: 저장(saves)에 박힌 구단 이름을 옮긴다. 같은 이름이 여럿이면 먼저 저장한 한 명만
update public.profiles p set club = x.name
from (
  select distinct on (lower(btrim(s.data -> 'team' ->> 'name'))) s.user_id, btrim(s.data -> 'team' ->> 'name') as name
  from public.saves s join public.profiles q on q.id = s.user_id
  where coalesce(btrim(s.data -> 'team' ->> 'name'), '') <> ''
    and char_length(btrim(s.data -> 'team' ->> 'name')) <= 12
    and lower(btrim(s.data -> 'team' ->> 'name')) <> lower(q.nick)
  order by lower(btrim(s.data -> 'team' ->> 'name')), s.updated_at
) x
where p.id = x.user_id and p.club is null;

create unique index if not exists profiles_club_uq on public.profiles (lower(club));
grant update (nick, club) on public.profiles to authenticated;

-- 가입 트리거 — 구단 이름(선택)도 함께
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lid text := lower(new.raw_user_meta_data ->> 'login_id');
  nk text := btrim(new.raw_user_meta_data ->> 'nick');
  cl text := nullif(btrim(new.raw_user_meta_data ->> 'club'), '');
begin
  if new.is_anonymous then return new; end if;
  if lid is null or lid !~ '^[a-z0-9_]{4,16}$' then raise exception 'login_id_invalid'; end if;
  if nk is null or char_length(nk) not between 2 and 12 then raise exception 'nick_invalid'; end if;
  if cl is not null and char_length(cl) > 12 then raise exception 'club_invalid'; end if;
  insert into public.profiles (id, login_id, nick, club) values (new.id, lid, nk, cl);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 이름 겹침 확인 — 로그인 전(가입)에도 부를 수 있다. 로그인했으면 나는 빼고 본다(이름 바꾸기)
-- 감독 이름은 남의 감독 이름 · 구단 이름과, 구단 이름도 남의 구단 이름 · 감독 이름과 견준다. 비운 칸은 통과
create or replace function public.names_free(p_nick text default null, p_club text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with v as (select lower(nullif(btrim(p_nick), '')) as n, lower(nullif(btrim(p_club), '')) as c)
  select jsonb_build_object(
    'nick', (select n from v) is null or not exists (
      select 1 from public.profiles p, v where p.id is distinct from auth.uid() and (lower(p.nick) = v.n or lower(p.club) = v.n)),
    'club', (select c from v) is null or not exists (
      select 1 from public.profiles p, v where p.id is distinct from auth.uid() and (lower(p.club) = v.c or lower(p.nick) = v.c)));
$$;
revoke execute on function public.names_free(text, text) from public;
grant execute on function public.names_free(text, text) to anon, authenticated;
