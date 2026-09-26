/*
 * 상단 바 오른쪽 프로필 — 등급 엠블럼 · 이름 · 등급/RP + 맞물린 골드 칩.
 * 누르면 프로필 창: 이름 변경 · 대진표 내 팀 칸 배너 고르기 · 소리(배경음악 · 효과음) · 로그아웃.
 * 이름 · 배너는 저장소에서 바로 읽는다(어느 화면의 상단 바든 바꾼 즉시 같은 값).
 */
import React, { useState, useEffect, useRef } from 'react';
import { Count, useExitGhost } from '../ui/motion.jsx';
import { createPortal } from 'react-dom';
import { rankOf } from './rank.js';
import { loadAccount, saveProfile, TEAM_NAME_MAX } from './store.js';
import { BANNERS, flagByKey } from './teamArt.js';
import { online } from '../net/supabase.js';
import { renameNick, myRecoveryEmail, setRecoveryEmail, checkEmail, NICK_MIN } from '../net/account.js';
import { getSettings, onSettings, setSettings } from '../audio/bgm.js';
import { play } from '../audio/sfx.js';

const NICK_MAX = 12;
const FLAG_MASK = 'linear-gradient(90deg,transparent 18%,#000 78%)';

/** 소리 — 배경음악 · 효과음 크기와 음소거. 다른 칸과 달리 저장을 누르지 않아도 바로 바뀐다 */
function MusicRow() {
  const [s, setS] = useState(getSettings);
  useEffect(() => onSettings(setS), []);
  const row = (key, label, onSet) => {
    const v = s[key] ?? 0;
    return (
      <div className="flex items-center gap-4">
        <span className="w-16 shrink-0 text-t3 font-bold text-gray-300">{label}</span>
        <input type="range" min="0" max="100" value={Math.round(v * 100)} aria-label={`${label} 크기`}
          onChange={(e) => setSettings({ [key]: Number(e.target.value) / 100, muted: false })} onPointerUp={onSet} className="min-w-0 flex-1 accent-emerald-400" />
        <b className="w-10 text-right font-display text-t2 text-white">{s.muted || v === 0 ? '끔' : Math.round(v * 100)}</b>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-t4 font-bold tracking-[0.24em] text-gray-400">소리</span>
      <div className="mt-cut flex items-center gap-4 bg-white/[0.06] px-4 py-2.5" style={{ '--c': '8px' }}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {row('vol', '배경음악')}
          {row('sfx', '효과음', () => play('goldIn'))}
        </div>
        <button type="button" onClick={() => setSettings({ muted: !s.muted })} className="mt-btn" aria-pressed={s.muted}>{s.muted ? '소리 켜기' : '음소거 · M'}</button>
      </div>
    </div>
  );
}

/** 대진표 팀 칸 미리보기 */
function SlotPreview({ name, banner }) {
  const flag = flagByKey(banner);
  return (
    <div className="mt-cut relative flex h-12 items-center overflow-hidden px-4" style={{ '--c': '7px', background: 'rgba(52,211,153,.16)', boxShadow: 'inset 0 0 0 1.5px #34d399' }}>
      {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.62, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />}
      <b className="relative truncate text-t2 font-black text-[#34d399]" style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{name}</b>
    </div>
  );
}

function ProfileModal({ nick: nick0, banner: banner0, teamName, onClose, onSaved, onSignOut }) {
  const rootRef = useRef(null);
  useExitGhost(rootRef);
  const [nick, setNick] = useState(nick0 || '');
  const [banner, setBanner] = useState(banner0 ?? null);
  const [club, setClub] = useState(teamName || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mail0, setMail0] = useState(null); // 서버에 있는 복구 이메일(불러오기 전 null)
  const [mail, setMail] = useState('');
  useEffect(() => {
    if (!online) return;
    myRecoveryEmail().then((m) => { setMail0(m || ''); setMail(m || ''); }).catch(() => setMail0(''));
  }, []);
  const valid = nick.trim().length >= (online ? NICK_MIN : 1) && club.trim().length >= 1;
  const save = async () => {
    if (!valid || busy) return;
    const nk = nick.trim();
    if (online && nk !== nick0) { // 서버 감독 이름부터 — 겹치면 여기서 멈춘다
      setBusy(true);
      try { await renameNick(nk); } catch (e) { setErr(e.message); setBusy(false); return; }
    }
    if (online && mail0 !== null && mail.trim().toLowerCase() !== mail0) {
      const bad = checkEmail(mail);
      if (bad) { setErr(bad); return; }
      setBusy(true);
      try { await setRecoveryEmail(mail); } catch (e) { setErr(e.message); setBusy(false); return; }
    }
    saveProfile({ nick: nk, banner, teamName: club.trim() !== teamName ? club.trim() : undefined });
    onSaved();
    onClose();
  };
  return createPortal(
    <div ref={rootRef} className="mt-pop-bg fixed inset-0 z-[80] grid place-items-center bg-[#03050a]/70 backdrop-blur-[5px]" onClick={onClose} role="presentation">
      <div className="mt-cut mt-frame mt-glass flex w-[760px] flex-col gap-5 p-7" style={{ '--c': '18px', '--a': '#10b981' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="프로필">
        <div className="flex items-baseline gap-3">
          <p className="mt-lab">감독</p>
          <b className="text-t1 font-black text-white">프로필</b>
          <button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center text-t2 text-gray-400 hover:text-white" aria-label="닫기">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-display text-t4 font-bold tracking-[0.24em] text-gray-400">감독 이름</span>
            <span className="flex items-center gap-3">
              <input value={nick} maxLength={NICK_MAX} onChange={(e) => { setNick(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && save()}
                className="mt-cut h-12 min-w-0 flex-1 bg-white/[0.06] px-4 text-t2 font-bold text-white outline-none focus:shadow-[inset_0_0_0_1.5px_#10b981]" style={{ '--c': '8px' }} />
              <span className="font-display text-t3 text-gray-400">{nick.length}/{NICK_MAX}</span>
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-display text-t4 font-bold tracking-[0.24em] text-gray-400">구단 이름</span>
            <span className="flex items-center gap-3">
              <input value={club} maxLength={TEAM_NAME_MAX} onChange={(e) => { setClub(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && save()}
                className="mt-cut h-12 min-w-0 flex-1 bg-white/[0.06] px-4 text-t2 font-bold text-white outline-none focus:shadow-[inset_0_0_0_1.5px_#10b981]" style={{ '--c': '8px' }} />
              <span className="font-display text-t3 text-gray-400">{club.length}/{TEAM_NAME_MAX}</span>
            </span>
          </label>
        </div>

        {online && (
          <label className="flex flex-col gap-2">
            <span className="font-display text-t4 font-bold tracking-[0.24em] text-gray-400">복구 이메일 · 선택</span>
            <input type="email" value={mail} maxLength={254} disabled={mail0 === null} placeholder={mail0 === null ? '불러오는 중' : '비밀번호 찾기용'}
              onChange={(e) => { setMail(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && save()} autoComplete="email"
              className="mt-cut h-12 bg-white/[0.06] px-4 text-t2 text-white outline-none placeholder:text-gray-500 focus:shadow-[inset_0_0_0_1.5px_#10b981]" style={{ '--c': '8px' }} />
          </label>
        )}
        {err && <span className="-mt-2 text-t3 font-bold text-red-400" role="alert">{err}</span>}

        <div className="flex flex-col gap-2">
          <span className="font-display text-t4 font-bold tracking-[0.24em] text-gray-400">배너</span>
          <SlotPreview name={club.trim() || teamName} banner={banner} />
          <div className="mt-1 grid grid-cols-4 gap-2">
            {[{ key: null, label: '없음' }, ...BANNERS].map((b) => {
              const on = banner === b.key;
              return (
                <button key={b.key || 'none'} type="button" onClick={() => setBanner(b.key)} aria-pressed={on}
                  className="mt-cut relative h-14 overflow-hidden text-left transition hover:brightness-125"
                  style={{ '--c': '6px', background: '#0b1220', boxShadow: on ? 'inset 0 0 0 2px #10b981' : `inset 0 0 0 1px ${b.color ? `${b.color}55` : 'rgba(255,255,255,.12)'}` }}>
                  {b.src && <i className="absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${b.src})`, opacity: 0.8, WebkitMaskImage: 'linear-gradient(90deg,transparent 5%,#000 60%)', maskImage: 'linear-gradient(90deg,transparent 5%,#000 60%)' }} />}
                  <b className={`relative block px-3 text-t3 ${on ? 'text-[#34d399]' : 'text-white'}`} style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{b.label}</b>
                </button>
              );
            })}
          </div>
        </div>

        <MusicRow />

        <div className="flex items-center gap-3 pt-1">
          {onSignOut && <button type="button" onClick={onSignOut} className="mt-btn" style={{ color: '#fca5a5' }}>로그아웃</button>}
          <button type="button" onClick={onClose} className="mt-btn ml-auto">취소</button>
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
  const live = loadAccount() || account; // 이름 · 배너는 저장소 기준
  const nick = live?.nick || account?.nick || '감독';
  const banner = live?.profile?.banner ?? null;
  const r = rankOf(account?.rank?.rp || 0);
  const flag = flagByKey(banner);
  const gold = account?.gold ?? 0;
  const prevGold = useRef(gold);
  const [delta, setDelta] = useState(null); // { d, k } — 방금 바뀐 골드
  useEffect(() => {
    const d = gold - prevGold.current;
    prevGold.current = gold;
    if (d) { setDelta({ d, k: `${Date.now()}` }); play(d > 0 ? 'goldIn' : 'goldOut'); }
  }, [gold]);
  return (
    <span className="relative inline-flex">
      {/* 1안 한 장 배너: 배너가 상자 전체에 깔리고 왼쪽 어둠 → 오른쪽 구단 색. 골드는 배너 위 유리 칩 */}
      <button type="button" onClick={() => setOpen(true)} aria-label="프로필"
        className="mt-cut relative flex h-[54px] items-center gap-3 overflow-hidden pl-1.5 pr-2 text-left transition hover:brightness-125"
        style={{ '--c': '10px', background: '#0a101c', boxShadow: `inset 0 0 0 1px ${flag ? `${flag.color}55` : 'rgba(148,163,184,.25)'}` }}>
        {flag && (
          <>
            <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.75 }} />
            <i className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,#05080f 8%,rgba(5,8,15,.72) 40%,rgba(5,8,15,.25) 100%)' }} />
          </>
        )}
        <img src={`ui/rank/${r.tier.key}.webp`} alt="" className="relative -my-1 h-[60px] w-[60px] object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.7))' }} />
        <span className="relative mr-3.5 leading-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,.85)' }}>
          <b className="block whitespace-nowrap text-t3 font-extrabold text-white">{nick} <span className="font-semibold text-gray-300">감독</span></b>
          <span className="whitespace-nowrap font-display text-t4 font-bold text-gray-400">{r.tier.ko} {r.div} · {(account?.rank?.rp || 0).toLocaleString()} RP</span>
        </span>
        <span className="relative flex h-[38px] items-center gap-2 px-3" style={{ background: 'rgba(5,8,15,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', clipPath: 'inset(0 round 8px 0 0 0)' }}>
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full font-display text-t4 font-extrabold text-[#7c2d12]"
            style={{ background: 'radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 45%,#b45309 100%)', boxShadow: '0 0 10px rgba(251,191,36,.55), inset 0 0 0 1.5px rgba(120,53,15,.55)' }}>G</span>
          <b className="font-display text-t2 font-extrabold leading-none">
            {/* 금빛 글자는 숫자 칸 자신에 — 세기 끝의 '톡'(크기 변화) 동안에도 글자가 사라지지 않게 */}
            <Count value={gold} dur={600} style={{ background: 'linear-gradient(180deg,#fff3c4,#fbbf24 60%,#d97706)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }} />
          </b>
        </span>
      </button>
      {delta && (
        <b key={delta.k} className={`gold-float ${delta.d > 0 ? 'up' : 'down'}`} onAnimationEnd={() => setDelta(null)} aria-hidden="true">
          {delta.d > 0 ? '+' : '−'}{Math.abs(delta.d).toLocaleString()} G
        </b>
      )}
      {open && (
        <ProfileModal nick={nick} banner={banner} teamName={live?.team?.name || live?.nick || ''}
          onClose={() => setOpen(false)} onSaved={() => bump((n) => n + 1)} onSignOut={onSignOut} />
      )}
    </span>
  );
}
