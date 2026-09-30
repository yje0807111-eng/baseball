/*
 * 상단 바 오른쪽 프로필 — 대표 선수 얼굴(등급 색 테두리 · 등급 엠블럼) · 이름 · 등급/RP, 그 옆에 떨어진 골드 칩.
 * 누르면 프로필 창(mockups/profile A1): 위 감독 명함(가입 2단계와 같은 결 · 배너가 배경) · 전적 네 칸 ·
 * 아래 탭 꾸미기(배너 · 대표 선수) / 계정(이름 · 구단 · 복구 이메일). 소리는 위 소리 단추로만.
 * 이름 · 배너 · 대표 선수는 저장소에서 바로 읽는다(어느 화면의 상단 바든 바꾼 즉시 같은 값).
 */
import React, { useState, useEffect, useRef } from 'react';
import { Count, useExitGhost } from '../ui/motion.jsx';
import { createPortal } from 'react-dom';
import { rankOf } from './rank.js';
import { loadAccount, saveProfile, TEAM_NAME_MAX } from './store.js';
import { BANNERS, flagByKey } from './teamArt.js';
import { artId } from '../data/artAlias.js';
import { useAce } from './useAce.js';
import { online } from '../net/supabase.js';
import { renameNick, myRecoveryEmail, setRecoveryEmail, checkEmail, NICK_MIN } from '../net/account.js';
import { play as playSfx } from '../audio/sfx.js';

const NICK_MAX = 12;
const SAIRA = { fontFamily: "'Saira Condensed',sans-serif" };
const INPUT = 'mt-cut h-12 min-w-0 flex-1 bg-black/35 px-4 text-t2 font-bold text-white outline-none placeholder:text-gray-500 focus:shadow-[inset_0_0_0_2px_#f5d27a]';
const CSS = `
  .pf-lic::before { content:''; position:absolute; inset:-40%; z-index:2; pointer-events:none; background:linear-gradient(115deg,transparent 44%,rgba(255,255,255,.12) 50%,transparent 56%); animation:pfSheen 5s ease-in-out infinite; }
  .pf-lic::after { content:'LEGEND'; position:absolute; right:-10px; bottom:-30px; font:italic 800 150px/1 'Saira Condensed',sans-serif; color:rgba(245,210,122,.06); pointer-events:none; }
  @keyframes pfSheen { 0%,60% { transform:translateX(-50%); } 90%,100% { transform:translateX(50%); } }
  @media (prefers-reduced-motion: reduce) { .pf-lic::before { animation:none; } }
`;

/** 대표 선수 얼굴 — 초상 → 실루엣 */
const face = (p) => (p ? `url(profiles/${encodeURIComponent(artId(p.id))}.webp), url(ui/mt/silhouette-player.webp)` : 'url(ui/mt/silhouette-coach.webp)');
/** 대표 선수 후보 — 종합 높은 순 8명. 고른 선수가 엔트리에 없으면(방출 등) 메인 에이스 → 맨 앞 */
const acesOf = (squad = []) => [...squad].sort((a, b) => (b.overall || 0) - (a.overall || 0)).slice(0, 8);
const aceOf = (squad, id, auto) => squad?.find((p) => p.id === id) || auto || acesOf(squad)[0] || null;

/** 얼굴 동그라미 — 등급 색 테두리 + 오른쪽 아래 등급 엠블럼 */
function Face({ p, tier, size = 44 }) {
  return (
    <span className="relative shrink-0 rounded-full bg-cover" style={{ width: size, height: size, backgroundImage: face(p), backgroundPosition: 'center 18%', boxShadow: `0 0 0 2px #0a101c,0 0 0 4px ${tier.c},0 0 14px ${tier.c}80` }}>
      <img src={`ui/rank/${tier.key}.webp`} alt="" className="absolute -bottom-1.5 -right-2 h-6 w-6 object-contain" style={{ filter: 'drop-shadow(0 1px 3px #000)' }} />
    </span>
  );
}

