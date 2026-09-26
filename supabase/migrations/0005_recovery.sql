-- 비밀번호 찾기 — 복구 이메일(선택 등록)과 인증번호.
-- 로그인은 계속 아이디(속 주소)로 하고, 복구 이메일은 이 표에만 둔다(남에게 안 보인다).
create table if not exists public.recovery (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  updated_at timestamptz not null default now()
);
alter table public.recovery enable row level security;
create policy "recovery own" on public.recovery for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members only" on public.recovery as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
grant select, insert, update, delete on public.recovery to authenticated;

-- 인증번호 — 서버 함수(service role)만 읽고 쓴다. 번호는 해시로만
create table if not exists public.recovery_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  tries int not null default 0,
  sent_at timestamptz not null default now(),
  sent_day date not null default current_date,
  sent_count int not null default 1
);
alter table public.recovery_codes enable row level security; -- 정책 없음 = 로그인한 누구도 못 본다
