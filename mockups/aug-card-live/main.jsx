import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { ChoiceOverlay, KEYFRAMES, AUGMENTS } from '../../src/KboAugmentDraft.jsx';

/* 게임 증강 선택 창 그대로 — ?ids=muscle,allOutPitch,infieldWall 로 카드 셋 고르기 */
const q = new URLSearchParams(location.search);
const ids = (q.get('ids') || 'muscle,allOutPitch,infieldWall').split(',');
/* ?lv=muscle:2,centerLine:5 — 강화 레벨 흉내 */
const lvs = Object.fromEntries((q.get('lv') || '').split(',').filter(Boolean).map((x) => x.split(':')).map(([k, v]) => [k, Number(v)]));
const options = ids.map((id) => AUGMENTS.find((a) => a.id === id)).filter(Boolean).map((a) => ({ ...a, lv: lvs[a.id] || 0 }));
/* ?v= — 카드 아래 빈 칸 목업(mockups/empty-fill). 게임 CSS 위에 덮어쓰기만 */
const VARIANT = {
  short: '.aug-card { height: 27rem !important; }',
  art: '.aug-gold .aug-window { height: 284px !important; }',
  mid: '.aug-gold .aug-desc { margin-top: auto !important; margin-bottom: auto !important; }',
};
createRoot(document.getElementById('root')).render(
  <>
    <style>{KEYFRAMES}</style>
    {VARIANT[q.get('v')] && <style>{VARIANT[q.get('v')]}</style>}
    <ChoiceOverlay choice={{ kind: 'augment', options, used: [false, true, false] }} onChoose={() => {}} total={1} picksLeft={1} onReroll={() => {}} />
  </>,
);
