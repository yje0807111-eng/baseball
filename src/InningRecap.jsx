/*
 * 이닝 정리 — 한 이닝(초·말)이 끝나면 화면 전체가 넘어간다.
 * 왼쪽은 우리 공격(말) · 오른쪽은 상대 공격(초) · 가운데는 이닝별 흐름.
 * 기본 방침이 미리 골라져 있고 초읽기가 끝나면 그대로 진행한다 — 누르고 싶을 때만 누른다.
 * 목업: mockups/half-inning.html
 */
import React, { useEffect, useRef, useState } from 'react';

/** 다음 이닝 기조 — 반이닝마다 따로 묻지 않고 이닝 단위로 하나만 고른다 */
export const PLANS = [
  { key: 'balanced', name: '균형', desc: '기본 — 맡긴다' },
  { key: 'aggressive', name: '공격적으로', desc: '작전 · 대타 아끼지 않기' },
  { key: 'protect', name: '지키기', desc: '불펜 · 전진 수비' },
];

const MY = '#34d399';
const OPP = '#f87171';
const SIL = 'url(ui/mt/silhouette-player.webp)';
/** 카드 → 프로필 → 실루엣 순으로 (아트가 없는 선수도 자리가 비지 않게) */
const art = (id) => (id ? `url(cards/${encodeURIComponent(id)}.webp), url(profiles/${encodeURIComponent(id)}.webp), ${SIL}` : SIL);

/** 한쪽 반이닝: 머리(회차 · 득점) → 주인공 → 사건 목록 */
function Side({ side, half, team, runs, hero, events, batters }) {
  const mine = side === 'my';
  const acc = hero?.side === 'opp' ? OPP : MY;
  return (
    <div className={`ir-col${mine ? '' : ' r'}`}>
      <div className="ir-hh">
        <span className={`ir-g${runs ? '' : ' zero'}`} style={{ '--g': mine ? '#fde047' : OPP }}>
          {runs ? `+${runs}` : '무득점'}
        </span>
        <span className="ir-t">{half}<span>{team} 공격</span></span>
      </div>

      {hero ? (
        <div className="ir-who" style={{ '--a': acc }}>
          <div className="ir-port" style={{ backgroundImage: art(hero.id) }} />
          <div>
            <div className="ir-nm">{hero.name}</div>
            <div className="ir-ps">{hero.pos}</div>
            <div className="ir-ac">{hero.act}</div>
            {hero.sub && <div className="ir-sb">{hero.sub}</div>}
          </div>
        </div>
      ) : <div className="ir-who" />}

      <div className="ir-blk mt-cut mt-frame mt-glass" style={{ '--a': acc, '--c': '14px' }}>
        <p className="mt-lab" style={{ '--a': acc }}>{half}<em>타자 {batters}명</em></p>
        {events.length ? events.map((e, i) => (
          <div key={i} className="ir-line" style={{ '--e': e.hot ? '#fde047' : '#9ca3af' }}>
            <div><b>{e.name}</b> <span>{e.text}</span></div>
            <em>{e.rt || '·'}</em>
          </div>
        )) : (
          <div className="ir-quiet"><b>조용한 이닝</b><span>삼자범퇴</span></div>
        )}
      </div>
    </div>
  );
}

