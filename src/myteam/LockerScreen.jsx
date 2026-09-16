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
import { UiStyle, Bg, TopBar, Btn, Portrait, SideNav, Hero, KV, Stats } from './ui.jsx';

const ALL = SERIES.flatMap((s) => s.players);
const YEARS = [...new Set(ALL.map((p) => p.year))].sort((a, b) => b - a);
const TEAMS = [...new Set(ALL.map((p) => p.team))].sort();
const cut = (n) => ({ '--c': `${n}px` });
const tone = (o) => (o >= 92 ? '#fde047' : o >= 85 ? '#34d399' : o >= 78 ? '#7dd3fc' : '#94a3b8');
const KEYS = { pitcher: [['구위', 'stuff'], ['제구', 'control'], ['체력', 'stamina'], ['안정', 'stability']], batter: [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense']] };
const EFF_LABEL = { bat: '타격', field: '수비', pitch: '구위', stamina: '체력', steal: '도루', clutch: '승부처' };
const effText = (e) => Object.entries(e).map(([k, v]) => `${EFF_LABEL[k]} +${k === 'steal' ? `${Math.round(v * 100)}%p` : v}`).join(' · ');
const GROUPS = [['선발', ['SP']], ['불펜', ['RP']], ['포수', ['C']], ['내야', ['1B', '2B', '3B', 'SS']], ['외야', ['OF']], ['지명', ['DH']]];
const ROW_COLS = '48px 50px minmax(0,1.3fr) repeat(4,minmax(0,1fr)) 60px 76px';
const cardImg = (p) => `url(cards/${encodeURIComponent(p.id)}.webp), url(profiles/${encodeURIComponent(p.id)}.webp), url(ui/mt/silhouette-player.webp)`;

const Select = ({ value, onChange, options, all }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}
    className="mt-cut w-full min-w-0 bg-white/[0.06] px-3 py-2.5 text-[13px] text-gray-200 outline-none" style={cut(6)}>
    <option value="">{all}</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

/** 선수 한 줄 (드래프트 선수 평점 문법) */
function PlayerRow({ p, on, action, blocked, onPick, onAct, showNote = true }) {
  const n = tone(p.overall);
  const keys = KEYS[p.type] || KEYS.batter;
  return (
    <div role="button" onClick={() => onPick(p)} className={`mt-row mt-cut cursor-pointer ${on ? 'on' : ''}`} style={{ gridTemplateColumns: ROW_COLS, '--a': n }}>
      <Portrait player={p} w={46} h={54} color={n} />
      <b className="font-display text-[30px] font-extrabold leading-none" style={{ color: n, textShadow: `0 0 14px ${n}88` }}>{p.overall}</b>
      <span className="min-w-0">
        <b className="block truncate text-base font-black text-white">
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
      <b className="text-right font-display text-lg text-amber-300">{p.cost}</b>
      <Btn sm pri={on} a={n} disabled={!!blocked} title={blocked || ''} onClick={(e) => { e.stopPropagation(); onAct(p); }}>{action}</Btn>
    </div>
  );
}

/** 오른쪽 상세 — 모드 설명 패널 문법: 큰 사진 · 수치 칸 · 막대 · 키-값 · 아래 큰 버튼 */
function DetailPanel({ p, squad, staff, cap, onAdd, onRelease }) {
  if (!p) return <aside className="mt-cut mt-frame mt-glass flex flex-col gap-4 p-6" style={cut(20)}><p className="mt-lab">Player</p><p className="text-sm text-gray-500">목록에서 선수를 고르세요.</p></aside>;
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
    <aside className="mt-cut mt-frame mt-glass mt-scroll flex min-h-0 flex-col gap-4 overflow-y-auto p-6" style={{ ...cut(20), '--a': n }}>
      <p className="mt-lab" style={{ '--a': n }}>{owned ? 'My Player' : 'Scouting'}</p>
      <Hero img={cardImg(p)} ovr={p.overall} name={p.name} color={n} />
      <Stats items={[['CP', p.cost], ['포지션', p.position], ['시즌', p.year]]} />
      <p className="-mt-1 text-sm leading-relaxed text-gray-300">{p.team}{p.note ? ` · ${p.note}` : ''}{p.isForeign ? ' · 외국인' : ''}</p>
      <div>
        {keys.map(([label, k]) => {
          const v = p.stats?.[k] ?? 0;
          return (
            <div key={k} className="flex items-center gap-3 py-1 text-sm">
              <span className="w-10 text-gray-400">{label}</span>
              <div className="h-2 flex-1 bg-white/10"><i className="block h-full" style={{ width: `${v}%`, background: n, boxShadow: `0 0 8px ${n}` }} /></div>
              <b className="w-8 text-right font-display text-white">{v}</b>
            </div>
          );
        })}
      </div>
      <div>
        <KV k={owned ? '방출 후 캡' : '영입 후 캡'} v={`${after.toLocaleString()} / ${cap.toLocaleString()}`} color={after > cap ? '#f87171' : '#fff'} />
        <KV k="팀 종합" v={`${now || '-'} → ${next || '-'}`} color={next >= now ? '#34d399' : '#f87171'} />
      </div>
      {blocked && <p className="text-sm text-red-400">{blocked}</p>}
      <div className="mt-auto">
        {owned
          ? <Btn lg className="w-full text-[#ff5a67]" style={cut(12)} onClick={() => onRelease(p)}>방출하기</Btn>
          : <Btn pri lg a={n} className="w-full" style={cut(12)} disabled={!!blocked} onClick={() => onAdd(p)}>영입하기 ▶</Btn>}
      </div>
    </aside>
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
    { key: 'scout', label: '영입', sub: `선수 검색 · ${ALL.length}명`, img: 'ui/mt/tile-locker.webp' },
    { key: 'squad', label: '내 선수', sub: `${squad.length} / ${SQUAD_SIZE}명`, img: 'ui/mt/mt-card.webp' },
    { key: 'staff', label: '감독·코치', sub: `${Object.values(staff).filter(Boolean).length} / 4 자리`, img: 'ui/mt/silhouette-coach.webp' },
  ];
  const eff = staffEffect(staff);
  const staffCost = Object.values(staff).reduce((s, x) => s + (x?.cost || 0), 0);
  const head = (label, sub, a, extra) => (
    <div className="flex items-baseline gap-3">
      <p className="mt-lab" style={{ '--a': a }}>{label}</p>
      <p className="text-sm text-gray-400">{sub}</p>
      <div className="ml-auto flex gap-2">{extra}</div>
    </div>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <Bg img="ui/mt/tile-locker.webp" opacity={0.6} />
      <TopBar eyebrow="My Locker" section="내 라커" team={team} account={account} onBack={onBack} />

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4"
        style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>

        <SideNav items={NAV} value={tab} onChange={(k) => { setTab(k); setSel(null); }}>
          <p className="mt-lab px-1 pb-2" style={{ fontSize: 10 }}>Squad</p>
          {POS_RULES.map((r) => {
            const n = squad.filter((p) => p.position === r.key).length;
            return (
              <div key={r.key} className="flex justify-between border-b border-white/10 px-1 py-1.5 text-sm text-gray-400">
                <span>{r.label}</span><b className="font-display" style={{ color: n < r.min ? '#f87171' : '#fff' }}>{n}/{r.min}</b>
              </div>
            );
          })}
          <div className="flex justify-between border-b border-white/10 px-1 py-1.5 text-sm text-gray-400">
            <span>외국인</span><b className="font-display" style={{ color: foreignCount(squad) > FOREIGN_MAX ? '#f87171' : '#fff' }}>{foreignCount(squad)}/{FOREIGN_MAX}</b>
          </div>
          <div className="mt-2 flex justify-between px-1 font-display text-sm">
            <span className="text-gray-500">엔트리</span><b style={{ color: issues.length ? '#fde047' : '#10b981' }}>{squad.length} / {SQUAD_SIZE}</b>
          </div>
        </SideNav>

        {tab === 'scout' && (
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={cut(20)}>
            {head('Scout', `${ALL.length.toLocaleString()}명 중 ${results.length}명 · 종합순`)}
            <div className="mt-3 grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) 140px 140px 120px' }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="선수 이름 · 연도 · 구단 검색"
                className="mt-cut w-full min-w-0 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:shadow-[inset_0_0_0_2px_#10b981]" style={cut(6)} />
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
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={cut(20)}>
            {head('My Squad', `${squad.length} / ${SQUAD_SIZE}명 · ${cost.toLocaleString()} CP`, undefined,
              <Btn sm onClick={autoFill} disabled={squad.length >= SQUAD_SIZE}>자동 채우기</Btn>)}
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
          <section className="mt-cut mt-frame mt-glass flex min-h-0 flex-col p-5" style={{ ...cut(20), '--a': '#c4b5fd' }}>
            {head('Staff', `${Object.values(staff).filter(Boolean).length} / 4 자리 · 코치진 ${staffCost} CP`, '#c4b5fd')}
            <div className="mt-3 grid h-48 shrink-0 grid-cols-4 gap-3">
              {STAFF_SLOTS.map((s) => {
                const cur = staff[s.key];
                const on = staffSlot === s.key;
                return (
                  <button key={s.key} type="button" onClick={() => setStaffSlot(s.key)}
                    className={`mt-cut ${on ? 'mt-frame' : ''} relative h-full overflow-hidden bg-[#0b1220] bg-cover bg-top text-left`}
                    style={{ ...cut(12), '--a': '#c4b5fd', backgroundImage: 'url(ui/mt/silhouette-coach.webp)' }}>
                    <span className="absolute inset-0" style={{ background: `linear-gradient(rgba(5,8,15,.4),rgba(5,8,15,${cur ? 0 : 0.6}) 30%,rgba(5,8,15,.92) 70%,#05080f)` }} />
                    <span className="absolute left-3 top-2 font-display text-2xl font-extrabold text-[#c4b5fd]" style={{ textShadow: '0 0 16px #c4b5fd88' }}>{s.label}</span>
                    <span className="absolute inset-x-3 bottom-2.5">
                      <b className={`block truncate text-lg font-black ${cur ? 'text-white' : 'text-gray-500'}`}>{cur?.name || '비어 있음'}</b>
                      <span className="block truncate text-[12px] text-[#c4b5fd]">{cur ? effText(cur.effect) : '선임 필요'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-grp">{STAFF_SLOTS.find((s) => s.key === staffSlot)?.label} 후보</div>
            <div className="mt-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
              {staffByRole(STAFF_SLOTS.find((s) => s.key === staffSlot)?.role).map((m) => {
                const on = staff[staffSlot]?.id === m.id;
                return (
                  <div key={m.id} className={`mt-row mt-cut ${on ? 'on' : ''}`} style={{ gridTemplateColumns: '46px minmax(0,1fr) minmax(0,1.2fr) 60px 76px', '--a': '#c4b5fd' }}>
                    <Portrait player={m} staff w={44} h={52} color="#c4b5fd" />
                    <span className="min-w-0"><b className="block truncate text-base font-black text-white">{m.name}</b><small className="text-[11px] text-gray-500">{m.era} · {m.note}</small></span>
                    <span className="text-sm text-[#c4b5fd]">{effText(m.effect)}</span>
                    <b className="text-right font-display text-lg text-amber-300">{m.cost}</b>
                    <Btn sm pri={on} a="#c4b5fd" onClick={() => setStaff(staffSlot, on ? null : m)}>{on ? '해임' : '선임'}</Btn>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'staff' ? (
          <aside className="mt-cut mt-frame mt-glass flex flex-col gap-4 p-6" style={{ ...cut(20), '--a': '#c4b5fd' }}>
            <p className="mt-lab" style={{ '--a': '#c4b5fd' }}>Staff Effect</p>
            <h2 className="-mt-2 text-3xl font-black text-white">코치진 효과</h2>
            <p className="text-sm leading-relaxed text-gray-300">경기 시작 때 선수 능력치에 더해집니다. CP를 쓰므로 선수 예산과 나눠 써야 합니다.</p>
            <Stats items={[['선임', `${Object.values(staff).filter(Boolean).length}/4`], ['코치 CP', staffCost], ['남는 CP', cap - cost]]} />
            <div>
              {Object.entries(eff).filter(([, v]) => v).map(([k, v]) => (
                <KV key={k} k={EFF_LABEL[k]} v={`+${k === 'steal' ? `${Math.round(v * 100)}%p` : v}`} color="#c4b5fd" />
              ))}
              {Object.values(eff).every((v) => !v) && <p className="text-sm text-gray-500">선임한 코치가 없습니다.</p>}
            </div>
          </aside>
        ) : (
          <DetailPanel p={sel} squad={squad} staff={staff} cap={cap} onAdd={add} onRelease={release} />
        )}
      </div>
    </div>
  );
}
