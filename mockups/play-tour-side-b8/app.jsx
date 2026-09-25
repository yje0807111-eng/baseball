/* 토너먼트 시작 전 오른쪽 판 — 2안(트로피 배경 + 라운드 상금 + 내 팀)을 더 다듬은 8가지
   테두리 · 제목 · 버튼 · 줄 · 칸은 모두 게임에 있는 것 그대로 (KEYFRAMES 의 ui-*, ui.jsx 의 KV · Stats · Chip, NormalPlay 의 FormatPicker) */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, KV, Stats } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { FormatPicker } from '/src/myteam/NormalPlay.jsx';

const A = '#fbbf24', G = '#10b981';
const SIZE = 16;
const ROAD = [['16강', 160], ['8강', 280], ['4강', 400], ['결승', 960]];
const MY = { name: '나의 드림팀', ovr: 77, squad: 26, foreign: 2, rec: '3승 1무 1패' };

/* 판 배경: 아주 어두운 그림 한 장 위에 세로 그라데이션 (글씨를 가리지 않는다) */
const bg = (img, pos = 'center') => ({
  backgroundImage: `linear-gradient(180deg,rgba(6,10,19,.88),rgba(6,10,19,.97)), url(ui/tour/${img}.webp)`,
  backgroundSize: 'cover', backgroundPosition: pos,
});
const pane = (children, style) => (
  <aside className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col gap-4 p-6" style={{ '--c': '20px', '--a': A, ...style }}>
    <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {SIZE}</p>
    <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
    <FormatPicker value={SIZE} onChange={() => {}} />
    {children}
    <div className="mt-auto flex flex-col gap-2">
      <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }}>{SIZE}강 시작 ▶</button>
    </div>
  </aside>
);
const lab = (t, a = A) => <p className="ui-lab font-display" style={{ '--a': a }}>{t}</p>;
const chip = (t, a = A) => <span className="ui-chip font-display" style={{ '--a': a }}>{t}</span>;
/* 라운드 상금 — 이긴 라운드 칸만 금색 */
const roadRows = ({ badge = false } = {}) => (
  <div>
    {ROAD.map(([k, g], i) => (
      <KV key={k} k={badge ? <span className="flex items-center gap-2">{chip(`R${i + 1}`)}{k} 승리</span> : `${k} 승리`}
        v={`${g} G`} color={i === ROAD.length - 1 ? A : '#fff'} />
    ))}
  </div>
);
const mineRows = () => (
  <div>
    <KV k="내 팀" v={MY.name} />
    <KV k="팀 종합" v={MY.ovr} color={G} />
    <KV k="엔트리 · 외국인" v={`${MY.squad}명 · ${MY.foreign}`} />
  </div>
);

/* ── 1. 트로피를 왼쪽 아래에, 라운드 상금 뱃지 ── */
const V1 = () => pane(<>
  <Stats items={[['참가', `${SIZE}팀`], ['경기', '최대 4'], ['우승', '960 G']]} />
  {lab('Prize')}
  {roadRows({ badge: true })}
  {lab('My Team', G)}
  {mineRows()}
</>, bg('panel-trophy', 'left bottom'));

/* ── 2. 빛 배경 · 내 팀을 칸으로 ── */
const V2 = () => pane(<>
  <Stats items={[['참가', `${SIZE}팀`], ['경기', '최대 4'], ['우승', '960 G']]} />
  {lab('Prize')}
  {roadRows()}
  {lab('My Team', G)}
  <Stats items={[['팀 종합', MY.ovr], ['엔트리', MY.squad], ['외국인', `${MY.foreign}/3`]]} />
</>, bg('panel-light', 'center top'));

/* ── 3. 우승 상금을 한 칸으로 크게 ── */
const V3 = () => pane(<>
  <div className="ui-cut px-4 py-3" style={{ '--c': '10px', background: `linear-gradient(90deg,${A}1f,rgba(255,255,255,.03))` }}>
    <p className="text-[11px] text-gray-400">우승 상금</p>
    <b className="font-display text-3xl" style={{ color: A }}>960 G</b>
  </div>
  {lab('Prize')}
  {roadRows()}
  {lab('My Team', G)}
  {mineRows()}
</>, bg('panel-trophy', 'right center'));

