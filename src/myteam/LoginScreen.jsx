/* 로그인 — 지금은 감독 이름만으로 브라우저에 저장. 나중에 계정 로그인으로 갈아 끼운다 */
import React, { useState } from 'react';
import { signIn, peekAccount } from './store.js';
import { SQUAD_CAP } from './rules.js';
import { UiStyle, Btn, Chip } from './ui.jsx';

export default function LoginScreen({ onDone }) {
  const saved = peekAccount();
  const [nick, setNick] = useState(saved?.nick || '');
  const [err, setErr] = useState('');
  const go = (name = nick) => {
    const v = (name || '').trim();
    if (v.length < 2) { setErr('2글자 이상'); return; }
    onDone(signIn(v));
  };
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/mt/mt-tunnel.webp)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.96) 0,rgba(3,5,10,.78) 34%,rgba(3,5,10,.15) 62%,rgba(3,5,10,.6) 100%)' }} />
      <div className="mt-scan absolute inset-0 opacity-60" />

      <div className="relative grid min-h-dvh items-center px-6">
        <div className="w-full max-w-[540px] pl-2 lg:pl-16">
          <p className="mt-lab">Legend Draft</p>
          <h1 className="mt-2.5 text-[62px] font-extrabold leading-[1.02] text-white">내 팀을<br />만든다</h1>
          <p className="mt-4 max-w-[440px] text-base leading-[1.75] text-gray-400">
            1982년부터 오늘까지, 역대 KBO 선수로 26인 엔트리와 코치진 꾸리기<br />
            샐러리 캡 {SQUAD_CAP} CP 안에서 최적해 찾기
          </p>

          <div className="mt-cut mt-frame mt-8 bg-[#060a13]/88 p-7 backdrop-blur-[10px]" style={{ '--c': '16px' }}>
            <p className="mt-lab" style={{ '--a': '#34d399' }}>Manager</p>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
              <input value={nick} onChange={(e) => { setNick(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && go()}
                placeholder="감독 이름" maxLength={12}
                className="mt-cut mt-frame bg-white/[0.06] px-4 py-3.5 text-[19px] text-white outline-none focus:shadow-[inset_0_0_0_2px_#10b981]" style={{ '--c': '10px' }} />
              <Btn pri onClick={() => go()} style={{ '--c': '10px', padding: '0 34px' }}>시작하기</Btn>
            </div>
            {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Chip a="#7dd3fc">엔트리 26명</Chip><Chip a="#fde047">외국인 3명</Chip><Chip a="#34d399">CP {SQUAD_CAP}</Chip><Chip>감독·코치 4명</Chip>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-gray-500">계정 연동 · 감독 대결 준비 중</p>
        </div>
      </div>

      {saved?.nick && (
        <div className="mt-cut mt-frame absolute bottom-16 right-16 w-[330px] bg-[#060a13]/80 p-4 backdrop-blur-[10px]" style={{ '--c': '12px' }}>
          <p className="mt-lab" style={{ '--a': '#7dd3fc' }}>이어서 하기</p>
          <div className="mt-3 flex items-center gap-3.5">
            <div className="mt-cut h-14 w-14 bg-cover bg-center" style={{ '--c': '8px', backgroundImage: 'url(ui/mt/mt-card.webp)' }} />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[17px] text-white">{saved.nick}</b>
              <span className="text-xs text-gray-400">{saved.team?.name || '나의 드림팀'} · {saved.team?.squad?.length || 0}/26 · {saved.team?.record?.w || 0}승 {saved.team?.record?.l || 0}패</span>
            </div>
            <Btn sm onClick={() => go(saved.nick)}>열기</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
