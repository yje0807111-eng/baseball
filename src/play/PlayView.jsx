/*
 * 플레이 뷰 — 대본(playScript)을 배경 사진 위에 그린다.
 *
 * 공 하나마다: 타석 시점 사진 위에 투구를, 맞으면 위에서 본 그라운드 사진으로 컷 전환해
 * 타구·수비·주자를 따라간다. 필드를 새로 그리지 않고 사진에 찍힌 진짜 다이아몬드에
 * 좌표를 맞추므로(fieldMap), 배경을 바꾸면 그 사진의 베이스 자리만 다시 재면 된다.
 *
 * 좌표계는 배경 아트 픽셀(1600×895) 하나로 통일했다 — 사진과 오버레이가 어긋날 일이 없다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlay, pitchTarget, along, phase, ease, ZONE } from './playScript.js';
import { makeMapper, ART } from './fieldMap.js';
import { DEFAULT_BG } from './backgrounds.js';

const PITCH_KO = { fast: '직구', slider: '슬라이더', change: '체인지업' };
const FIELDERS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
/** 야수 기본 자리 (필드 좌표) */
const SPOTS = {
  P: [0, 0.151], C: [0, -0.035], '1B': [0.185, 0.2], '2B': [0.105, 0.33], SS: [-0.105, 0.33],
  '3B': [-0.185, 0.2], LF: [-0.37, 0.64], CF: [0, 0.76], RF: [0.37, 0.64],
};

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

/** 배경 사진 — 아트 기준 크기에 꽉 채운다 */
const Photo = ({ src, dim }) => (
  <>
    <image href={src} x="0" y="0" width={ART.w} height={ART.h} preserveAspectRatio="xMidYMid slice" />
    <rect x="0" y="0" width={ART.w} height={ART.h} fill="#03060c" opacity={dim} />
  </>
);

/** 선수 한 명 — 멀수록 작게 */
const Chip = ({ at, s = 1, color, label, name, dim, ring }) => {
  const k = 0.55 + 0.45 * s; // 원근은 주되 멀다고 점이 되지는 않게
  const r = 30 * k;
  return (
    <g opacity={dim ? 0.62 : 1}>
      {ring && <circle cx={at[0]} cy={at[1]} r={r * 2.1} fill="none" stroke={color} strokeWidth={5 * k} opacity="0.7" />}
      <ellipse cx={at[0]} cy={at[1] + r * 0.9} rx={r * 0.9} ry={r * 0.32} fill="rgba(0,0,0,.5)" />
      <circle cx={at[0]} cy={at[1]} r={r} fill={color} stroke="rgba(0,0,0,.65)" strokeWidth={4 * k} />
      {label && <text x={at[0]} y={at[1] + 10 * k} textAnchor="middle" fontSize={(label.length > 1 ? 25 : 32) * k} fontWeight="800" fill="#05080f">{label}</text>}
      {name && (
        <text x={at[0]} y={at[1] - r - 12 * k} textAnchor="middle" fontSize={34 * k} fontWeight="700" fill="#fff"
          stroke="rgba(0,0,0,.85)" strokeWidth={11 * k} paintOrder="stroke">{name}</text>
      )}
    </g>
  );
};