/* ── 4. 내 팀 먼저 · 상금은 아래 ── */
const V4 = () => pane(<>
  {lab('My Team', G)}
  <Stats items={[['팀 종합', MY.ovr], ['엔트리', MY.squad], ['외국인', `${MY.foreign}/3`]]} />
  <div><KV k="최근 전적" v={MY.rec} /></div>
  {lab('Prize')}
  {roadRows({ badge: true })}
</>, bg('panel-field', 'center'));

/* ── 5. 칩으로 라운드 표시 ── */
const V5 = () => pane(<>
  <div className="flex flex-wrap gap-1.5">{['단판 승부', `${SIZE}팀`, '최대 4경기'].map((t) => chip(t, '#94a3b8'))}</div>
  {lab('Prize')}
  {roadRows()}
  {lab('My Team', G)}
  {mineRows()}
</>, bg('panel-trophy', 'left center'));

/* ── 6. 상금 · 내 팀을 두 칸씩 ── */
const V6 = () => pane(<>
  <Stats items={[['참가', `${SIZE}팀`], ['경기', '최대 4']]} />
  <Stats items={[['팀 종합', MY.ovr], ['엔트리', MY.squad]]} />
  {lab('Prize')}
  {roadRows({ badge: true })}
</>, bg('panel-light', 'center'));

/* ── 7. 상금만 크게, 내 팀은 한 줄 ── */
const V7 = () => pane(<>
  {lab('Prize')}
  {roadRows()}
  <div className="ui-cut mt-1 px-4 py-3" style={{ '--c': '10px', background: `linear-gradient(90deg,${A}22,rgba(255,255,255,.03))` }}>
    <p className="text-[11px] text-gray-400">우승하면</p>
    <b className="font-display text-3xl" style={{ color: A }}>960 G</b>
  </div>
  <div><KV k="내 팀" v={`${MY.name} · 종합 ${MY.ovr}`} color={G} /></div>
</>, bg('panel-trophy', 'center bottom'));

/* ── 8. 구장 배경 · 전적까지 ── */
const V8 = () => pane(<>
  <Stats items={[['참가', `${SIZE}팀`], ['경기', '최대 4'], ['우승', '960 G']]} />
  {lab('Prize')}
  {roadRows()}
  {lab('My Team', G)}
  <div>
    <KV k="팀 종합" v={MY.ovr} color={G} />
    <KV k="엔트리 · 외국인" v={`${MY.squad}명 · ${MY.foreign}`} />
    <KV k="최근 전적" v={MY.rec} />
  </div>
</>, bg('panel-field', 'center bottom'));

const V = [['1', '트로피 왼쪽 · 라운드 뱃지', V1], ['2', '빛 배경 · 내 팀 칸', V2], ['3', '우승 상금 큰 칸', V3], ['4', '내 팀 먼저', V4],
  ['5', '칩 요약', V5], ['6', '두 칸씩 요약', V6], ['7', '상금 중심', V7], ['8', '구장 배경 · 전적', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">토너먼트 시작 전 · 오른쪽 판 다듬기 8안</b>
        {V.map(([id, name]) => (
          <a key={id} className={`px-2.5 py-1 no-underline ${id === one ? 'text-[#05080f]' : 'text-gray-300'}`}
            style={{ background: id === one ? A : 'rgba(255,255,255,.06)' }} href={`${location.pathname}?v=${id}`}>{id}. {name}</a>
        ))}
      </div>
      {pick ? <div style={{ width: 384, height: 807 }}>{pick[2]()}</div> : (
        <div className="grid grid-cols-4 gap-4">
          {V.map(([id, name, C]) => (
            <div key={id}>
              <h3 className="mb-1.5 text-[13px] text-white"><a className="text-inherit no-underline" href={`${location.pathname}?v=${id}`}>{id}. {name}</a></h3>
              <div style={{ width: 384, height: 807 }}>{C()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
