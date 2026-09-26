/*
 * 저장 동기화 — 브라우저 사본(store.js) ↔ 서버 saves.
 * 바뀌면 3초 모아 올리고, 창을 숨길 때 · 인터넷이 돌아올 때도 올린다.
 * rev 가 서버와 엇갈리면(다른 기기가 먼저 저장) 서버 쪽을 남기고 받아 온다.
 */
import { client } from './supabase.js';
import { onSave, readSave, replaceSave } from '../myteam/store.js';

const SK = 'kbo.sync.v1'; // { uid, rev, dirty, n }

export function syncState() {
  try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch { return null; }
}
export function setSync(s) {
  try { if (s) localStorage.setItem(SK, JSON.stringify(s)); else localStorage.removeItem(SK); } catch { /* noop */ }
}
/** 올릴 몸통 — 이 기기에서만 쓰는 표시는 뺀다 */
export function payload(a) {
  if (!a) return null;
  const { signedOut, ...rest } = a; // eslint-disable-line no-unused-vars
  return rest;
}

/** 서버 저장을 받아 깐다 → 'server' | 'none' */
export async function pull(uid) {
  const sb = await client();
  const { data, error } = await sb.from('saves').select('rev, data').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data) return 'none';
  replaceSave(data.data);
  setSync({ uid, rev: data.rev, dirty: false, n: 0 });
  return 'server';
}

let pushing = null;
/** 못 올린 진행을 올린다 → 'clean' | 'ok' | 'conflict'(서버 것을 받아 깔았음) */
export function push() {
  if (pushing) return pushing;
  const s = syncState();
  const body = payload(readSave());
  if (!s?.uid || !s.dirty || !body) return Promise.resolve('clean');
  pushing = (async () => {
    const sb = await client();
    const { data, error } = await sb.rpc('push_save', { p_base: s.rev || 0, p_data: body });
    if (error) throw error;
    if (data > 0) {
      const cur = syncState(); // 올리는 사이 또 바뀌었으면 dirty 를 남긴다
      setSync({ uid: s.uid, rev: data, dirty: (cur?.n || 0) !== (s.n || 0), n: cur?.n || 0 });
      return 'ok';
    }
    await pull(s.uid);
    return 'conflict';
  })().finally(() => { pushing = null; });
  return pushing;
}

let stop = null;
/** 로그인한 동안 켜 둔다. onRemote = 서버 것을 받아 깔았을 때(화면 다시 읽기) */
export function startSync(uid, onRemote) {
  stopSync();
  let timer = 0;
  const run = async () => {
    clearTimeout(timer);
    try {
      if ((await push()) === 'conflict') onRemote?.();
      else if (syncState()?.dirty) timer = setTimeout(run, 3000); // 올리는 사이 또 바뀐 것
    } catch {
      timer = setTimeout(run, 30000); // 끊겼으면 30초 뒤 다시
    }
  };
  const off = onSave(() => {
    const s = syncState();
    if (s?.uid !== uid) return;
    setSync({ ...s, dirty: true, n: (s.n || 0) + 1 });
    clearTimeout(timer);
    timer = setTimeout(run, 3000);
  });
  const onHide = () => { if (document.visibilityState === 'hidden') run(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('online', run);
  stop = () => {
    off();
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('online', run);
  };
  if (syncState()?.dirty) run();
}
export function stopSync() {
  stop?.();
  stop = null;
}
