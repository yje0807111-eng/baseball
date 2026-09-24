/*
 * 플레이 뷰 — 대본(playScript)을 배경 사진 위에 그린다.
 *
 * 화면은 위에서 본 그라운드 사진 하나다 — 투구도 타구도 컷 전환 없이 여기서 벌어진다.
 * 필드를 새로 그리지 않고 사진에 찍힌 진짜 다이아몬드에 좌표를 맞추므로(fieldMap),
 * 배경을 바꾸면 그 사진의 베이스 자리만 다시 재면 된다.
 *
 * 좌표계는 배경 아트 픽셀(1600×895) 하나로 통일했다 — 사진과 오버레이가 어긋날 일이 없다.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlay, along, phase, ease } from './playScript.js';
import { makeMapper, ART } from './fieldMap.js';
import { DEFAULT_BG } from './backgrounds.js';

const PITCH_KO = { fast: '직구', slider: '슬라이더', change: '체인지업' };
const FIELDERS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const EMPTY_DEF = {};
/** 야수 기본 자리 (필드 좌표) */
const BOX = { R: [-0.013, 0.004], L: [0.013, 0.004] }; // 타석 — 홈플레이트 양옆
const HOME_G = [0, 0];
const MOUND = [0, 0.151];
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
      <defs>
        <filter id="pv-haze" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="64" />
        </filter>
      </defs>
      <rect x={-ART.w} y={-ART.h} width={ART.w * 3} height={ART.h * 3} fill="#060c16" />
      {src && (
        <>
          {/* 사진보다 화면이 넓다 — 남는 자리는 같은 사진을 키워 흐리게 깔아 메운다 */}
          <image href={src} x={-ART.w * 0.34} y={-ART.h * 0.34} width={ART.w * 1.68} height={ART.h * 1.68}
            preserveAspectRatio="xMidYMid slice" filter="url(#pv-haze)" />
          <rect x={-ART.w} y={-ART.h} width={ART.w * 3} height={ART.h * 3} fill="#03060c" opacity="0.62" />
          <image key={src} href={src} x="0" y="0" width={ART.w} height={ART.h} preserveAspectRatio="xMidYMid slice"
            onError={() => setStep((v) => v + 1)} />
        </>
      )}
      <rect x={-ART.w} y={-ART.h} width={ART.w * 3} height={ART.h * 3} fill="#03060c" opacity={dim} />
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
/* 선수가 들고 날 때 — 툭 끊기지 않게 */
export const CHIP_CSS = `
@keyframes chipIn { from { opacity: 0; transform: translateY(14px) scale(.82); } to { opacity: 1; transform: none; } }
@keyframes chipOut { from { opacity: .85; transform: scale(1); } to { opacity: 0; transform: scale(.72); } }
@keyframes chipPuff { from { opacity: .95; transform: scale(1); filter: blur(0); }
  to { opacity: 0; transform: scale(1.3) translateY(-10px); filter: blur(5px); } }
@keyframes chipForm { from { opacity: 0; transform: scale(.66) translateY(12px); filter: blur(6px); }
  to { opacity: 1; transform: none; filter: blur(0); } }
.pv-chip { transform-box: fill-box; transform-origin: center; }
.pv-in { animation: chipIn .34s cubic-bezier(.2,.9,.3,1) both; }
.pv-out { animation: chipOut .5s ease-in both; }
.pv-puff { animation: chipPuff .46s ease-in both; }
.pv-form { animation: chipForm .5s cubic-bezier(.2,.9,.3,1) both; }
`;
const Chip = ({ at, s = 1, u = 1, color, label, name, player, dim, ring, enter, leave, puff, form }) => {
  const k = (0.55 + 0.45 * s) * u; // 원근은 주되 멀다고 점이 되지는 않게 · u 는 화면 확대 보정
  const r = 38 * k;
  const who = player && player.id != null ? player.id : null;
  const tag = name || (player && player.name) || null;
  return (
    <g className={`pv-chip${enter ? ' pv-in' : ''}${leave ? ' pv-out' : ''}${puff ? ' pv-puff' : ''}${form ? ' pv-form' : ''}`} opacity={dim ? 0.82 : 1}>
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

/* 타구가 뜬 높이 — 발사각이 크면 아치를 그리고, 낮으면 땅을 튀며 간다.
   정점을 앞쪽에 두어 떨어질 때가 더 가파르다 */
const HOPS = 3.1;
function ballRise(u, loft = 0) {
  const k = Math.min(1, Math.max(0, u));
  const arc = Math.sin(Math.PI * k ** 0.86) * Math.max(0, loft) * 2.6;
  if (loft >= 9) return arc;
  /* 바운드는 뒤로 갈수록 낮고 잦아진다 */
  return arc + Math.abs(Math.sin(Math.PI * HOPS * k ** 1.25)) * 24 * (1 - k) ** 1.5;
}

/* ───────── 필드 뷰 ───────── */
function FieldView({ play, t, u, bases, offColor, defColor, bg, defense = {}, batter = null, gone = null, fresh = false }) {
  const { at, scaleAt } = useMemo(() => makeMapper(bg.marks), [bg]);
  const beats = play?.beats || [];
  const ball = beats.find((b) => b.kind === 'ball');
  const fielder = beats.find((b) => b.kind === 'fielder');
  const thrown = beats.find((b) => b.kind === 'throw');
  const runs = beats.filter((b) => b.kind === 'run');
  const steal = beats.find((b) => b.kind === 'steal');
  const pitch = beats.find((b) => b.kind === 'pitch');
  const baseAt = (i) => at([[0.1591, 0.1591], [0, 0.318], [-0.1591, 0.1591]][i]);

  let ballAt = null; let lift = 0; let trail = null; let landed = false;
  if (ball && t >= ball.t0) {
    const u = phase(t, ball.t0, ball.t1);
    /* 진행도 하나에 공의 땅 그림자와 뜬 높이가 함께 나온다 */
    const shot = (v) => {
      const k = Math.min(1, Math.max(0, v));
      const g = [ball.from[0] + (ball.to[0] - ball.from[0]) * k, ball.from[1] + (ball.to[1] - ball.from[1]) * k];
      const p = at(g);
      return [p[0], p[1], ballRise(k, ball.loft) * scaleAt(g)];
    };
    const now = shot(u);
    ballAt = [now[0], now[1]];
    lift = now[2];
    landed = u >= 1;

    /* 꼬리 — 지나온 곡선을 잘게 잇고 뒤로 갈수록 가늘고 옅게.
       담장을 넘는 타구는 날아온 길 전체를 남긴다 */
    const far = !!ball.gone;
    const span = Math.min(u, far ? 1 : 0.46);
    const seg = far ? 26 : 18;
    const fade = landed && !far ? Math.max(0, 1 - (t - ball.t1) / 0.1) : 1;
    if (fade > 0.02 && span > 0.001) {
      trail = [];
      for (let i = 0; i < seg; i += 1) {
        const a = shot(u - (span * (i + 1)) / seg); const b = shot(u - (span * i) / seg);
        const back = i / seg;
        trail.push({
          d: `M ${a[0]} ${a[1] - a[2]} L ${b[0]} ${b[1] - b[2]}`,
          w: 1.8 + 7 * (1 - back) ** 1.2,
          o: fade * (far ? 0.2 + 0.68 * (1 - back) ** 1.4 : 0.9 * (1 - back) ** 1.5),
          c: back < 0.12 ? '#fffbe6' : '#fde047',
        });
      }
    }
  }
  // 투구 — 마운드에서 홈으로. 존 좌표의 좌우 코스만 1m 안쪽으로 옮겨 담는다
  let pitchAt = null; let pitchHop = 0;
  if (pitch && t >= pitch.t0 && !(ball && t >= ball.t0)) {
    const k = phase(t, pitch.t0, pitch.t1);
    const side = (pitch.to[0] + pitch.bend[0] * (1 - k)) * 0.008;
    const g = [side * k, MOUND[1] * (1 - k)];
    pitchAt = at(g);
    pitchHop = Math.sin(Math.PI * k) * 9 * scaleAt(g);
  }
  let throwAt = null;
  if (thrown && t >= thrown.t0) {
    const u = ease(phase(t, thrown.t0, thrown.t1));
    throwAt = at([thrown.from[0] + (thrown.to[0] - thrown.from[0]) * u, thrown.from[1] + (thrown.to[1] - thrown.from[1]) * u]);
  }

  return (
    <>
      <Photo bg={bg} dim={0.18} />
      {trail && (
        <g fill="none" strokeLinecap="round">
          {trail.map((g, i) => <path key={i} d={g.d} stroke={g.c} strokeWidth={g.w * u} opacity={g.o} />)}
        </g>
      )}

      {/* 막 물러난 수비 — 연기처럼 흩어진다. 자리가 그대로면 그냥 서 있는다 */}
      {gone && FIELDERS.filter((pos) => (gone[pos]?.id ?? '') !== (defense[pos]?.id ?? '')).map((pos) => (
        <Chip key={`gone-${pos}`} at={at(SPOTS[pos])} s={scaleAt(SPOTS[pos])} u={u} color={defColor} label={pos} player={gone[pos]} puff />
      ))}
      {FIELDERS.map((pos) => {
        const acting = fielder?.pos === pos;
        const home = SPOTS[pos];
        let p = home;
        if (acting && t >= fielder.t0) {
          const u = ease(phase(t, fielder.t0, fielder.t1));
          const to = [home[0] + (fielder.to[0] - home[0]) * u, home[1] + (fielder.to[1] - home[1]) * u];
          /* 쫓아가 잡은 뒤에는 남은 시간 동안 제자리로 — 다음 공에 툭 되돌아가 있지 않게 */
          const back = t > fielder.t1 ? ease(phase(t, fielder.t1 + 0.08, 0.99)) : 0;
          p = back > 0 ? [to[0] + (home[0] - to[0]) * back, to[1] + (home[1] - to[1]) * back] : to;
        }
        return <Chip key={pos} at={at(p)} s={scaleAt(p)} u={u} color={acting ? '#fff' : defColor} label={pos} player={defense[pos]} ring={acting} dim={!acting && !!play}
          form={fresh && (gone?.[pos]?.id ?? '') !== (defense[pos]?.id ?? '')} />;
      })}

      {!runs.length && batter && (() => { const p = BOX[batter.hand === 'L' ? 'L' : 'R'];
        return <Chip key={batter.id} at={at(p)} s={scaleAt(p)} u={u} color={offColor} player={batter} enter />; })()}
      {!runs.length && bases.map((r, i) => (
        r && !(steal && steal.player && steal.player.id === r.id)
          /* 베이스에 선 주자는 이미 달려와 선 사람이다 — 다음 공마다 다시 솟아오르지 않는다 */
          ? <Chip key={`b${i}:${r.id}`} at={baseAt(i)} s={scaleAt(SPOTS.P)} u={u} color={offColor} player={r} /> : null))}
      {runs.map((b, i) => {
        /* 진행도는 k 로 — 바깥 u 는 화면 확대 보정값이라 덮으면 칩이 0 에서 커진다 */
        const k = ease(phase(t, b.t0, b.t1));
        const p = along(b.path, k);
        const done = k >= 1;
        return <Chip key={`r${b.player?.id ?? i}`} at={at(p)} s={scaleAt(p)} u={u} player={b.player} dim={(b.out && done) || b.still} ring={b.scored && done}
          leave={(b.out || b.scored) && done}
          color={b.out && done ? '#6b7280' : b.scored && done ? '#fde047' : offColor} />;
      })}
      {steal && t >= steal.t0 && (() => {
        const k = ease(phase(t, steal.t0, steal.t1));
        const p = along(steal.path, k);
        return <Chip at={at(p)} s={scaleAt(p)} u={u} player={steal.player} ring={k >= 1} color={steal.ok ? offColor : '#6b7280'} />;
      })()}

      {pitchAt && (
        <g>
          <circle cx={pitchAt[0]} cy={pitchAt[1] - pitchHop} r={18 * u} fill={pitch.inZone ? 'rgba(253,224,71,.2)' : 'rgba(52,211,153,.18)'} />
          <circle cx={pitchAt[0]} cy={pitchAt[1] - pitchHop} r={8 * u} fill="#fff" stroke="rgba(0,0,0,.5)" strokeWidth={3 * u} />
        </g>
      )}
      {throwAt && <circle cx={throwAt[0]} cy={throwAt[1]} r={9 * u} fill="#fff" />}
      {ballAt && (() => { const shade = 1 / (1 + lift / 95); return (
        <g>
          <ellipse cx={ballAt[0]} cy={ballAt[1]} rx={14 * u * shade} ry={6 * u * shade} fill={`rgba(0,0,0,${0.55 * shade})`} />
          <circle cx={ballAt[0]} cy={ballAt[1] - lift} r={30 * u} fill="rgba(253,224,71,.25)" />
          <circle cx={ballAt[0]} cy={ballAt[1] - lift} r={(landed ? 11 : 14) * u} fill="#fff" stroke="#fde047" strokeWidth={5 * u} />
        </g>
      ); })()}
      {ball?.gone && t > ball.t1 - 0.12 && (
        <text x={ART.w / 2} y="250" textAnchor="middle" fontSize={92 * u} fontWeight="900" fill="#fde047"
          stroke="rgba(0,0,0,.9)" strokeWidth={20 * u} paintOrder="stroke">GONE!</text>
      )}
    </>
  );
}

/* ───────── 본체 ───────── */
export default function PlayView({
  event, beatMs = 1200, paused = false, bases = [null, null, null],
  offColor = '#34d399', defColor = '#94a3b8', bg = DEFAULT_BG, defense = null, batter = null,
}) {
  /* 공수가 바뀌면 옛 아홉은 연기처럼 흩어지고 새 아홉이 맺힌다 — 잠깐 겹쳐 그린다 */
  const dKey = FIELDERS.map((p) => defense?.[p]?.id ?? '').join('|');
  const [shown, setShown] = useState({ men: defense, key: dKey });
  const [gone, setGone] = useState(null);
  useEffect(() => {
    if (dKey === shown.key) return undefined;
    setGone(shown.men);
    setShown({ men: defense, key: dKey });
    const id = setTimeout(() => setGone(null), 520);
    return () => clearTimeout(id);
  }, [dKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const boxRef = useRef(null);
  // 배경 아트가 화면에 얼마나 확대돼 그려지는지 — 오버레이는 그 반대로 줄여 늘 같은 크기로 보인다
  const [u, setU] = useState(1);
  const [ar, setAr] = useState(ART.w / ART.h); // 화면 가로세로 비
  const want = (bg.field || bg).stage?.zoom || 1;
  // 사진이 칸을 여백 없이 덮게 — 칸이 세로로 길면 그만큼 더 키운다
  const zoom = Math.max(want, ART.w / ART.h / ar);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const read = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setAr(width / height);
      const s = width * zoom / ART.w; // 실제로 그려지는 배율 (viewBox 가로 = ART.w / zoom)
      setU(Math.max(0.3, Math.min(1.6, 0.514 / s))); // 0.514 = 예전 칸 크기 기준
    };
    read();
    if (!window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);
  const play = useMemo(() => buildPlay(event, beatMs), [event, beatMs]);
  const t = useClock(event, beatMs, paused);
  const field = bg.field || bg;
  // 구장을 화면에 꽉 채우면 위로는 외야수가 머리칸에, 아래로는 포수·타자가 작전 버튼에 가린다.
  // 아트보다 넓은 창(vw × vh)을 잡아 그만큼 구장을 작게 그린다 — 남는 자리는 흐린 사진이 메운다.
  const vw = ART.w / zoom;
  const vh = vw / ar;
  const box = [(ART.w - vw) / 2, (ART.h - vh) / 2 - (field.stage?.dy || 0), vw, vh].join(' ');

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden">
      <style>{CHIP_CSS}</style>
      <svg viewBox={box} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <FieldView play={play} t={t} u={u} bases={bases} offColor={offColor} defColor={defColor} bg={field}
          defense={shown.men || EMPTY_DEF} gone={gone} fresh={!!gone} batter={batter} />
      </svg>
    </div>
  );
}
