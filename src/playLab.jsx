/*
 * 플레이 뷰 실험실 (개발용, 빌드에는 안 들어간다)
 *   npm run dev → /play-lab.html        배경 후보를 갈아 끼우며 상황별 플레이를 본다
 *   npm run dev → /play-lab.html?full   실제 경기 화면을 드래프트 없이 바로 띄운다 (배경도 바뀐다)
 *
 * 아직 저장소에 없는 후보(remote)는 생성 CDN 에서 바로 불러온다 — 고른 뒤
 * `node scripts/fetch-ui-art.mjs` 로 public/ui 에 받는다.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BroadcastGame from './BroadcastGame.jsx';
import PlayView from './play/PlayView.jsx';
import { FIELD_BGS, ZONE_BGS } from './play/backgrounds.js';
import { makeMapper, marksFrom, ART, BASE_FIELD } from './play/fieldMap.js';
import { spot, fenceAt } from './play/playScript.js';
import { randomSeriesTeam } from './myteam/aiTeam.js';
import { hitLocation } from './engine/pitchSim.js';
import './index.css';

const P = (id, name) => ({ id, name, overall: 85, position: 'OF', type: 'batter', stats: { contact: 80, power: 85, speed: 75, defense: 75 } });
const bat = P('b', '김하성'); const r1 = P('r1', '이정후'); const r3 = P('r3', '박병호'); const pit = P('p', '류현진');
const seeded = (n) => { let x = n; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
const base = (over) => ({
  inning: 7, top: false, batter: bat, pitcher: pit,
  pitch: { type: 'fast', zone: 4, inZone: true, velo: 149 },
  before: { outs: 1, balls: 1, strikes: 2, bases: [r1, null, r3] }, ...over,
});
const CASES = [
  ['홈런 (주자 1·3루)', base({ call: 'inplay', result: 'HR', runs: 3, after: { outs: 1, balls: 0, strikes: 0, bases: [null, null, null] }, hit: hitLocation(seeded(7), 'HR', { power: 92 }) })],
  ['2루타', base({ call: 'inplay', result: '2B', runs: 2, after: { outs: 1, balls: 0, strikes: 0, bases: [null, bat, null] }, hit: hitLocation(seeded(3), '2B', { power: 84 }) })],
  ['땅볼 아웃', base({ call: 'inplay', result: 'GO', runs: 0, after: { outs: 2, balls: 0, strikes: 0, bases: [null, r1, r3] }, hit: hitLocation(seeded(11), 'GO', {}) })],
  ['헛스윙', base({ call: 'swinging', after: { outs: 1, balls: 1, strikes: 3, bases: [r1, null, r3] } })],
  ['볼 (바깥쪽)', base({ call: 'ball', pitch: { type: 'slider', zone: null, inZone: false, velo: 133 }, after: { outs: 1, balls: 2, strikes: 2, bases: [r1, null, r3] } })],
];

/* 보정 자 — 사진의 진짜 다이아몬드에 좌표가 맞았는지 눈으로 본다 */
function Guide({ marks }) {
  const { at } = useMemo(() => makeMapper(marks), [marks]);
  const fence = [];
  for (let d = -1; d <= 1.0001; d += 2 / 36) fence.push(at(spot(d, fenceAt(d))));
  const dia = [...BASE_FIELD.slice(1), BASE_FIELD[0]].map((p, i) => `${i ? 'L' : 'M'} ${at(p).join(' ')}`).join(' ') + ' Z';
  return (
    <svg viewBox={`0 0 ${ART.w} ${ART.h}`} preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-0 h-full w-full">
      <path d={dia} fill="none" stroke="#f0abfc" strokeWidth="5" />
      <path d={`M ${at([0, 0]).join(' ')} ` + fence.map((p) => `L ${p.join(' ')}`).join(' ')} fill="none" stroke="#f0abfc" strokeWidth="4" opacity="0.8" />
      {BASE_FIELD.map((p, i) => <circle key={i} cx={at(p)[0]} cy={at(p)[1]} r="12" fill="#f0abfc" />)}
      <circle cx={at([0, 0.151])[0]} cy={at([0, 0.151])[1]} r="10" fill="#38bdf8" />
    </svg>
  );
}

