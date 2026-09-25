/* 토너먼트 시작 전 오른쪽 판 8안 — 라운드별 상금 + 내 팀 정보
   테두리 · 제목 · 버튼 · 줄은 실제 화면 조각(ui.jsx 의 KV · Stats, NormalPlay 의 FormatPicker)을 그대로 쓴다 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle, KV, Stats } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { FormatPicker } from '/src/myteam/NormalPlay.jsx';

const A = '#fbbf24';
const SIZE = 16;
const ROUND_PRIZE = [['16강 탈락', 160], ['8강 탈락', 280], ['4강 탈락', 400], ['준우승', 640], ['우승', 960]];
const ROAD = [['16강', 160], ['8강', 280], ['4강', 400], ['결승', 960]];
const MY = { name: '나의 드림팀', ovr: 77, squad: 26, foreign: 2, rec: '3승 1무 1패' };
const BG = (img, opacity = 0.5) => ({
  backgroundImage: `linear-gradient(180deg,rgba(6,10,19,.86),rgba(6,10,19,.97)), url(ui/tour/${img}.webp)`,
  backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1,
});

/* 실제 화면의 오른쪽 판과 같은 껍데기 */
const pane = (children, bg) => (
  <aside className="ui-cut ui-frame ui-glass flex h-full min-h-0 flex-col gap-4 p-6" style={{ '--c': '20px', '--a': A, ...(bg || {}) }}>
    <p className="ui-lab font-display" style={{ '--a': A }}>Tournament · {SIZE}</p>
    <h2 className="-mt-2 text-3xl font-black text-white">일반 대결</h2>
    <FormatPicker value={SIZE} onChange={() => {}} />
    {children}
    <div className="mt-auto flex flex-col gap-2">
      <button type="button" className="ui-btn ui-cut pri min-h-[3.5rem] w-full text-lg" style={{ '--a': A }}>{SIZE}강 시작 ▶</button>
    </div>
  </aside>
);
const lab = (t) => <p className="ui-lab font-display" style={{ '--a': A }}>{t}</p>;
const roadKV = () => <div>{ROAD.map(([k, g], i) => <KV key={k} k={`${k} 승리`} v={`${g} G`} color={i === ROAD.length - 1 ? A : '#fff'} />)}</div>;
const prizeKV = () => <div>{ROUND_PRIZE.slice().reverse().map(([k, g], i) => <KV key={k} k={k} v={`${g} G`} color={i === 0 ? A : '#fff'} />)}</div>;
const myKV = () => (
  <div>
    <KV k="내 팀" v={MY.name} />
    <KV k="팀 종합" v={MY.ovr} color="#10b981" />
    <KV k="엔트리 · 외국인" v={`${MY.squad}명 · ${MY.foreign}`} />
  </div>
);
const myStats = () => <Stats items={[['팀 종합', MY.ovr], ['엔트리', `${MY.squad}`], ['외국인', `${MY.foreign}/3`]]} />;
const sumStats = () => <Stats items={[['참가', `${SIZE}팀`], ['경기', '최대 4'], ['우승', '960 G']]} />;

/* ── 1. 기본: 요약 · 라운드 상금 · 내 팀 ── */
const V1 = () => pane(<>
  {sumStats()}
  {lab('Prize')}
  {roadKV()}
  {lab('My Team')}
  {myKV()}
</>);

/* ── 2. 은은한 트로피 배경 ── */
const V2 = () => pane(<>
  {sumStats()}
  {lab('Prize')}
  {roadKV()}
  {lab('My Team')}
  {myKV()}
</>, BG('panel-trophy'));

/* ── 3. 빛 배경 + 성적별 상금 전부 ── */
const V3 = () => pane(<>
  {myStats()}
  {lab('Prize')}
  {prizeKV()}
</>, BG('panel-light'));

/* ── 4. 내 팀 먼저 ── */
const V4 = () => pane(<>
  {lab('My Team')}
  {myKV()}
  {lab('Prize')}
  {roadKV()}
</>);

/* ── 5. 구장 배경 + 내 팀 칸 ── */
const V5 = () => pane(<>
  {lab('Prize')}
  {roadKV()}
  {lab('My Team')}
  {myStats()}
  <div><KV k="최근 전적" v={MY.rec} /></div>
</>, BG('panel-field'));

/* ── 6. 우승 상금 강조 ── */
const V6 = () => pane(<>
  <Stats items={[['우승 상금', '960 G']]} />
  {lab('Prize')}
  {prizeKV()}
  {lab('My Team')}
  {myStats()}
</>, BG('panel-trophy'));

/* ── 7. 라운드 상금 + 전적까지 ── */
const V7 = () => pane(<>
  {sumStats()}
  {lab('Prize')}
  {roadKV()}
  {lab('My Team')}
  <div>
    <KV k="팀 종합" v={MY.ovr} color="#10b981" />
    <KV k="최근 전적" v={MY.rec} />
  </div>
</>, BG('panel-light'));

/* ── 8. 두 줄 요약 + 상금 ── */
const V8 = () => pane(<>
  <Stats items={[['참가', `${SIZE}팀`], ['경기', '최대 4']]} />
  <Stats items={[['팀 종합', MY.ovr], ['엔트리', `${MY.squad}`]]} />
  {lab('Prize')}
  {prizeKV()}
</>, BG('panel-field'));

const V = [['1', '기본', V1], ['2', '트로피 배경', V2], ['3', '빛 배경 · 성적별 상금', V3], ['4', '내 팀 먼저', V4],
  ['5', '구장 배경 · 전적', V5], ['6', '우승 상금 강조', V6], ['7', '빛 배경 · 전적', V7], ['8', '두 줄 요약', V8]];

function Gallery() {
  const one = new URLSearchParams(location.search).get('v');
  const pick = V.find(([id]) => id === one);
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex items-center gap-2 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">토너먼트 시작 전 · 오른쪽 판 8안</b>
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
