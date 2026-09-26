/*
 * 계정 — 아이디 · 비밀번호 가입(이메일 인증 없음).
 * Supabase 로그인은 이메일이 있어야 해서 아이디를 `아이디@id.kbodream.app` 로 바꿔 넣는다(메일은 가지 않는다).
 * 비밀번호는 Supabase Auth 로 곧장 보내고 어디에도 남기지 않는다.
 * 비밀번호 찾기 = 복구 이메일(선택 등록) + 서버 함수 recover 가 보내는 6자리 인증번호.
 */
import { client } from './supabase.js';
import { readSave, replaceSave, signIn as startLocal } from '../myteam/store.js';
import { pull, push, setSync, syncState, stopSync } from './sync.js';

export const ID_RE = /^[a-z0-9_]{4,16}$/;
export const PW_MIN = 8;
export const NICK_MIN = 2;
export const NICK_MAX = 12;

export const idToEmail = (id) => `${String(id).trim().toLowerCase()}@id.kbodream.app`;

/** 입력 검사 — 문제가 있으면 화면에 띄울 한 마디, 없으면 null */
export function checkId(id) {
  return ID_RE.test(String(id || '').trim().toLowerCase()) ? null : '아이디 4~16자 · 영문 · 숫자 · _';
}
export function checkPw(pw) {
  const n = String(pw || '').length;
  if (n < PW_MIN) return `비밀번호 ${PW_MIN}자 이상`;
  if (n > 72) return '비밀번호 72자 이하';
  return null;
}
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** 복구 이메일 — 비워 두면 통과(선택) */
export function checkEmail(email) {
  const v = String(email || '').trim();
  return !v || (EMAIL_RE.test(v) && v.length <= 254) ? null : '이메일 형식 확인';
}
export function checkNick(nick) {
  const n = String(nick || '').trim().length;
  return n >= NICK_MIN && n <= NICK_MAX ? null : `감독 이름 ${NICK_MIN}~${NICK_MAX}자`;
}

/** 서버 오류 → 화면 문구 */
export function errText(e) {
  const m = String(e?.message || e || '');
  if (/already registered|already exists/i.test(m)) return '이미 있는 아이디';
  if (/invalid login credentials/i.test(m)) return '아이디 · 비밀번호 확인';
  if (/password should be at least/i.test(m)) return `비밀번호 ${PW_MIN}자 이상`;
  if (/weak password|pwned|leaked/i.test(m)) return '더 어려운 비밀번호';
  if (/23505|duplicate key|database error saving new user/i.test(m)) return '이미 있는 감독 이름';
  if (/signups? (are|is) (not allowed|disabled)/i.test(m)) return '가입 막힘 · 서버 설정';
  if (/rate limit|too many/i.test(m)) return '잠시 뒤 다시';
  if (/failed to fetch|network|timeout/i.test(m)) return '서버 연결 실패';
  return '다시 시도';
}