const Row = ({ label, children }) => (
  <div className="flex items-center gap-2">
    <b className="w-[92px] shrink-0 font-display text-[11px] tracking-[0.18em] text-emerald-400">{label}</b>
    <div className="flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);
const Pick = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick}
    className={`px-2.5 py-1 text-[12px] ${on ? 'bg-emerald-400 font-bold text-[#05080f]' : 'bg-white/[0.07] text-gray-300 hover:bg-white/15'}`}>{children}</button>
);

function Lab() {
  const [zi, setZi] = useState(0);
  const [fi, setFi] = useState(0);
  const [ci, setCi] = useState(0);
  const [guide, setGuide] = useState(false);
  const [cal, setCal] = useState({ homeY: 731, sideY: 548, secondY: 450, halfW: 324 });
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return undefined;
    const h = setInterval(() => setCi((v) => (v + 1) % CASES.length), 3200);
    return () => clearInterval(h);
  }, [auto]);

  const marks = useMemo(() => marksFrom(cal), [cal]);
  const bg = { zone: ZONE_BGS[zi], field: { ...FIELD_BGS[fi], marks } };
  const [label, ev] = CASES[ci];

  return (
    <div className="min-h-dvh bg-[#05080f] p-4 text-gray-200">
      <div className="mb-3 flex flex-col gap-2">
        <Row label="ZONE 배경">{ZONE_BGS.map((b, i) => <Pick key={b.id} on={i === zi} onClick={() => setZi(i)}>{b.name}</Pick>)}</Row>
        <Row label="FIELD 배경">{FIELD_BGS.map((b, i) => <Pick key={b.id} on={i === fi} onClick={() => setFi(i)}>{b.name}</Pick>)}</Row>
        <Row label="상황">
          {CASES.map(([n], i) => <Pick key={n} on={i === ci} onClick={() => { setAuto(false); setCi(i); }}>{n}</Pick>)}
          <Pick on={auto} onClick={() => setAuto((v) => !v)}>자동 넘김</Pick>
        </Row>
        <Row label="보정">
          <Pick on={guide} onClick={() => setGuide((v) => !v)}>다이아몬드 자</Pick>
          {[['homeY', '홈 Y', 600, 890], ['sideY', '1·3루 Y', 400, 750], ['secondY', '2루 Y', 300, 650], ['halfW', '좌우 반폭', 180, 520]].map(([k, n, lo, hi]) => (
            <label key={k} className="flex items-center gap-1.5 text-[11px] text-gray-400">
              {n}
              <input type="range" min={lo} max={hi} value={cal[k]} onChange={(e) => setCal((c) => ({ ...c, [k]: +e.target.value }))} className="w-24" />
              <em className="w-9 font-display not-italic text-gray-200">{cal[k]}</em>
            </label>
          ))}
          <code className="bg-white/[0.06] px-2 py-1 text-[11px] text-emerald-300">{JSON.stringify(cal)}</code>
        </Row>
      </div>

      <p className="mb-1.5 font-display text-sm text-yellow-300">{label} — {bg.zone.name} / {bg.field.name}</p>
      <div className="relative" style={{ width: 816, height: 500, maxWidth: '100%' }}>
        <PlayView event={ev} atBat={[ev]} beatMs={2600} bases={ev.before.bases} offColor="#34d399" defColor="#f87171" bg={bg} />
        {guide && <Guide marks={marks} />}
      </div>
      <p className="mt-2 text-[12px] text-gray-500">
        경기 화면에서는 이 자리 위에 점수판이, 아래에 작전 버튼과 해설이 얹힙니다. 실제 화면은 /play-lab.html?full
      </p>
    </div>
  );
}

const q = new URLSearchParams(location.search);
const my = randomSeriesTeam(); const opp = randomSeriesTeam();
const fullBg = { zone: ZONE_BGS[Number(q.get('z') || 0)], field: FIELD_BGS[Number(q.get('f') || 0)] };
createRoot(document.getElementById('root')).render(
  q.has('full')
    ? <BroadcastGame my={{ ...my, name: '우리 팀' }} opp={opp} bg={fullBg} onFinish={() => {}} onExit={() => {}} />
    : <Lab />,
);
