import buttonClick from '../assets/sfx/button_click.mp3';
import gameStart from '../assets/sfx/game_start.mp3';
import notify from '../assets/sfx/notify.mp3';
import uiClose from '../assets/sfx/ui_close.mp3';
import uiConfirm from '../assets/sfx/ui_confirm.mp3';
import uiDenied from '../assets/sfx/ui_denied.mp3';
import uiOpen from '../assets/sfx/ui_open.mp3';
import uiTab from '../assets/sfx/ui_tab.mp3';

const SOURCES = {
  click: buttonClick,
  start: gameStart,
  score: notify,
  close: uiClose,
  confirm: uiConfirm,
  denied: uiDenied,
  open: uiOpen,
  tab: uiTab,
};

export type Sfx = keyof typeof SOURCES;

const KEY = 'kbo-dd-muted';
let muted = (() => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
})();

const cache = new Map<Sfx, HTMLAudioElement>();

export function playSfx(name: Sfx, volume = 0.45) {
  if (muted) return;
  let base = cache.get(name);
  if (!base) {
    base = new Audio(SOURCES[name]);
    cache.set(name, base);
  }
  // 겹쳐 재생될 수 있도록 복제본을 쓴다.
  const a = base.cloneNode() as HTMLAudioElement;
  a.volume = volume;
  a.play().catch(() => {});
}

export const isMuted = () => muted;

export function setMuted(v: boolean) {
  muted = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* 저장 불가 환경 */ }
}
