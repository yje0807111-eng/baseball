/*
 * 플레이 뷰 — 대본(playScript)을 실제 움직임으로 그린다.
 *
 * 공 하나마다: 포수 뒤 존 뷰로 투구를 보여 주고, 맞으면 위에서 본 필드 뷰로 컷 전환해
 * 타구·수비·주자를 따라간다. 선수는 아직 점과 이름으로만 그린다 — 대본은 그대로 두고
 * 이 파일의 그리는 부분만 스프라이트로 갈아 끼우면 된다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlay, pitchTarget, along, phase, ease, spot, fenceAt, BASE_POS, FIELDERS, HOME, ZONE } from './playScript.js';

/* 필드 좌표 → 화면 좌표. 가로로 조금 늘려(중계 카메라처럼) 넓은 칸을 채운다 */
const WIDE = 1.5;
const FX = (p) => p[0] * WIDE;
const FY = (p) => 1.08 - p[1];

const GRASS = '#12452c';
const DIRT = '#6b4626';
const LINE = 'rgba(255,255,255,.26)';

/* ───────── 시계: 공 하나에 배정된 시간을 0~1 로 ───────── */
function useClock(key, durMs, paused) {
  const [t, setT] = useState(1);
  const acc = useRef(0);
  const last = useRef(0);
  useEffect(() => { acc.current = 0; last.current = performance.now(); setT(0); }, [key]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const dt = now - last.current;
      last.current = now;
      if (!paused) {
        acc.current += dt;
        const u = Math.min(1, acc.current / Math.max(1, durMs));
        setT((prev) => (prev === u ? prev : u));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durMs, paused]);
  return t;
}

/* ───────── 필드 바탕 (움직이지 않는 것) ───────── */
const FieldBase = React.memo(function FieldBase() {
  const arc = (r, n) => { const a = []; for (let i = -1; i <= 1.0001; i += 2 / n) a.push(spot(i, typeof r === 'function' ? r(i) : r)); return a; };
  const poly = (pts) => `M ${FX(HOME)} ${FY(HOME)} ` + pts.map((q) => `L ${FX(q)} ${FY(q)}`).join(' ') + ' Z';
  const grass = poly(arc(fenceAt, 48));
  const dirt = poly(arc(0.3, 18));
  const diamond = [...BASE_POS.slice(0, 3), HOME].map((q, i) => `${i ? 'L' : 'M'} ${FX(q)} ${FY(q)}`).join(' ') + ' Z';
  // 잔디 깎은 줄무늬 — 홈에서 부챗살로 번갈아
  const mow = [];
  for (let i = 0; i < 9; i += 2) {
    const a = -1 + (i * 2) / 9;
    const b = -1 + ((i + 1) * 2) / 9;
    const pts = [];
    for (let d = a; d <= b + 0.0001; d += (b - a) / 4) pts.push(spot(d, fenceAt(d)));
    mow.push(`M ${FX(HOME)} ${FY(HOME)} ` + pts.map((q) => `L ${FX(q)} ${FY(q)}`).join(' ') + ' Z');
  }
  return (
    <g>
      <rect x="-0.95" y="-0.02" width="1.9" height="1.16" fill="url(#pv-night)" />
      <path d={grass} fill={GRASS} />
      <path d={grass} fill="url(#pv-grass)" opacity="0.55" />
      {mow.map((d, i) => <path key={i} d={d} fill="#fff" opacity="0.045" />)}
      <path d={grass} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.008" />
      <path d={dirt} fill={DIRT} opacity="0.9" />
      <path d={diamond} fill={GRASS} />
      <path d={diamond} fill="none" stroke={LINE} strokeWidth="0.007" />
      {[-1, 1].map((d) => {
        const q = spot(d, fenceAt(d));
        return <line key={d} x1={FX(HOME)} y1={FY(HOME)} x2={FX(q)} y2={FY(q)} stroke="rgba(255,255,255,.4)" strokeWidth="0.006" />;
      })}
      <circle cx={FX([0, 0.151])} cy={FY([0, 0.151])} r="0.034" fill={DIRT} />
      {BASE_POS.slice(0, 3).map((q, i) => (
        <rect key={i} x={FX(q) - 0.016} y={FY(q) - 0.016} width="0.032" height="0.032" fill="#eef3f8" transform={`rotate(45 ${FX(q)} ${FY(q)})`} />
      ))}
      <path d={`M -0.02 ${FY(HOME) - 0.006} L 0.02 ${FY(HOME) - 0.006} L 0.02 ${FY(HOME) + 0.012} L 0 ${FY(HOME) + 0.026} L -0.02 ${FY(HOME) + 0.012} Z`} fill="#eef3f8" />
    </g>
  );
});

