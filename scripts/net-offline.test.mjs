import { describe, it, expect } from 'vitest';
import { online, client, ping, ensureSession } from '../src/net/supabase.js';

// 키가 없으면 오프라인 — 서버 없이도 게임이 그대로 돌아야 한다
describe('Supabase 오프라인', () => {
  it('키가 없으면 client · 로그인 · ping 모두 조용히 빠진다', async () => {
    if (online) return; // .env.local 이 있는 자리에서는 건너뜀
    expect(await client()).toBe(null);
    expect(await ensureSession('감독')).toBe(null);
    expect(await ping()).toEqual({ ok: false, why: 'offline' });
  });
});
