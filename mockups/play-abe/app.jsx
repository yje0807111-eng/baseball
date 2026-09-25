/* 경기 화면 연출 시연 — A 실루엣 동작 · B 결과 컷신 · E 카메라 연출 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const MINT = '#34d399', AMBER = '#fbbf24';
/* 실루엣은 마스크로 쓴다 — 색은 CSS 로 칠한다 */
const Sil = ({ src, w, color = '#0a0f18', style, shade = 0.92 }) => (
  <span className="pointer-events-none absolute block" style={{
    width: w, aspectRatio: '0.62', background: color, opacity: shade,
    WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
    WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'bottom center', maskPosition: 'bottom center', ...style,
  }} />
);
const CUTS = {
  HR: ['cut-hr', '홈런!', '#fde047'],
  K: ['cut-k', '삼진', '#f87171'],
  H: ['cut-hit', '안타', MINT],
  DP: ['cut-dp', '병살', '#f87171'],
  FO: ['cut-fo', '호수비', '#7dd3fc'],
  SB: ['cut-steal', '도루 성공', AMBER],
};
const KEYS = Object.keys(CUTS);

/* E — 카메라: 공이 오는 동안 살짝 밀고, 임팩트에 흔든다 */
const CAM = `
@keyframes camPush { 0% { transform: scale(1); } 100% { transform: scale(1.045); } }
@keyframes camShake { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 20% { transform: translate3d(-7px,4px,0) scale(1.06); } 45% { transform: translate3d(6px,-5px,0) scale(1.06); } 70% { transform: translate3d(-4px,-2px,0) scale(1.05); } }
@keyframes flashIn { 0% { opacity: 0; } 12% { opacity: .85; } 100% { opacity: 0; } }
@keyframes cutIn { 0% { opacity: 0; transform: scale(1.14); } 14% { opacity: 1; transform: scale(1.04); } 78% { opacity: 1; transform: scale(1.01); } 100% { opacity: 0; transform: scale(1); } }
@keyframes cutText { 0% { opacity: 0; transform: translateY(14px) scale(.94); } 18% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ballFly { 0% { transform: translate(0,0) scale(.35); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--bx), var(--by)) scale(1.5); opacity: 1; } }
@keyframes swingRot { 0% { transform: rotate(0deg); } 100% { transform: rotate(-6deg); } }
`;

function Stage() {
  const [phase, setPhase] = useState('idle'); // idle → wind → throw → hit
  const [cut, setCut] = useState(null);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);

  const pitch = (result) => {
    clear();
    setCut(null);
    setPhase('wind');
    timers.current.push(setTimeout(() => setPhase('throw'), 420));
    timers.current.push(setTimeout(() => setPhase('hit'), 1080));
    timers.current.push(setTimeout(() => { setCut(result); setPhase('idle'); }, 1240));
    timers.current.push(setTimeout(() => setCut(null), 3100));
  };

  const camAnim = phase === 'throw' ? 'camPush .62s ease-in forwards' : phase === 'hit' ? 'camShake .5s ease-out both' : 'none';
  return (
    <div className="relative overflow-hidden" style={{ width: 1400, height: 760, background: '#05080f' }}>
      <style>{CAM}</style>
      {/* 배경 + 선수: 이 층 전체가 카메라다 */}
      <div className="absolute inset-0" style={{ animation: camAnim, transformOrigin: '50% 62%' }}>
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/hud/c1.webp)' }} />
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(3,5,10,.6),rgba(3,5,10,0) 30%,rgba(3,5,10,.1) 70%,rgba(3,5,10,.75))' }} />
        {/* A — 투수: 세트 ↔ 릴리스 두 컷 */}
        <Sil src={`ui/act/${phase === 'wind' || phase === 'idle' ? 'p-set' : 'p-throw'}.webp`} w={132}
          style={{ left: '46.5%', bottom: '44%', transform: `translateX(-50%) ${phase === 'throw' || phase === 'hit' ? 'scale(1.06)' : 'scale(1)'}`, transition: 'transform .18s ease-out' }} />
        {/* A — 타자: 대기 ↔ 스윙 */}
        <Sil src={`ui/act/${phase === 'hit' ? 'b-swing' : 'b-set'}.webp`} w={phase === 'hit' ? 330 : 240} color="#070c14"
          style={{ right: '12%', bottom: '8%', transformOrigin: 'bottom center', animation: phase === 'hit' ? 'swingRot .22s ease-out both' : 'none' }} />
        {/* 공 */}
        {(phase === 'throw' || phase === 'hit') && (
          <i className="absolute block rounded-full bg-white" style={{
            left: '46.5%', bottom: '46%', width: 14, height: 14, boxShadow: '0 0 14px rgba(255,255,255,.85)',
            '--bx': '150px', '--by': '150px', animation: 'ballFly .62s cubic-bezier(.4,.1,.8,1) both',
          }} />
        )}
        {/* E — 임팩트 섬광 */}
        {phase === 'hit' && <span className="absolute inset-0" style={{ background: 'radial-gradient(40% 40% at 62% 62%, rgba(255,255,255,.75), transparent 70%)', animation: 'flashIn .45s ease-out both' }} />}
      </div>

      {/* B — 결과 컷신 */}
      {cut && (
        <>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(ui/act/${CUTS[cut][0]}.webp)`, animation: 'cutIn 1.9s ease-out both' }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.86),rgba(3,5,10,.15) 45%,rgba(3,5,10,.7))', animation: 'cutIn 1.9s ease-out both' }} />
          <div className="absolute" style={{ left: 60, bottom: 130, animation: 'cutText 1.9s ease-out both' }}>
            <p className="m-0 font-display text-[13px] font-bold tracking-[0.34em]" style={{ color: CUTS[cut][2] }}>THIS PLAY</p>
            <b className="mt-1 block text-[74px] font-black leading-none text-white" style={{ textShadow: '0 4px 24px rgba(0,0,0,.9)' }}>{CUTS[cut][1]}</b>
            <span className="mt-2 block text-[17px] text-white/80">윤동희 — 중견수 뒤 깊숙이</span>
          </div>
        </>
      )}

      {/* 조작 */}
      <div className="absolute flex flex-wrap gap-2" style={{ left: 24, top: 20 }}>
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => pitch(k)}
            className="ui-cut px-3.5 py-2 font-display text-[13px] font-bold text-white"
            style={{ '--c': '6px', background: 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 1px ${CUTS[k][2]}59` }}>
            {CUTS[k][1]}
          </button>
        ))}
      </div>
      <span className="absolute font-display text-[12px] tracking-[0.2em] text-white/40" style={{ left: 26, top: 66 }}>
        버튼을 누르면 투구 → 스윙 → 결과 컷신까지 한 번에 돕니다
      </span>
    </div>
  );
}

function Gallery() {
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">A 실루엣 · B 결과 컷신 · E 카메라 연출</b>
        <span>A: 투수·타자 실루엣이 세트 → 릴리스 → 스윙으로 바뀝니다</span>
        <span>· B: 결과마다 컷신 한 장</span>
        <span>· E: 공이 올 때 화면이 밀고 임팩트에 흔들립니다</span>
      </div>
      <Stage />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
