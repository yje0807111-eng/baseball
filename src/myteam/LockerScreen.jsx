/* 내 라커 — 왼쪽 엔트리 카드 격자(26칸) + 코치진, 오른쪽 검색 리스트, 카드를 누르면 상세 판 */
import React, { useMemo, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_SIZE, SQUAD_CAP, FOREIGN_MAX, POS_RULES, STAFF_SLOTS, squadCost, foreignCount, addBlockReason, squadIssues } from './rules.js';
import { staffByRole } from './staff.js';
import { saveTeam } from './store.js';
import { UiStyle, Bg, TopBar, Panel, Btn, Chip, PlayerTile } from './ui.jsx';

const ALL = SERIES.flatMap((s) => s.players);
const YEARS = [...new Set(ALL.map((p) => p.year))].sort((a, b) => b - a);
const TEAMS = [...new Set(ALL.map((p) => p.team))].sort();
const POS = POS_RULES.map((r) => r.key);
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const cut = (n) => ({ '--c': `${n}px` });

const Select = ({ value, onChange, options, all }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="mt-cut bg-[#05080f]/60 px-3 py-2.5 text-[13px] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] outline-none" style={cut(8)}>
    <option value="">{all}</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

/* 검색 결과 한 줄 (A안 리스트 문법) */
function PlayerRow({ p, onPick, onAdd, blocked, owned }) {
  return (
    <div role="button" onClick={() => onPick(p)}
      className="mt-cut grid cursor-pointer grid-cols-[38px_1fr_auto_auto] items-center gap-2.5 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)]"
      style={{ ...cut(8), background: owned ? 'rgba(16,185,129,.12)' : 'rgba(5,8,15,.6)' }}>
      <b className="font-display text-lg" style={{ color: tone(p.overall) }}>{p.overall}</b>
      <div className="min-w-0">
        <b className="block truncate text-sm text-white">{p.name}{p.isForeign && <span className="ml-1.5 text-[10px] text-amber-300">외국인</span>}</b>
        <span className="text-[11px] text-gray-400">{p.year} {p.team} · {p.position}</span>
      </div>
      <span className="font-display text-sm text-gray-300">{p.cost}</span>
      <Btn sm disabled={!!blocked || owned} title={blocked || ''} onClick={(e) => { e.stopPropagation(); onAdd(p); }}>{owned ? '보유' : '영입'}</Btn>
    </div>
  );
}

/* 선수 상세 판 (C안) */
function DetailPanel({ p, squad, staff, cap, onAdd, onRelease, onClose }) {
  const owned = squad.some((x) => x.id === p.id);
  const cost = squadCost(squad, staff);
  const after = owned ? cost - p.cost : cost + p.cost;
  const blocked = owned ? null : addBlockReason(p, squad, staff, cap);
  const now = squad.length ? Math.round(squad.reduce((s, x) => s + x.overall, 0) / squad.length) : 0;
  const next = owned
    ? (squad.length > 1 ? Math.round((squad.reduce((s, x) => s + x.overall, 0) - p.overall) / (squad.length - 1)) : 0)
    : Math.round((squad.reduce((s, x) => s + x.overall, 0) + p.overall) / (squad.length + 1));
  const statKeys = p.type === 'pitcher' ? [['구위', 'stuff'], ['제구', 'control'], ['체력', 'stamina'], ['안정', 'stability']] : [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#03050a]/80 p-6 backdrop-blur-[3px]" onClick={onClose}>
      <section onClick={(e) => e.stopPropagation()}
        className="mt-cut mt-frame hot relative w-full max-w-[980px] overflow-hidden p-6"
        style={{ ...cut(16), '--a': tone(p.overall), background: 'linear-gradient(160deg,rgba(253,224,71,.08),rgba(5,8,15,.96) 55%), url(ui/mt/mt-card.webp) center/cover' }}>
        <div className="flex items-start justify-between">
          <p className="mt-lab" style={{ '--a': tone(p.overall) }}>Player</p>
          <Btn sm onClick={onClose}>닫기</Btn>
        </div>
        <div className="mt-4 flex gap-6">
          <PlayerTile player={p} width={230} height={306} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[40px] font-extrabold leading-tight text-white">
              {p.name} <span className="font-display text-[22px] text-gray-400">{p.year} {p.team} · {p.position}</span>
            </h2>
            {p.source && <p className="mt-1.5 text-sm text-gray-300">{p.source.split('—')[0].trim()}</p>}
            {p.note && <p className="mt-1 text-sm text-emerald-300">{p.note}</p>}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {statKeys.map(([label, k]) => (
                <div key={k}>
                  <b className="block font-display text-[40px] leading-none text-white">{p.stats?.[k] ?? '-'}</b>
                  <span className="text-[11px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.isForeign && <Chip a="#fbbf24">외국인 {foreignCount(squad)}/{FOREIGN_MAX}</Chip>}
              {p.isNational && <Chip a="#7dd3fc">국가대표</Chip>}
              <Chip a="#34d399">{p.year} {p.club || p.team}</Chip>
            </div>
            <div className="mt-cut mt-4 bg-[#05080f]/72 p-4" style={cut(10)}>
              {[[owned ? '방출 환급' : '영입가', `${p.cost} CP`, '#fff'],
              [owned ? '방출 후 남은 예산' : '영입 후 남은 예산', `${(cap - after).toLocaleString()}`, cap - after < 0 ? '#f87171' : '#fff'],
              ['팀 종합', `${now || '-'} → ${next || '-'}`, next >= now ? '#34d399' : '#f87171']].map(([k, v, c]) => (
                <div key={k} className="flex justify-between py-0.5 text-[13px] text-gray-400">
                  <span>{k}</span><b className="font-display text-xl" style={{ color: c }}>{v}</b>
                </div>
              ))}
            </div>
            {blocked && <p className="mt-2 text-sm text-red-400">{blocked}</p>}
            <div className="mt-4 flex gap-2.5">
              {owned
                ? <Btn lg className="flex-1" style={cut(12)} onClick={() => { onRelease(p); onClose(); }}>방출하기</Btn>
                : <Btn pri lg className="flex-1" style={cut(12)} disabled={!!blocked} onClick={() => { onAdd(p); onClose(); }}>영입하기</Btn>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LockerScreen({ account, onSave, onBack }) {
  const [team, setTeam] = useState(account.team);
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [club, setClub] = useState('');
  const [pos, setPos] = useState('');
  const [detail, setDetail] = useState(null);
  const [staffPick, setStaffPick] = useState(null); // 코치 고르는 중인 자리

  const squad = team.squad || [];
  const staff = team.staff || {};
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(squad, staff);
  const issues = squadIssues(squad, staff, cap);

  const commit = (next) => { setTeam(next); saveTeam(next); onSave?.(next); };
  const add = (p) => { if (!addBlockReason(p, squad, staff, cap)) commit({ ...team, squad: [...squad, p] }); };
  const release = (p) => commit({ ...team, squad: squad.filter((x) => x.id !== p.id) });
  const setStaff = (slot, person) => { commit({ ...team, staff: { ...staff, [slot]: person } }); setStaffPick(null); };

  /* 자동 채우기: 모자란 포지션부터 예산에 맞는 선수로 남은 자리를 채운다 */
  const autoFill = () => {
    let next = [...squad];
    const need = () => POS_RULES.flatMap((r) => {
      const n = next.filter((p) => p.position === r.key).length;
      return Array.from({ length: Math.max(0, r.min - n) }, () => r.key);
    });
    const tryAdd = (pos) => {
      const slots = SQUAD_SIZE - next.length;
      const budget = Math.max(40, Math.floor((cap - squadCost(next, staff)) / Math.max(1, slots)));
      const pool = ALL.filter((p) => (!pos || p.position === pos) && p.cost <= budget && !addBlockReason(p, next, staff, cap))
        .sort((a, b) => b.overall - a.overall);
      if (!pool.length) return false;
      next = [...next, pool[0]];
      return true;
    };
    for (const pos of need()) { if (next.length >= SQUAD_SIZE) break; tryAdd(pos); }
    while (next.length < SQUAD_SIZE) { if (!tryAdd(null)) break; }
    commit({ ...team, squad: next });
  };

  const results = useMemo(() => {
    const kw = q.trim();
    return ALL.filter((p) => (!year || String(p.year) === year) && (!club || p.team === club) && (!pos || p.position === pos)
      && (!kw || p.name.includes(kw) || String(p.year).includes(kw) || p.team.includes(kw)))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 120);
  }, [q, year, club, pos]);

  const slots = Array.from({ length: SQUAD_SIZE }, (_, i) => squad[i] || null);
  const rating = squad.length ? Math.round(squad.reduce((s, p) => s + p.overall, 0) / squad.length) : 0;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/mt-locker.webp" opacity={0.45} grad="linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.93))" />
      <TopBar title="내 라커" left={<Btn sm onClick={onBack}>← 메인</Btn>}
        sub={<div className="flex gap-2">
          <Chip a={squad.length === SQUAD_SIZE ? '#34d399' : '#f87171'}>엔트리 {squad.length}/{SQUAD_SIZE}</Chip>
          <Chip a={foreignCount(squad) > FOREIGN_MAX ? '#f87171' : '#fde047'}>외국인 {foreignCount(squad)}/{FOREIGN_MAX}</Chip>
          <Chip a={cost > cap ? '#f87171' : '#7dd3fc'}>{cost.toLocaleString()} / {cap.toLocaleString()} CP</Chip>
          <Chip a="#34d399">팀 종합 {rating || '-'}</Chip>
        </div>}>
        {issues.length > 0 && <span className="text-xs text-amber-200">{issues[0]}{issues.length > 1 ? ` 외 ${issues.length - 1}건` : ''}</span>}
        <Btn sm onClick={autoFill} disabled={squad.length >= SQUAD_SIZE}>자동 채우기</Btn>
      </TopBar>

      <div className="relative grid min-h-0 flex-1 gap-4 overflow-hidden px-6 py-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 470px', gridTemplateRows: 'minmax(0,1fr)' }}>
        {/* 왼쪽: 엔트리 카드 격자 + 코치진 */}
        <Panel className="flex min-h-0 flex-col p-4 px-[18px]" c={16}>
          <div className="flex items-center gap-3.5">
            <p className="mt-lab">My Squad · {squad.length}/{SQUAD_SIZE}</p>
            <div className="flex gap-1.5">
              {POS_RULES.map((r) => {
                const n = squad.filter((p) => p.position === r.key).length;
                return <Chip key={r.key} a={n < r.min ? '#f87171' : '#94a3b8'}>{r.label} {n}/{r.min}</Chip>;
              })}
            </div>
          </div>

          <div className="mt-scroll mt-3.5 grid min-h-0 flex-1 grid-cols-7 content-start gap-2.5 overflow-y-auto pr-2">
            {slots.map((p, i) => (p
              ? <PlayerTile key={p.id} player={p} width="100%" height={152} onClick={() => setDetail(p)} />
              : <div key={`e${i}`} className="mt-cut grid h-[152px] place-items-center border border-dashed border-white/20 text-[13px] text-gray-600" style={cut(12)}>빈 자리</div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            {STAFF_SLOTS.map((s) => {
              const cur = staff[s.key];
              return (
                <button key={s.key} type="button" onClick={() => setStaffPick(s)}
                  className="mt-cut flex items-center gap-2.5 p-2 px-2.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.3)]"
                  style={{ ...cut(8), background: 'rgba(5,8,15,.6)' }}>
                  <div className="mt-cut h-[38px] w-[38px] bg-cover bg-center opacity-80" style={{ ...cut(6), backgroundImage: 'url(ui/mt/mt-card.webp)' }} />
                  <div className="min-w-0">
                    <span className="block font-display text-[10px] tracking-[0.2em] text-gray-500">{s.label}</span>
                    <b className={`block truncate text-sm ${cur ? 'text-white' : 'text-gray-600'}`}>{cur?.name || '비어 있음'}</b>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* 오른쪽: 검색 리스트 */}
        <Panel label={staffPick ? `${staffPick.label} 고르기` : 'Search'} a={staffPick ? '#c4b5fd' : '#fde047'} className="flex min-h-0 flex-col p-4" c={14}>
          {staffPick ? (
            <>
              <div className="mt-scroll gold mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
                {staffByRole(staffPick.role).map((m) => (
                  <div key={m.id} className="mt-cut grid grid-cols-[1fr_auto_auto] items-center gap-2.5 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]" style={{ ...cut(8), background: 'rgba(5,8,15,.6)' }}>
                    <div className="min-w-0">
                      <b className="block truncate text-sm text-white">{m.name} <span className="text-[11px] text-gray-500">{m.era}</span></b>
                      <span className="text-[11px] text-violet-300">
                        {Object.entries(m.effect).map(([k, v]) => `${{ bat: '타격', field: '수비', pitch: '구위', stamina: '체력', steal: '도루', clutch: '승부처' }[k]} +${k === 'steal' ? `${Math.round(v * 100)}%p` : v}`).join(' · ')}
                      </span>
                    </div>
                    <span className="font-display text-sm text-gray-300">{m.cost}</span>
                    <Btn sm onClick={() => setStaff(staffPick.key, m)}>선임</Btn>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Btn className="flex-1" onClick={() => { setStaff(staffPick.key, null); }}>비우기</Btn>
                <Btn className="flex-1" onClick={() => setStaffPick(null)}>닫기</Btn>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-[1fr_repeat(3,110px)] gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="선수 이름 · 연도 · 구단 검색"
                  className="mt-cut mt-frame bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:shadow-[inset_0_0_0_2px_#10b981]" style={cut(8)} />
                <Select value={year} onChange={setYear} options={YEARS} all="연도 전체" />
                <Select value={club} onChange={setClub} options={TEAMS} all="구단 전체" />
                <Select value={pos} onChange={setPos} options={POS} all="포지션" />
              </div>
              <p className="mb-2 mt-3 text-xs text-gray-500">결과 {results.length}명 · 종합 높은 순</p>
              <div className="mt-scroll gold flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
                {results.map((p) => (
                  <PlayerRow key={p.id} p={p} onPick={setDetail} onAdd={add}
                    owned={squad.some((x) => x.id === p.id)} blocked={addBlockReason(p, squad, staff, cap)} />
                ))}
                {results.length === 0 && <p className="text-sm text-gray-500">조건에 맞는 선수가 없습니다.</p>}
              </div>
              <div className="mt-3">
                <div className="mt-bar"><i style={{ width: `${Math.min(100, (cost / cap) * 100)}%`, background: cost > cap ? '#f87171' : 'linear-gradient(90deg,#10b981,#fde047)' }} /></div>
                <p className="mt-1.5 text-xs text-gray-400">{cost.toLocaleString()} / {cap.toLocaleString()} CP · 남은 {(cap - cost).toLocaleString()}</p>
              </div>
            </>
          )}
        </Panel>
      </div>

      {detail && <DetailPanel p={detail} squad={squad} staff={staff} cap={cap} onAdd={add} onRelease={release} onClose={() => setDetail(null)} />}
    </div>
  );
}
