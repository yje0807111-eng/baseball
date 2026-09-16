/* 메인 로비 — 내 라커 · 바로 플레이 · 인기 선수/시즌 · 감독 추천 · 상점 · 모드 방 */
import React, { useMemo } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_SIZE, SQUAD_CAP, squadCost, squadIssues } from './rules.js';
import { staffByRole } from './staff.js';
import { UiStyle, Bg, TopBar, Panel, Btn, Chip, PlayerTile } from './ui.jsx';

const ALL = SERIES.flatMap((s) => s.players);
const pickN = (arr, n, seed) => {
  const out = [];
  const used = new Set();
  let h = seed;
  while (out.length < n && used.size < arr.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    const i = h % arr.length;
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }
  return out;
};
/** 오늘의 추천: 날짜를 씨앗으로 고정 (하루 동안 같은 목록) */
const daySeed = () => { const d = new Date(); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };

export default function LobbyScreen({ account, onLocker, onPlay, onShop, onModes, onSignOut }) {
  const team = account.team;
  const squad = team.squad || [];
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(squad, team.staff);
  const issues = squadIssues(squad, team.staff, cap);
  const ready = issues.length === 0;
  const rec = team.record || { w: 0, l: 0, d: 0 };
  const seed = daySeed();

  const hotPlayers = useMemo(() => pickN(ALL.filter((p) => p.overall >= 88), 6, seed), [seed]);
  const hotSeasons = useMemo(() => pickN(SERIES.filter((s) => s.kind === 'team'), 3, seed + 7), [seed]);
  const managers = useMemo(() => pickN(staffByRole('manager'), 3, seed + 13), [seed]);
  const top3 = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 3);
  const teamRating = squad.length ? Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length) : 0;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg />
      <TopBar title="메인" sub={<Chip a="#34d399">감독 {account.nick}</Chip>}>
        <Chip a="#fde047">💰 {(account.gold ?? 0).toLocaleString()} G</Chip>
        <Btn sm onClick={onSignOut}>로그아웃</Btn>
      </TopBar>

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 py-4" style={{ gridTemplateColumns: '420px minmax(0,1fr) 340px' }}>
        {/* 왼쪽: 내 라커 · 바로 플레이 */}
        <div className="grid min-h-0 gap-4" style={{ gridTemplateRows: 'minmax(0,1fr) auto' }}>
          <section className="mt-cut mt-frame hot relative overflow-hidden p-5" style={{ '--c': '18px', '--a': '#10b981', background: 'linear-gradient(160deg,rgba(16,185,129,.2),rgba(5,8,15,.92) 55%), url(ui/mt/mt-locker.webp) center/cover' }}>
            <p className="mt-lab">My Locker</p>
            <h2 className="mt-2.5 text-4xl font-extrabold text-white">{team.name}</h2>
            <p className="mt-1 text-[13px] text-gray-300">
              엔트리 {squad.length}/{SQUAD_SIZE} · 코치진 {Object.keys(team.staff || {}).length}/4 · 팀 종합 <b className="font-display text-lg text-emerald-400">{teamRating || '-'}</b>
            </p>
            <div className="mt-bar mt-4"><i style={{ width: `${Math.min(100, (cost / cap) * 100)}%`, background: 'linear-gradient(90deg,#10b981,#fde047)' }} /></div>
            <p className="mt-1.5 text-xs text-gray-400">{cost.toLocaleString()} / {cap.toLocaleString()} CP · 남은 예산 {Math.max(0, cap - cost).toLocaleString()}</p>
            <div className="mt-4 flex gap-2.5">
              {top3.length ? top3.map((p) => <PlayerTile key={p.id} player={p} width={118} height={158} />)
                : <p className="text-sm text-gray-500">아직 영입한 선수가 없습니다. 라커에서 선수를 찾아 보세요.</p>}
            </div>
            <div className="mt-5 flex gap-2.5">
              <Btn pri lg className="flex-1" style={{ '--c': '12px' }} onClick={onLocker}>내 라커 들어가기</Btn>
            </div>
          </section>

          <section className="mt-cut mt-frame overflow-hidden p-5" style={{ '--c': '16px', '--a': '#7dd3fc', background: 'linear-gradient(120deg,rgba(125,211,252,.18),rgba(5,8,15,.92) 60%), url(ui/mt/mt-tunnel.webp) center/cover' }}>
            <p className="mt-lab" style={{ '--a': '#7dd3fc' }}>Quick Play</p>
            <div className="mt-2.5 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <b className="block text-2xl text-white">바로 플레이</b>
                <span className="text-[13px] text-gray-300">{ready ? 'AI 올스타와 한 경기' : issues[0]}</span>
              </div>
              <Btn pri lg disabled={!ready} onClick={onPlay} style={{ '--c': '12px', padding: '0 34px' }}>경기 시작</Btn>
            </div>
          </section>
        </div>

        {/* 가운데: 추천 */}
        <div className="grid min-h-0 gap-4" style={{ gridTemplateRows: 'auto auto minmax(0,1fr)' }}>
          <Panel label="Hot Players · 이번 주 인기 영입" a="#fde047" className="p-4 px-[18px]">
            <div className="mt-3 flex gap-3">
              {hotPlayers.map((p) => <PlayerTile key={p.id} player={p} onClick={onLocker} />)}
            </div>
          </Panel>

          <Panel label="Hot Seasons · 인기 시즌" a="#34d399" className="p-4 px-[18px]">
            <div className="mt-3 grid grid-cols-3 gap-3">
              {hotSeasons.map((s) => (
                <button key={s.id} type="button" onClick={onLocker}
                  className="mt-cut mt-frame relative h-[120px] overflow-hidden text-left" style={{ '--c': '12px', '--a': '#34d399', background: 'url(ui/mt/mt-season.webp) center/cover' }}>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,.94))' }} />
                  <div className="absolute inset-x-3.5 bottom-3">
                    <b className="block text-[19px] text-white">{s.year} {s.title}</b>
                    <span className="text-xs text-emerald-300">{s.subtitle || `${s.players.length}명`}</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel label="Managers · 감독 추천" a="#c4b5fd" className="min-h-0 p-4 px-[18px]">
            <div className="mt-3 grid grid-cols-3 gap-3">
              {managers.map((m) => (
                <div key={m.id} className="mt-cut p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={{ '--c': '10px', background: 'rgba(5,8,15,.66)' }}>
                  <div className="flex items-center gap-3">
                    <div className="mt-cut h-[52px] w-[52px] bg-cover bg-center opacity-80" style={{ '--c': '7px', backgroundImage: 'url(ui/mt/mt-card.webp)' }} />
                    <div className="min-w-0"><b className="block truncate text-[17px] text-white">{m.name}</b><span className="text-xs text-gray-400">{m.note}</span></div>
                  </div>
                  <p className="mt-2.5 text-xs text-violet-300">
                    {Object.entries(m.effect).map(([k, v]) => `${{ bat: '타격', field: '수비', pitch: '구위', stamina: '체력', steal: '도루', clutch: '승부처' }[k]} +${k === 'steal' ? `${Math.round(v * 100)}%p` : v}`).join(' · ')} · {m.cost} CP
                  </p>
                  <Btn sm className="mt-2.5 w-full" onClick={onLocker}>라커에서 영입</Btn>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* 오른쪽: 상점 · 모드 */}
        <div className="grid min-h-0 gap-4" style={{ gridTemplateRows: 'minmax(0,1fr) auto' }}>
          <Panel label="Shop · 오늘의 상품" a="#fde047" className="min-h-0 p-4">
            <div className="mt-3 flex flex-col gap-2.5">
              {[['에너지 드링크', '선수 1명 체력 +15 · 3경기', 120, '#34d399', 'mt-boost'], ['레전드 팩', '80+ 선수 3장 중 1장 선택', 450, '#fde047', 'mt-pack'], ['타격 특훈', '타자 1명 컨택 +3 · 영구', 300, '#7dd3fc', 'mt-boost']].map(([t, d, price, c, img]) => (
                <button key={t} type="button" onClick={onShop}
                  className="mt-cut grid grid-cols-[56px_1fr_auto] items-center gap-3 p-2.5 px-3 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={{ '--c': '10px', background: 'rgba(5,8,15,.66)' }}>
                  <div className="mt-cut h-14 w-14 bg-cover bg-center" style={{ '--c': '7px', backgroundImage: `url(ui/mt/${img}.webp)` }} />
                  <div className="min-w-0"><b className="block truncate text-[15px] text-white">{t}</b><span className="text-xs text-gray-400">{d}</span></div>
                  <span className="font-display text-lg" style={{ color: c }}>{price}G</span>
                </button>
              ))}
            </div>
            <Btn className="mt-3.5 w-full" style={{ '--c': '10px' }} onClick={onShop}>상점 열기</Btn>
            <p className="mt-2.5 text-xs text-gray-500">부스트는 선수·감독에게 붙여 쓰는 소모품입니다</p>
          </Panel>

          <Panel label="Modes · 모드 방" a="#c4b5fd" className="p-4">
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="mt-cut mt-frame p-3 px-3.5" style={{ '--c': '10px', '--a': '#c4b5fd', background: 'rgba(196,181,253,.1)' }}>
                <b className="block text-base text-white">레전드 드래프트</b>
                <span className="text-xs text-gray-400">랜덤 시즌에서 한 명씩 뽑아 한 판</span>
                <Btn sm className="mt-2.5 w-full" onClick={onModes}>입장</Btn>
              </div>
              {[['감독 리그', '다른 감독의 팀과 대결 · 준비 중'], ['주간 도전', '특정 조건으로 팀을 짜는 과제 · 준비 중']].map(([t, d]) => (
                <div key={t} className="mt-cut p-3 px-3.5 opacity-55" style={{ '--c': '10px', background: 'rgba(5,8,15,.6)' }}>
                  <b className="block text-base text-white">{t}</b><span className="text-xs text-gray-400">{d}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="Recent" a="#34d399" className="p-4">
            {(account.history || []).length === 0 ? <p className="mt-2 text-sm text-gray-500">기록이 없습니다.</p> : (
              <div className="mt-2">
                {account.history.slice(0, 4).map((h, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-white/[0.06] py-2">
                    <span className="w-9 font-display text-xs tracking-wider" style={{ color: h.winner === 'my' ? '#34d399' : h.winner === 'opp' ? '#f87171' : '#9ca3af' }}>
                      {h.winner === 'my' ? 'WIN' : h.winner === 'opp' ? 'LOSE' : 'DRAW'}
                    </span>
                    <span className="truncate text-[13px] text-gray-300">{h.opp}</span>
                    <b className="font-display text-lg text-white">{h.myRuns} : {h.oppRuns}</b>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">{rec.w}승 {rec.l}패 {rec.d}무</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
