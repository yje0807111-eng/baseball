/*
 * 경기 인트로 — '경기 시작'을 누르면 경기 화면이 먼저 뜨고, 그 위로 두 구단 현수막이 떨어져 흔들리다 올라간다(목업 match-intro 7안).
 * 순서 · 시간(스트리트 파이터 · 철권 · MLB 더 쇼 · KBO 중계 조사):
 *   0      가림막 흐려짐 · 왼쪽(원정) 현수막 떨어짐(0.55초, 끝에 살짝 튐)   0.09  오른쪽(홈) 현수막
 *   0.26   가운데 VS 톡(0.38초) · 쿵 소리                                 0.55~  현수막이 천처럼 흔들림(좌우 기울기 · 옷감 주름)
 *   1.75   현수막 올라감 · VS 흐려짐(0.3초) — 2.05 에 다 사라짐
 *   3.05   경기 화면을 1초 보여 준 뒤 onHandoff(증강 판) · onDone — 바로 이어지면 너무 급했다
 *          그 1초 동안은 보이지 않는 칸만 남아 누르면 곧바로 증강으로 넘어간다
 * 누르면 곧바로 넘어간다. '애니메이션 줄이기'면 떨어짐 · 흔들림 없이 1.2초 보여 주고 넘어간다.
 * 한 팀에 보여 주는 것은 둘(종합 · 선발) — 읽을 수 있는 만큼만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { SfxAt, reducedMotion } from './ui/motion.jsx';

const CSS = `
.mi { position: fixed; inset: 0; z-index: 40; overflow: hidden; cursor: pointer; color: #fff; }
.mi-scrim { position: absolute; inset: 0; background: radial-gradient(70% 62% at 50% 50%, rgba(3,5,10,.45), rgba(3,5,10,.84)); animation: miFade .25s ease-out both, miOut .3s ease-in 1.75s forwards; }
.mi-ban { position: absolute; top: 0; width: 360px; transform-origin: 50% 0; animation: miDrop .55s cubic-bezier(.3,.8,.3,1) var(--d, 0ms) both, miUp .3s cubic-bezier(.5,0,.8,.4) calc(1750ms + var(--d, 0ms)) forwards; }
.mi-rod { position: relative; z-index: 2; height: 14px; margin: 0 -16px; border-radius: 7px; background: linear-gradient(180deg, #d1d5db, #6b7280); box-shadow: 0 3px 8px rgba(0,0,0,.6); }
.mi-sway { transform-origin: 50% 0; animation: miSway 3.2s ease-in-out var(--sd, 0s) infinite; }
.mi-cloth { position: relative; height: 640px; margin-top: -4px; transform-origin: 50% 0; clip-path: polygon(0 0,100% 0,100% 92%,50% 100%,0 92%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); animation: miCloth 2.3s ease-in-out var(--cd, 0s) infinite; }
.mi-folds { position: absolute; inset: 0; pointer-events: none; opacity: .55; mix-blend-mode: soft-light;
  background: repeating-linear-gradient(90deg, rgba(0,0,0,.5) 0, rgba(255,255,255,.35) 60px, rgba(0,0,0,.5) 120px); background-size: 240px 100%; animation: miFold 2.8s linear infinite; }
.mi-emb { width: 170px; height: 170px; border-radius: 24%; background: center/cover no-repeat; box-shadow: 0 10px 30px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.18); }
.mi-mid { position: absolute; left: 0; right: 0; top: 300px; display: grid; place-items: center; gap: 20px; animation: miPop .38s cubic-bezier(.2,.9,.25,1) .26s both, miOut .3s ease-in 1.75s forwards; }
.mi-vs { font: italic 900 132px/.9 'Saira Condensed', sans-serif; letter-spacing: -.02em; text-shadow: 0 0 30px rgba(255,255,255,.35), 0 6px 0 rgba(0,0,0,.5); -webkit-text-stroke: 2px rgba(255,255,255,.2); }
.mi-tag { display: inline-flex; align-items: center; height: 34px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 700; color: #e5e7eb;
  background: rgba(6,10,19,.72); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); backdrop-filter: blur(8px); }
@keyframes miFade { from { opacity: 0; } }
@keyframes miOut { to { opacity: 0; transform: scale(.97); } }
@keyframes miPop { 0% { transform: scale(1.9); opacity: 0; } 62% { transform: scale(.95); opacity: 1; } 100% { transform: scale(1); } }
@keyframes miDrop { 0% { transform: translateY(-105%) rotate(-3deg); } 62% { transform: translateY(3%) rotate(1deg); } 82% { transform: translateY(-1%); } 100% { transform: none; } }
@keyframes miUp { to { transform: translateY(-105%); } }
/* 흔들림 — 막대에 매달린 채 좌우로 1.1도(3.2초) · 옷감은 아래가 늦게 따라오게 기울기(2.3초) · 주름은 옆으로 흘러간다 */
@keyframes miSway { 0%, 100% { transform: rotate(-1.1deg); } 50% { transform: rotate(1.1deg); } }
@keyframes miCloth { 0%, 100% { transform: skewX(-1.4deg) scaleX(1); } 50% { transform: skewX(1.4deg) scaleX(.985); } }
@keyframes miFold { to { background-position: 240px 0; } }
.mi.calm .mi-ban, .mi.calm .mi-sway, .mi.calm .mi-cloth, .mi.calm .mi-folds, .mi.calm .mi-mid { animation: miFade .15s ease-out both; }
.mi.calm .mi-scrim { animation: miFade .15s ease-out both; }
`;

/** 팀 이름 '2014 삼성 라이온즈' → 연도 · 구단 (내 팀처럼 연도가 없으면 이름 그대로) */
const split = (name = '') => { const m = String(name).match(/^(\d{4})\s+(.*)$/); return m ? [m[1], m[2]] : ['', name]; };

function Banner({ t, left, delay }) {
  const [year, club] = split(t.name);
  return (
    <div className="mi-ban" style={{ left, '--d': `${delay}ms` }}>
      <div className="mi-rod" />
      <div className="mi-sway" style={{ '--sd': delay ? '-1.6s' : '0s' }}>
        <div className="mi-cloth" style={{ '--cd': delay ? '-1.1s' : '0s', background: `linear-gradient(180deg, ${t.color}cc, ${t.color}66 55%, ${t.color}aa)${t.bg ? `, url(${t.bg}) center/cover` : ''}` }}>
          <i className="mi-folds" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 70, gap: 20, textAlign: 'center' }}>
            <div className="mi-emb" style={{ backgroundImage: `url(${t.emblem})` }} />
            {year && <div className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.3em' }}>{year}</div>}
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, padding: '0 24px', textShadow: '0 3px 12px rgba(0,0,0,.45)', wordBreak: 'keep-all' }}>{club}</div>
            <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>종합 <b style={{ fontSize: 30 }}>{t.ovr}</b></span>
            {t.starter && <span style={{ fontSize: 18, fontWeight: 700 }}>선발 {t.starter}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * away · home: { name, color, emblem, bg, ovr, starter } — 원정은 왼쪽, 홈(내 팀)은 오른쪽(전광판과 같은 순서)
 * onHandoff: 다음 판(증강)을 띄울 때 · onDone: 인트로를 걷을 때
 */
export default function MatchIntro({ away, home, tag, onHandoff, onDone }) {
  const calm = useRef(reducedMotion()).current;
  const fired = useRef(false);
  const cb = useRef({ onHandoff, onDone });
  cb.current = { onHandoff, onDone };
  const handoff = () => { if (!fired.current) { fired.current = true; cb.current.onHandoff?.(); } };
  /* 현수막이 다 사라지는 때 · 그 뒤 1초 쉬고 증강 */
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const out = calm ? 1200 : 2050;
    const a = setTimeout(() => setGone(true), out);
    const b = setTimeout(() => { handoff(); cb.current.onDone?.(); }, out + 1000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* 누르면 곧바로 — 증강 판을 띄우고 인트로를 걷는다 */
  const skip = () => { handoff(); cb.current.onDone?.(); };
  if (gone) return <div className="mi" onClick={skip} role="presentation" style={{ background: 'transparent' }} />;
  return (
    <div className={`mi ${calm ? 'calm' : ''}`} onClick={skip} role="presentation" aria-label="경기 소개">
      <style>{CSS}</style>
      <div className="mi-scrim" />
      <Banner t={away} left="15.6%" delay={0} />
      <Banner t={home} left="calc(84.4% - 360px)" delay={90} />
      <div className="mi-mid">
        <b className="mi-vs">VS</b>
        {tag && <span className="mi-tag">{tag}</span>}
      </div>
      {!calm && <><SfxAt name="flip" delay={120} /><SfxAt name="stamp" delay={300} /></>}
    </div>
  );
}