/** 감독 명함 — 배너가 배경 · 대표 선수 · 이름 · 구단 · 등급과 다음 등급까지 */
function License({ nick, club, ace, banner, rp, since }) {
  const r = rankOf(rp);
  const flag = flagByKey(banner);
  const pct = r.next ? ((rp - r.tier.min) / (r.next.min - r.tier.min)) * 100 : 100;
  return (
    <div className="pf-lic relative h-[250px] overflow-hidden rounded-[20px]" style={{ background: 'linear-gradient(120deg,#221a3a,#0b0f1c 70%)', boxShadow: 'inset 0 0 0 1px rgba(245,210,122,.45),0 20px 50px rgba(0,0,0,.45)' }}>
      {flag && <i className="absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.55, WebkitMaskImage: 'linear-gradient(90deg,transparent 15%,#000 75%)', maskImage: 'linear-gradient(90deg,transparent 15%,#000 75%)' }} />}
      <div className="absolute inset-8 z-[1] flex items-center gap-[26px]">
        <div className="h-[180px] w-[150px] shrink-0 rounded-2xl bg-cover" style={{ backgroundImage: face(ace), backgroundPosition: 'center 18%', boxShadow: `0 0 0 2px #0b0f1c,0 0 0 4px ${r.tier.c},0 0 24px ${r.tier.c}59` }} />
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold tracking-[.32em] text-[#f5d27a]" style={SAIRA}>MANAGER LICENSE</p>
          <b className="mb-0.5 mt-2 block truncate text-[40px] font-bold leading-[1.15] text-white">{nick}</b>
          <p className="truncate text-t2 text-gray-300">{club}{ace ? ` · 대표 선수 ${ace.name}` : ''}</p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <img src={`ui/rank/${r.tier.key}.webp`} alt="" className="h-16 w-16 object-contain" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.6))' }} />
            <div className="w-[240px]">
              <b className="block text-[20px] font-bold" style={{ color: r.tier.c }}>{r.tier.ko} {r.div}</b>
              <small className="text-[15px] font-bold tracking-[.04em] text-gray-400" style={SAIRA}>{rp.toLocaleString()} RP{r.next ? ` · ${r.next.ko}까지 ${r.toNext}` : ''}</small>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <i className="block h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${r.tier.c},#fde68a)`, boxShadow: `0 0 8px ${r.tier.c}99` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {since && <span className="absolute right-[26px] top-5 z-[1] text-[14px] font-bold tracking-[.12em] text-gray-500" style={SAIRA}>SINCE {since}</span>}
    </div>
  );
}

/** 전적 네 칸 — 경기 승패 · 승률 · 최고 등급 · 랭크전 시즌 최고 순위 */
function Stats({ account }) {
  const rec = account?.team?.record || { w: 0, l: 0 };
  const n = rec.w + rec.l;
  const best = rankOf(account?.rank?.best || account?.rank?.rp || 0);
  const places = (account?.rank?.seasons || []).map((s) => s.place).filter(Boolean);
  const cell = (label, v, color) => (
    <div className="rounded-[14px] bg-black/30 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]">
      <small className="block text-t4 font-bold text-gray-400">{label}</small>
      <b className="text-[26px] font-extrabold leading-tight" style={{ ...SAIRA, color: color || '#fff' }}>{v}</b>
    </div>
  );
  const em = (t) => <em className="ml-0.5 text-[15px] not-italic text-gray-400">{t}</em>;
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {cell('전적', <>{rec.w}{em('승')} {rec.l}{em('패')}</>)}
      {cell('승률', n ? <>{((rec.w / n) * 100).toFixed(1)}{em('%')}</> : '—')}
      {cell('최고 등급', `${best.tier.ko} ${best.div}`, best.tier.c)}
      {cell('랭크전 최고 순위', places.length ? <>{Math.min(...places)}{em('위')}</> : '—')}
    </div>
  );
}

