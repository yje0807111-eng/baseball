-- 대전 표 손질 — 방어 팀 사진 크기 · 점수 범위 · 최근 팀 찾기 색인
alter table public.teams add constraint teams_payload_size check (octet_length(payload::text) < 20000);
alter table public.battles add constraint battles_runs_range check (att_runs between 0 and 99 and def_runs between 0 and 99);
create index if not exists teams_mode_updated on public.teams (mode, updated_at desc);