/* ───────── 필드 뷰 ───────── */
function FieldView({ play, t, bases, offColor, defColor, bg }) {
  const { at, scaleAt } = useMemo(() => makeMapper(bg.marks), [bg]);
  const beats = play?.beats || [];
  const ball = beats.find((b) => b.kind === 'ball');
  const fielder = beats.find((b) => b.kind === 'fielder');
  const thrown = beats.find((b) => b.kind === 'throw');
  const runs = beats.filter((b) => b.kind === 'run');
  const steal = beats.find((b) => b.kind === 'steal');
  const baseAt = (i) => at([[0.1591, 0.1591], [0, 0.318], [-0.1591, 0.1591]][i]);

  let ballAt = null; let lift = 0; let trail = null; let landed = false;
  if (ball && t >= ball.t0) {
    const u = phase(t, ball.t0, ball.t1);
    const g = [ball.from[0] + (ball.to[0] - ball.from[0]) * u, ball.from[1] + (ball.to[1] - ball.from[1]) * u];
    ballAt = at(g);
    lift = Math.sin(Math.PI * Math.min(1, u)) * Math.max(0, ball.loft) * 2.6 * scaleAt(g);
    landed = u >= 1;
    trail = `M ${at(ball.from).join(' ')} L ${ballAt[0]} ${ballAt[1] - lift}`;
  }
  let throwAt = null;
  if (thrown && t >= thrown.t0) {
    const u = ease(phase(t, thrown.t0, thrown.t1));
    throwAt = at([thrown.from[0] + (thrown.to[0] - thrown.from[0]) * u, thrown.from[1] + (thrown.to[1] - thrown.from[1]) * u]);
  }

  return (
    <>
      <Photo src={bg.src} dim={0.3} />
      {trail && <path d={trail} stroke="rgba(253,224,71,.65)" strokeWidth="7" fill="none" strokeLinecap="round" />}

      {FIELDERS.map((pos) => {
        const acting = fielder?.pos === pos;
        let p = SPOTS[pos];
        if (acting && t >= fielder.t0) {
          const u = ease(phase(t, fielder.t0, fielder.t1));
          p = [p[0] + (fielder.to[0] - p[0]) * u, p[1] + (fielder.to[1] - p[1]) * u];
        }
        return <Chip key={pos} at={at(p)} s={scaleAt(p)} color={acting ? '#fff' : defColor} label={pos} dim={!acting && !!play} />;
      })}

      {!play && bases.map((r, i) => (r ? <Chip key={i} at={baseAt(i)} s={scaleAt(SPOTS.P)} color={offColor} name={r.name} /> : null))}
      {runs.map((b, i) => {
        const u = ease(phase(t, b.t0, b.t1));
        const p = along(b.path, u);
        const done = u >= 1;
        return <Chip key={`r${i}`} at={at(p)} s={scaleAt(p)} name={b.player?.name} dim={(b.out && done) || b.still} ring={b.scored && done}
          color={b.out && done ? '#6b7280' : b.scored && done ? '#fde047' : offColor} />;
      })}
      {steal && t >= steal.t0 && (() => {
        const u = ease(phase(t, steal.t0, steal.t1));
        const p = along(steal.path, u);
        return <Chip at={at(p)} s={scaleAt(p)} name={steal.player?.name} ring={u >= 1} color={steal.ok ? offColor : '#6b7280'} />;
      })()}

      {throwAt && <circle cx={throwAt[0]} cy={throwAt[1]} r="9" fill="#fff" />}
      {ballAt && (
        <g>
          <ellipse cx={ballAt[0]} cy={ballAt[1]} rx="14" ry="6" fill="rgba(0,0,0,.55)" />
          <circle cx={ballAt[0]} cy={ballAt[1] - lift} r="30" fill="rgba(253,224,71,.25)" />
          <circle cx={ballAt[0]} cy={ballAt[1] - lift} r={landed ? 11 : 14} fill="#fff" stroke="#fde047" strokeWidth="5" />
        </g>
      )}
      {ball?.gone && t > ball.t1 - 0.12 && (
        <text x={ART.w / 2} y="250" textAnchor="middle" fontSize="92" fontWeight="900" fill="#fde047"
          stroke="rgba(0,0,0,.9)" strokeWidth="20" paintOrder="stroke">GONE!</text>
      )}
    </>
  );
}

