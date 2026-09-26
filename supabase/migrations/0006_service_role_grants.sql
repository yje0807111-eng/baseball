-- 새 표 자동 공개를 끈 프로젝트라 서버 함수(service_role)에도 권한을 직접 준다 — 비밀번호 찾기 함수가 쓰는 만큼만
grant select on public.profiles to service_role;
grant select on public.recovery to service_role;
grant select, insert, update, delete on public.recovery_codes to service_role;