function ProfileModal({ account, nick: nick0, banner: banner0, ace: ace0, teamName, onClose, onSaved, onSignOut }) {
  const rootRef = useRef(null);
  useExitGhost(rootRef);
  const squad = account?.team?.squad || [];
  const [tab, setTab] = useState('deco'); // deco | acct
  const [nick, setNick] = useState(nick0 || '');
  const [banner, setBanner] = useState(banner0 ?? null);
  const [aceId, setAceId] = useState(ace0?.id ?? null);
  const [club, setClub] = useState(teamName || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mail0, setMail0] = useState(null); // 서버에 있는 복구 이메일(불러오기 전 null)
  const [mail, setMail] = useState('');
  useEffect(() => {
    if (!online) return;
    myRecoveryEmail().then((m) => { setMail0(m || ''); setMail(m || ''); }).catch(() => setMail0(''));
  }, []);
  /* Esc 로 닫기 — 다른 팝업(Pop)과 같게. 서버에 저장하는 중엔 닫지 않는다 */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);
  const valid = nick.trim().length >= (online ? NICK_MIN : 1) && club.trim().length >= 1;
  const save = async () => {
    if (!valid || busy) return;
    const nk = nick.trim();
    if (online && nk !== nick0) { // 서버 감독 이름부터 — 겹치면 여기서 멈춘다
      setBusy(true);
      try { await renameNick(nk); } catch (e) { setErr(e.message); setTab('acct'); setBusy(false); return; }
    }
    if (online && mail0 !== null && mail.trim().toLowerCase() !== mail0) {
      const bad = checkEmail(mail);
      if (bad) { setErr(bad); setTab('acct'); setBusy(false); return; } // 이름을 먼저 바꾼 뒤라 busy 가 켜져 있을 수 있다 — 저장 단추가 잠기지 않게
      setBusy(true);
      try { await setRecoveryEmail(mail); } catch (e) { setErr(e.message); setTab('acct'); setBusy(false); return; }
    }
    saveProfile({ nick: nk, banner, ace: aceId !== ace0?.id ? aceId : undefined, teamName: club.trim() !== teamName ? club.trim() : undefined });
    onSaved();
    onClose();
  };
  const onEnter = (e) => e.key === 'Enter' && save();
  const since = account?.createdAt ? new Date(account.createdAt).toLocaleDateString('sv').replace(/-/g, '.') : '';
  const lab = (t) => <p className="mb-2.5 font-display text-t4 font-bold tracking-[0.24em] text-gray-400">{t}</p>;
  return createPortal(
    <div ref={rootRef} className="mt-pop-bg fixed inset-0 z-[80] grid place-items-center bg-[#03050a]/70 backdrop-blur-[5px]" onClick={onClose} role="presentation">
      <style>{CSS}</style>
      <div className="mt-glass relative flex w-[980px] flex-col rounded-[24px] px-[30px] pb-6 pt-[26px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.12),0_40px_90px_rgba(0,0,0,.6)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="프로필">
        <button type="button" onClick={onClose} className="absolute right-[18px] top-4 z-[5] grid h-9 w-9 place-items-center rounded-[10px] bg-black/30 text-t2 text-gray-400 hover:text-white" aria-label="닫기">×</button>
        <License nick={nick.trim() || nick0} club={club.trim() || teamName} ace={aceOf(squad, aceId, ace0)} banner={banner} rp={account?.rank?.rp || 0} since={since} />
        <div className="mb-5 mt-4"><Stats account={account} /></div>

        <div className="h-12 border-b border-white/10">
          <nav className="mt-tabs" aria-label="프로필">
            <button type="button" data-sfx="navTab" className={`mt-tab ${tab === 'deco' ? 'on' : ''}`} aria-pressed={tab === 'deco'} onClick={() => setTab('deco')}>꾸미기</button>
            <button type="button" data-sfx="navTab" className={`mt-tab ${tab === 'acct' ? 'on' : ''}`} aria-pressed={tab === 'acct'} onClick={() => setTab('acct')}>계정</button>
          </nav>
        </div>
        <div className="min-h-[246px] py-5">
          {tab === 'deco' ? (
            <>
              {lab('배너')}
              <div className="grid grid-cols-7 gap-2">
                {[{ key: null, label: '없음' }, ...BANNERS].map((b) => {
                  const on = banner === b.key;
                  return (
                    <button key={b.key || 'none'} type="button" onClick={() => setBanner(b.key)} aria-pressed={on} aria-label={b.label}
                      className="relative h-14 overflow-hidden rounded-xl bg-[#0b1220] bg-cover bg-center text-left transition hover:brightness-125"
                      style={{ backgroundImage: b.src ? `url(${b.src})` : undefined, boxShadow: on ? 'inset 0 0 0 2px #f5d27a,0 0 14px rgba(245,210,122,.35)' : 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
                      <span className="absolute bottom-1 left-2 text-[11.5px] font-bold text-white" style={{ textShadow: '0 1px 4px #000' }}>{b.label.replace(/ .*/, '')}</span>
                      {on && <i className="absolute right-1.5 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#f5d27a] text-[11px] font-black not-italic text-[#1c1203]">✓</i>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-[18px]">{lab('대표 선수')}</div>
              {squad.length ? (
                <div className="flex gap-2.5">
                  {acesOf(squad).map((p) => {
                    const on = aceOf(squad, aceId, ace0)?.id === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => setAceId(p.id)} aria-pressed={on} aria-label={p.name}
                        className="relative h-[104px] w-[78px] overflow-hidden rounded-xl bg-[#0b1220] bg-cover transition hover:brightness-125"
                        style={{ backgroundImage: face(p), backgroundPosition: 'center 18%', boxShadow: on ? 'inset 0 0 0 2px #f5d27a,0 0 14px rgba(245,210,122,.35)' : 'inset 0 0 0 1px rgba(255,255,255,.14)' }}>
                        <span className="absolute inset-x-0 bottom-0 truncate px-1.5 pb-1 pt-4 text-[12.5px] font-bold text-white" style={{ background: 'linear-gradient(transparent,rgba(0,0,0,.85))' }}>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-t3 text-gray-500">엔트리 선수 없음</p>}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-t4 font-bold text-gray-400">감독 이름</span>
                <span className="flex items-center gap-3">
                  <input value={nick} maxLength={NICK_MAX} onChange={(e) => { setNick(e.target.value); setErr(''); }} onKeyDown={onEnter} className={INPUT} style={{ '--c': '8px' }} />
                  <span className="font-display text-t3 text-gray-500">{nick.length}/{NICK_MAX}</span>
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-t4 font-bold text-gray-400">구단 이름</span>
                <span className="flex items-center gap-3">
                  <input value={club} maxLength={TEAM_NAME_MAX} onChange={(e) => { setClub(e.target.value); setErr(''); }} onKeyDown={onEnter} className={INPUT} style={{ '--c': '8px' }} />
                  <span className="font-display text-t3 text-gray-500">{club.length}/{TEAM_NAME_MAX}</span>
                </span>
              </label>
              {online && (
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-t4 font-bold text-gray-400">복구 이메일 · 선택</span>
                  <input type="email" value={mail} maxLength={254} disabled={mail0 === null} placeholder={mail0 === null ? '불러오는 중' : '비밀번호 찾기용'}
                    onChange={(e) => { setMail(e.target.value); setErr(''); }} onKeyDown={onEnter} autoComplete="email" className={INPUT} style={{ '--c': '8px' }} />
                </label>
              )}
            </div>
          )}
          {err && <p className="mt-3 text-t3 font-bold text-red-400" role="alert">{err}</p>}
        </div>

        <div className="flex items-center gap-3">
          {onSignOut && <button type="button" onClick={onSignOut} className="mt-btn" style={{ color: '#fca5a5' }}>로그아웃</button>}
          <button type="button" onClick={onClose} className="mt-btn ml-auto">닫기</button>
          <button type="button" onClick={save} disabled={!valid || busy} className="mt-btn pri" style={{ padding: '0 34px' }}>저장</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ProfileBadge({ account, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const live = loadAccount() || account; // 이름 · 배너 · 대표 선수는 저장소 기준
  const nick = live?.nick || account?.nick || '감독';
  const banner = live?.profile?.banner ?? null;
  const auto = useAce(live?.team?.squad || [])?.p;
  const ace = aceOf(live?.team?.squad, live?.profile?.ace, auto);
  const rp = account?.rank?.rp || 0;
  const r = rankOf(rp);
  const flag = flagByKey(banner);
  const gold = account?.gold ?? 0;
  const prevGold = useRef(gold);
  const [delta, setDelta] = useState(null); // { d, k } — 방금 바뀐 골드
  useEffect(() => {
    const d = gold - prevGold.current;
    prevGold.current = gold;
    if (d) { setDelta({ d, k: `${Date.now()}` }); playSfx(d > 0 ? 'goldIn' : 'goldOut'); }
  }, [gold]);
  return (
    <span className="flex items-center gap-3">
      {/* 배지 — 배너가 상자 전체에 깔리고 왼쪽 어둠 → 오른쪽 구단 색 */}
      <button type="button" onClick={() => setOpen(true)} aria-label="프로필"
        className="relative flex h-[54px] items-center gap-3 overflow-hidden rounded-2xl pl-[7px] pr-[18px] text-left transition hover:brightness-125"
        style={{ background: '#0a101c', boxShadow: `inset 0 0 0 1px ${flag ? `${flag.color}55` : `${r.tier.c}40`}` }}>
        {flag && (
          <>
            <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.7 }} />
            <i className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 10%,rgba(5,8,15,.7) 45%,rgba(5,8,15,.2) 100%)' }} />
          </>
        )}
        <Face p={ace} tier={r.tier} />
        <span className="relative leading-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,.85)' }}>
          <b className="block whitespace-nowrap text-t3 font-bold text-white">{nick}</b>
          <span className="whitespace-nowrap font-display text-t4 font-bold tracking-[.04em]" style={{ color: r.tier.c }}>{r.tier.ko} {r.div} · {rp.toLocaleString()} RP</span>
        </span>
      </button>
      {/* 골드 — 배지와 떼어 둔 칩 */}
      <span className="relative flex h-11 items-center gap-2 rounded-[14px] bg-[#0a0e1a]/80 pl-2.5 pr-4 shadow-[inset_0_0_0_1px_rgba(251,191,36,.3)]">
        <span className="grid h-6 w-6 place-items-center rounded-full font-display text-t4 font-extrabold text-[#7c2d12]"
          style={{ background: 'radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 45%,#b45309 100%)', boxShadow: '0 0 10px rgba(251,191,36,.55), inset 0 0 0 1.5px rgba(120,53,15,.55)' }}>G</span>
        <b className="font-display text-t2 font-extrabold leading-none">
          {/* 금빛 글자는 숫자 칸 자신에 — 세기 끝의 '톡'(크기 변화) 동안에도 글자가 사라지지 않게 */}
          <Count value={gold} dur={600} style={{ background: 'linear-gradient(180deg,#fff3c4,#fbbf24 60%,#d97706)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }} />
        </b>
        {delta && (
          <b key={delta.k} className={`gold-float ${delta.d > 0 ? 'up' : 'down'}`} onAnimationEnd={() => setDelta(null)} aria-hidden="true">
            {delta.d > 0 ? '+' : '−'}{Math.abs(delta.d).toLocaleString()} G
          </b>
        )}
      </span>
      {open && (
        <ProfileModal account={live} nick={nick} banner={banner} ace={ace} teamName={live?.team?.name || live?.nick || ''}
          onClose={() => setOpen(false)} onSaved={() => bump((n) => n + 1)} onSignOut={onSignOut} />
      )}
    </span>
  );
}
