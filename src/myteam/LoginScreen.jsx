/*
 * 로그인 — 서버 키가 있으면 아이디 · 비밀번호(로그인 / 가입), 없으면 감독 이름만으로 이 브라우저에 저장.
 * 비밀번호 찾기는 복구 이메일(가입 때 선택)로 받은 인증번호로.
 * 가입할 때 이 브라우저에 옛 저장(감독 이름만으로 만든 것)이 있으면 그 기록으로 시작할 수 있다.
 */
import React, { useState } from 'react';
import { signIn, peekAccount, TEAM_NAME_MAX } from './store.js';
import { UiStyle } from './ui.jsx';
import BgmButton from '../audio/BgmButton.jsx';
import { online } from '../net/supabase.js';
import { logIn, signUp, loginFree, legacySave, lastLoginId, recoverStart, recoverFinish, checkId, checkPw, checkNick, checkEmail, NICK_MAX, PW_MIN } from '../net/account.js';

/*
 * 판 — Battle.net 결(mockups/login-panel P6): 아이콘 입력 · 큰 금빛 단추 · 아래 테두리 단추로 가입.
 * 가입 2단계는 판 머리가 감독 명함(치는 대로 이름 · 구단이 새겨짐).
 * 포커스 빛 0.15초 · 단계 넘김 0.24초(자주 보는 것 → 0.3초 안) · 줄이기 설정이면 끔.
 */
const CSS = `
  .lg-pn { position:relative; border-radius:22px; overflow:hidden; background:linear-gradient(180deg,rgba(30,34,56,.72),rgba(8,10,20,.86)); -webkit-backdrop-filter:blur(18px); backdrop-filter:blur(18px);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),inset 0 1px 0 rgba(255,255,255,.14),0 30px 70px rgba(0,0,0,.55); }
  .lg-pn::after { content:''; position:absolute; left:32px; right:32px; top:0; height:1px; background:linear-gradient(90deg,transparent,rgba(245,210,122,.7),transparent); }
  .lg-in { animation:lgIn .24s cubic-bezier(.2,.8,.2,1); }
  @keyframes lgIn { from { opacity:0; transform:translateX(18px); } }
  .lg-t { margin:0 0 8px; font-size:26px; font-weight:700; color:#fff; }
  .lg-ic { position:relative; display:block; }
  .lg-ic svg { position:absolute; left:16px; top:50%; transform:translateY(-50%); width:18px; height:18px; stroke:#8b93a4; fill:none; stroke-width:2; transition:stroke .15s; pointer-events:none; }
  .lg-ic input { width:100%; height:54px; border:0; outline:0; border-radius:12px; padding:0 64px 0 46px; font-size:16px; font-weight:500; color:#fff; background:rgba(0,0,0,.35); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); transition:box-shadow .15s; }
  .lg-ic input::placeholder { color:#6b7280; }
  .lg-ic input:focus { box-shadow:inset 0 0 0 2px #f5d27a; }
  .lg-ic:focus-within svg { stroke:#f5d27a; }
  .lg-eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:700; color:#9ca3af; }
  .lg-eye:hover { color:#fff; }
  .lg-go { width:100%; height:56px; border-radius:14px; font-size:18px; font-weight:800; color:#1c1203; background:linear-gradient(180deg,#fde68a,#e3b24a);
    box-shadow:0 0 26px rgba(245,210,122,.28),inset 0 1px 0 rgba(255,255,255,.5); transition:filter .15s,transform .1s; }
  .lg-go:hover { filter:brightness(1.07); } .lg-go:active { transform:translateY(1px); }
  .lg-go:disabled { filter:grayscale(.6) brightness(.6); box-shadow:none; }
  .lg-ghost { width:100%; height:50px; border-radius:14px; font-size:16px; font-weight:700; color:#e5e7eb; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); transition:box-shadow .15s,background .15s; }
  .lg-ghost:hover { box-shadow:inset 0 0 0 1px rgba(245,210,122,.6); background:rgba(245,210,122,.06); }
  .lg-or { display:flex; align-items:center; gap:12px; margin:6px 0; font-size:13px; color:#6b7280; }
  .lg-or::before, .lg-or::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.1); }
  .lg-lk { font-size:14px; color:#9ca3af; } .lg-lk:hover { color:#fff; } .lg-lk b { color:#f5d27a; font-weight:700; }
  .lg-sn { display:flex; align-items:center; gap:10px; margin-bottom:6px; font-size:14px; font-weight:700; color:#e5e7eb; }
  .lg-sn b { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font:800 14px 'Saira Condensed',sans-serif; background:rgba(255,255,255,.08); color:#9ca3af; }
  .lg-sn b.on { background:#f5d27a; color:#1c1203; box-shadow:0 0 12px rgba(245,210,122,.5); }
  .lg-sn b.done { background:#34d399; color:#04120c; }
  .lg-sn i { flex:1; height:2px; background:rgba(255,255,255,.1); } .lg-sn i.on { background:#f5d27a; }
  .lg-sn .off { color:#6b7280; }
  .lg-badge { position:relative; height:196px; overflow:hidden; background:radial-gradient(80% 120% at 85% 20%,rgba(245,210,122,.22),transparent 60%),linear-gradient(120deg,#221a3a,#0b0f1c 70%); border-bottom:1px solid rgba(245,210,122,.45); }
  .lg-badge::before { content:''; position:absolute; inset:-40%; background:linear-gradient(115deg,transparent 44%,rgba(255,255,255,.12) 50%,transparent 56%); animation:lgSheen 5s ease-in-out infinite; }
  .lg-badge::after { content:'LEGEND'; position:absolute; right:-10px; bottom:-26px; font:italic 800 120px/1 'Saira Condensed',sans-serif; color:rgba(245,210,122,.06); }
  @keyframes lgSheen { 0%,60% { transform:translateX(-50%); } 90%,100% { transform:translateX(50%); } }
  @media (prefers-reduced-motion: reduce) { .lg-in, .lg-badge::before { animation:none; } }
`;

