/* 대진표 팀 칸 깃발: 팀 이름 → 구단 */
import { test, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { teamFlag } from '../src/myteam/teamArt.js';

test('구단 · 국가대표 · 레전드 이름으로 깃발을 찾는다', () => {
  const cases = {
    '2022 SSG 랜더스': 'sk', '2008 SK 와이번스': 'sk', '1995 OB 베어스': 'doosan', '1993 해태 타이거즈': 'kia',
    '2019 키움 히어로즈': 'kiwoom', '2023 WBC 국가대표': 'korea', '해태·KIA 레전드': 'kia', 'NC·KT 레전드': 'nc',
    '1990년대 레전드': 'legend', '외국인 레전드': 'legend', '2025 LG 트윈스': 'lg', '1999 한화 이글스': 'hanwha',
  };
  for (const [name, key] of Object.entries(cases)) expect(teamFlag(name)?.key, name).toBe(key);
  expect(teamFlag('홈런왕42 드림팀')).toBeNull();
  for (const key of new Set(Object.values(cases))) expect(existsSync(`public/ui/teams/flag-${key}.webp`)).toBe(true);
});

test('프로필 배너 목록: 깃발 13장 · key 로 찾기', async () => {
  const { BANNERS, flagByKey } = await import('../src/myteam/teamArt.js');
  expect(BANNERS).toHaveLength(13);
  expect(new Set(BANNERS.map((b) => b.label)).size).toBe(13);
  expect(flagByKey('kia')?.src).toBe('ui/teams/flag-kia.webp');
  expect(flagByKey(null)).toBeNull();
  for (const b of BANNERS) expect(existsSync(`public/${b.src}`)).toBe(true);
});