const Chip = ({ at, color, label, name, r = 0.026, dim = false, ring = false }) => (
  <g opacity={dim ? 0.4 : 1}>
    {ring && <circle cx={FX(at)} cy={FY(at)} r={r * 2.2} fill="none" stroke={color} strokeWidth="0.008" opacity="0.6" />}
    <circle cx={FX(at)} cy={FY(at)} r={r} fill={color} stroke="rgba(0,0,0,.6)" strokeWidth="0.007" />
    {label && <text x={FX(at)} y={FY(at) + 0.011} textAnchor="middle" fontSize={label.length > 1 ? 0.028 : 0.036} fontWeight="800" fill="#05080f">{label}</text>}
    {name && <text x={FX(at)} y={FY(at) - r - 0.016} textAnchor="middle" fontSize="0.04" fontWeight="700" fill="#fff"
      stroke="rgba(0,0,0,.85)" strokeWidth="0.014" paintOrder="stroke">{name}</text>}
  </g>
);

/* ───────── 필드 뷰 ───────── */
function FieldView({ play, t, bases, offColor, defColor }) {
  const beats = play?.beats || [];
  const ball = beats.find((b) => b.kind === 'ball');
  const fielder = beats.find((b) => b.kind === 'fielder');
  const thrown = beats.find((b) => b.kind === 'throw');
  const runs = beats.filter((b) => b.kind === 'run');
  const steal = beats.find((b) => b.kind === 'steal');

  let ballAt = null, lift = 0, trail = null, landed = false;
  if (ball && t >= ball.t0) {
    const u = phase(t, ball.t0, ball.t1);
    const at = [ball.from[0] + (ball.to[0] - ball.from[0]) * u, ball.from[1] + (ball.to[1] - ball.from[1]) * u];
    ballAt = at;
    lift = Math.sin(Math.PI * Math.min(1, u)) * Math.max(0, ball.loft) * 0.006;
    landed = u >= 1;
    trail = `M ${FX(ball.from)} ${FY(ball.from)} L ${FX(at)} ${FY(at) - lift}`;
  }
  let throwAt = null;
  if (thrown && t >= thrown.t0) {
    const u = ease(phase(t, thrown.t0, thrown.t1));
    throwAt = [thrown.from[0] + (thrown.to[0] - thrown.from[0]) * u, thrown.from[1] + (thrown.to[1] - thrown.from[1]) * u];
  }

  return (
    <>
      <FieldBase />
      {trail && <path d={trail} stroke="rgba(253,224,71,.55)" strokeWidth="0.009" fill="none" strokeLinecap="round" />}

      {Object.entries(FIELDERS).map(([pos, home]) => {
        const acting = fielder && fielder.pos === pos;
        let at = home;
        if (acting && t >= fielder.t0) {
          const u = ease(phase(t, fielder.t0, fielder.t1));
          at = [home[0] + (fielder.to[0] - home[0]) * u, home[1] + (fielder.to[1] - home[1]) * u];
        }
        return <Chip key={pos} at={at} color={acting ? '#fff' : '#cbd5e1'} label={pos} r={0.028} ring={acting} dim={!acting && !!play} />;
      })}

      {!play && bases.map((r, i) => (r ? <Chip key={i} at={BASE_POS[i]} color={offColor} name={r.name} r={0.026} /> : null))}
      {runs.map((b, i) => {
        const u = ease(phase(t, b.t0, b.t1));
        const done = u >= 1;
        return <Chip key={`r${i}`} at={along(b.path, u)} r={0.026} name={b.player?.name} dim={(b.out && done) || b.still} ring={b.scored && done}
          color={b.out && done ? '#6b7280' : b.scored && done ? '#fde047' : offColor} />;
      })}
      {steal && t >= steal.t0 && (() => {
        const u = ease(phase(t, steal.t0, steal.t1));
        return <Chip at={along(steal.path, u)} r={0.026} name={steal.player?.name} ring={u >= 1} color={steal.ok ? offColor : '#6b7280'} />;
      })()}

      {throwAt && <circle cx={FX(throwAt)} cy={FY(throwAt)} r="0.015" fill="#fff" />}
      {ballAt && (
        <g>
          <ellipse cx={FX(ballAt)} cy={FY(ballAt)} rx="0.018" ry="0.009" fill="rgba(0,0,0,.5)" />
          <circle cx={FX(ballAt)} cy={FY(ballAt) - lift} r={0.036} fill="rgba(253,224,71,.28)" />
          <circle cx={FX(ballAt)} cy={FY(ballAt) - lift} r={landed ? 0.015 : 0.019} fill="#fff" stroke="#fde047" strokeWidth="0.008" />
        </g>
      )}
      {ball?.gone && t > ball.t1 - 0.12 && (
        <text x="0" y={FY(spot(0, 0.9))} textAnchor="middle" fontSize="0.1" fontWeight="900" fill="#fde047"
          stroke="rgba(0,0,0,.9)" strokeWidth="0.026" paintOrder="stroke">GONE!</text>
      )}
    </>
  );
}

