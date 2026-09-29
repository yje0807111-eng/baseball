/*
 * 경기 인트로 — '경기 시작'을 누르면 경기 화면이 먼저 뜨고, 그 위로 두 구단 현수막이 펼쳐졌다 말려 올라간다(목업 match-intro 7안).
 * 현수막은 진짜 걸개처럼: 막대는 화면 위 끝에 매달린 채 움직이지 않고, 천만 막대에서 아래로 풀려 내려온다
 * (예전엔 막대까지 통째로 떨어져 튕기느라 윗단이 화면 아래로 내려왔다 올라가 어색했다).
 * 순서 · 시간(스트리트 파이터 · 철권 · MLB 더 쇼 · KBO 중계 조사):
 *   0      가림막 흐려짐 · 줄 · 막대가 위 끝에 나타남(0.2초)          오른쪽(홈)은 0.09초 늦게
 *   0.08   천이 막대에서 풀려 내려옴(0.6초, 끝에 옷감이 1.8% 늘었다 되돌아옴 — 윗단은 그대로)
 *   0.26   가운데 VS 톡(0.38초) · 쿵 소리          0.32  천 위 글씨가 떠오름
 *   0.35   풀린 힘으로 한 번 크게 흔들렸다 잦아듦(1초, 2도 → 0)   1.35~  잔잔한 흔들림(1도) · 옷감 기울기 · 주름 흐름
 *   1.75   글씨 흐려짐 · 천이 막대로 말려 올라감(0.3초) · VS 흐려짐   1.95  막대 · 줄 사라짐 — 2.2 에 다 걷힘
 *   3.2    경기 화면을 1초 보여 준 뒤 onHandoff(증강 판) · onDone. 그 1초 동안 누르면 곧바로 증강
 * 누르면 곧바로 넘어간다. '애니메이션 줄이기'면 풀림 · 흔들림 없이 1.2초 보여 주고 넘어간다.
 * 한 팀에 보여 주는 것은 둘(종합 · 선발) — 읽을 수 있는 만큼만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { SfxAt, reducedMotion } from './ui/motion.jsx';

const CSS = `
.mi { position: fixed; inset: 0; z-index: 40; overflow: hidden; cursor: pointer; color: #fff; }
.mi-scrim { position: absolute; inset: 0; background: radial-gradient(70% 62% at 50% 50%, rgba(3,5,10,.45), rgba(3,5,10,.84)); animation: miFade .25s ease-out both, miOut .3s ease-in 1.75s forwards; }
.mi-ban { position: absolute; top: 0; width: 360px; }
/* 걸이 — 위 끝에서 내려오는 줄 둘 · 금속 막대(양끝 둥근 마개). 들어올 때 · 나갈 때 말고는 움직이지 않는다 */
.mi-cord { position: absolute; top: 0; width: 2px; height: 22px; background: linear-gradient(#6b7280, #d1d5db); box-shadow: 0 0 4px rgba(0,0,0,.6);
  animation: miHang .2s ease-out var(--d) both, miUnhang .15s ease-in calc(1950ms + var(--d)) forwards; }
.mi-rod { position: relative; z-index: 2; margin: 20px -18px 0; height: 12px; border-radius: 6px;
  background: linear-gradient(180deg, #f9fafb, #9ca3af 55%, #4b5563); box-shadow: 0 4px 10px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.6);
  animation: miHang .2s ease-out var(--d) both, miUnhang .15s ease-in calc(1950ms + var(--d)) forwards; }
.mi-rod > i { position: absolute; top: -3px; width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff, #9ca3af 55%, #374151); box-shadow: 0 2px 5px rgba(0,0,0,.5); }
/* 흔들림 — 막대 가운데를 축으로: 풀린 힘에 한 번 크게 → 잦아들고 → 잔잔하게. 두 현수막은 박자(3.2 · 3.7초)를 달리해 똑같이 움직이지 않는다 */
.mi-sway { margin-top: -5px; transform-origin: 50% 0;
  animation: miSettle 1s cubic-bezier(.3,.6,.4,1) calc(350ms + var(--d)) both, miSway var(--sp, 3.2s) ease-in-out calc(1350ms + var(--d)) infinite; }
/* 풀림 — 윗단을 막대에 붙인 채 아래로 드러난다(clip). 끝에 옷감이 조금 늘었다 되돌아옴. 옆은 흔들림 · 기울기만큼 여유를 둔다 */
.mi-unfurl { transform-origin: 50% 0;
  animation: miUnfurl .6s cubic-bezier(.22,1,.36,1) calc(80ms + var(--d)) both, miRoll .3s cubic-bezier(.55,0,.8,.4) calc(1750ms + var(--d)) forwards; }
.mi-cloth { position: relative; height: 640px; transform-origin: 50% 0; clip-path: polygon(0 0,100% 0,100% 92%,50% 100%,0 92%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), inset 0 14px 18px -10px rgba(0,0,0,.55);
  animation: miCloth 2.3s ease-in-out calc(650ms + var(--d)) infinite; }
.mi-folds { position: absolute; inset: 0; pointer-events: none; opacity: .5; mix-blend-mode: soft-light;
  background: repeating-linear-gradient(90deg, rgba(0,0,0,.5) 0, rgba(255,255,255,.35) 60px, rgba(0,0,0,.5) 120px); background-size: 240px 100%; animation: miFold 2.8s linear infinite; }
.mi-body { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 64px; gap: 20px; text-align: center;
  animation: miBodyIn .35s ease-out calc(320ms + var(--d)) both, miOut .15s ease-in calc(1750ms + var(--d)) forwards; }
.mi-emb { width: 170px; height: 170px; border-radius: 24%; background: center/cover no-repeat; box-shadow: 0 10px 30px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.18); }
.mi-mid { position: absolute; left: 0; right: 0; top: 300px; display: grid; place-items: center; gap: 20px; animation: miPop .38s cubic-bezier(.2,.9,.25,1) .26s both, miOut .3s ease-in 1.75s forwards; }
.mi-vs { font: italic 900 132px/.9 'Saira Condensed', sans-serif; letter-spacing: -.02em; text-shadow: 0 0 30px rgba(255,255,255,.35), 0 6px 0 rgba(0,0,0,.5); -webkit-text-stroke: 2px rgba(255,255,255,.2); }
.mi-tag { display: inline-flex; align-items: center; height: 34px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 700; color: #e5e7eb;
  background: rgba(6,10,19,.72); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); backdrop-filter: blur(8px); }
@keyframes miFade { from { opacity: 0; } }
@keyframes miOut { to { opacity: 0; transform: scale(.97); } }
@keyframes miPop { 0% { transform: scale(1.9); opacity: 0; } 62% { transform: scale(.95); opacity: 1; } 100% { transform: scale(1); } }
@keyframes miHang { from { opacity: 0; transform: translateY(-14px); } }
@keyframes miUnhang { to { opacity: 0; transform: translateY(-14px); } }
@keyframes miUnfurl { 0% { clip-path: inset(0 -40px 100% -40px); transform: scaleY(.92); } 72% { clip-path: inset(0 -40px -30px -40px); transform: scaleY(1.018); } 100% { clip-path: inset(0 -40px -30px -40px); transform: scaleY(1); } }
@keyframes miRoll { from { clip-path: inset(0 -40px -30px -40px); } to { clip-path: inset(0 -40px 100% -40px); transform: scaleY(.95); } }
@keyframes miBodyIn { from { opacity: 0; transform: translateY(-10px); } }
@keyframes miSettle { 0% { transform: rotate(0); } 25% { transform: rotate(2deg); } 55% { transform: rotate(-1.2deg); } 80% { transform: rotate(.45deg); } 100% { transform: rotate(0); } }
@keyframes miSway { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(1deg); } 75% { transform: rotate(-1deg); } }
@keyframes miCloth { 0%, 100% { transform: skewX(0); } 25% { transform: skewX(1.3deg) scaleX(.99); } 75% { transform: skewX(-1.3deg) scaleX(.99); } }
@keyframes miFold { to { background-position: 240px 0; } }
.mi.calm .mi-cord, .mi.calm .mi-rod, .mi.calm .mi-sway, .mi.calm .mi-unfurl, .mi.calm .mi-cloth, .mi.calm .mi-folds, .mi.calm .mi-body, .mi.calm .mi-mid, .mi.calm .mi-scrim { animation: miFade .15s ease-out both; }
`;

/** 팀 이름 '2014 삼성 라이온즈' → 연도 · 구단 (내 팀처럼 연도가 없으면 이름 그대로) */
const split = (name = '') => { const m = String(name).match(/^(\d{4})\s+(.*)$/); return m ? [m[1], m[2]] : ['', name]; };

function Banner({ t, left, delay, period }) {
  const [year, club] = split(t.name);
  return (
    <div className="mi-ban" style={{ left, '--d': `${delay}ms`, '--sp': period }}>
      <i className="mi-cord" style={{ left: 46 }} /><i className="mi-cord" style={{ right: 46 }} />
      <div className="mi-rod"><i style={{ left: -6 }} /><i style={{ right: -6 }} /></div>
      <div className="mi-sway">
        <div className="mi-unfurl">
          <div className="mi-cloth" style={{ background: `linear-gradient(180deg, ${t.color}cc, ${t.color}66 55%, ${t.color}aa)${t.bg ? `, url(${t.bg}) center/cover` : ''}` }}>
            <i className="mi-folds" />
            <div className="mi-body">
              <div className="mi-emb" style={{ backgroundImage: `url(${t.emblem})` }} />
              {year && <div className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.3em' }}>{year}</div>}
              <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, padding: '0 24px', textShadow: '0 3px 12px rgba(0,0,0,.45)', wordBreak: 'keep-all' }}>{club}</div>
              <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>종합 <b style={{ fontSize: 30 }}>{t.ovr}</b></span>
              {t.starter && <span style={{ fontSize: 18, fontWeight: 700 }}>선발 {t.starter}</span>}
            </div>
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
    const out = calm ? 1200 : 2200; // 막대 · 줄까지 사라지는 때
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
      <Banner t={away} left="15.6%" delay={0} period="3.2s" />
      <Banner t={home} left="calc(84.4% - 360px)" delay={90} period="3.7s" />
      <div className="mi-mid">
        <b className="mi-vs">VS</b>
        {tag && <span className="mi-tag">{tag}</span>}
      </div>
      {!calm && <><SfxAt name="flip" delay={120} /><SfxAt name="stamp" delay={300} /></>}
    </div>
  );
}