const timeout = (p, ms = 8000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

/* 덮어쓰기 전에 이 브라우저의 다른 저장을 한 벌 남긴다(옛 감독 이름 저장 · 다른 계정) */
function keepAside() {
  const a = readSave();
  if (!a) return;
  try { localStorage.setItem('kbo.myteam.prev', JSON.stringify(a)); } catch { /* noop */ }
}

/** 이 브라우저에 계정과 이어지지 않은 옛 저장(감독 이름만으로 만든 것)이 있으면 요약 */
export function legacySave() {
  const a = readSave();
  if (!a?.nick || syncState()?.uid) return null;
  return { nick: a.nick, team: a.team?.name || '나의 드림팀', size: a.team?.squad?.length || 0, w: a.team?.record?.w || 0, l: a.team?.record?.l || 0 };
}

async function profileNick(sb, uid) {
  const { data } = await sb.from('profiles').select('nick').eq('id', uid).maybeSingle();
  return data?.nick || '감독';
}

/* 서버 저장이 없는 계정 — 새로 시작해 곧바로 올린다 */
function freshStart(uid, nick) {
  keepAside();
  replaceSave(null);
  setSync({ uid, rev: 0, dirty: true, n: 1 });
  startLocal(nick);
}

/** 가입 — 겹침 확인 → 계정 만들기(감독 줄은 서버 트리거가 만든다) → 저장 시작. 돌려주는 값 = uid */
export async function signUp({ id, pw, nick, email = '', adopt = false }) {
  const bad = checkId(id) || checkPw(pw) || checkNick(nick) || checkEmail(email);
  if (bad) throw new Error(bad);
  const sb = await client();
  const lid = id.trim().toLowerCase();
  const nk = nick.trim();
  const free = await timeout(sb.rpc('account_free', { p_login: lid, p_nick: nk }));
  if (free.error) throw new Error(errText(free.error));
  if (!free.data.login) throw new Error('이미 있는 아이디');
  if (!free.data.nick) throw new Error('이미 있는 감독 이름');
  const { data, error } = await timeout(sb.auth.signUp({ email: idToEmail(lid), password: pw, options: { data: { login_id: lid, nick: nk } } }));
  if (error) throw new Error(errText(error));
  if (!data.session) throw new Error('가입 확인 메일 켜짐 · 서버 설정');
  const uid = data.user.id;
  const old = adopt ? readSave() : null;
  if (old) {
    replaceSave({ ...old, nick: nk, signedOut: false });
    setSync({ uid, rev: 0, dirty: true, n: 1 });
  } else {
    freshStart(uid, nk);
  }
  await push().catch(() => {}); // 못 올려도 동기화가 다시 시도한다
  if (email.trim()) await setRecoveryEmail(email).catch(() => {}); // 못 넣으면 프로필에서 다시
  return uid;
}

/** 로그인 → 서버 저장을 받아 깐다. 돌려주는 값 = uid */
export async function logIn({ id, pw }) {
  const bad = checkId(id) || (pw ? null : '비밀번호 입력');
  if (bad) throw new Error(bad);
  const sb = await client();
  const { data, error } = await timeout(sb.auth.signInWithPassword({ email: idToEmail(id), password: pw }));
  if (error) throw new Error(errText(error));
  try {
    await settle(sb, data.user.id);
  } catch (e) {
    throw new Error(errText(e));
  }
  return data.user.id;
}

/* 로그인된 계정의 저장을 맞춘다 — 이 기기에 못 올린 진행이 있으면 먼저 올리고, 아니면 서버 것을 받는다 */
async function settle(sb, uid) {
  const s = syncState();
  const mine = s?.uid === uid && !!readSave();
  if (mine && s.dirty) {
    await timeout(push());
    return;
  }
  if (!mine) keepAside();
  const got = await timeout(pull(uid));
  if (got === 'none') freshStart(uid, await profileNick(sb, uid));
}

/** 앱을 열 때 — 남아 있는 로그인으로 이어서. 인터넷이 없으면 이 기기 사본으로. 돌려주는 값 = uid 또는 null */
export async function resume() {
  const sb = await client();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const uid = session.user.id;
  try {
    await settle(sb, uid);
  } catch (e) {
    if (!(syncState()?.uid === uid && readSave())) throw e; // 받을 것도 없고 이 기기 사본도 없으면 로그인부터
  }
  return uid;
}

/** 로그아웃 — 못 올린 진행을 먼저 올린다. 올리지 못하면 이 기기 사본을 남겨 다음 로그인 때 올린다 */
export async function logOut() {
  const sb = await client();
  let clean = true;
  try { await timeout(push(), 5000); } catch { clean = false; }
  stopSync();
  if (clean && !syncState()?.dirty) { replaceSave(null); setSync(null); }
  await sb?.auth.signOut().catch(() => {});
}

/** 감독 이름 바꾸기 — 서버 먼저(겹침 확인). 저장 쪽은 부르는 곳이 바꾼다 */
export async function renameNick(nick) {
  const bad = checkNick(nick);
  if (bad) throw new Error(bad);
  const sb = await client();
  const uid = syncState()?.uid;
  if (!sb || !uid) return;
  const { error } = await timeout(sb.from('profiles').update({ nick: nick.trim() }).eq('id', uid));
  if (error) throw new Error(errText(error));
}

/** 내 복구 이메일(없으면 null) */
export async function myRecoveryEmail() {
  const sb = await client();
  const uid = syncState()?.uid;
  if (!sb || !uid) return null;
  const { data } = await timeout(sb.from('recovery').select('email').eq('user_id', uid).maybeSingle());
  return data?.email || null;
}

/** 복구 이메일 넣기 · 바꾸기 — 빈칸이면 지운다 */
export async function setRecoveryEmail(email) {
  const bad = checkEmail(email);
  if (bad) throw new Error(bad);
  const sb = await client();
  const uid = syncState()?.uid;
  if (!sb || !uid) return;
  const v = String(email || '').trim().toLowerCase();
  const q = v
    ? sb.from('recovery').upsert({ user_id: uid, email: v, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    : sb.from('recovery').delete().eq('user_id', uid);
  const { error } = await timeout(q);
  if (error) throw new Error(errText(error));
}

const RECOVER_ERR = {
  bad_id: '아이디 4~16자 · 영문 · 숫자 · _',
  wait: '1분 뒤 다시',
  daily: '오늘 발송 횟수 끝 · 내일 다시',
  mail: '메일 발송 실패 · 잠시 뒤 다시',
  bad_code: '인증번호 확인',
  expired: '인증번호 만료 · 다시 받기',
  bad_password: `비밀번호 ${PW_MIN}자 이상`,
};
async function recoverCall(body) {
  const sb = await client();
  if (!sb) throw new Error('서버 연결 실패');
  const { error } = await timeout(sb.functions.invoke('recover', { body }));
  if (!error) return;
  const b = await error.context?.json?.().catch(() => null);
  throw new Error(RECOVER_ERR[b?.error] || errText(b?.message || error));
}

/** 비밀번호 찾기 1 — 아이디 · 복구 이메일이 맞으면 인증번호 메일(맞지 않아도 똑같이 조용히 끝난다) */
export async function recoverStart(id, email) {
  const bad = checkId(id) || (String(email || '').trim() ? checkEmail(email) : '복구 이메일 입력');
  if (bad) throw new Error(bad);
  await recoverCall({ action: 'start', id: id.trim().toLowerCase(), email: email.trim().toLowerCase() });
}

/** 비밀번호 찾기 2 — 인증번호 · 새 비밀번호 */
export async function recoverFinish(id, code, pw) {
  const bad = checkId(id) || (/^\d{6}$/.test(String(code || '').trim()) ? null : '인증번호 6자리') || checkPw(pw);
  if (bad) throw new Error(bad);
  await recoverCall({ action: 'finish', id: id.trim().toLowerCase(), code: code.trim(), password: pw });
}
