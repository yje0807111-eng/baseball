/* 경기 연출 — 선수 없는 포수 시점 구장에 실루엣을 얹고, 구질마다 코스를 흔들어 던진다 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const W = 1400, H = 760;
/* 배경 그림에 맞춘 자리 — 마운드 · 홈플레이트 · 스트라이크 존 */
const MOUND = [700, 302];          // 투수판 — 투수는 여기에 발을 딛는다
const REL = [690, 214];            // 공이 손을 떠나는 자리(어깨 높이)
const PLATE = [687, 664];          // 홈플레이트
const BOX = [1046, 694];           // 오른쪽 타석 — 타자의 발
const ZONE = { x: 632, y: 452, w: 112, h: 132 }; // 존 — 플레이트 위 공중
/* 실루엣마다 가로세로가 다르다 — 키를 주면 폭은 비율대로 */
const SIL = { 'p-set': 243 / 760, 'p-throw': 290 / 760, 'b-set': 379 / 760, 'b-swing': 560 / 602 };
const cell = (col, row) => [ZONE.x + ZONE.w * (col + 0.5) / 3, ZONE.y + ZONE.h * (row + 0.5) / 3];

/* ── 구질: 속도와 휘는 결, 그리고 즐겨 가는 코스(칸)와 흔들리는 폭 ── */
const PITCH = {
  직구: { ms: 430, velo: 148, color: '#f87171', spots: [[1, 0], [1, 1], [0, 0], [2, 1]], jitter: 26, bend: [-6, -70, 4, 46] },
  슬라이더: { ms: 505, velo: 136, color: '#fbbf24', spots: [[2, 2], [2, 1], [1, 2]], jitter: 30, bend: [-48, -86, -8, 40] },
  커브: { ms: 620, velo: 121, color: '#7dd3fc', spots: [[1, 2], [0, 2], [1, 1]], jitter: 34, bend: [-30, -150, -14, 6] },
  체인지업: { ms: 560, velo: 128, color: '#a78bfa', spots: [[1, 2], [0, 1], [2, 2]], jitter: 30, bend: [-14, -92, 0, 30] },
  포크: { ms: 530, velo: 133, color: '#34d399', spots: [[1, 2], [1, 2], [0, 2]], jitter: 28, bend: [-8, -96, -2, 10] },
};
/* ── 결과: 스윙 시점(공 도달 기준 ms) · 타구 길 · 카메라 ── */
const RESULT = {
  HR: { ko: '홈런!', cut: 'cut-hr', color: '#fde047', swing: -30, sub: '가운데 담장을 넘어갑니다',
    ball: { to: [150, 70], via: [[520, 430], [300, 190]], ms: 1500, ease: 'cubic-bezier(.2,.5,.5,1)' }, shake: 'big' },
  '2B': { ko: '2루타', cut: 'cut-hit', color: '#34d399', swing: -10, sub: '우중간을 완전히 가릅니다',
    ball: { to: [1290, 330], via: [[900, 520], [1120, 390]], ms: 950, ease: 'cubic-bezier(.15,.7,.5,1)' }, shake: 'mid' },
  H: { ko: '안타', cut: 'cut-hit', color: '#34d399', swing: 12, sub: '2루수 옆을 빠져나갑니다',
    ball: { to: [1150, 452], via: [[850, 600], [1010, 500]], ms: 780, ease: 'cubic-bezier(.1,.8,.6,1)' }, shake: 'small' },
  FO: { ko: '뜬공 아웃', cut: 'cut-fo', color: '#7dd3fc', swing: -62, sub: '중견수가 자리에서 잡습니다',
    ball: { to: [660, 330], via: [[600, 260], [610, 220]], ms: 1300, ease: 'ease-out' }, shake: 'small' },
  DP: { ko: '병살', cut: 'cut-dp', color: '#f87171', swing: 58, sub: '유격수 앞 땅볼, 2루에서 1루로',
    ball: { to: [330, 470], via: [[600, 690], [430, 560]], ms: 760, ease: 'cubic-bezier(.3,.9,.7,1)' }, shake: 'small' },
  K: { ko: '삼진', cut: 'cut-k', color: '#f87171', swing: 150, sub: '헛스윙, 돌아섭니다', ball: null, shake: 'none' },
  KL: { ko: '루킹 삼진', cut: 'cut-k', color: '#f87171', swing: null, sub: '꼼짝 못 하고 섰습니다', ball: null, shake: 'none' },
  FOUL: { ko: '파울', cut: null, color: '#94a3b8', swing: 26, sub: '뒤로 크게 걷어냅니다',
    ball: { to: [1120, 40], via: [[820, 420], [1010, 150]], ms: 850, ease: 'ease-out' }, shake: 'small' },
};
const CSS = `
@keyframes camPush { from { transform: scale(1); } to { transform: scale(1.05); } }
@keyframes camBig { 0%,100% { transform: translate3d(0,0,0) scale(1.07); } 15% { transform: translate3d(-12px,7px,0) scale(1.09); } 38% { transform: translate3d(10px,-8px,0) scale(1.08); } 62% { transform: translate3d(-7px,-3px,0) scale(1.07); } 82% { transform: translate3d(4px,2px,0) scale(1.07); } }
@keyframes camMid { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 22% { transform: translate3d(-7px,4px,0) scale(1.06); } 55% { transform: translate3d(5px,-4px,0) scale(1.06); } }
@keyframes camSmall { 0%,100% { transform: translate3d(0,0,0) scale(1.04); } 30% { transform: translate3d(-3px,2px,0) scale(1.05); } }
@keyframes flashIn { 0% { opacity: 0; } 10% { opacity: .9; } 100% { opacity: 0; } }
@keyframes cutIn { 0% { opacity: 0; transform: scale(1.14); } 12% { opacity: 1; transform: scale(1.05); } 80% { opacity: 1; transform: scale(1.01); } 100% { opacity: 0; } }
@keyframes cutText { 0% { opacity: 0; transform: translateY(16px) scale(.94); } 16% { opacity: 1; transform: none; } 82% { opacity: 1; } 100% { opacity: 0; } }
@keyframes callOut { 0% { opacity: 0; transform: scale(1.5); } 18% { opacity: 1; transform: scale(1); } 74% { opacity: 1; } 100% { opacity: 0; transform: scale(.96); } }
@keyframes swingHit { 0% { transform: rotate(7deg); } 35% { transform: rotate(-9deg); } 100% { transform: rotate(-5deg); } }
@keyframes swingMiss { 0% { transform: rotate(5deg); } 45% { transform: rotate(-14deg); } 100% { transform: rotate(-9deg); } }
@keyframes trailFade { from { opacity: .9; } to { opacity: 0; } }
@keyframes spotPop { 0% { opacity: 0; transform: scale(.4); } 30% { opacity: 1; transform: scale(1.15); } 100% { opacity: .75; transform: scale(1); } }
@keyframes flyPath { from { offset-distance: 0%; width: 8px; height: 8px; } to { offset-distance: 100%; width: 21px; height: 21px; } }
@keyframes hitPath { from { offset-distance: 0%; opacity: 1; } 84% { opacity: 1; } to { offset-distance: 100%; opacity: 0; } }
`;
const Sil = ({ name, h, at, color = '#060a12', style }) => {
  const w = h * SIL[name];
  return (
    <span className="pointer-events-none absolute block" style={{
      left: at[0] - w / 2, top: at[1] - h, width: w, height: h, background: color,
      WebkitMaskImage: `url(ui/act/${name}.webp)`, maskImage: `url(ui/act/${name}.webp)`,
      WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'bottom center', maskPosition: 'bottom center', ...style,
    }} />
  );
};
/* 구질 · 코스에서 한 번의 투구를 만든다 */
function makePitch(key) {
  const p = PITCH[key];
  const [c, r] = p.spots[Math.floor(Math.random() * p.spots.length)];
  const [zx, zy] = cell(c, r);
  const jx = (Math.random() - 0.5) * 2 * p.jitter;
  const jy = (Math.random() - 0.5) * 2 * p.jitter;
  const end = [Math.round(zx + jx), Math.round(zy + jy)];
  const [bx1, by1, bx2, by2] = p.bend;
  const c1 = [Math.round(REL[0] + (end[0] - REL[0]) * 0.28 + bx1), Math.round(REL[1] + (end[1] - REL[1]) * 0.42 + by1 * 0.25)];
  const c2 = [Math.round(REL[0] + (end[0] - REL[0]) * 0.72 + bx2), Math.round(REL[1] + (end[1] - REL[1]) * 0.82 + by2 * 0.3)];
  const ball = `M ${REL[0]} ${REL[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${end[0]} ${end[1]}`;
  // 존 안인지 — 코스 표시에 쓴다
  const inZone = end[0] > ZONE.x && end[0] < ZONE.x + ZONE.w && end[1] > ZONE.y && end[1] < ZONE.y + ZONE.h;
  return { key, ...p, end, path: ball, inZone };
}
const hitPath = (b) => `M ${PLATE[0]} ${PLATE[1] - 70} C ${b.via[0][0]} ${b.via[0][1]}, ${b.via[1][0]} ${b.via[1][1]}, ${b.to[0]} ${b.to[1]}`;

