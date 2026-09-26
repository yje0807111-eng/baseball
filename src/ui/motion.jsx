/*
 * 모션 공통 틀 — 화면 이동 · 위 탭 · 숫자 세기 · 카드 뒤집기 · 차례로 올라오기
 *
 * 기준(FC 온라인 · TFT · 클래시 로얄 · 하스스톤 메뉴를 견주고 Material 모션 값에 맞춤)
 *  - 자주 보는 이동은 짧게: 탭 0.18초 · 화면 0.28초 · 나가는 쪽은 0.16초로 먼저 빠진다
 *  - 들어오는 것은 빠르게 출발해 부드럽게 멈춤(--fx-out), 나가는 것은 천천히 출발해 빨리 사라짐(--fx-in)
 *  - 깊이 들어가면 새 화면이 살짝 작게서 커지며 앞으로, 돌아오면 반대 — 같은 축으로만 움직여 방향을 읽게
 *  - 숫자판 · 표를 통째로 흔들거나 번쩍이지 않는다(눈 피로). 보상 같은 드문 순간만 크게
 *  - 운영체제 '애니메이션 줄이기'면 모두 끈다
 * 값(길이 · 곡선)은 index.css 의 --fx-* 와 ::view-transition 규칙에 있다.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * 화면 · 탭 바꾸기를 View Transition 으로 감싼다.
 * kind: 'fwd'(깊이 들어감) · 'back'(돌아옴) · 'tab-r' · 'tab-l'(옆 탭으로)
 * 지원하지 않는 브라우저 · 애니메이션 줄이기면 그냥 바꾼다.
 */
export function navTo(update, kind = 'fwd', ready = null) {
  /* 갈 화면을 아직 받는 중이면 옛 화면을 그대로 두고 기다렸다가 넘어간다(검은 판 없이). 너무 오래면 2.5초에 그냥 넘어감 */
  if (ready) {
    let done = false;
    const go = () => { if (!done) { done = true; navTo(update, kind); } };
    ready.then(go, go);
    setTimeout(go, 2500);
    return;
  }
  if (typeof document === 'undefined' || !document.startViewTransition || document.visibilityState !== 'visible' || reducedMotion()) { update(); return; }
  const root = document.documentElement;
  root.dataset.nav = kind;
  try {
    const t = document.startViewTransition(() => flushSync(update));
    /* 겹쳐 누르거나 창이 가려져 모션이 끊겨도 화면은 이미 바뀌었다 — 끊김 오류는 삼킨다 */
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => { if (root.dataset.nav === kind) delete root.dataset.nav; });
  } catch {
    delete root.dataset.nav;
    update();
  }
}

/**
 * 숫자 세기 — 값이 바뀌면 이전 값에서 새 값까지 세어 가고, 다 세면 한 번 톡 튄다(클래시 로얄 보상 방식).
 * from 을 주면 처음 뜰 때 그 값에서 센다. format 으로 1,234 · +300 G 같은 모양.
 */