/* ───────── 존 뷰 (포수 뒤) ───────── */
const Z = { x: ZONE.w, y: ZONE.h };
const PITCH_KO = { fast: '직구', slider: '슬라이더', change: '체인지업' };

function ZoneView({ play, t, history, atBat, defColor }) {
  const beats = play?.beats || [];
  const p = beats.find((b) => b.kind === 'pitch');
  const swing = beats.find((b) => b.kind === 'swing');
  const call = beats.find((b) => b.kind === 'call');

  let ball = null, r = 0.03;
  if (p && t >= p.t0) {
    const u = Math.min(1, phase(t, p.t0, p.t1));
    const k = u * u; // 늦게 휜다
    ball = [p.from[0] + (p.to[0] - p.from[0]) * u + p.bend[0] * k, p.from[1] + (p.to[1] - p.from[1]) * u + p.bend[1] * k];
    r = 0.014 + 0.036 * u * u;
  }
  const sw = swing ? phase(t, swing.t0, swing.t1) : 0;
  const wind = p ? phase(t, 0, p.t0 + 0.03) : 1; // 와인드업 → 릴리스

  return (
    <>
      {/* 포수 뒤 카메라 — 멀리 스탠드와 그라운드 */}
      <g mask="url(#pv-edge)">
        <rect x="-1.2" y="-0.66" width="2.4" height="1.44" fill="url(#pv-stand)" />
        <rect x="-1.2" y="-0.28" width="2.4" height="1.06" fill="url(#pv-turf)" />
        <line x1="-1.2" y1="-0.28" x2="1.2" y2="-0.28" stroke="rgba(255,255,255,.14)" strokeWidth="0.008" />
      </g>

      {/* 마운드 위 투수 (멀리) */}
      <ellipse cx="0.06" cy="-0.44" rx="0.12" ry="0.03" fill="rgba(107,70,38,.85)" />
      <g transform={`translate(0.06 -0.53) rotate(${-20 + 32 * ease(wind)})`}>
        <rect x="-0.028" y="-0.07" width="0.056" height="0.145" rx="0.028" fill={defColor} opacity="0.9" />
        <circle cx="0" cy="-0.096" r="0.028" fill={defColor} />
      </g>

      {/* 스트라이크존 */}
      <rect x={-Z.x} y={-Z.y} width={Z.x * 2} height={Z.y * 2} fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)" strokeWidth="0.012" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={-Z.x + (i % 3) * (Z.x * 2 / 3)} y={-Z.y + Math.floor(i / 3) * (Z.y * 2 / 3)}
          width={Z.x * 2 / 3} height={Z.y * 2 / 3} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="0.005" />
      ))}

      {/* 이 타석에 지나간 공 */}
      {history.map((h, i) => (
        <g key={i} opacity="0.8">
          <circle cx={h.at[0]} cy={h.at[1]} r="0.036" fill={h.tone === 'ball' ? 'rgba(52,211,153,.28)' : 'rgba(253,224,71,.28)'}
            stroke={h.tone === 'ball' ? '#34d399' : '#fde047'} strokeWidth="0.008" />
          <text x={h.at[0]} y={h.at[1] + 0.016} textAnchor="middle" fontSize="0.045" fontWeight="800" fill="#fff">{i + 1}</text>
        </g>
      ))}

      {/* 타자 — 배트는 손에 붙어 돈다 */}
      <g transform="translate(-0.56 0.06)">
        <ellipse cx="0" cy="0.34" rx="0.14" ry="0.04" fill="rgba(0,0,0,.4)" />
        <rect x="-0.062" y="-0.28" width="0.124" height="0.6" rx="0.062" fill="rgba(16,185,129,.42)" stroke="rgba(52,211,153,.85)" strokeWidth="0.011" />
        <circle cx="0" cy="-0.34" r="0.06" fill="rgba(52,211,153,.85)" />
        <g transform={`translate(0.04 -0.19) rotate(${-98 + 150 * ease(sw)})`}>
          <line x1="0" y1="0" x2="0.5" y2="0" stroke="#d9b989" strokeWidth="0.03" strokeLinecap="round" />
        </g>
      </g>

      {/* 홈플레이트 · 포수 */}
      <path d="M -0.13 0.5 L 0.13 0.5 L 0.13 0.56 L 0 0.62 L -0.13 0.56 Z" fill="#eef3f8" opacity="0.8" />
      <path d="M -0.46 0.86 Q 0 0.42 0.46 0.86 Z" fill="rgba(5,8,15,.92)" />
      <circle cx="0.22" cy="0.5" r="0.072" fill="rgba(104,80,52,.95)" stroke="rgba(0,0,0,.6)" strokeWidth="0.01" />

      {/* 지금 공 */}
      {ball && (
        <>
          <circle cx={ball[0]} cy={ball[1]} r={r * 2} fill={p.inZone ? 'rgba(253,224,71,.2)' : 'rgba(52,211,153,.18)'} />
          <circle cx={ball[0]} cy={ball[1]} r={r} fill="#fff" stroke="rgba(0,0,0,.45)" strokeWidth="0.007" />
        </>
      )}
      {call && t >= call.t0 && (
        <text x="-1.14" y="-0.3" fontSize="0.15" fontWeight="900"
          fill={call.tone === 'ball' ? '#34d399' : '#fde047'} stroke="rgba(0,0,0,.85)" strokeWidth="0.032" paintOrder="stroke">{call.label}</text>
      )}

      {/* 오른쪽: 이 타석에 던진 공 */}
      <g>
        <text x="0.7" y="-0.4" fontSize="0.05" fontWeight="800" fill="rgba(148,163,184,.9)">THIS AT-BAT</text>
        {atBat.slice(-7).map((e, i, arr) => {
          const now = i === arr.length - 1;
          const tone = e.call === 'ball' ? '#34d399' : e.call === 'inplay' ? '#fff' : '#fde047';
          return (
            <g key={i} opacity={now ? 1 : 0.6}>
              <rect x="0.68" y={-0.33 + i * 0.1} width="0.46" height="0.084" fill={now ? 'rgba(255,255,255,.14)' : 'rgba(5,8,15,.55)'} />
              <rect x="0.68" y={-0.33 + i * 0.1} width="0.011" height="0.084" fill={tone} />
              <text x="0.72" y={-0.271 + i * 0.1} fontSize="0.055" fontWeight="700" fill="#e2e8f0">{PITCH_KO[e.pitch?.type] || ''}</text>
              <text x="1.12" y={-0.271 + i * 0.1} textAnchor="end" fontSize="0.055" fontWeight="800" fill={tone}>{e.pitch?.velo}</text>
            </g>
          );
        })}
      </g>
    </>
  );
}