function Stage() {
  const [pitchKey, setPitchKey] = useState('직구');
  const [shot, setShot] = useState(null);   // 이번 투구
  const [play, setPlay] = useState(null);   // 결과 키
  const [step, setStep] = useState('idle');
  const [cut, setCut] = useState(null);
  const [marks, setMarks] = useState([]);   // 이 타석에 들어온 공 자리
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);

  const run = (resKey, key = pitchKey) => {
    clear(); setCut(null);
    const s = makePitch(key); const r = RESULT[resKey];
    setShot(s); setPlay(resKey); setStep('wind');
    const t = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    const arrive = 300 + s.ms;
    t(300, () => setStep('fly'));
    if (r.swing !== null) t(Math.max(320, arrive + r.swing - 90), () => setStep('swing'));
    t(arrive, () => { setStep('after'); setMarks((m) => [...m.slice(-4), { x: s.end[0], y: s.end[1], c: s.color }]); });
    const wait = r.ball ? r.ball.ms * 0.72 : 420;
    t(arrive + wait, () => setCut(resKey));
    t(arrive + wait + 1900, () => { setCut(null); setStep('idle'); setPlay(null); setShot(null); });
  };
  const r = play ? RESULT[play] : null;
  const flying = step === 'fly';
  const hitting = step === 'after' && r?.ball;
  const cam = step === 'fly' ? `camPush ${(shot?.ms || 430)}ms ease-in forwards`
    : step === 'after' && r && r.shake !== 'none' ? `cam${r.shake === 'big' ? 'Big' : r.shake === 'mid' ? 'Mid' : 'Small'} .55s ease-out both` : 'none';
  const swinging = step === 'swing' || (step === 'after' && r && r.swing !== null);
  const missed = play === 'K' || play === 'FOUL';

  return (
    <div className="relative overflow-hidden" style={{ width: W, height: H, background: '#05080f' }}>
      <style>{CSS}</style>
      <div className="absolute inset-0" style={{ animation: cam, transformOrigin: '50% 58%' }}>
        {/* 선수 없는 구장 — 실루엣과 같은 눈높이 */}
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/act/field-cam.webp)' }} />
        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(3,5,10,.55),rgba(3,5,10,0) 26%,rgba(3,5,10,.06) 66%,rgba(3,5,10,.6))' }} />
        {/* 투수 — 마운드 위에 선다 */}
        <Sil name={step === 'idle' || step === 'wind' ? 'p-set' : 'p-throw'} h={148} at={MOUND}
          style={{ transformOrigin: 'bottom center', transform: `scale(${step === 'wind' ? 1.03 : step === 'idle' ? 1 : 1.06})`, transition: 'transform .16s ease-out' }} />
        <span className="pointer-events-none absolute rounded-[50%]" style={{ left: MOUND[0] - 34, top: MOUND[1] - 7, width: 68, height: 12, background: 'rgba(0,0,0,.5)', filter: 'blur(5px)' }} />
        {/* 타자 — 오른쪽 타석 */}
        <Sil name={swinging ? 'b-swing' : 'b-set'} h={swinging ? 268 : 300} at={BOX}
          style={{ transformOrigin: 'bottom center',
            animation: swinging ? `${missed ? 'swingMiss' : 'swingHit'} .26s ease-out both` : 'none' }} />
        <span className="pointer-events-none absolute rounded-[50%]" style={{ left: BOX[0] - 62, top: BOX[1] - 10, width: 124, height: 18, background: 'rgba(0,0,0,.5)', filter: 'blur(7px)' }} />

        <svg className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
          <rect x={ZONE.x} y={ZONE.y} width={ZONE.w} height={ZONE.h} fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.26)" strokeWidth="1.5" />
          {[1, 2].map((i) => <line key={`v${i}`} x1={ZONE.x + ZONE.w * i / 3} y1={ZONE.y} x2={ZONE.x + ZONE.w * i / 3} y2={ZONE.y + ZONE.h} stroke="rgba(255,255,255,.12)" />)}
          {[1, 2].map((i) => <line key={`h${i}`} x1={ZONE.x} y1={ZONE.y + ZONE.h * i / 3} x2={ZONE.x + ZONE.w} y2={ZONE.y + ZONE.h * i / 3} stroke="rgba(255,255,255,.12)" />)}
          {/* 이 타석에 들어온 공 자리 */}
          {marks.map((m, i) => (
            <circle key={i} cx={m.x} cy={m.y} r="7" fill="none" stroke={m.c} strokeWidth="2" opacity={0.3 + i * 0.16} />
          ))}
          {shot && (flying || step === 'swing' || step === 'after') && (
            <path d={shot.path} fill="none" stroke={shot.color} strokeWidth="2.5" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${shot.color})`, opacity: 0.85, animation: step === 'after' ? 'trailFade .5s ease-out both' : undefined }} />
          )}
          {hitting && <path d={hitPath(r.ball)} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" strokeDasharray="6 8" style={{ animation: 'trailFade 1s ease-out both' }} />}
          {step === 'after' && shot && (
            <circle cx={shot.end[0]} cy={shot.end[1]} r="9" fill={shot.inZone ? shot.color : 'transparent'} stroke={shot.color} strokeWidth="2.5" style={{ animation: 'spotPop .35s ease-out both' }} />
          )}
        </svg>
        {flying && shot && (
          <i key={`${shot.key}-${shot.end.join()}`} className="absolute block rounded-full bg-white"
            style={{ left: 0, top: 0, width: 14, height: 14, marginLeft: -7, marginTop: -7,
              boxShadow: `0 0 16px ${shot.color}`, offsetPath: `path("${shot.path}")`, offsetRotate: '0deg',
              animation: `flyPath ${shot.ms}ms cubic-bezier(.36,.06,.6,1) both` }} />
        )}
        {hitting && (
          <i key={`hit-${play}`} className="absolute block rounded-full bg-white"
            style={{ left: 0, top: 0, width: 16, height: 16, marginLeft: -8, marginTop: -8,
              boxShadow: '0 0 18px rgba(255,255,255,.9)', offsetPath: `path("${hitPath(r.ball)}")`, offsetRotate: '0deg',
              animation: `hitPath ${r.ball.ms}ms ${r.ball.ease} both` }} />
        )}
        {step === 'after' && r?.ball && (
          <span className="absolute inset-0" style={{ background: `radial-gradient(26% 26% at ${(PLATE[0] / W) * 100}% ${((PLATE[1] - 70) / H) * 100}%, rgba(255,255,255,.75), transparent 70%)`, animation: 'flashIn .4s ease-out both' }} />
        )}
      </div>

      {(flying || step === 'swing') && shot && (
        <div className="absolute" style={{ right: 40, top: 120 }}>
          <b className="block text-right font-display text-[40px] font-extrabold leading-none" style={{ color: shot.color, textShadow: '0 2px 12px rgba(0,0,0,.85)' }}>{shot.velo}<small className="ml-1 text-[16px]">km/h</small></b>
          <span className="mt-1 block text-right text-[18px] font-bold text-white/85">{shot.key}</span>
          <span className="mt-0.5 block text-right font-display text-[12px] tracking-[0.18em]" style={{ color: shot.inZone ? '#a7f3d0' : '#fca5a5' }}>{shot.inZone ? 'IN ZONE' : 'OUT'}</span>
        </div>
      )}
      {step === 'after' && r && !cut && (
        <b className="absolute text-[64px] font-black" style={{ left: 80, top: 250, color: r.color, textShadow: '0 4px 20px rgba(0,0,0,.9)', animation: 'callOut .9s ease-out both' }}>{r.ko}</b>
      )}
      {cut && RESULT[cut].cut && (
        <>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(ui/act/${RESULT[cut].cut}.webp)`, animation: 'cutIn 1.9s ease-out both' }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.86),rgba(3,5,10,.12) 46%,rgba(3,5,10,.7))', animation: 'cutIn 1.9s ease-out both' }} />
          <div className="absolute" style={{ left: 60, bottom: 120, animation: 'cutText 1.9s ease-out both' }}>
            <p className="m-0 font-display text-[13px] font-bold tracking-[0.34em]" style={{ color: RESULT[cut].color }}>{shot?.key} {shot?.velo}km/h</p>
            <b className="mt-1 block text-[72px] font-black leading-none text-white" style={{ textShadow: '0 4px 24px rgba(0,0,0,.9)' }}>{RESULT[cut].ko}</b>
            <span className="mt-2 block text-[17px] text-white/80">{RESULT[cut].sub}</span>
          </div>
        </>
      )}

      <div className="absolute" style={{ left: 24, top: 18 }}>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PITCH).map(([k, v]) => (
            <button key={k} type="button" onClick={() => setPitchKey(k)}
              className="ui-cut px-3 py-1.5 font-display text-[12.5px] font-bold"
              style={{ '--c': '5px', background: pitchKey === k ? v.color : 'rgba(7,12,20,.86)', color: pitchKey === k ? '#05080f' : '#d1d5db', boxShadow: `inset 0 0 0 1px ${v.color}59` }}>
              {k} <small className="opacity-70">{v.velo}</small>
            </button>
          ))}
          <button type="button" onClick={() => setMarks([])} className="ui-cut px-3 py-1.5 text-[12px] text-white/60" style={{ '--c': '5px', background: 'rgba(7,12,20,.7)' }}>자취 지우기</button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.entries(RESULT).map(([k, v]) => (
            <button key={k} type="button" onClick={() => run(k)}
              className="ui-cut px-3 py-1.5 text-[12.5px] font-bold text-white"
              style={{ '--c': '5px', background: 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 1px ${v.color}59` }}>{v.ko}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">구질 · 코스 · 타이밍</b>
        <span>같은 구질도 던질 때마다 코스가 달라집니다 — 존에 들어오면 색이 차고, 빠지면 테두리만 남습니다</span>
      </div>
      <Stage />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