export function Count({ value, from, dur = 700, delay = 0, format = (n) => n.toLocaleString(), className = '', style }) {
  const start = from ?? value;
  const [n, setShown] = useState(start);
  const [pop, setPop] = useState(0);
  /* 지금 보이는 값에서 센다 — 중간에 끊기거나(개발 모드 이중 실행 · 값이 또 바뀜) 다시 돌아도 끝 값으로 건너뛰지 않게 */
  const shown = useRef(start);
  const setN = (v) => { shown.current = v; setShown(v); };
  useEffect(() => {
    const a = shown.current;
    const b = value;
    if (a === b) return undefined;
    if (!dur || reducedMotion()) { setN(b); return undefined; }
    let raf = 0;
    let t0 = 0;
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - (1 - p) ** 3; // 빠르게 세다가 끝에서 느려진다
      setN(Math.round(a + (b - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPop((x) => x + 1);
    };
    const wait = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(wait); cancelAnimationFrame(raf); };
  }, [value, dur, delay]);
  return <span key={pop} className={`inline-block tabular-nums ${pop ? 'fx-pop' : ''} ${className}`} style={style}>{format(n)}</span>;
}

/**
 * 카드 뒤집기 — 뒷면으로 놓였다가 살짝 들리며 앞면으로(하스스톤 팩 열기처럼 끝에서 조금 넘었다 돌아옴).
 * delay(ms) 로 여러 장을 차례로. back 을 안 주면 어두운 판.
 */
export function Flip({ back = null, delay = 0, className = '', style, children }) {
  return (
    <div className={`fx-flip-wrap ${className}`} style={style}>
      <div className="fx-flip" style={{ '--d': `${delay}ms` }}>
        <div className="fx-face">{children}</div>
        <div className="fx-face fx-back" aria-hidden="true">{back || <div className="fx-back-plain" />}</div>
      </div>
    </div>
  );
}

/**
 * 빛 가루 — 한 점에서 사방으로 한 번 터진다(승리 · 등급 오름 · 정복). 부모 가운데 기준, 누름을 막지 않는다.
 * 무작위 대신 번호로 각도 · 거리를 정해 매번 같은 모양(깜빡이는 느낌 없이)
 */
export function Burst({ n = 22, colors = ['#f5d27a', '#fff'], spread = 150, delay = 0, size = 7 }) {
  return (
    <span className="fx-burst" aria-hidden="true" style={{ '--d': `${delay}ms` }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.21;
        const dist = spread * (0.55 + ((i * 37) % 45) / 100);
        return <i key={i} style={{ '--x': `${Math.cos(a) * dist}px`, '--y': `${Math.sin(a) * dist * 0.7}px`, '--s': `${size * (0.6 + (i % 4) * 0.2)}px`, background: colors[i % colors.length], color: colors[i % colors.length] }} />;
      })}
    </span>
  );
}

/**
 * 날아가기 — 누른 카드의 사본이 살짝 떠올랐다가(호) 도착 자리로 작아지며 들어간다(TFT 상점 → 벤치, FC 온라인 영입).
 * 도착 자리는 화면이 바뀐 뒤에 생기므로 findTarget 은 두 프레임 뒤에 찾는다. 원본 화면은 건드리지 않는다.
 */
