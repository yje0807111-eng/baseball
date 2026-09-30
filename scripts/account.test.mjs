import { describe, it, expect, vi } from 'vitest';

/* 서버 흉내 — names_free 가 돌려줄 값 · profiles 에 올린 줄을 적어 둔다 */
const srv = { free: { nick: true, club: true }, updates: [], err: null };
vi.mock('../src/net/supabase.js', () => ({
  online: true,
  client: async () => ({
    rpc: async (fn, args) => (srv.err ? { error: srv.err } : { data: fn === 'names_free' ? srv.free : { login: args.p_login !== 'taken', nick: true } }),
    from: () => ({ update: (row) => ({ eq: async () => { srv.updates.push(row); return { error: null }; } }) }),
  }),
}));
vi.mock('../src/net/sync.js', async (orig) => ({ ...(await orig()), syncState: () => ({ uid: 'me' }) }));

import { checkId, checkPw, checkNick, checkEmail, idToEmail, errText, namesFree, renameProfile, loginFree, TAKEN } from '../src/net/account.js';
import { payload } from '../src/net/sync.js';

describe('가입 입력 검사', () => {
  it('아이디 — 영문 소문자 · 숫자 · _ 4~16자, 대문자는 소문자로 본다', () => {
    expect(checkId('kbo_fan7')).toBe(null);
    expect(checkId('KBOfan')).toBe(null);
    expect(checkId('abc')).toMatch(/4~16/);
    expect(checkId('a'.repeat(17))).toMatch(/4~16/);
    expect(checkId('감독이름')).toMatch(/4~16/);
    expect(checkId('kbo fan')).toMatch(/4~16/);
    expect(checkId('')).toMatch(/4~16/);
  });
  it('비밀번호 8~72자', () => {
    expect(checkPw('1234567')).toMatch(/8자/);
    expect(checkPw('12345678')).toBe(null);
    expect(checkPw('x'.repeat(73))).toMatch(/72/);
  });
  it('감독 이름 2~12자(앞뒤 빈칸 빼고)', () => {
    expect(checkNick('김')).toMatch(/2~12/);
    expect(checkNick(' 김감독 ')).toBe(null);
    expect(checkNick('가'.repeat(13))).toMatch(/2~12/);
  });
  it('복구 이메일 — 비우면 통과(선택), 넣으면 형식 확인', () => {
    expect(checkEmail('')).toBe(null);
    expect(checkEmail('  ')).toBe(null);
    expect(checkEmail('fan@kbo.kr')).toBe(null);
    expect(checkEmail('fan@kbo')).toMatch(/형식/);
    expect(checkEmail('fan kbo@x.kr')).toMatch(/형식/);
  });
  it('아이디 → 속 주소(소문자 · 앞뒤 빈칸 없음)', () => {
    expect(idToEmail(' KBO_Fan ')).toBe('kbo_fan@id.kbodream.app');
  });
});

describe('서버 오류 → 화면 문구', () => {
  it('자주 나는 오류를 한 마디로', () => {
    expect(errText({ message: 'User already registered' })).toBe(TAKEN.login);
    expect(errText({ message: 'Invalid login credentials' })).toBe('아이디 · 비밀번호 확인');
    expect(errText({ message: 'Database error saving new user' })).toBe(TAKEN.nick);
    expect(errText({ message: 'duplicate key value violates unique constraint "profiles_nick_uq"', code: '23505' })).toBe(TAKEN.nick);
    expect(errText({ message: 'duplicate key value violates unique constraint "profiles_club_uq"', code: '23505' })).toBe(TAKEN.club);
    expect(errText(new TypeError('Failed to fetch'))).toBe('서버 연결 실패');
    expect(errText(new Error('timeout'))).toBe('서버 연결 실패');
    expect(errText({ message: '??' })).toBe('다시 시도');
  });
});

describe('올릴 저장 몸통', () => {
  it('이 기기 표시(signedOut)는 빼고 나머지는 그대로', () => {
    expect(payload({ nick: '감독', gold: 5, signedOut: true })).toEqual({ nick: '감독', gold: 5 });
    expect(payload(null)).toBe(null);
  });
});

describe('이름 겹침 — 바꿔 넣으라고', () => {
  it('겹치면 그 칸 문구로 던지고, 서버엔 올리지 않는다', async () => {
    srv.updates = [];
    srv.free = { nick: false, club: true };
    await expect(namesFree({ nick: '김감독' })).rejects.toThrow(TAKEN.nick);
    srv.free = { nick: true, club: false };
    await expect(renameProfile({ club: '해태 왕조' })).rejects.toThrow(TAKEN.club);
    expect(srv.updates).toEqual([]);
    await expect(loginFree('taken')).rejects.toThrow(TAKEN.login);
    await expect(loginFree('fresh_id')).resolves.toBeUndefined();
  });
  it('안 겹치면 바꾼 칸만 올린다 · 빈 구단 이름은 null(감독 이름을 따라감)', async () => {
    srv.updates = [];
    srv.free = { nick: true, club: true };
    await renameProfile({ nick: ' 새감독 ' });
    await renameProfile({ club: '' });
    expect(srv.updates).toEqual([{ nick: '새감독' }, { club: null }]);
  });
  it('서버에 names_free 가 아직 없으면(PGRST202) 막지 않는다', async () => {
    srv.err = { code: 'PGRST202', message: 'Could not find the function' };
    await expect(namesFree({ nick: '김감독', club: 'x' })).resolves.toBeUndefined();
    srv.err = null;
  });
});
