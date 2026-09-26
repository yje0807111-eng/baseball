import { describe, it, expect } from 'vitest';
import { checkId, checkPw, checkNick, idToEmail, errText } from '../src/net/account.js';
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
  it('아이디 → 속 주소(소문자 · 앞뒤 빈칸 없음)', () => {
    expect(idToEmail(' KBO_Fan ')).toBe('kbo_fan@id.kbodream.app');
  });
});

describe('서버 오류 → 화면 문구', () => {
  it('자주 나는 오류를 한 마디로', () => {
    expect(errText({ message: 'User already registered' })).toBe('이미 있는 아이디');
    expect(errText({ message: 'Invalid login credentials' })).toBe('아이디 · 비밀번호 확인');
    expect(errText({ message: 'Database error saving new user' })).toBe('이미 있는 감독 이름');
    expect(errText({ message: 'duplicate key value violates unique constraint "profiles_nick_uq"', code: '23505' })).toBe('이미 있는 감독 이름');
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