/* ───────── 본체 ───────── */
export default function PlayView({ event, atBat = [], beatMs = 1200, paused = false, bases = [null, null, null], offColor = '#34d399', defColor = '#94a3b8' }) {
  const play = useMemo(() => buildPlay(event), [event]);
  const t = useClock(event, beatMs, paused);
  // 이 타석에 지나간 공들 (지금 공은 뺀다 — 그건 날아가는 중)
  const history = useMemo(() => atBat.slice(0, -1).map((e) => ({
    at: pitchTarget(e), tone: e.call === 'ball' ? 'ball' : 'strike',
  })).filter((h) => h.at), [atBat]);

  const onField = !play ? true : play.cut != null && t >= play.cut;
  const fade = play?.cut ? Math.min(1, Math.max(0, (t - play.cut) / 0.04)) : 1;

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 62% at 50% 56%, rgba(3,6,12,.86) 0%, rgba(3,6,12,.62) 55%, rgba(3,6,12,0) 100%)' }} />
      {onField ? (
        <svg viewBox="-0.95 -0.02 1.9 1.16" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 h-full w-full" style={{ opacity: fade }}>
          <defs>
            <radialGradient id="pv-grass" cx="50%" cy="100%" r="95%">
              <stop offset="0%" stopColor="#1d7a4f" /><stop offset="100%" stopColor="#0a2417" />
            </radialGradient>
            <radialGradient id="pv-night" cx="50%" cy="82%" r="78%">
              <stop offset="0%" stopColor="#050a12" stopOpacity="1" />
              <stop offset="68%" stopColor="#050a12" stopOpacity="1" />
              <stop offset="100%" stopColor="#050a12" stopOpacity="0" />
            </radialGradient>
          </defs>
          <FieldView play={play} t={t} bases={bases} offColor={offColor} defColor={defColor} />
        </svg>
      ) : (
        <svg viewBox="-1.2 -0.66 2.4 1.44" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="pv-stand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#070c16" /><stop offset="100%" stopColor="#0b1422" />
            </linearGradient>
            <linearGradient id="pv-turf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10432c" /><stop offset="100%" stopColor="#071a11" />
            </linearGradient>
            <radialGradient id="pv-edgeg" cx="50%" cy="50%" r="72%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="70%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id="pv-edge"><rect x="-1.2" y="-0.66" width="2.4" height="1.44" fill="url(#pv-edgeg)" /></mask>
          </defs>
          <ZoneView play={play} t={t} history={history} atBat={atBat} defColor={defColor} />
        </svg>
      )}
    </div>
  );
}
