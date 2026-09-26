/* 배경음악 — 화면 묶음(scene)마다 곡을 바꿔 튼다.
   · menu : 로그인 · 로비 · 드래프트 · 정비까지. 메뉴 곡 셋을 섞어 돌려 틀고, 곡이 끝나기 3초 전부터 다음 곡과 겹쳐 넘긴다
   · game : 경기. 가장 신나는 곡(128 BPM)의 45초(24마디) 구간을 끊김 없이 돈다
   브라우저는 사람이 한 번 누르기 전에는 소리를 막아서, 첫 누름 때 오디오를 연다.
   크기 · 음소거는 이 기기에 기억한다 (localStorage — 못 쓰면 기본값). */

const MENU = ['menu-1', 'menu-2', 'menu-3'].map((n) => `audio/bgm/${n}.mp3`);
/* 경기 곡 파일은 [한 바퀴][처음 2초] — 압축의 앞뒤 여백이 반복 구간에 닿지 않게 1초 ~ 1초+한 바퀴 사이를 돈다 */
const LOOP = { src: 'audio/bgm/game-loop.mp3', start: 1, length: 1984488 / 44100 };
const LEVEL = { menu: { menu: 1, loop: 0 }, game: { menu: 0, loop: 0.9 } };
const SCENE_FADE = 1.2; // 화면 묶음이 바뀔 때
const SONG_FADE = 3; // 메뉴 곡끼리 넘어갈 때
const KEY = 'kbo.bgm';

const load = () => { try { return { vol: 0.5, muted: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { vol: 0.5, muted: false }; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 못 쓰면 이번 방문만 */ } };

let settings = typeof window === 'undefined' ? { vol: 0.5, muted: false } : load();
let ctx = null; let master = null; let menuBus = null; let loopBus = null;
let scene = null; let wanted = null;
let loopBuffer = null; let loopNode = null; let loopLoading = null;
const decks = []; let deckOn = -1; let order = []; let lastSong = null;
const listeners = new Set();

const now = () => ctx.currentTime;
function ramp(param, to, sec) { param.cancelScheduledValues(now()); param.setValueAtTime(param.value, now()); param.linearRampToValueAtTime(to, now() + sec); }
const masterLevel = () => (settings.muted ? 0 : settings.vol);

/** 섞은 순서로 다음 메뉴 곡 — 방금 튼 곡은 바로 다시 나오지 않게 */
function nextSong() {
  if (!order.length) { order = [...MENU].sort(() => Math.random() - 0.5); if (order[0] === lastSong && order.length > 1) order.push(order.shift()); }
  lastSong = order.shift();
  return lastSong;
}

/** 메뉴 곡 데크 둘 — 번갈아 쓰며 겹쳐 넘긴다 */
function deck(i) {
  if (!decks[i]) {
    const el = new Audio(); el.preload = 'none'; el.crossOrigin = 'anonymous';
    const gain = ctx.createGain(); gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain).connect(menuBus);
    const d = { el, gain, handing: false };
    el.addEventListener('timeupdate', () => { if (scene === 'menu' && !d.handing && el.duration && el.currentTime > el.duration - SONG_FADE - 0.2) { d.handing = true; playSong(); } });
    el.addEventListener('ended', () => { d.gain.gain.value = 0; });
    decks[i] = d;
  }
  return decks[i];
}
function playSong() {
  const prev = decks[deckOn];
  deckOn = deckOn === 0 ? 1 : 0;
  const d = deck(deckOn);
  d.handing = false; d.el.src = nextSong(); d.el.currentTime = 0;
  d.el.play().catch(() => {});
  ramp(d.gain.gain, 1, prev ? SONG_FADE : 0.05);
  if (prev) { ramp(prev.gain.gain, 0, SONG_FADE); setTimeout(() => prev.el.pause(), SONG_FADE * 1000 + 100); }
}
function menuPlaying() { const d = decks[deckOn]; return d && !d.el.paused; }
function stopMenu() { decks.forEach((d) => { if (d) { ramp(d.gain.gain, 0, SCENE_FADE); setTimeout(() => { if (scene !== 'menu') d.el.pause(); }, SCENE_FADE * 1000 + 100); } }); deckOn = -1; }

