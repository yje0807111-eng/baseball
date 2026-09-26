/*
 * 로그인 — 서버 키가 있으면 아이디 · 비밀번호(로그인 / 가입), 없으면 감독 이름만으로 이 브라우저에 저장.
 * 가입할 때 이 브라우저에 옛 저장(감독 이름만으로 만든 것)이 있으면 그 기록으로 시작할 수 있다.
 */
import React, { useState } from 'react';
import { signIn, peekAccount } from './store.js';
import { SQUAD_CAP } from './rules.js';
import { UiStyle, Btn, Chip } from './ui.jsx';
import { online } from '../net/supabase.js';
import { logIn, signUp, legacySave, checkId, checkPw, checkNick, NICK_MAX } from '../net/account.js';

const INPUT = 'mt-cut mt-frame w-full bg-white/[0.06] px-4 py-3 text-t2 text-white outline-none placeholder:text-gray-500 focus:shadow-[inset_0_0_0_2px_#10b981]';

function Field({ label, ...rest }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-t4 font-bold text-gray-400">{label}</span>
      <input className={INPUT} style={{ '--c': '10px' }} {...rest} />
    </label>
  );
}

/** 서버 계정 — 로그인 / 가입 */
function AccountPanel({ onDone }) {
  const legacy = legacySave();
  const [tab, setTab] = useState(legacy ? 'join' : 'login');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [nick, setNick] = useState(legacy?.nick?.slice(0, NICK_MAX) || '');
  const [adopt, setAdopt] = useState(!!legacy);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const join = tab === 'join';

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const bad = join
      ? checkId(id) || checkPw(pw) || (pw !== pw2 ? '비밀번호 불일치' : null) || checkNick(nick)
      : checkId(id) || (pw ? null : '비밀번호 입력');
    if (bad) { setErr(bad); return; }
    setBusy(true);
    setErr('');
    try {
      const uid = join ? await signUp({ id, pw, nick, adopt: adopt && !!legacy }) : await logIn({ id, pw });
      onDone(uid);
    } catch (x) {
      setErr(x.message || '다시 시도');
      setBusy(false);
    }
  };
  const pick = (t) => { setTab(t); setErr(''); setPw(''); setPw2(''); };

  return (
    <div className="mt-cut mt-frame mt-glass mt-8 flex flex-col overflow-hidden" style={{ '--c': '16px' }}>
      <div className="h-14 shrink-0 border-b border-white/10 px-3">
        <nav className="mt-tabs" aria-label="계정">
          <button type="button" className={`mt-tab ${!join ? 'on' : ''}`} aria-pressed={!join} onClick={() => pick('login')}>로그인</button>
          <button type="button" className={`mt-tab ${join ? 'on' : ''}`} aria-pressed={join} onClick={() => pick('join')}>가입</button>
        </nav>
      </div>
      <form className="flex flex-col gap-3 px-7 py-6" onSubmit={submit} onChange={() => setErr('')}>
        <Field label="아이디" value={id} onChange={(e) => setId(e.target.value.toLowerCase())} maxLength={16}
          autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="영문 · 숫자 · _ 4~16자" />
        <Field label="비밀번호" type="password" value={pw} onChange={(e) => setPw(e.target.value)} maxLength={72}
          autoComplete={join ? 'new-password' : 'current-password'} placeholder={join ? '8자 이상' : ''} />
        {join && (
          <>
            <Field label="비밀번호 확인" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} maxLength={72} autoComplete="new-password" />
            <Field label="감독 이름" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={NICK_MAX} placeholder={`다른 감독에게 보이는 이름 · 2~${NICK_MAX}자`} />
            {legacy && (
              <button type="button" onClick={() => setAdopt((v) => !v)} aria-pressed={adopt}
                className={`mt-cut flex items-center gap-3 px-4 py-3 text-left transition ${adopt ? 'bg-emerald-400/10 shadow-[inset_0_0_0_1.5px_#34d399]' : 'bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]'}`} style={{ '--c': '10px' }}>
                <i className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-t3 font-black ${adopt ? 'bg-[#34d399] text-[#04120c]' : 'bg-white/10 text-transparent'}`} aria-hidden="true">✓</i>
                <span className="min-w-0 flex-1">
                  <b className="block text-t3 text-white">이 브라우저 기록으로 시작</b>
                  <span className="block truncate text-t4 text-gray-400">{legacy.nick} · {legacy.team} · {legacy.size}/26 · {legacy.w}승 {legacy.l}패</span>
                </span>
              </button>
            )}
          </>
        )}
        <div className="mt-1 flex items-center gap-4">
          <Btn pri type="submit" disabled={busy} style={{ '--c': '10px', padding: '0 34px', minHeight: 50 }}>
            {busy ? '확인 중' : join ? '가입하고 시작' : '로그인'}
          </Btn>
          {err && <p className="text-t3 font-bold text-red-400" role="alert">{err}</p>}
        </div>
        {join && <p className="text-t4 text-gray-500">이메일 없는 가입 · 비밀번호 분실 시 복구 불가</p>}
      </form>
    </div>
  );
}

/** 서버 없는 빌드 — 감독 이름만으로 이 브라우저에 */
function LocalPanel({ onDone }) {
  const saved = peekAccount();
  const [nick, setNick] = useState(saved?.nick || '');
  const [err, setErr] = useState('');
  const go = (name = nick) => {
    const v = (name || '').trim();
    if (v.length < 2) { setErr('2글자 이상'); return; }
    onDone(signIn(v));
  };
  return (
    <div className="mt-cut mt-frame mt-8 bg-[#060a13]/88 p-7 backdrop-blur-[10px]" style={{ '--c': '16px' }}>
      <p className="mt-lab" style={{ '--a': '#34d399' }}>{saved?.nick ? '이어서 하기' : '새로 시작'}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <input value={nick} onChange={(e) => { setNick(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && go()}
          placeholder="감독 이름" maxLength={12} className={INPUT} style={{ '--c': '10px' }} />
        <Btn pri onClick={() => go()} style={{ '--c': '10px', padding: '0 34px' }}>시작하기</Btn>
      </div>
      {err && <p className="mt-2 text-t3 text-red-400">{err}</p>}
    </div>
  );
}

export default function LoginScreen({ onDone }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/mt/mt-tunnel.webp)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.96) 0,rgba(3,5,10,.78) 34%,rgba(3,5,10,.15) 62%,rgba(3,5,10,.6) 100%)' }} />
      <div className="mt-scan absolute inset-0 opacity-60" />

      <div className="relative grid min-h-dvh items-center px-6 py-4">
        <div className="w-full max-w-[540px] pl-2 lg:pl-16">
          <p className="mt-lab">레전드 드래프트</p>
          <h1 className="mt-2.5 text-[62px] font-extrabold leading-[1.02] text-white">내 팀을<br />만든다</h1>
          <p className="mt-4 max-w-[440px] text-t3 leading-[1.75] text-gray-400">
            1982년부터 오늘까지, 역대 KBO 선수로 26인 엔트리와 코치진 꾸리기<br />
            샐러리 캡 {SQUAD_CAP} CP 안에서 최적해 찾기
          </p>
          {online ? <AccountPanel onDone={onDone} /> : <LocalPanel onDone={onDone} />}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Chip a="#7dd3fc">엔트리 26명</Chip><Chip a="#fde047">외국인 3명</Chip><Chip a="#34d399">CP {SQUAD_CAP}</Chip><Chip>감독·코치 4명</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}