const ICON = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  flag: <path d="M5 21V4h12l-2 4 2 4H5" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3" /></>,
};

/** 아이콘 입력 — 이름은 칸 안(placeholder) · aria-label 로 읽힘. 비밀번호 칸은 보기 단추 · Caps Lock 알림 */
function Field({ icon, label, hint, type = 'text', eye, ...rest }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const pw = type === 'password';
  return (
    <>
      <label className="lg-ic">
        <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[icon]}</svg>
        <input type={pw && show ? 'text' : type} aria-label={label} placeholder={hint ? `${label} · ${hint}` : label}
          onKeyUp={pw ? (e) => setCaps(e.getModifierState('CapsLock')) : undefined} onBlur={pw ? () => setCaps(false) : undefined} {...rest} />
        {pw && eye && <button type="button" className="lg-eye" data-sfx="none" onClick={() => setShow((v) => !v)}>{show ? '숨기기' : '보기'}</button>}
      </label>
      {caps && <p className="-mt-1 text-t4 text-amber-400">Caps Lock 켜짐</p>}
    </>
  );
}

function Msg({ err, note }) {
  return err ? <p className="text-t3 font-bold text-red-400" role="alert">{err}</p> : note ? <p className="text-t3 text-emerald-300">{note}</p> : null;
}