export function flyGhost(fromEl, findTarget, { dur = 520, lift = 46 } = {}) {
  if (!fromEl || reducedMotion() || typeof document === 'undefined') return;
  const a = fromEl.getBoundingClientRect();
  if (!a.width) return;
  const ghost = fromEl.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  /* 원본에 걸린 등장 · 사라짐 모션(투명에서 시작하는 rise 등)이 사본에서 다시 돌면 안 보인다 — 사본 안은 모두 끈 채 또렷하게 출발 */
  [ghost, ...ghost.querySelectorAll('*')].forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  ghost.querySelectorAll('.gone, .gone-keep, .mc-leave, .taken').forEach((e) => e.classList.remove('gone', 'gone-keep', 'mc-leave', 'taken'));
  Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: '0', zIndex: '80', pointerEvents: 'none', animation: 'none', transformOrigin: '0 0', willChange: 'transform, opacity' });
  document.body.appendChild(ghost);
  const drop = setTimeout(() => ghost.remove(), dur + 800); // 창이 가려져 프레임이 멈춰도 사본은 반드시 치운다
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const t = findTarget?.();
    const b = t?.getBoundingClientRect();
    if (!b?.width) { ghost.remove(); return; }
    const s = Math.min(b.width / a.width, b.height / a.height);
    const dx = b.left + b.width / 2 - (a.left + (a.width * s) / 2);
    const dy = b.top + b.height / 2 - (a.top + (a.height * s) / 2);
    const mid = (1 + s) / 2;
    const anim = ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'brightness(1)' },
      { transform: 'translate(0,-10px) scale(1.06)', opacity: 1, filter: 'brightness(1.25)', offset: 0.15 }, // 먼저 살짝 들어 올림
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(${mid})`, opacity: 1, filter: 'brightness(1.1)', offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0, filter: 'brightness(1)' },
    ], { duration: dur, easing: 'cubic-bezier(.3,.7,.2,1)' });
    anim.onfinish = () => { clearTimeout(drop); ghost.remove(); };
    anim.oncancel = () => ghost.remove();
  }));
}

/**
 * 닫힘 — 팝업이 사라질 때 0.16초 동안 흐려지며 살짝 작아진다(열림 모션과 짝).
 * 팝업은 부르는 쪽 상태로 바로 사라지므로(닫기 · 받기 · 바깥 누르기 등 길이 여럿), 사라지는 순간의 모습을 사본으로 떠서
 * 그 사본을 흐리게 한다 — 어느 단추로 닫든 똑같이. 개발 모드 이중 실행(가짜 사라짐)에는 원본이 남아 있으니 건너뛴다.
 */
export function useExitGhost(ref) {
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      if (!node || reducedMotion() || typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      const r = node.getBoundingClientRect();
      if (!r.width) return;
      const ghost = node.cloneNode(true);
      queueMicrotask(() => {
        if (node.isConnected) return; // 진짜로 사라진 게 아니다
        [ghost, ...ghost.querySelectorAll('*')].forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
        Object.assign(ghost.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: '0', pointerEvents: 'none', zIndex: '90' });
        document.body.appendChild(ghost);
        const panel = ghost.querySelector('[role="dialog"]') || ghost;
        if (panel !== ghost) panel.animate([{ transform: 'none' }, { transform: 'translateY(6px) scale(.97)' }], { duration: 160, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
        const a = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
        const drop = setTimeout(() => ghost.remove(), 600);
        a.onfinish = () => { clearTimeout(drop); ghost.remove(); };
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * 차오르는 막대 값 — 마지막으로 보여 준 값(같은 key)에서 새 값으로. 처음이면 0 에서.
 * 경기를 마치고 로비로 돌아오면 주간 과제 · 랭크 막대가 '얼마나 늘었는지' 보이게(화면이 새로 열려도 기억).
 * 막대 쪽에 transition(width) 을 걸어 쓴다.
 */
const grown = new Map();
export function useGrow(key, value) {
  const [v, setV] = useState(() => (reducedMotion() ? value : grown.get(key) ?? 0));
  useEffect(() => {
    grown.set(key, value);
    if (v === value) return undefined;
    const t = setTimeout(() => setV(value), 180);
    return () => clearTimeout(t);
  }, [key, value]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/**
 * 목록이 새로 뜰 때만 — key(탭 · 분류)가 바뀐 그 순간부터 0.7초 동안 'fx-list' 를 준다.
 * 그 사이 처음 12칸이 30ms 간격으로 올라오고, 뒤에 검색 · 정렬로 새로 끼는 줄은 움직이지 않는다(글자 칠 때마다 출렁이지 않게).
 * 같은 그림 안에서 바로 켜야(렌더 중 상태 갱신) 한 번 보였다 사라지는 깜빡임이 없다.
 */
export function useListIntro(key, ms = 700) {
  const [state, setState] = useState({ key, on: !reducedMotion() });
  if (state.key !== key) setState({ key, on: !reducedMotion() });
  useEffect(() => {
    if (!state.on) return undefined;
    const t = setTimeout(() => setState((s) => ({ ...s, on: false })), ms);
    return () => clearTimeout(t);
  }, [state.key, state.on, ms]);
  return state.on ? 'fx-list' : '';
}

/** 차오르는 막대 — useGrow 를 쓴 <i>. 같은 key 는 화면이 달라도(로비 · 기록) 같은 기억을 쓴다 */
export function GrowBar({ k, pct, className = '', style }) {
  const w = useGrow(k, pct);
  return <i className={className} style={{ ...style, width: `${w}%`, transition: 'width .7s var(--fx-out)' }} />;
}

/** 차례로 올라오기 — 목록 · 카드 줄이 처음 뜰 때만. i 번째는 45ms 씩 늦게 */
export const rise = (i = 0) => ({ className: 'fx-rise', style: { '--i': i } });
