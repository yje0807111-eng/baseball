/*
 * 상단 바 오른쪽 프로필 — 등급 엠블럼 · 이름 · 등급/RP + 맞물린 골드 칩.
 * 누르면 프로필 창: 이름 변경 · 대진표 내 팀 칸 배너 고르기 · 로그아웃.
 * 이름 · 배너는 저장소에서 바로 읽는다(어느 화면의 상단 바든 바꾼 즉시 같은 값).
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { rankOf } from './rank.js';
import { loadAccount, saveProfile } from './store.js';
import { BANNERS, flagByKey } from './teamArt.js';

const NICK_MAX = 12;
const FLAG_MASK = 'linear-gradient(90deg,transparent 18%,#000 78%)';

/** 대진표 팀 칸 미리보기 */
function SlotPreview({ name, banner }) {
  const flag = flagByKey(banner);
  return (
    <div className="mt-cut relative flex h-12 items-center overflow-hidden px-4" style={{ '--c': '7px', background: 'rgba(52,211,153,.16)', boxShadow: 'inset 0 0 0 1.5px #34d399' }}>
      {flag && <i className="pointer-events-none absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${flag.src})`, opacity: 0.62, WebkitMaskImage: FLAG_MASK, maskImage: FLAG_MASK }} />}
      <b className="relative truncate text-lg font-black text-[#34d399]" style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{name}</b>
    </div>
  );
}

function ProfileModal({ nick: nick0, banner: banner0, teamName, onClose, onSaved, onSignOut }) {
  const [nick, setNick] = useState(nick0 || '');
  const [banner, setBanner] = useState(banner0 ?? null);
  const valid = nick.trim().length > 0;
  const save = () => {
    if (!valid) return;
    saveProfile({ nick: nick.trim(), banner });
    onSaved();
    onClose();
  };
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#02040a]/80 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className="mt-cut mt-frame mt-glass flex w-[760px] flex-col gap-5 p-7" style={{ '--c': '18px', '--a': '#10b981' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="프로필">
        <div className="flex items-baseline gap-3">
          <p className="mt-lab">Profile</p>
          <b className="text-2xl font-black text-white">프로필</b>
          <button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center text-xl text-gray-400 hover:text-white" aria-label="닫기">×</button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-display text-xs font-bold tracking-[0.24em] text-gray-400">이름</span>
          <span className="flex items-center gap-3">
            <input value={nick} maxLength={NICK_MAX} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
              className="mt-cut h-12 flex-1 bg-white/[0.06] px-4 text-lg font-bold text-white outline-none focus:shadow-[inset_0_0_0_1.5px_#10b981]" style={{ '--c': '8px' }} />
            <span className="font-display text-sm text-gray-500">{nick.length}/{NICK_MAX}</span>
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-display text-xs font-bold tracking-[0.24em] text-gray-400">배너</span>
          <SlotPreview name={teamName} banner={banner} />
          <div className="mt-1 grid grid-cols-4 gap-2">
            {[{ key: null, label: '없음' }, ...BANNERS].map((b) => {
              const on = banner === b.key;
              return (
                <button key={b.key || 'none'} type="button" onClick={() => setBanner(b.key)} aria-pressed={on}
                  className="mt-cut relative h-14 overflow-hidden text-left transition hover:brightness-125"
                  style={{ '--c': '6px', background: '#0b1220', boxShadow: on ? 'inset 0 0 0 2px #10b981' : `inset 0 0 0 1px ${b.color ? `${b.color}55` : 'rgba(255,255,255,.12)'}` }}>
                  {b.src && <i className="absolute inset-0 bg-cover bg-right" style={{ backgroundImage: `url(${b.src})`, opacity: 0.8, WebkitMaskImage: 'linear-gradient(90deg,transparent 5%,#000 60%)', maskImage: 'linear-gradient(90deg,transparent 5%,#000 60%)' }} />}
                  <b className={`relative block px-3 text-sm ${on ? 'text-[#34d399]' : 'text-white'}`} style={{ textShadow: '0 1px 6px rgba(0,0,0,.9)' }}>{b.label}</b>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {onSignOut && <button type="button" onClick={onSignOut} className="mt-btn" style={{ color: '#fca5a5' }}>로그아웃</button>}
          <button type="button" onClick={onClose} className="mt-btn ml-auto">취소</button>
          <button type="button" onClick={save} disabled={!valid} className="mt-btn pri" style={{ padding: '0 34px' }}>저장</button>
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
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="프로필"
        className="mt-cut flex h-12 items-stretch text-left transition hover:brightness-125"
        style={{ '--c': '10px', background: 'rgba(255,255,255,.05)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,.25)' }}>
        <span className="flex items-center gap-2.5 pl-2 pr-3.5">
          <img src={`ui/rank/${r.tier.key}.webp`} alt="" className="h-[38px] w-[38px] object-contain" />
          <span className="leading-tight">
            <b className="block text-base font-extrabold text-white">{nick} <span className="text-gray-300">감독</span></b>
            <span className="font-display text-[11px] font-bold tracking-[0.16em] text-gray-400">{r.tier.en} {r.div} · {(account?.rank?.rp || 0).toLocaleString()} RP</span>
          </span>
        </span>
        <span className="flex items-center gap-2 pl-6 pr-4" style={{ background: 'linear-gradient(90deg,rgba(251,191,36,.08),rgba(251,191,36,.2))', clipPath: 'polygon(14px 0,100% 0,100% 100%,0 100%)' }}>
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full font-display text-xs font-extrabold text-[#7c2d12]"
            style={{ background: 'radial-gradient(circle at 35% 30%,#fff7c2,#fbbf24 45%,#b45309 100%)', boxShadow: '0 0 10px rgba(251,191,36,.55), inset 0 0 0 1.5px rgba(120,53,15,.55)' }}>G</span>
          <b className="font-display text-[22px] font-extrabold leading-none" style={{ background: 'linear-gradient(180deg,#fff3c4,#fbbf24 60%,#d97706)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {(account?.gold ?? 0).toLocaleString()}
          </b>
        </span>
      </button>
      {open && (
        <ProfileModal nick={nick} banner={banner} teamName={live?.team?.name || '나의 드림팀'}
          onClose={() => setOpen(false)} onSaved={() => bump((n) => n + 1)} onSignOut={onSignOut} />
      )}
    </>
  );
}