/** 비밀번호 찾기 — 아이디 · 복구 이메일 → 인증번호 · 새 비밀번호 */
function FindForm({ id, setId, onBack }) {
  const [step, setStep] = useState('ask');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try { await fn(); } catch (x) { setErr(x.message || '다시 시도'); }
    setBusy(false);
  };
  const ask = () => run(async () => {
    await recoverStart(id, email);
    setStep('code');
    setNote('등록된 이메일이면 인증번호 발송 · 10분');
  });
  const submit = (e) => {
    e.preventDefault();
    if (step === 'ask') { ask(); return; }
    if (pw !== pw2) { setErr('비밀번호 불일치'); return; }
    run(async () => {
      await recoverFinish(id, code, pw);
      onBack('비밀번호 변경 완료 · 로그인');
    });
  };
  return (
    <form key={step} className="lg-in flex flex-col gap-3 px-8 pb-7 pt-8" onSubmit={submit} onChange={() => setErr('')}>
      <p className="lg-t">비밀번호 찾기</p>
      {step === 'ask' ? (
        <>
          <Field icon="user" label="아이디" value={id} onChange={(e) => setId(e.target.value.toLowerCase())} maxLength={16}
            autoComplete="username" autoCapitalize="none" spellCheck={false} />
          <Field icon="mail" label="복구 이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
        </>
      ) : (
        <>
          <Field icon="key" label="인증번호" hint="6자리" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6}
            inputMode="numeric" autoComplete="one-time-code" autoFocus />
          <Field icon="lock" label="새 비밀번호" hint={`${PW_MIN}자 이상`} type="password" eye value={pw} onChange={(e) => setPw(e.target.value)} maxLength={72} autoComplete="new-password" />
          <Field icon="lock" label="새 비밀번호 확인" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} maxLength={72} autoComplete="new-password" />
        </>
      )}
      <Msg err={err} note={note} />
      <button type="submit" className="lg-go mt-1" data-sfx="press" disabled={busy || (step === 'ask' ? !id || !email : !code || !pw || !pw2)}>
        {busy ? '확인 중' : step === 'ask' ? '인증번호 받기' : '비밀번호 바꾸기'}
      </button>
      <div className="mt-2 flex justify-center gap-6">
        <button type="button" className="lg-lk" onClick={() => onBack('')}>로그인으로</button>
        {step === 'code' && <button type="button" className="lg-lk" onClick={ask} disabled={busy}>인증번호 다시 받기</button>}
      </div>
    </form>
  );
}

/** 가입 단계 — ① 계정 → ② 감독 */
function Steps({ step }) {
  return (
    <div className="lg-sn" aria-label={`가입 ${step} / 2`}>
      <b className={step === 2 ? 'done' : 'on'}>{step === 2 ? '✓' : 1}</b>계정
      <i className={step === 2 ? 'on' : ''} />
      <b className={step === 2 ? 'on' : ''}>2</b><span className={step === 2 ? '' : 'off'}>감독</span>
    </div>
  );
}

/** 가입 2단계 판 머리 — 감독 명함(치는 대로 새겨짐) */
function Badge({ nick, club }) {
  const day = new Date().toLocaleDateString('sv').replace(/-/g, '.');
  const saira = { fontFamily: "'Saira Condensed',sans-serif" };
  return (
    <div className="lg-badge" aria-hidden="true">
      <div className="absolute bottom-0 right-[26px] h-[180px] w-[150px] bg-contain bg-bottom bg-no-repeat"
        style={{ backgroundImage: 'url(ui/mt/silhouette-coach.webp)', filter: 'drop-shadow(0 0 16px rgba(245,210,122,.25))' }} />
      <div className="absolute left-8 right-[190px] top-[34px]">
        <small className="text-[12px] font-extrabold tracking-[.32em] text-[#f5d27a]" style={saira}>MANAGER LICENSE</small>
        <b className="mb-1 mt-2 block min-h-[44px] truncate text-[38px] font-bold leading-[1.15] text-white">{nick.trim() || <span className="text-gray-600">감독 이름</span>}</b>
        <span className="text-t2 text-gray-300">{club.trim() || nick.trim() || '구단 이름'}</span>
      </div>
      <span className="absolute bottom-4 left-8 text-[13px] font-bold tracking-[.12em] text-gray-500" style={saira}>{day}</span>
    </div>
  );
}

