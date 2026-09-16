/* 메인 — 메트로 타일 배치: 큰 경기 타일 + 라커·상점·모드·기록 타일 + 아래 내 선수 줄 */
import React, { useMemo } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_SIZE, SQUAD_CAP, squadCost, squadIssues } from './rules.js';
import { UiStyle, Bg, TopBar, Btn, Chip, PlayerTile } from './ui.jsx';

const ALL = SERIES.flatMap((s) => s.players);
const daySeed = () => { const d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };
const pickN = (arr, n, seed) => {
  const out = []; const used = new Set(); let h = seed;
  while (out.length < n && used.size < arr.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    const i = h % arr.length;
    if (!used.has(i)) { used.add(i); out.push(arr[i]); }
  }
  return out;
};

/** 메트로 타일 */
function Tile({ img, a, label, title, desc, style, onClick, disabled, children, big }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`mt-cut mt-frame group relative overflow-hidden text-left transition ${disabled ? 'opacity-50' : 'hover:brightness-110'}`}
      style={{
        '--c': big ? '20px' : '14px', '--a': a, ...style,
        background: `linear-gradient(180deg, rgba(5,8,15,.25), rgba(5,8,15,.94)), url(${img}) center/cover`,
      }}>
      <span className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 20% 100%, ${a}22, transparent 70%)` }} />
      <div className="absolute inset-x-5 bottom-4">
        {label && <p className="mt-lab" style={{ '--a': a, fontSize: 10 }}>{label}</p>}
        <b className={`mt-1 block font-extrabold text-white ${big ? 'text-[44px] leading-tight' : 'text-[24px]'}`}>{title}</b>
        {desc && <span className="text-[13px]" style={{ color: a }}>{desc}</span>}
        {children}
      </div>
    </button>
  );
}

export default function LobbyScreen({ account, onLocker, onPlay, onShop, onModes, onSignOut }) {
  const team = account.team;
  const squad = team.squad || [];
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(squad, team.staff);
  const issues = squadIssues(squad, team.staff, cap);
  const ready = issues.length === 0;
  const rec = team.record || { w: 0, l: 0, d: 0 };
  const rating = squad.length ? Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length) : 0;
  const seed = daySeed();
  const hot = useMemo(() => pickN(ALL.filter((p) => p.overall >= 88), 8, seed), [seed]);
  const show = squad.length ? [...squad].sort((a, b) => b.overall - a.overall).slice(0, 8) : hot;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg opacity={0.55} grad="linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.9))" />
      <TopBar section="메인" team={team} account={account} onSignOut={onSignOut} />

      <div className="relative grid min-h-0 flex-1 gap-3.5 px-6 py-4"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr) minmax(0,0.85fr)' }}>

        {/* 경기 — 가장 큰 타일 */}
        <Tile big img="ui/broadcast-field.webp" a="#10b981" label="Next Match" title="오늘의 경기"
          desc={ready ? 'AI 올스타 · 전력 87 · 승리 보상 300G' : issues[0]}
          style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2' }} onClick={ready ? onPlay : onLocker}>
          <div className="mt-5 flex items-center gap-4">
            <span className="mt-btn pri" style={{ '--c': '14px', minHeight: 78, fontSize: 25, padding: '0 56px', boxShadow: '0 0 56px -10px rgba(16,185,129,.95)' }}>
              {ready ? '경기 시작 ▶' : '라커에서 채우기'}
            </span>
            <span className="text-[13px] text-gray-300">엔트리 {squad.length}/{SQUAD_SIZE} · 팀 종합 {rating || '-'}</span>
          </div>
        </Tile>

        <Tile img="ui/mt/tile-locker.webp" a="#34d399" label="My Locker" title="내 라커"
          desc={`${squad.length}/${SQUAD_SIZE} · ${cost.toLocaleString()}/${cap.toLocaleString()} CP`} onClick={onLocker} />

        <Tile img="ui/mt/tile-shop.webp" a="#fde047" label="Shop" title="상점"
          desc="훈련 · 부스트 · 계약서" onClick={onShop} />

        <Tile img="ui/mt/tile-modes.webp" a="#c4b5fd" label="Modes" title="모드"
          desc="레전드 드래프트 입장 가능" onClick={onModes} />

        <Tile img="ui/mt/tile-record.webp" a="#7dd3fc" label="Record" title="기록"
          desc={account.history?.length ? `최근 ${account.history[0].myRuns} : ${account.history[0].oppRuns}` : '아직 경기가 없습니다'} disabled />

        {/* 아래 줄: 내 선수 (없으면 인기 선수) */}
        <section className="mt-cut mt-frame mt-glass min-h-0 p-3 px-4" style={{ '--c': '14px', gridColumn: '1 / span 4' }}>
          <div className="flex items-center gap-3">
            <p className="mt-lab" style={{ '--a': squad.length ? '#34d399' : '#fde047' }}>{squad.length ? 'My Squad' : 'Hot Players'}</p>
            <span className="text-xs text-gray-500">{squad.length ? `종합 상위 8명 · 엔트리 ${squad.length}명` : '이번 주 인기 영입 — 라커에서 찾아보세요'}</span>
            <Btn sm className="ml-auto" onClick={onLocker}>{squad.length ? '엔트리 보기' : '선수 검색'}</Btn>
          </div>
          <div className="mt-2.5 grid grid-cols-8 gap-2.5">
            {show.map((p) => <PlayerTile key={p.id} player={p} width="100%" height={132} onClick={onLocker} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
