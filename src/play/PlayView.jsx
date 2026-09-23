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
const EMPTY_DEF = {};
/** 야수 기본 자리 (필드 좌표) */
const BOX = { R: [-0.013, 0.004], L: [0.013, 0.004] }; // 타석 — 홈플레이트 양옆
const SPOTS = {
  P: [0, 0.151], C: [0, -0.014], '1B': [0.185, 0.2], '2B': [0.105, 0.33], SS: [-0.105, 0.33],
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

/*
 * 배경 사진 — 아트 기준 크기에 꽉 채운다.
 * 저장소에 아직 파일이 없으면 생성 원본(remoteSrc)으로 떨어지고, 그것도 안 되면
 * 사진 없이 어두운 바탕만 깐다 — 깨진 그림 대신 플레이가 그대로 읽히게.
 */
function Photo({ bg, dim }) {
  const chain = useMemo(() => [bg.src, bg.remoteSrc].filter(Boolean), [bg]);
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, [chain]);
  const src = chain[step];
  return (
    <>
      <rect x="-400" y="-400" width={ART.w + 800} height={ART.h + 800} fill="#060c16" />
      {src && (
        <image key={src} href={src} x="0" y="0" width={ART.w} height={ART.h} preserveAspectRatio="xMidYMid slice"
          onError={() => setStep((v) => v + 1)} />
      )}
      <rect x="0" y="0" width={ART.w} height={ART.h} fill="#03060c" opacity={dim} />
    </>
  );
}

/* 선수 얼굴 — 프로필 · 카드 · 실루엣 순으로 찾는다 */
const FACE_FALLBACK = 'ui/mt/silhouette-player.webp';
const faceSrcs = (id) => (id
  ? [`profiles/${encodeURIComponent(id)}.webp`, `cards/${encodeURIComponent(id)}.webp`, FACE_FALLBACK]
  : [FACE_FALLBACK]);
let faceSeq = 0;
const Face = ({ id, cx, cy, r }) => {
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, [id]);
  const list = faceSrcs(id);
  const src = list[Math.min(step, list.length - 1)];
  const cid = useMemo(() => `fc${(faceSeq += 1)}`, []);
  return (
    <>
      <clipPath id={cid}><circle cx={cx} cy={cy} r={r} /></clipPath>
      <image href={src} x={cx - r} y={cy - r * 1.05} width={r * 2} height={r * 2.6}
        preserveAspectRatio="xMidYMin slice" clipPath={`url(#${cid})`}
        style={{ filter: 'brightness(1.22) saturate(1.08) contrast(1.05)' }}
        onError={() => setStep((v) => v + 1)} />
    </>
  );
};

/** 선수 한 명 — 얼굴에 팀 색 테를 두르고 이름을 아래에 적는다. 멀수록 작게 */
const Chip = ({ at, s = 1, u = 1, color, label, name, player, dim, ring }) => {
  const k = (0.55 + 0.45 * s) * u; // 원근은 주되 멀다고 점이 되지는 않게 · u 는 화면 확대 보정
  const r = 38 * k;
  const who = player && player.id != null ? player.id : null;
  const tag = name || (player && player.name) || null;
  return (
    <g opacity={dim ? 0.82 : 1}>
      {ring && <circle cx={at[0]} cy={at[1]} r={r * 1.55} fill="none" stroke={color} strokeWidth={6 * k} opacity="0.75" />}
      <ellipse cx={at[0]} cy={at[1] + r * 0.95} rx={r * 0.92} ry={r * 0.3} fill="rgba(0,0,0,.55)" />
      <circle cx={at[0]} cy={at[1]} r={r} fill="#0b1220" />
      <Face id={who} cx={at[0]} cy={at[1]} r={r} />
      <circle cx={at[0]} cy={at[1]} r={r} fill="none" stroke={color} strokeWidth={5 * k} />
      {label && !who && (
        <text x={at[0]} y={at[1] + 10 * k} textAnchor="middle" fontSize={(label.length > 1 ? 25 : 32) * k} fontWeight="800" fill="#e6edf6"
          stroke="rgba(0,0,0,.8)" strokeWidth={6 * k} paintOrder="stroke">{label}</text>
      )}
      {tag && (
        <text x={at[0]} y={at[1] + r + 30 * k} textAnchor="middle" fontSize={30 * k} fontWeight="700" fill={color}
          stroke="rgba(0,0,0,.9)" strokeWidth={9 * k} paintOrder="stroke">{tag}</text>
      )}
    </g>
  );
};

