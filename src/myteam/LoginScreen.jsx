/* 로그인 화면 — 지금은 닉네임만으로 브라우저에 저장. 나중에 실제 로그인으로 갈아 끼운다 */
import React, { useState } from 'react';
import { signIn } from './store.js';

const cut = (n = 12) => ({ clipPath: `polygon(${n}px 0,100% 0,100% calc(100% - ${n}px),calc(100% - ${n}px) 100%,0 100%,0 ${n}px)` });

export default function LoginScreen({ onDone }) {
  const [nick, setNick] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    const v = nick.trim();
    if (v.length < 2) { setErr('2글자 이상 입력해 주세요'); return; }
    onDone(signIn(v));
  };
  return (
    <div className="relative min-h-dvh bg-[#05080f] text-gray-200">
      <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: 'url(ui/broadcast-field.webp)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(3,5,10,.9),rgba(3,5,10,.6) 40%,rgba(3,5,10,.95))' }} />
      <div className="relative grid min-h-dvh place-items-center px-4">
        <div className="w-full max-w-[420px] bg-[#070b14]/92 p-8 shadow-[inset_0_0_0_1px_rgba(52,211,153,.35),0_30px_80px_-30px_rgba(0,0,0,.95)]" style={cut(16)}>
          <p className="m-0 font-display text-[10px] font-semibold tracking-[0.4em] text-gray-500">LEGEND DRAFT</p>
          <h1 className="mt-1 text-3xl font-black text-white">내 팀 만들기</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            역대 KBO 선수를 직접 검색해 26인 엔트리와 코치진을 꾸리고, 그 팀으로 경기를 치릅니다.
            지금은 이 브라우저에 저장되고, 나중에 계정 로그인으로 이어집니다.
          </p>
          <label className="mt-6 block font-display text-[11px] font-semibold tracking-[0.3em] text-emerald-300">감독 이름</label>
          <input value={nick} onChange={(e) => { setNick(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="예: 김감독" maxLength={12}
            className="mt-2 w-full bg-white/[0.06] px-4 py-3 text-lg text-white outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)] focus:shadow-[inset_0_0_0_2px_#10b981]" style={cut(10)} />
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
          <button type="button" onClick={go}
            className="mt-5 w-full bg-emerald-500 py-3 text-lg font-black text-[#05080f]" style={cut(10)}>시작하기</button>
          <p className="mt-4 text-center text-xs text-gray-500">계정 연동 · 다른 감독과의 대결은 준비 중입니다</p>
        </div>
      </div>
    </div>
  );
}
