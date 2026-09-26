-- 가입한 계정만 — 익명 로그인 토큰으로는 어떤 표도 못 건드린다(익명 로그인을 다시 켜더라도)
create policy "members only" on public.profiles as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "members only" on public.saves as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "members only" on public.teams as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "members only" on public.battles as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