/* 마운드 위 투수 — 배경 사진에는 아무도 없고, 여기서 그린다.
   w 0 와인드업 → 1 릴리스. 나중에 실루엣·스프라이트로 바꿀 때도 이 자세값을 그대로 쓴다. */
function pitcherPose(mound, h, w) {
  const [x, y] = mound;
  const lift = Math.sin(Math.PI * Math.min(1, w * 1.25)); // 다리를 들었다 내딛는다
  const stride = ease(Math.max(0, (w - 0.45) / 0.55)) * h * 0.42;
  const hip = [x - stride * 0.25, y - h * 0.52];
  const shoulder = [x - stride * 0.1, y - h * 0.8];
  const deg = 165 - 238 * ease(w); // 뒤로 젖혔다(왼쪽 아래) 머리 위로(-73°) 넘어온다
  const rad = (deg * Math.PI) / 180;
  const hand = [shoulder[0] + Math.cos(rad) * h * 0.4, shoulder[1] + Math.sin(rad) * h * 0.4];
  return {
    hip, shoulder, hand,
    head: [shoulder[0] + h * 0.03, y - h * 0.94],
    backFoot: [x - h * 0.06, y],
    frontFoot: [x + stride * 0.55, y + stride * 0.32 - lift * h * 0.32 * (1 - ease(Math.max(0, (w - 0.5) / 0.5)))], // 카메라 쪽으로 내딛는다
  };
}

const Pitcher = ({ mound, h, w, color }) => {
  const p = pitcherPose(mound, h, w);
  const limb = { stroke: color, strokeWidth: h * 0.09, strokeLinecap: 'round', fill: 'none' };
  return (
    <g>
      <ellipse cx={mound[0]} cy={mound[1]} rx={h * 0.34} ry={h * 0.1} fill="rgba(0,0,0,.45)" />
      <line x1={p.hip[0]} y1={p.hip[1]} x2={p.backFoot[0]} y2={p.backFoot[1]} {...limb} />
      <line x1={p.hip[0]} y1={p.hip[1]} x2={p.frontFoot[0]} y2={p.frontFoot[1]} {...limb} />
      <line x1={p.hip[0]} y1={p.hip[1]} x2={p.shoulder[0]} y2={p.shoulder[1]} {...limb} strokeWidth={h * 0.14} />
      <line x1={p.shoulder[0]} y1={p.shoulder[1]} x2={p.hand[0]} y2={p.hand[1]} {...limb} strokeWidth={h * 0.075} />
      <circle cx={p.head[0]} cy={p.head[1]} r={h * 0.1} fill={color} stroke="rgba(0,0,0,.5)" strokeWidth={h * 0.02} />
    </g>
  );
};

/* ───────── 필드 뷰 ───────── */
function FieldView({ play, t, u, bases, offColor, defColor, bg, defense = {}, batter = null }) {
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
      <Photo bg={bg} dim={0.18} />
      {trail && <path d={trail} stroke="rgba(253,224,71,.65)" strokeWidth={7 * u} fill="none" strokeLinecap="round" />}

      {FIELDERS.map((pos) => {
        const acting = fielder?.pos === pos;
        let p = SPOTS[pos];
        if (acting && t >= fielder.t0) {
          const u = ease(phase(t, fielder.t0, fielder.t1));
          p = [p[0] + (fielder.to[0] - p[0]) * u, p[1] + (fielder.to[1] - p[1]) * u];
        }
        return <Chip key={pos} at={at(p)} s={scaleAt(p)} u={u} color={acting ? '#fff' : defColor} label={pos} player={defense[pos]} ring={acting} dim={!acting && !!play} />;
      })}

      {!play && batter && (() => { const p = BOX[batter.hand === 'L' ? 'L' : 'R'];
        return <Chip at={at(p)} s={scaleAt(p)} u={u} color={offColor} player={batter} />; })()}
      {!play && bases.map((r, i) => (r ? <Chip key={i} at={baseAt(i)} s={scaleAt(SPOTS.P)} u={u} color={offColor} player={r} /> : null))}
      {runs.map((b, i) => {
        const u = ease(phase(t, b.t0, b.t1));
        const p = along(b.path, u);
        const done = u >= 1;
        return <Chip key={`r${i}`} at={at(p)} s={scaleAt(p)} u={u} player={b.player} dim={(b.out && done) || b.still} ring={b.scored && done}
          color={b.out && done ? '#6b7280' : b.scored && done ? '#fde047' : offColor} />;
      })}
      {steal && t >= steal.t0 && (() => {
        const k = ease(phase(t, steal.t0, steal.t1));
        const p = along(steal.path, k);
        return <Chip at={at(p)} s={scaleAt(p)} u={u} player={steal.player} ring={k >= 1} color={steal.ok ? offColor : '#6b7280'} />;
      })()}

      {throwAt && <circle cx={throwAt[0]} cy={throwAt[1]} r={9 * u} fill="#fff" />}
      {ballAt && (
        <g>
          <ellipse cx={ballAt[0]} cy={ballAt[1]} rx={14 * u} ry={6 * u} fill="rgba(0,0,0,.55)" />
          <circle cx={ballAt[0]} cy={ballAt[1] - lift} r={30 * u} fill="rgba(253,224,71,.25)" />
          <circle cx={ballAt[0]} cy={ballAt[1] - lift} r={(landed ? 11 : 14) * u} fill="#fff" stroke="#fde047" strokeWidth={5 * u} />
        </g>
      )}
      {ball?.gone && t > ball.t1 - 0.12 && (
        <text x={ART.w / 2} y="250" textAnchor="middle" fontSize={92 * u} fontWeight="900" fill="#fde047"
          stroke="rgba(0,0,0,.9)" strokeWidth={20 * u} paintOrder="stroke">GONE!</text>
      )}
    </>
  );
}