async function startLoop() {
  if (loopNode) return;
  if (!loopBuffer) {
    loopLoading ||= fetch(LOOP.src).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((b) => { loopBuffer = b; });
    await loopLoading;
    if (loopNode || scene === 'menu') return;
  }
  loopNode = ctx.createBufferSource();
  loopNode.buffer = loopBuffer; loopNode.loop = true;
  loopNode.loopStart = LOOP.start; loopNode.loopEnd = LOOP.start + LOOP.length;
  loopNode.connect(loopBus);
  loopNode.start(0, LOOP.start);
}
function stopLoop() { const n = loopNode; loopNode = null; if (n) setTimeout(() => { try { n.stop(); } catch { /* 이미 멈춤 */ } }, SCENE_FADE * 1000 + 100); }

function apply(next) {
  if (!ctx || next === scene) return;
  scene = next;
  const lv = LEVEL[next];
  ramp(menuBus.gain, lv.menu, SCENE_FADE);
  ramp(loopBus.gain, lv.loop, SCENE_FADE);
  if (next === 'menu') { stopLoop(); if (!menuPlaying()) playSong(); } else { stopMenu(); startLoop(); }
}

/** 첫 누름 때 오디오를 연다 */
function unlock() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = masterLevel(); master.connect(ctx.destination);
  menuBus = ctx.createGain(); menuBus.gain.value = 0; menuBus.connect(master);
  loopBus = ctx.createGain(); loopBus.gain.value = 0; loopBus.connect(master);
  if (wanted) apply(wanted);
}
if (typeof window !== 'undefined') {
  /* 누를 때마다: 처음이면 오디오를 열고, 브라우저가 멈춘 채로 만들었으면 다시 켠다 */
  const touch = () => {
    unlock();
    if (ctx && ctx.state === 'suspended' && !document.hidden) {
      ctx.resume().then(() => { const d = decks[deckOn]; if (scene === 'menu' && d && d.el.paused) d.el.play().catch(() => {}); });
    }
  };
  window.addEventListener('pointerdown', touch, true);
  window.addEventListener('keydown', touch, true);
  /* M 키로 음소거 — 한글 자판이면 같은 자리의 ㅡ. 글을 쓰는 칸에서는 무시 */
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M' || e.key === 'ㅡ') setSettings({ muted: !settings.muted });
  });
  /* 탭을 벗어나면 멈추고, 돌아오면 이어 튼다 */
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend(); decks.forEach((d) => d && d.el.pause()); } else { ctx.resume(); const d = decks[deckOn]; if (scene === 'menu' && d) d.el.play().catch(() => {}); }
  });
}

/** 화면 묶음을 알린다 — 'menu' | 'game' (예전 이름 'prep' 은 메뉴로) */
export function setScene(next) { const s = next === 'game' ? 'game' : 'menu'; wanted = s; apply(s); }
export function getSettings() { return settings; }
export function setSettings(patch) {
  settings = { ...settings, ...patch };
  save(settings);
  if (master) ramp(master.gain, masterLevel(), 0.15);
  listeners.forEach((f) => f(settings));
}
export function onSettings(f) { listeners.add(f); return () => listeners.delete(f); }
/** 지금 무엇이 나오는지 — 확인용 */
export function bgmState() {
  const d = decks[deckOn];
  return { ready: !!ctx, audio: ctx?.state, scene, song: d && !d.el.paused ? d.el.src.split('/').pop() : null, at: d ? Math.round(d.el.currentTime) : null, loop: !!loopNode, menuLevel: menuBus?.gain.value, loopLevel: loopBus?.gain.value, master: master?.gain.value };
}
