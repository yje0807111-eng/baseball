/*
 * Supabase 연결 — 저장된 팀끼리 겨루는 비동기 대전의 서버.
 * 주소 · 공개 키(.env.local 의 VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY)가 없으면 오프라인 — 게임은 지금처럼 브라우저 저장만으로 돈다.
 * 라이브러리는 처음 쓸 때 불러온다(첫 화면 짐을 늘리지 않게).
 */
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const online = !!(URL && KEY);

let clientP = null;
export function client() {
  if (!online) return Promise.resolve(null);
  clientP ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kbo.auth.v1' } }));
  return clientP;
}

/** 서버 계정 — 처음엔 익명 로그인(이메일 없이). 감독 이름은 profiles 에 적는다. 나중에 구글 로그인으로 이어 붙인다 */
export async function ensureSession(nick) {
  const sb = await client();
  if (!sb) return null;
  let { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }
  if (nick) {
    const { error } = await sb.from('profiles').upsert({ id: session.user.id, nick }, { onConflict: 'id' });
    if (error) throw error;
  }
  return session.user;
}

/** 연결 확인 — 서버에 닿는지 · 로그인되는지 · 표를 읽을 수 있는지 */
export async function ping() {
  if (!online) return { ok: false, why: 'offline' };
  try {
    const user = await ensureSession();
    const sb = await client();
    const { count, error } = await sb.from('teams').select('*', { count: 'exact', head: true });
    if (error) return { ok: false, why: error.message };
    return { ok: true, user: user.id, teams: count };
  } catch (e) {
    return { ok: false, why: e.message };
  }
}