/** 서버 계정 — 로그인 / 가입 / 비밀번호 찾기 */
function AccountPanel({ onDone }) {
  const legacy = legacySave();
  const [tab, setTab] = useState(legacy ? 'join' : 'login'); // login | join | find
  const [step, setStep] = useState(1); // 가입 — 1 아이디 · 비밀번호 / 2 감독 이름 · 구단 · 이메일
  const [id, setId] = useState(() => (legacy ? '' : lastLoginId()));
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [nick, setNick] = useState(legacy?.nick?.slice(0, NICK_MAX) || '');
  const [email, setEmail] = useState('');
  const [club, setClub] = useState(legacy?.team && legacy.team !== '나의 드림팀' ? legacy.team.slice(0, TEAM_NAME_MAX) : '');
  const [adopt, setAdopt] = useState(!!legacy);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const join = tab === 'join';
  const card = join && step === 2;
  const filled = !join ? id && pw : step === 1 ? id && pw && pw2 : nick.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (join && step === 1) {
      const bad1 = checkId(id) || checkPw(pw) || (pw !== pw2 ? '비밀번호 불일치' : null);
      if (bad1) { setErr(bad1); return; }
      setBusy(true); // 아이디 겹침은 여기서 — 2단계까지 채운 뒤에 되돌아오지 않게
      try { await loginFree(id); setStep(2); } catch (x) { setErr(x.message || '다시 시도'); }
      setBusy(false);
      return;
    }
    const bad = join
      ? checkId(id) || checkPw(pw) || (pw !== pw2 ? '비밀번호 불일치' : null) || checkNick(nick) || checkEmail(email)
      : checkId(id) || (pw ? null : '비밀번호 입력');
    if (bad) { setErr(bad); return; }
    setBusy(true);
    setErr('');
    try {
      const uid = join ? await signUp({ id, pw, nick, club, email, adopt: adopt && !!legacy }) : await logIn({ id, pw });
      onDone(uid);
    } catch (x) {
      setErr(x.message || '다시 시도');
      setBusy(false);
    }
  };
  const pick = (t, msg = '') => { setTab(t); setStep(1); setErr(''); setNote(msg); setPw(''); setPw2(''); };

  if (tab === 'find') return <div className="lg-pn"><FindForm id={id} setId={setId} onBack={(msg) => pick('login', msg)} /></div>;
  const idField = (
    <Field icon="user" label="아이디" hint={join ? '영문 · 숫자 · _ 4~16자' : ''} value={id} onChange={(e) => setId(e.target.value.toLowerCase())} maxLength={16}
      autoComplete="username" autoCapitalize="none" spellCheck={false} />
  );
  return (
    <div className="lg-pn">
      {card && <Badge nick={nick} club={club} />}
      <form key={`${tab}${step}`} className={`lg-in flex flex-col gap-3 px-8 pb-7 ${card ? 'pt-6' : 'pt-8'}`} onSubmit={submit} onChange={() => { setErr(''); setNote(''); }}>
        {!card && <p className="lg-t">{join ? '가입' : '로그인'}</p>}
        {join && <Steps step={step} />}
        {!join ? (
          <>
            {idField}
            <Field icon="lock" label="비밀번호" type="password" eye value={pw} onChange={(e) => setPw(e.target.value)} maxLength={72} autoComplete="current-password" />
            <button type="button" className="lg-lk -mt-1 self-end" onClick={() => pick('find')}>비밀번호 찾기</button>
          </>
        ) : step === 1 ? (
          <>
            {idField}
            <Field icon="lock" label="비밀번호" hint={`${PW_MIN}자 이상`} type="password" eye value={pw} onChange={(e) => setPw(e.target.value)} maxLength={72} autoComplete="new-password" />
            <Field icon="lock" label="비밀번호 확인" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} maxLength={72} autoComplete="new-password" />
          </>
        ) : (
          <>
            <Field icon="user" label="감독 이름" hint={`2~${NICK_MAX}자`} value={nick} onChange={(e) => setNick(e.target.value)} maxLength={NICK_MAX} autoFocus />
            <Field icon="flag" label="구단 이름 · 선택" hint="비우면 감독 이름" value={club} onChange={(e) => setClub(e.target.value)} maxLength={TEAM_NAME_MAX} />
            <Field icon="mail" label="복구 이메일 · 선택" hint="비밀번호 찾기용" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
            {legacy && (
              <button type="button" onClick={() => setAdopt((v) => !v)} aria-pressed={adopt}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${adopt ? 'bg-emerald-400/10 shadow-[inset_0_0_0_1.5px_#34d399]' : 'bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]'}`}>
                <i className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-t3 font-black ${adopt ? 'bg-[#34d399] text-[#04120c]' : 'bg-white/10 text-transparent'}`} aria-hidden="true">✓</i>
                <span className="min-w-0 flex-1">
                  <b className="block text-t3 text-white">이 브라우저 기록으로 시작</b>
                  <span className="block truncate text-t4 text-gray-400">{legacy.nick} · {legacy.team} · {legacy.size}/26 · {legacy.w}승 {legacy.l}패</span>
                </span>
              </button>
            )}
            {!email.trim() && <p className="text-t4 text-gray-500">복구 이메일 없으면 비밀번호 찾기 불가</p>}
          </>
        )}
        <Msg err={err} note={note} />
        <button type="submit" className="lg-go mt-1" data-sfx="press" disabled={busy || !filled}>
          {busy ? '확인 중' : !join ? '로그인' : step === 1 ? '다음' : '가입하고 시작'}
        </button>
        {!join ? (
          <><div className="lg-or">처음이면</div><button type="button" className="lg-ghost" onClick={() => pick('join')}>가입</button></>
        ) : (
          <p className="mt-2 text-center">
            {step === 1
              ? <button type="button" className="lg-lk" onClick={() => pick('login')}>이미 계정 있음 · <b>로그인</b></button>
              : <button type="button" className="lg-lk" onClick={() => { setStep(1); setErr(''); }}>이전</button>}
          </p>
        )}
      </form>
    </div>
  );
}