/** 이닝별 양방향 막대 — 왼쪽 우리 · 오른쪽 상대, 이번 이닝만 빛난다 */
function Flow({ home, away, now }) {
  const cell = (n, side, hot) => Array.from({ length: n }, (_, i) => {
    const c = side === 'me' ? (hot ? '#fde047' : MY) : OPP;
    return <i key={i} style={{ background: c, boxShadow: hot ? `0 0 14px ${c}` : 'none' }} />;
  });
  return (
    <div className="ir-flow">
      <div className="hd"><span className="l">나의 드림팀</span><span /><span className="rr">AI 올스타</span></div>
      {Array.from({ length: 9 }, (_, i) => {
        const n = i + 1;
        const future = n > now;
        return (
          <div key={n} className={`r${n === now ? ' n' : ''}${future ? ' fu' : ''}`}>
            <div className="l">{cell(Number(home[i]) || 0, 'me', n === now)}</div>
            <span>{n}</span>
            <div className="rr">{cell(Number(away[i]) || 0, 'op', n === now)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function InningRecap({ inning, mine, theirs, board, score, final, secs = 5, onPick }) {
  const [plan, setPlan] = useState('balanced');
  const [left, setLeft] = useState(secs);
  const doneRef = useRef(false);
  const planRef = useRef('balanced');
  planRef.current = plan;

  const finish = (k) => { if (doneRef.current) return; doneRef.current = true; onPick?.(k ?? planRef.current); };

  // 초읽기: 끝나면 골라 둔 방침 그대로 진행. 경기가 끝난 화면은 직접 눌러야 넘어간다
  useEffect(() => {
    if (final) return undefined;
    const t = setInterval(() => setLeft((v) => {
      if (v <= 1) { clearInterval(t); finish(); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [final]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ir-wrap">
      <IrStyle />
      <div className="ir-bg" />
      <div className="ir-vig" />
      <div className="ir-lay">
        <div className="ir-top">
          <div className="grp"><span>INNING RECAP</span><b>이닝 정리</b></div>
          <div className="grp"><span>INNING</span><b className="a">{final ? '경기 종료' : `${inning}회 종료`}</b></div>
          <div className="prog">
            <div className="pl"><span>경기 진행</span><span>{inning} / 9 이닝</span></div>
            <div className="seg">{Array.from({ length: 9 }, (_, i) => (
              <i key={i} className={i + 1 < inning ? 'on' : i + 1 === inning ? 'now' : ''} />
            ))}</div>
          </div>
          <div className="ir-tot">
            <span className="t">AI 올스타</span>
            <span className="v">{score.away}<span className="x">:</span>{score.home}</span>
            <span className="t me">나의 드림팀</span>
          </div>
        </div>

        <div className="ir-mid">
          <Side side="my" half={`${inning}회말`} team="나의 드림팀" {...mine} />
          <div className="ir-center mt-cut mt-frame mt-glass mt-scan" style={{ '--a': '#fb923c', '--c': '18px' }}>
            <span className="ir-wm">{inning}TH</span>
            <p className="ir-inn">{final ? <>경기 <em>종료</em></> : <>{inning}<em>회 종료</em></>}</p>
            <span className="ir-sd">
              {final ? final.text : `이 이닝 ${score.away} : ${score.home}`}
            </span>
            <Flow home={board.home} away={board.away} now={inning} />
            {final ? (
              <div className="ir-fin"><b>{final.head}</b><span>결과 화면으로</span></div>
            ) : (
              <div className="ir-tally">
                <div className="s me"><b className={mine.runs ? '' : 'z'}>{mine.runs ? `+${mine.runs}` : '0'}</b>
                  <span>우리 {mine.runs ? '득점' : '무득점'}</span></div>
                <span className="vs">이 이닝</span>
                <div className="s op"><b className={theirs.runs ? '' : 'z'}>{theirs.runs ? `+${theirs.runs}` : '0'}</b>
                  <span>상대 {theirs.runs ? '득점' : '무득점'}</span></div>
              </div>
            )}
          </div>
          <Side side="opp" half={`${inning}회초`} team="AI 올스타" {...theirs} />
        </div>

        <div className="ir-foot">
          {final ? (
            <div className="hd" style={{ justifyContent: 'center' }}>
              <p className="mt-lab" style={{ '--a': '#fde047' }}>Final</p>
              <p className="ir-fp"><b>{final.head}</b></p>
              <button type="button" className="mt-btn pri" style={{ '--a': '#10b981', minHeight: 52, padding: '0 30px' }}
                onClick={() => finish('balanced')}>결과 보기 ▶</button>
            </div>
          ) : (
            <>
              <div className="hd">
                <p className="mt-lab" style={{ '--a': '#34d399' }}>Next</p>
                <p className="ir-np"><b>{inning + 1}회</b> — 다음 이닝 기조 고르기</p>
              </div>
              <div className="ir-opts">
                {PLANS.map((p) => (
                  <button key={p.key} type="button" className={`ir-btn${plan === p.key ? ' pri' : ''}`}
                    onClick={() => { setPlan(p.key); finish(p.key); }}
                    onMouseEnter={() => setPlan(p.key)}>
                    {p.name}<small>{p.desc}</small>
                  </button>
                ))}
                <div className="ir-ring">
                  <svg width="58" height="58">
                    <circle className="b1" cx="29" cy="29" r="24" />
                    <circle className="b2" cx="29" cy="29" r="24" strokeDasharray="151"
                      strokeDashoffset={151 * (1 - left / secs)} />
                  </svg>
                  <b>{left}</b>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const IrStyle = () => (
  <style>{`
  .ir-wrap { position:fixed; inset:0; z-index:60; overflow:hidden; background:#05080f; font-size:16px;
             font-family:'IBM Plex Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;
             animation:irIn .28s ease-out both; }
  @keyframes irIn { from { opacity:0; transform:scale(.99) } }
  .ir-bg { position:absolute; inset:0; background:url(ui/broadcast-field.webp) center/cover; opacity:.26; }
  .ir-vig { position:absolute; inset:0; pointer-events:none;
            background:radial-gradient(128% 92% at 50% 40%,rgba(3,5,10,.42),rgba(3,5,10,.97) 78%),
                       repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 3px); }
  .ir-lay { position:relative; z-index:2; height:100%; display:grid; grid-template-rows:auto 1fr auto; }

  .ir-top { display:flex; align-items:center; gap:clamp(16px,2.4vw,34px); padding:0 clamp(18px,2.6vw,44px); height:clamp(58px,8vh,78px);
            border-bottom:1px solid rgba(255,255,255,.1); background:linear-gradient(180deg,rgba(3,5,10,.94),rgba(3,5,10,.4)); }
  .ir-top .grp { display:flex; flex-direction:column; gap:3px; }
  .ir-top .grp span { font:700 10px 'Saira Condensed'; letter-spacing:.34em; color:#4b5563; }
  .ir-top .grp b { font-size:clamp(14px,1.2vw,19px); font-weight:700; color:#fff; line-height:1; }
  .ir-top .grp b.a { color:#fb923c; }
  .ir-top .prog { flex:1; max-width:420px; }
  .ir-top .prog .pl { display:flex; justify-content:space-between; font-size:11px; color:#4b5563; margin-bottom:6px; }
  .ir-top .seg { display:grid; grid-auto-flow:column; gap:3px; height:9px; }
  .ir-top .seg i { background:rgba(255,255,255,.08); transform:skewX(-24deg); }
  .ir-top .seg i.on { background:#34d399; box-shadow:0 0 8px #34d399; }
  .ir-top .seg i.now { background:#fde047; box-shadow:0 0 12px #fde047; }
  .ir-tot { margin-left:auto; display:flex; align-items:center; gap:13px; }
  .ir-tot .t { font-size:14px; font-weight:600; color:#6b7280; } .ir-tot .t.me { color:#34d399; }
  .ir-tot .v { font:800 clamp(20px,2vw,29px)/1 'Saira Condensed'; color:#fff; } .ir-tot .v .x { color:#374151; margin:0 8px; }

  .ir-mid { display:grid; grid-template-columns:1fr minmax(360px,620px) 1fr; gap:clamp(12px,1.6vw,26px);
            padding:clamp(12px,1.8vw,24px) clamp(18px,2.6vw,44px); min-height:0; }
  .ir-col { display:flex; flex-direction:column; gap:clamp(8px,1vw,14px); min-width:0; min-height:0; }
  .ir-col.r { align-items:flex-end; text-align:right; }
  .ir-col > .ir-blk { flex:1; min-height:0; overflow:hidden; }

  .ir-hh { display:flex; align-items:center; gap:14px; width:100%; }
  .ir-col.r .ir-hh { flex-direction:row-reverse; }
  .ir-hh .ir-t { margin-right:auto; font-size:clamp(15px,1.2vw,19px); font-weight:700; color:#fff; }
  .ir-col.r .ir-hh .ir-t { margin-right:0; margin-left:auto; }
  .ir-hh .ir-t span { font-size:13px; font-weight:500; color:#9ca3af; margin-left:8px; }
  .ir-hh .ir-g { font:800 clamp(28px,3vw,44px)/1 'Saira Condensed'; color:var(--g); }
  .ir-hh .ir-g.zero { font-size:clamp(14px,1.2vw,19px); color:#4b5563; letter-spacing:.14em; }

  .ir-who { display:flex; align-items:center; gap:clamp(10px,1.2vw,16px); width:100%; min-height:0; }
  .ir-col.r .ir-who { flex-direction:row-reverse; }
  .ir-port { flex:none; width:clamp(84px,8vw,132px); aspect-ratio:3/4; background:#0b1220 center 6%/cover;
             box-shadow:inset 0 0 0 2px var(--a), 0 0 60px -20px var(--a);
             clip-path:polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px); }
  .ir-nm { font-size:clamp(20px,2.1vw,31px); font-weight:700; color:#fff; line-height:1.08; }
  .ir-ps { font-size:12.5px; color:#9ca3af; margin-top:3px; }
  .ir-ac { margin-top:8px; font-size:clamp(14px,1.4vw,20px); font-weight:700; color:var(--a); }
  .ir-sb { margin-top:5px; font-size:12px; color:#6b7280; }

  .ir-blk { padding:clamp(10px,1.1vw,15px) clamp(12px,1.3vw,18px); width:100%; }
  .ir-blk .mt-lab { margin:0 0 10px; }
  .ir-blk .mt-lab em { font-style:normal; letter-spacing:0; text-transform:none; font-size:13px; color:#9ca3af; margin-left:6px; }
  .ir-line { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:7px 0;
             border-top:1px solid rgba(255,255,255,.06); font-size:clamp(12px,1vw,14px); }
  .ir-col.r .ir-line { flex-direction:row-reverse; }
  .ir-line:first-of-type { border-top:0; }
  .ir-line b { color:#e5e7eb; font-weight:600; } .ir-line span { color:#8b95a5; font-size:.94em; }
  .ir-line em { font-style:normal; font:800 17px 'Saira Condensed'; color:var(--e); }
  .ir-quiet { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px; padding:22px 0; }
  .ir-quiet b { font-size:20px; font-weight:700; color:#6b7280; } .ir-quiet span { font-size:13px; color:#4b5563; }

  .ir-center { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:space-evenly;
               gap:clamp(8px,1vw,16px); padding:clamp(14px,1.8vw,26px) clamp(16px,2vw,32px); min-height:0; overflow:hidden; }
  .ir-wm { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:-1;
           font:800 clamp(160px,22vw,330px)/1 'Saira Condensed'; color:transparent;
           -webkit-text-stroke:2px rgba(251,146,60,.13); pointer-events:none; user-select:none; }
  .ir-inn { margin:0; font-size:clamp(42px,6vw,96px); font-weight:700; color:#fff; letter-spacing:-.05em; line-height:.9; text-align:center; }
  .ir-inn em { font-style:normal; font-size:.56em; color:#fb923c; margin-left:8px; }
  .ir-sd { font-size:clamp(12px,1.1vw,15px); color:#9ca3af; }

  .ir-flow { width:100%; display:grid; gap:5px; }
  .ir-flow .hd { display:grid; grid-template-columns:1fr 46px 1fr; align-items:baseline; gap:10px;
                 font:700 10px 'Saira Condensed'; letter-spacing:.26em; color:#4b5563; margin-bottom:3px; }
  .ir-flow .hd .l { text-align:right; color:#34d399; } .ir-flow .hd .rr { color:#f87171; }
  .ir-flow .r { display:grid; grid-template-columns:1fr 46px 1fr; align-items:center; gap:10px; }
  .ir-flow .r .l { display:flex; justify-content:flex-end; gap:4px; } .ir-flow .r .rr { display:flex; gap:4px; }
  .ir-flow .r i { display:block; height:clamp(11px,1.5vh,16px); width:clamp(16px,1.6vw,24px); }
  .ir-flow .r span { font:800 13px 'Saira Condensed'; color:#4b5563; text-align:center; }
  .ir-flow .r.fu span { color:#334155; }
  .ir-flow .r.n span { color:#fde047; font-size:16px; }
  .ir-flow .r.n { background:rgba(253,224,71,.07); box-shadow:inset 0 0 0 1px rgba(253,224,71,.28); padding:2px 0;
                  clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px); }

  .ir-tally { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:18px; width:100%; }
  .ir-tally .s { text-align:center; }
  .ir-tally .s b { display:block; font:800 clamp(34px,4vw,62px)/1 'Saira Condensed'; }
  .ir-tally .s.me b { color:#34d399; } .ir-tally .s.op b { color:#f87171; }
  .ir-tally .s b.z { color:#374151; font-size:clamp(24px,2.6vw,40px); }
  .ir-tally .s span { display:block; margin-top:6px; font:700 10px 'Saira Condensed'; letter-spacing:.24em; color:#6b7280; }
  .ir-tally .vs { font:800 15px 'Saira Condensed'; color:#374151; letter-spacing:.2em; }
  .ir-fin { text-align:center; } .ir-fin b { display:block; font-size:clamp(20px,2.2vw,30px); font-weight:700; color:#fff; }
  .ir-fin span { display:block; margin-top:7px; font-size:13px; color:#9ca3af; }

  .ir-foot { display:flex; flex-direction:column; justify-content:center; gap:11px;
             padding:clamp(10px,1.4vw,18px) clamp(18px,2.6vw,44px); min-height:clamp(96px,16vh,150px);
             border-top:1px solid rgba(255,255,255,.1); background:linear-gradient(0deg,rgba(3,5,10,.95),rgba(3,5,10,.42)); }
  .ir-foot .hd { display:flex; align-items:center; gap:15px; }
  .ir-foot .hd .mt-lab { margin:0; }
  .ir-np, .ir-fp { margin:0; font-size:clamp(14px,1.2vw,17px); color:#9ca3af; } .ir-np b, .ir-fp b { color:#fff; }
  .ir-opts { display:flex; gap:10px; }
  .ir-btn { --c:10px; flex:1; display:flex; flex-direction:column; justify-content:center; text-align:left;
            min-height:clamp(46px,7vh,58px); padding:8px clamp(12px,1.4vw,22px);
            font-size:clamp(14px,1.3vw,19px); font-weight:700; color:#e8ecf2; background:rgba(255,255,255,.055);
            box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); cursor:pointer; transition:background .14s, box-shadow .14s;
            clip-path:polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
  .ir-btn:hover { background:rgba(255,255,255,.1); }
  .ir-btn.pri { background:#10b981; color:#04070d; box-shadow:none; }
  .ir-btn small { font-size:clamp(10px,.9vw,12.5px); font-weight:500; color:#8b95a5; margin-top:3px; }
  .ir-btn.pri small { color:rgba(4,7,13,.66); }
  .ir-ring { position:relative; display:grid; place-items:center; width:58px; flex:none; }
  .ir-ring svg { transform:rotate(-90deg); } .ir-ring circle { fill:none; stroke-width:4; }
  .ir-ring .b1 { stroke:rgba(255,255,255,.12); }
  .ir-ring .b2 { stroke:#10b981; stroke-linecap:round; transition:stroke-dashoffset 1s linear; }
  .ir-ring b { position:absolute; font:800 19px 'Saira Condensed'; color:#fff; }
  `}</style>
);
