/*
 * 경기 인트로 — '경기 시작'을 누르면 경기 화면이 먼저 뜨고, 그 위로 두 구단 이름이 크게 떠올랐다 사라진 뒤 증강 판(목업 match-intro2 4안 · 키네틱 타이포).
 * 깃발처럼 물체를 흉내 내는 움직임은 CSS 로는 어색해 뺐다 — 글자 자체가 주인공인 중계 타이틀(MLB 더 쇼)처럼.
 * 순서 · 시간(스트리트 파이터 · 철권 · MLB 더 쇼 · KBO 중계 조사):
 *   0      가림막 짙어짐(0.25초) · 원정 이름이 흐린 채 크게 다가와 또렷해짐(0.5초, 1.5배 → 1)   0.11  홈 이름
 *   0.30   가운데 윤곽선 VS · 쿵 소리        0.30 / 0.38  구단 색 밑줄이 그어짐(0.42초)     0.32  모드 꼬리표
 *   1.75   모두 흐려짐(0.3초) — 2.05 에 다 사라짐
 *   3.05   경기 화면을 1초 보여 준 뒤 onHandoff(증강 판) · onDone. 그 1초 동안 누르면 곧바로 증강
 * 누르면 곧바로 넘어간다. '애니메이션 줄이기'면 움직임 없이 1.2초 보여 주고 넘어간다.
 * 한 팀에 보여 주는 것은 둘(종합 · 선발) — 읽을 수 있는 만큼만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { SfxAt, reducedMotion } from './ui/motion.jsx';

const CSS = `
.mi { position: fixed; inset: 0; z-index: 40; overflow: hidden; cursor: pointer; color: #fff; }
.mi-scrim { position: absolute; inset: 0; background: radial-gradient(80% 70% at 50% 50%, rgba(3,5,10,.82), rgba(3,5,10,.93)); animation: miFade .25s ease-out both, miOut .3s ease-in 1.75s forwards; }
.mi-team { position: absolute; left: 7.8%; right: 7.8%; animation: miZoom .5s cubic-bezier(.16,1,.3,1) var(--d) both, miOut .3s cubic-bezier(.5,0,.75,.35) 1.75s forwards; }
.mi-eyebrow { font: 700 22px 'Saira Condensed', sans-serif; letter-spacing: .4em; }
.mi-name { font-weight: 900; line-height: 1; letter-spacing: -.02em; white-space: nowrap; text-shadow: 0 6px 30px rgba(0,0,0,.5); }
.mi-line { height: 6px; width: 520px; margin-top: 14px; animation: miWipe .42s cubic-bezier(.16,1,.3,1) var(--ld) both; }
.mi-chip { display: inline-flex; align-items: baseline; gap: 8px; }
.mi-chip small { font-size: 13px; font-weight: 700; color: #9ca3af; }
.mi-chip b { font: 800 26px 'Saira Condensed', sans-serif; }
.mi-vs { position: absolute; left: 0; right: 0; top: 41.7%; text-align: center; font: italic 900 150px/.9 'Saira Condensed', sans-serif; color: transparent; -webkit-text-stroke: 2px rgba(255,255,255,.85);
  animation: miZoom .5s cubic-bezier(.16,1,.3,1) .3s both, miOut .3s ease-in 1.75s forwards; }
.mi-tag { position: absolute; left: 0; right: 0; bottom: 40px; text-align: center; animation: miFade .42s ease-out .32s both, miOut .3s ease-in 1.75s forwards; }
.mi-tag span { display: inline-flex; align-items: center; height: 34px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 700; color: #e5e7eb;
  background: rgba(6,10,19,.72); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
@keyframes miFade { from { opacity: 0; } }
@keyframes miOut { to { opacity: 0; transform: scale(.98); } }
@keyframes miZoom { from { opacity: 0; transform: scale(1.5); filter: blur(12px); } }
@keyframes miWipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.mi-team.home .mi-line { animation-name: miWipeL; }
@keyframes miWipeL { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
.mi.calm .mi-scrim, .mi.calm .mi-team, .mi.calm .mi-line, .mi.calm .mi-vs, .mi.calm .mi-tag { animation: miFade .15s ease-out both; }
`;

/** 팀 이름 '2014 삼성 라이온즈' → 연도 · 구단 (내 팀처럼 연도가 없으면 이름 그대로) */
const split = (name = '') => { const m = String(name).match(/^(\d{4})\s+(.*)$/); return m ? [m[1], m[2]] : ['', name]; };
/* 이름이 길면 글자를 줄인다 — 한 줄로(화면 폭 1,620px 안) */
const sizeOf = (s) => (s.length <= 7 ? 132 : s.length <= 10 ? 112 : 92);

function Team({ t, home }) {
  const [year, club] = split(t.name);
  return (
    <div className={`mi-team ${home ? 'home' : ''}`} style={{ top: home ? '58%' : '16.5%', textAlign: home ? 'right' : 'left', '--d': home ? '110ms' : '0ms' }}>
      <div className="mi-eyebrow" style={{ color: t.color }}>{year ? `${year} ` : ''}{home ? 'HOME' : 'AWAY'}</div>
      <div className="mi-name" style={{ fontSize: sizeOf(club) }}>{club}</div>
      <div className="mi-line" style={{ '--ld': home ? '380ms' : '300ms', marginLeft: home ? 'auto' : 0, background: `linear-gradient(${home ? 270 : 90}deg, ${t.color}, ${t.color}33)` }} />
      <div style={{ display: 'flex', gap: 26, marginTop: 14, justifyContent: home ? 'flex-end' : 'flex-start' }}>
        <span className="mi-chip"><small>종합</small><b style={{ color: t.color }}>{t.ovr}</b></span>
        {t.starter && <span className="mi-chip"><small>선발</small><b style={{ fontFamily: 'inherit', fontSize: 20 }}>{t.starter}</b></span>}
      </div>
    </div>
  );
}

/**
 * away · home: { name, color, ovr, starter } — 원정은 위 왼쪽, 홈(내 팀)은 아래 오른쪽(전광판과 같은 순서)
 * onHandoff: 다음 판(증강)을 띄울 때 · onDone: 인트로를 걷을 때
 */
export default function MatchIntro({ away, home, tag, onHandoff, onDone }) {
  const calm = useRef(reducedMotion()).current;
  const fired = useRef(false);
  const cb = useRef({ onHandoff, onDone });
  cb.current = { onHandoff, onDone };
  const handoff = () => { if (!fired.current) { fired.current = true; cb.current.onHandoff?.(); } };
  /* 글자가 다 사라지는 때 · 그 뒤 1초 쉬고 증강 */
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
      <Team t={away} />
      <Team t={home} home />
      <b className="mi-vs">VS</b>
      {tag && <div className="mi-tag"><span>{tag}</span></div>}
      {/* 소리: 한 벌(이름 다가옴 · VS 쾅 · 먼 관중)이 화면 박자에 맞춰 들어 있다. 경기 시작 단추가 이미 화면 이동 소리를 냈으니 여기서 또 내지 않는다 */}
      {!calm && <SfxAt name="introFull" delay={0} />}
    </div>
  );
}