/** 서버 없는 빌드 — 감독 이름만으로 이 브라우저에 */
function LocalPanel({ onDone }) {
  const saved = peekAccount();
  const [nick, setNick] = useState(saved?.nick || '');
  const [err, setErr] = useState('');
  const go = (e) => {
    e.preventDefault();
    const v = nick.trim();
    if (v.length < 2) { setErr('2글자 이상'); return; }
    onDone(signIn(v));
  };
  return (
    <form className="lg-pn flex flex-col gap-3 px-8 pb-7 pt-8" onSubmit={go}>
      <p className="lg-t">{saved?.nick ? '이어서 하기' : '새로 시작'}</p>
      <Field icon="user" label="감독 이름" hint="2~12자" value={nick} onChange={(e) => { setNick(e.target.value); setErr(''); }} maxLength={12} />
      <Msg err={err} />
      <button type="submit" className="lg-go mt-1" data-sfx="nav" disabled={!nick.trim()}>시작하기</button>
    </form>
  );
}

/*
 * 짜임 — 로고 · 로그인 판 두 칸을 가운데로(mockups/login-b C2). 1920 폭에서 왼쪽에 몰려 비던 자리를 줄임.
 * 로고는 방송 글씨(Saira Condensed) · 금빛은 레전드 결(#f5d27a).
 */
export default function LoginScreen({ onDone }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05080f] text-gray-200">
      <UiStyle />
      <style>{CSS}</style>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/mt/mt-tunnel.webp)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(50% 60% at 50% 50%,rgba(3,5,10,.55),rgba(3,5,10,.9))' }} />
      <div className="mt-scan absolute inset-0 opacity-60" />
      {/* 소리 — 다른 화면과 같은 자리 · 같은 단추(오른쪽 28px · 위 18px) */}
      <BgmButton className="!absolute right-7 top-[18px] z-10" />

      <div className="relative flex min-h-dvh items-center justify-center gap-[120px] px-6 py-4">
        <div className="w-[560px] shrink-0">
          <p className="mt-lab" style={{ '--a': '#f5d27a', letterSpacing: '.42em', fontFamily: "'Saira Condensed',sans-serif" }}>KBO</p>
          <h1 className="mt-2.5 text-white" style={{ font: "italic 800 132px/.86 'Saira Condensed',sans-serif", textShadow: '0 6px 40px rgba(0,0,0,.6)' }}>
            LEGEND
            <b className="block" style={{ background: 'linear-gradient(180deg,#fff3c4,#f5d27a 45%,#c8942f)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 22px rgba(245,210,122,.35))' }}>DRAFT</b>
          </h1>
          <p className="mt-3 text-[26px] font-black text-gray-200">레전드 드래프트</p>
          <p className="mt-2 text-t2 text-gray-400">역대 KBO 선수 드래프트 · 랭크전</p>
        </div>
        <div className="h-[420px] w-px shrink-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(245,210,122,.5),transparent)' }} aria-hidden="true" />
        <div className="w-[500px] shrink-0">
          {online ? <AccountPanel onDone={onDone} /> : <LocalPanel onDone={onDone} />}
        </div>
      </div>
    </div>
  );
}
