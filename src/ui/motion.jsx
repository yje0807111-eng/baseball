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
import React, { useEffect, useRef, useState } from 'react';
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
  const [n, setN] = useState(start);
  const [pop, setPop] = useState(0);
  const prev = useRef(start);
  useEffect(() => {
    const a = prev.current;
    const b = value;
    prev.current = b;
    if (a === b || !dur || reducedMotion()) { setN(b); return undefined; }
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

/** 차례로 올라오기 — 목록 · 카드 줄이 처음 뜰 때만. i 번째는 45ms 씩 늦게 */
export const rise = (i = 0) => ({ className: 'fx-rise', style: { '--i': i } });