/* ───────── 존 뷰 (타석 시점) ───────── */
function ZoneView({ play, t, u, history, atBat, bg, defColor }) {
  const Z = bg.zone;
  const px = ([x, y]) => [Z.cx + (x / ZONE.w) * Z.hw, Z.cy + (y / ZONE.h) * Z.hh];
  const beats = play?.beats || [];
  const p = beats.find((b) => b.kind === 'pitch');
  const swing = beats.find((b) => b.kind === 'swing');
  const call = beats.find((b) => b.kind === 'call');

  const wind = p ? phase(t, 0, p.t0 + 0.03) : 1; // 와인드업 → 릴리스
  const ph = bg.pitcherH || 150;
  const release = bg.hasPitcher ? bg.release : pitcherPose(bg.mound, ph, 1).hand;

  let ball = null; let r = 10;
  if (p && t >= p.t0) {
    const pu = Math.min(1, phase(t, p.t0, p.t1));
    const to = px(p.to);
    // 늦게 휘는 곡선(2차 베지에). 조종점을 끝쪽으로 밀어 두면 막판에 꺾이고,
    // 끝점은 목표 그대로라 변화구가 존 안으로 끌려 들어가지 않는다.
    const bend = [(p.bend[0] / ZONE.w) * Z.hw * 1.6, (p.bend[1] / ZONE.h) * Z.hh * 1.6];
    const ctrl = [release[0] + (to[0] - release[0]) * 0.72 + bend[0], release[1] + (to[1] - release[1]) * 0.72 + bend[1]];
    const q = (a, c, z) => (1 - pu) * (1 - pu) * a + 2 * pu * (1 - pu) * c + pu * pu * z;
    ball = [q(release[0], ctrl[0], to[0]), q(release[1], ctrl[1], to[1])];
    r = (7 + 23 * pu * pu) * u;
  }
  const sw = swing ? phase(t, swing.t0, swing.t1) : 0;
  const cell = (i) => [Z.cx - Z.hw + (i % 3) * (Z.hw * 2 / 3), Z.cy - Z.hh + Math.floor(i / 3) * (Z.hh * 2 / 3)];

  return (
    <>
      <Photo bg={bg} dim={0.22} />
      {!bg.hasPitcher && bg.mound && <Pitcher mound={bg.mound} h={ph} w={wind} color={defColor} />}

      {/* 스트라이크존 */}
      <rect x={Z.cx - Z.hw} y={Z.cy - Z.hh} width={Z.hw * 2} height={Z.hh * 2} fill="rgba(255,255,255,.06)"
        stroke="rgba(255,255,255,.6)" strokeWidth={5 * u} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={cell(i)[0]} y={cell(i)[1]} width={Z.hw * 2 / 3} height={Z.hh * 2 / 3} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={2 * u} />
      ))}

      {/* 이 타석에 지나간 공 */}
      {history.map((h, i) => {
        const q = px(h.at);
        return (
          <g key={i} opacity="0.85">
            <circle cx={q[0]} cy={q[1]} r={17 * u} fill={h.tone === 'ball' ? 'rgba(52,211,153,.3)' : 'rgba(253,224,71,.3)'}
              stroke={h.tone === 'ball' ? '#34d399' : '#fde047'} strokeWidth={4 * u} />
            <text x={q[0]} y={q[1] + 7 * u} textAnchor="middle" fontSize={20 * u} fontWeight="800" fill="#fff">{i + 1}</text>
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
        <text x="1135" y="345" textAnchor="end" fontSize={54 * u} fontWeight="800" fill="rgba(255,255,255,.9)"
          stroke="rgba(0,0,0,.65)" strokeWidth={9 * u} paintOrder="stroke">
          {p.velo}<tspan fontSize={28 * u} fill="rgba(255,255,255,.6)"> km/h</tspan>
        </text>
      )}
      {call && t >= call.t0 && (
        <text x="450" y={Z.cy - Z.hh - 40} textAnchor="middle" fontSize={92 * u} fontWeight="900"
          fill={call.tone === 'ball' ? '#34d399' : '#fde047'} stroke="rgba(0,0,0,.85)" strokeWidth={22 * u} paintOrder="stroke">{call.label}</text>
      )}

      {/* 오른쪽: 이 타석에 던진 공 */}
      <g>
        <text x="952" y="392" fontSize={26 * u} fontWeight="800" fill="rgba(203,213,225,.95)" stroke="rgba(0,0,0,.6)" strokeWidth={7 * u} paintOrder="stroke">THIS AT-BAT</text>
        {atBat.slice(-5).map((e, i, arr) => {
          const now = i === arr.length - 1;
          const tone = e.call === 'ball' ? '#34d399' : e.call === 'inplay' ? '#fff' : '#fde047';
          const y = 412 + i * 50;
          return (
            <g key={i} opacity={now ? 1 : 0.6}>
              <rect x="950" y={y} width="200" height="42" fill={now ? 'rgba(255,255,255,.14)' : 'rgba(5,8,15,.6)'} />
              <rect x="950" y={y} width="6" height="42" fill={tone} />
              <text x="968" y={y + 30} fontSize={28 * u} fontWeight="700" fill="#e2e8f0">{PITCH_KO[e.pitch?.type] || ''}</text>
              <text x="1136" y={y + 30} textAnchor="end" fontSize={28 * u} fontWeight="800" fill={tone}>{e.pitch?.velo}</text>
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
  offColor = '#34d399', defColor = '#94a3b8', bg = DEFAULT_BG, defense = null, batter = null,
}) {
  const boxRef = useRef(null);
  // 배경 아트가 화면에 얼마나 확대돼 그려지는지 — 오버레이는 그 반대로 줄여 늘 같은 크기로 보인다
  const [u, setU] = useState(1);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const read = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const s = Math.max(width / ART.w, height / ART.h);
      setU(Math.max(0.3, Math.min(1.6, 0.514 / s))); // 0.514 = 예전 칸 크기 기준
    };
    read();
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const play = useMemo(() => buildPlay(event), [event]);
  const t = useClock(event, beatMs, paused);
  const history = useMemo(
    () => atBat.slice(0, -1).map((e) => ({ at: pitchTarget(e), tone: e.call === 'ball' ? 'ball' : 'strike' })).filter((h) => h.at),
    [atBat],
  );
  const onField = !play ? true : play.cut != null && t >= play.cut;
  const shift = (b) => `translate(0 ${b.stage?.dy || 0})`; // 화면을 꽉 채운 사진을 위아래로 밀어 맞춘다
  const fade = play?.cut ? Math.min(1, Math.max(0, (t - play.cut) / 0.04)) : 1;
  const box = `0 0 ${ART.w} ${ART.h}`;

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      {onField ? (
        <svg viewBox={box} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" style={{ opacity: fade }}>
          <g transform={shift(bg.field)}>
            <FieldView play={play} t={t} u={u} bases={bases} offColor={offColor} defColor={defColor} bg={bg.field} defense={defense || EMPTY_DEF} batter={batter} />
          </g>
        </svg>
      ) : (
        <svg viewBox={box} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <g transform={shift(bg.zone)}>
            <ZoneView play={play} t={t} u={u} history={history} atBat={atBat} bg={bg.zone} defColor={defColor} />
          </g>
        </svg>
      )}
    </div>
  );
}
