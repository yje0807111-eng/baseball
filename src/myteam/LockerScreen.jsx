/*
 * 내 라커 — 사이드 네비(영입 · 내 선수 · 감독·코치)와 드래프트 '선수 평점' 문법의 리스트
 *  영입(L1): 검색 + 후보 리스트 + 오른쪽 상세
 *  내 선수(L2): 포지션 그룹 목록 + 오른쪽 상세(방출)
 *  감독·코치(L6): 네 자리 슬롯 + 후보 리스트 + 효과 합계
 */
import React, { useMemo, useState } from 'react';
import { SERIES } from '../data/seriesPlayers.js';
import { SQUAD_SIZE, SQUAD_CAP, FOREIGN_MAX, POS_RULES, STAFF_SLOTS, squadCost, foreignCount, addBlockReason, squadIssues } from './rules.js';
import { staffByRole, staffEffect } from './staff.js';
import { saveTeam } from './store.js';
import { UiStyle, Bg, TopBar, Btn, Chip, Portrait } from './ui.jsx';

const ALL = SERIES.flatMap((s) => s.players);
const YEARS = [...new Set(ALL.map((p) => p.year))].sort((a, b) => b - a);
const TEAMS = [...new Set(ALL.map((p) => p.team))].sort();
const cut = (n) => ({ '--c': `${n}px` });
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const KEYS = { pitcher: [['구위', 'stuff'], ['제구', 'control'], ['체력', 'stamina'], ['안정', 'stability']], batter: [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']] };
const EFF_LABEL = { bat: '타격', field: '수비', pitch: '구위', stamina: '체력', steal: '도루', clutch: '승부처' };
const effText = (e) => Object.entries(e).map(([k, v]) => `${EFF_LABEL[k]} +${k === 'steal' ? `${Math.round(v * 100)}%p` : v}`).join(' · ');
const GROUPS = [['선발', ['SP']], ['불펜', ['RP']], ['포수', ['C']], ['내야', ['1B', '2B', '3B', 'SS']], ['외야', ['OF']], ['지명', ['DH']]];
const ROW_COLS = '34px 40px minmax(0,1.25fr) repeat(4,minmax(0,1fr)) 56px 64px';

const Select = ({ value, onChange, options, all }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="mt-cut w-full min-w-0 bg-[#05080f]/60 px-3 py-2.5 text-[13px] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] outline-none" style={cut(8)}>
    <option value="">{all}</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

/** 선수 한 줄 (드래프트 선수 평점 문법) */
function PlayerRow({ p, on, action, blocked, onPick, onAct, showNote = true }) {
  const n = tone(p.overall);
  const keys = KEYS[p.type] || KEYS.batter;
  return (
    <div role="button" onClick={() => onPick(p)} className={`mt-row mt-cut cursor-pointer ${on ? 'on' : ''}`} style={{ gridTemplateColumns: ROW_COLS }}>
      <b className="text-center font-display text-[19px]" style={{ color: n }}>{p.overall}</b>
      <Portrait player={p} color={n} />
      <span className="min-w-0">
        <b className="block truncate text-sm text-white">
          {p.name}
          <em className="ml-1.5 px-1.5 py-px text-[11px] not-italic text-[#05080f]" style={{ background: n }}>{p.position}</em>
          {p.isForeign && <em className="ml-1.5 text-[10px] not-italic text-amber-300">외국인</em>}
        </b>
        <small className="block truncate text-[11px] text-gray-500">
          {p.year} {p.team}{showNote && p.note ? ` · ${p.note}` : ''}
        </small>
      </span>
      {keys.map(([label, k]) => {
        const v = p.stats?.[k] ?? 0;
        return (
          <span key={k} className="min-w-0">
            <span className="flex justify-between text-[10px] text-gray-500">{label}<b className="font-display text-[13px] text-gray-200">{v}</b></span>
            <span className="mt-sb mt-[3px]"><b style={{ width: `${v}%`, background: n }} /></span>
          </span>
        );
      })}
      <b className="text-right font-display text-[15px] text-gray-300">{p.cost}</b>
      <Btn sm disabled={!!blocked} title={blocked || ''} onClick={(e) => { e.stopPropagation(); onAct(p); }}>{action}</Btn>
    </div>
  );
}

/** 오른쪽 상세 */
function DetailPanel({ p, squad, staff, cap, onAdd, onRelease }) {
  if (!p) return <section className="mt-cut mt-frame mt-glass p-4 px-[18px]" style={cut(16)}><p className="mt-lab">Player</p><p className="mt-3 text-sm text-gray-500">목록에서 선수를 고르세요.</p></section>;
  const owned = squad.some((x) => x.id === p.id);
  const n = tone(p.overall);
  const cost = squadCost(squad, staff);
  const after = owned ? cost - p.cost : cost + p.cost;
  const blocked = owned ? null : addBlockReason(p, squad, staff, cap);
  const sum = squad.reduce((s, x) => s + x.overall, 0);
  const now = squad.length ? Math.round(sum / squad.length) : 0;
  const next = owned
    ? (squad.length > 1 ? Math.round((sum - p.overall) / (squad.length - 1)) : 0)
    : Math.round((sum + p.overall) / (squad.length + 1));
  const keys = KEYS[p.type] || KEYS.batter;
  return (
    <section className="mt-cut mt-frame mt-glass min-h-0 overflow-y-auto p-4 px-[18px] mt-scroll" style={{ ...cut(16), '--a': n }}>
      <p className="mt-lab" style={{ '--a': n }}>Player</p>
      <div className="mt-3 flex gap-4">
        <Portrait player={p} w={96} h={124} color={n} />
        <div className="min-w-0 flex-1">
          <b className="block text-[26px] font-black text-white">{p.name}</b>
          <span className="text-[13px] text-gray-400">{p.year} {p.team} · {p.position} · {p.cost} CP</span>
          {p.note && <p className="mt-2 text-[13px] text-emerald-300">{p.note}</p>}
        </div>
        <b className="font-display text-[52px] leading-none" style={{ color: n }}>{p.overall}</b>
      </div>
      {p.source && <p className="mt-2.5 text-xs leading-relaxed text-gray-400">{p.source.split('—')[0].trim()}</p>}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {keys.map(([label, k]) => {
          const v = p.stats?.[k] ?? 0;
          return (
            <div key={k}>
              <span className="flex justify-between text-[11px] text-gray-400">{label}<b className="font-display text-[15px] text-white">{v}</b></span>
              <span className="mt-sb mt-1"><b style={{ width: `${v}%`, background: n }} /></span>
            </div>
          );
        })}
      </div>
      <div className="mt-cut mt-4 bg-[#05080f]/66 p-3 px-3.5" style={cut(10)}>
        <span className="flex justify-between py-0.5 text-[13px] text-gray-400">{owned ? '방출 후 남은 예산' : '영입 후 남은 예산'}
          <b className="font-display text-lg" style={{ color: cap - after < 0 ? '#f87171' : '#fff' }}>{(cap - after).toLocaleString()}</b></span>
        <span className="flex justify-between py-0.5 text-[13px] text-gray-400">팀 종합
          <b className="font-display text-lg" style={{ color: next >= now ? '#34d399' : '#f87171' }}>{now || '-'} → {next || '-'}</b></span>
      </div>
      {blocked && <p className="mt-2 text-sm text-red-400">{blocked}</p>}
      <div className="mt-3">
        {owned
          ? <Btn lg className="w-full" style={cut(12)} onClick={() => onRelease(p)}>방출하기</Btn>
          : <Btn pri lg className="w-full" style={cut(12)} disabled={!!blocked} onClick={() => onAdd(p)}>영입하기</Btn>}
      </div>
    </section>
  );
}

export default function LockerScreen({ account, onSave, onBack }) {
  const [team, setTeam] = useState(account.team);
  const [tab, setTab] = useState('scout');
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [club, setClub] = useState('');
  const [pos, setPos] = useState('');
  const [sel, setSel] = useState(null);
  const [staffSlot, setStaffSlot] = useState('manager');

  const squad = team.squad || [];
  const staff = team.staff || {};
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(squad, staff);
  const issues = squadIssues(squad, staff, cap);

  const commit = (next) => { setTeam(next); saveTeam(next); onSave?.(next); };
  const add = (p) => { if (!addBlockReason(p, squad, staff, cap)) commit({ ...team, squad: [...squad, p] }); };
  const release = (p) => { commit({ ...team, squad: squad.filter((x) => x.id !== p.id) }); setSel(null); };
  const setStaff = (slot, person) => commit({ ...team, staff: { ...staff, [slot]: person } });

  const autoFill = () => {
    let next = [...squad];
    const tryAdd = (want) => {
      const slots = SQUAD_SIZE - next.length;
      const budget = Math.max(40, Math.floor((cap - squadCost(next, staff)) / Math.max(1, slots)));
      const pool = ALL.filter((p) => (!want || p.position === want) && p.cost <= budget && !addBlockReason(p, next, staff, cap)).sort((a, b) => b.overall - a.overall);
      if (!pool.length) return false;
      next = [...next, pool[0]];
      return true;
    };
    for (const r of POS_RULES) {
      for (let i = next.filter((p) => p.position === r.key).length; i < r.min && next.length < SQUAD_SIZE; i++) tryAdd(r.key);
    }
    while (next.length < SQUAD_SIZE) { if (!tryAdd(null)) break; }
    commit({ ...team, squad: next });
  };

  const results = useMemo(() => {
    const kw = q.trim();
    return ALL.filter((p) => (!year || String(p.year) === year) && (!club || p.team === club) && (!pos || p.position === pos)
      && (!kw || p.name.includes(kw) || String(p.year).includes(kw) || p.team.includes(kw)))
      .sort((a, b) => b.overall - a.overall).slice(0, 80);
  }, [q, year, club, pos]);

  const NAV = [
    ['scout', '영입', `선수 검색 · ${ALL.length}명`],
    ['squad', '내 선수', `${squad.length}/${SQUAD_SIZE}`],
    ['staff', '감독·코치', `${Object.values(staff).filter(Boolean).length}/4`],
  ];
  const eff = staffEffect(staff);
  const staffCost = Object.values(staff).reduce((s, x) => s + (x?.cost || 0), 0);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/tile-locker.webp" opacity={0.4} grad="linear-gradient(180deg,rgba(3,5,10,.95),rgba(3,5,10,.93))" />
      <TopBar section="내 라커" team={team} account={account} onBack={onBack}
        right={<Btn sm className="ml-2" onClick={autoFill} disabled={squad.length >= SQUAD_SIZE}>자동 채우기</Btn>} />

      <div className="relative grid min-h-0 flex-1 gap-3.5 overflow-hidden px-6 py-3.5"
        style={{ gridTemplateColumns: '200px minmax(0,1fr) 400px', gridTemplateRows: 'minmax(0,1fr)' }}>

        {/* 사이드 네비 */}
        <section className="mt-cut mt-frame mt-glass flex flex-col p-3.5 px-3" style={cut(14)}>
          <p className="mt-lab" style={{ '--a': '#fde047' }}>Locker</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {NAV.map(([key, label, sub]) => {
              const on = tab === key;
              return (
                <button key={key} type="button" onClick={() => { setTab(key); setSel(null); }}
                  className={`mt-cut ${on ? 'mt-frame hot' : ''} px-3 py-2.5 text-left`}
                  style={{ ...cut(8), '--a': '#10b981', background: on ? 'rgba(16,185,129,.14)' : 'rgba(5,8,15,.55)' }}>
                  <b className={`block text-sm ${on ? 'text-white' : 'text-gray-400'}`}>{label}</b>
                  <span className="text-[11px] text-gray-500">{sub}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto">
            <p className="mb-2 font-display text-[11px] tracking-[0.16em] text-gray-500">포지션</p>
            {POS_RULES.map((r) => {
              const n = squad.filter((p) => p.position === r.key).length;
              return (
                <div key={r.key} className="flex justify-between py-0.5 text-xs text-gray-400">
                  {r.label}<b style={{ color: n < r.min ? '#f87171' : '#e5e7eb' }}>{n}/{r.min}</b>
                </div>
              );
            })}
            <div className="mt-2 flex gap-1.5">
              <Chip a={foreignCount(squad) > FOREIGN_MAX ? '#f87171' : '#fde047'}>외국인 {foreignCount(squad)}/{FOREIGN_MAX}</Chip>
            </div>
          </div>
        </section>

        {/* 가운데 */}
        {tab === 'scout' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-4 px-[18px]" style={cut(16)}>
            <div className="flex items-center gap-3">
              <p className="mt-lab" style={{ '--a': '#fde047' }}>Scout</p>
              <span className="text-xs text-gray-500">{results.length}명 · 종합순</span>
            </div>
            <div className="mt-3 grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) 128px 128px 112px' }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 연도 · 구단"
                className="mt-cut mt-frame w-full min-w-0 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:shadow-[inset_0_0_0_2px_#10b981]" style={cut(8)} />
              <Select value={year} onChange={setYear} options={YEARS} all="연도 전체" />
              <Select value={club} onChange={setClub} options={TEAMS} all="구단 전체" />
              <Select value={pos} onChange={setPos} options={POS_RULES.map((r) => r.key)} all="포지션" />
            </div>
            <div className="mt-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
              {results.map((p) => (
                <PlayerRow key={p.id} p={p} on={sel?.id === p.id} action="영입" blocked={addBlockReason(p, squad, staff, cap)}
                  onPick={setSel} onAct={add} />
              ))}
              {results.length === 0 && <p className="text-sm text-gray-500">조건에 맞는 선수가 없습니다.</p>}
            </div>
          </section>
        )}

        {tab === 'squad' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-4 px-[18px]" style={cut(16)}>
            <div className="flex items-center gap-3">
              <p className="mt-lab">My Squad</p>
              <span className="text-xs text-gray-500">{squad.length}명 · {cost.toLocaleString()} CP</span>
            </div>
            <div className="mt-scroll mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2">
              {GROUPS.map(([label, list]) => {
                const rows = squad.filter((p) => list.includes(p.position)).sort((a, b) => b.overall - a.overall);
                if (!rows.length) return null;
                return (
                  <div key={label}>
                    <div className="mt-grp">{label} {rows.length}</div>
                    <div className="flex flex-col gap-1.5">
                      {rows.map((p) => <PlayerRow key={p.id} p={p} on={sel?.id === p.id} action="방출" onPick={setSel} onAct={release} showNote={false} />)}
                    </div>
                  </div>
                );
              })}
              {squad.length === 0 && <p className="mt-4 text-sm text-gray-500">아직 영입한 선수가 없습니다. 왼쪽 영입에서 찾아 보세요.</p>}
            </div>
          </section>
        )}

        {tab === 'staff' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-4 px-[18px]" style={cut(16)}>
            <p className="mt-lab" style={{ '--a': '#c4b5fd' }}>Staff</p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {STAFF_SLOTS.map((s) => {
                const cur = staff[s.key];
                const on = staffSlot === s.key;
                return (
                  <button key={s.key} type="button" onClick={() => setStaffSlot(s.key)}
                    className={`mt-cut ${on ? 'mt-frame hot' : ''} p-3 text-left`} style={{ ...cut(12), '--a': '#c4b5fd', background: on ? 'rgba(196,181,253,.12)' : 'rgba(5,8,15,.6)' }}>
                    <span className="font-display text-[10px] tracking-[0.2em] text-violet-300">{s.label}</span>
                    <div className="mt-2 flex items-center gap-2.5">
                      <Portrait player={cur} staff w={44} h={56} color="#c4b5fd" />
                      <div className="min-w-0">
                        <b className={`block truncate text-[15px] ${cur ? 'text-white' : 'text-gray-600'}`}>{cur?.name || '비어 있음'}</b>
                        <span className="text-[11px] text-gray-400">{cur ? effText(cur.effect) : '선임 필요'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-grp">{STAFF_SLOTS.find((s) => s.key === staffSlot)?.label} 후보</div>
            <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
              {staffByRole(STAFF_SLOTS.find((s) => s.key === staffSlot)?.role).map((m) => {
                const on = staff[staffSlot]?.id === m.id;
                return (
                  <div key={m.id} className={`mt-row mt-cut ${on ? 'on' : ''}`} style={{ gridTemplateColumns: '44px minmax(0,1fr) minmax(0,1.1fr) 56px 64px' }}>
                    <Portrait player={m} staff color="#c4b5fd" />
                    <span className="min-w-0"><b className="block truncate text-sm text-white">{m.name}</b><small className="text-[11px] text-gray-500">{m.era} · {m.note}</small></span>
                    <span className="text-xs text-violet-300">{effText(m.effect)}</span>
                    <b className="text-right font-display text-[15px] text-gray-300">{m.cost}</b>
                    <Btn sm onClick={() => setStaff(staffSlot, on ? null : m)}>{on ? '해임' : '선임'}</Btn>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 오른쪽 */}
        {tab === 'staff' ? (
          <section className="mt-cut mt-frame mt-glass p-4 px-[18px]" style={cut(16)}>
            <p className="mt-lab" style={{ '--a': '#c4b5fd' }}>코치진 효과</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Object.entries(eff).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="mt-cut bg-[#05080f]/60 p-3 text-center" style={cut(8)}>
                  <b className="block font-display text-[30px] leading-none text-white">+{k === 'steal' ? `${Math.round(v * 100)}%p` : v}</b>
                  <span className="text-[11px] text-gray-400">{EFF_LABEL[k]}</span>
                </div>
              ))}
              {Object.values(eff).every((v) => !v) && <p className="col-span-2 text-sm text-gray-500">선임한 코치가 없습니다.</p>}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-gray-400">코치진 효과는 경기 시작 때 선수 능력치에 더해집니다. CP를 쓰므로 선수 예산과 나눠 써야 합니다.</p>
            <div className="mt-cut mt-3 bg-[#05080f]/66 p-3 px-3.5" style={cut(10)}>
              <span className="flex justify-between text-[13px] text-gray-400">코치진 합계<b className="font-display text-lg text-white">{staffCost} CP</b></span>
            </div>
          </section>
        ) : (
          <DetailPanel p={sel} squad={squad} staff={staff} cap={cap} onAdd={add} onRelease={release} />
        )}
      </div>
    </div>
  );
}