/* ───────── 존 뷰 (타석 시점) ───────── */
function ZoneView({ play, t, history, atBat, bg }) {
  const Z = bg.zone;
  const px = ([x, y]) => [Z.cx + (x / ZONE.w) * Z.hw, Z.cy + (y / ZONE.h) * Z.hh];
  const beats = play?.beats || [];
  const p = beats.find((b) => b.kind === 'pitch');
  const swing = beats.find((b) => b.kind === 'swing');
  const call = beats.find((b) => b.kind === 'call');

  let ball = null; let r = 10;
  if (p && t >= p.t0) {
    const u = Math.min(1, phase(t, p.t0, p.t1));
    const k = u * u; // 늦게 휜다
    const to = px(p.to);
    const bend = [(p.bend[0] / ZONE.w) * Z.hw, (p.bend[1] / ZONE.h) * Z.hh];
    ball = [bg.release[0] + (to[0] - bg.release[0]) * u + bend[0] * k, bg.release[1] + (to[1] - bg.release[1]) * u + bend[1] * k];
    r = 7 + 23 * u * u;
  }
  const sw = swing ? phase(t, swing.t0, swing.t1) : 0;
  const cell = (i) => [Z.cx - Z.hw + (i % 3) * (Z.hw * 2 / 3), Z.cy - Z.hh + Math.floor(i / 3) * (Z.hh * 2 / 3)];

  return (
    <>
      <Photo src={bg.src} dim={0.22} />

      {/* 스트라이크존 */}
      <rect x={Z.cx - Z.hw} y={Z.cy - Z.hh} width={Z.hw * 2} height={Z.hh * 2} fill="rgba(255,255,255,.06)"
        stroke="rgba(255,255,255,.6)" strokeWidth="5" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={cell(i)[0]} y={cell(i)[1]} width={Z.hw * 2 / 3} height={Z.hh * 2 / 3} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2" />
      ))}

      {/* 이 타석에 지나간 공 */}
      {history.map((h, i) => {
        const q = px(h.at);
        return (
          <g key={i} opacity="0.85">
            <circle cx={q[0]} cy={q[1]} r="17" fill={h.tone === 'ball' ? 'rgba(52,211,153,.3)' : 'rgba(253,224,71,.3)'}
              stroke={h.tone === 'ball' ? '#34d399' : '#fde047'} strokeWidth="4" />
            <text x={q[0]} y={q[1] + 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">{i + 1}</text>
          </g>
        );
      })}

      {/* 스윙 — 존 앞을 스치고 지나가는 궤적 */}
      {sw > 0 && sw < 1 && (
        <path d={`M ${Z.cx - Z.hw - 150} ${Z.cy + Z.hh + 40} Q ${Z.cx - 40} ${Z.cy + Z.hh + 150} ${Z.cx + Z.hw + 120} ${Z.cy - 30}`}
          fill="none" stroke="#e8d5a8" strokeWidth={26 * (1 - sw)} strokeLinecap="round" opacity={0.75 * (1 - Math.abs(sw - 0.4) * 1.6)} />
      )}

      {/* 지금 공 */}
      {ball && (
        <>
          <circle cx={ball[0]} cy={ball[1]} r={r * 2} fill={p.inZone ? 'rgba(253,224,71,.2)' : 'rgba(52,211,153,.18)'} />
          <circle cx={ball[0]} cy={ball[1]} r={r} fill="#fff" stroke="rgba(0,0,0,.45)" strokeWidth="3" />
        </>
      )}

      {p && (
        <text x={ART.w - 120} y="126" textAnchor="end" fontSize="58" fontWeight="800" fill="rgba(255,255,255,.88)">
          {p.velo}<tspan fontSize="30" fill="rgba(255,255,255,.55)"> km/h</tspan>
        </text>
      )}
      {call && t >= call.t0 && (
        <text x="110" y={Z.cy - Z.hh + 30} fontSize="104" fontWeight="900"
          fill={call.tone === 'ball' ? '#34d399' : '#fde047'} stroke="rgba(0,0,0,.85)" strokeWidth="22" paintOrder="stroke">{call.label}</text>
      )}

      {/* 오른쪽: 이 타석에 던진 공 */}
      <g>
        <text x="1150" y="230" fontSize="28" fontWeight="800" fill="rgba(148,163,184,.95)">THIS AT-BAT</text>
        {atBat.slice(-7).map((e, i, arr) => {
          const now = i === arr.length - 1;
          const tone = e.call === 'ball' ? '#34d399' : e.call === 'inplay' ? '#fff' : '#fde047';
          const y = 255 + i * 54;
          return (
            <g key={i} opacity={now ? 1 : 0.6}>
              <rect x="1148" y={y} width="332" height="46" fill={now ? 'rgba(255,255,255,.14)' : 'rgba(5,8,15,.6)'} />
              <rect x="1148" y={y} width="7" height="46" fill={tone} />
              <text x="1172" y={y + 33} fontSize="32" fontWeight="700" fill="#e2e8f0">{PITCH_KO[e.pitch?.type] || ''}</text>
              <text x="1468" y={y + 33} textAnchor="end" fontSize="32" fontWeight="800" fill={tone}>{e.pitch?.velo}</text>
            </g>
          );
        })}
      </g>
    </>
  );
}

/* ───────── 본체 ───────── */
export default function PlayView({
  event, atBat = [], beatMs = 1200, paused = false, bases = [null, null, null],
  offColor = '#34d399', defColor = '#94a3b8', bg = DEFAULT_BG,
}) {
  const play = useMemo(() => buildPlay(event), [event]);
  const t = useClock(event, beatMs, paused);
  const history = useMemo(
    () => atBat.slice(0, -1).map((e) => ({ at: pitchTarget(e), tone: e.call === 'ball' ? 'ball' : 'strike' })).filter((h) => h.at),
    [atBat],
  );
  const onField = !play ? true : play.cut != null && t >= play.cut;
  const fade = play?.cut ? Math.min(1, Math.max(0, (t - play.cut) / 0.04)) : 1;
  const box = `0 0 ${ART.w} ${ART.h}`;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {onField ? (
        <svg viewBox={box} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" style={{ opacity: fade }}>
          <FieldView play={play} t={t} bases={bases} offColor={offColor} defColor={defColor} bg={bg.field} />
        </svg>
      ) : (
        <svg viewBox={box} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
          <ZoneView play={play} t={t} history={history} atBat={atBat} bg={bg.zone} />
        </svg>
      )}
    </div>
  );
}
