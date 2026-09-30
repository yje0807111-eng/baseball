import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { ChoiceOverlay, KEYFRAMES, AUGMENTS } from '../../src/KboAugmentDraft.jsx';

/* 게임 증강 선택 창 그대로 — ?ids=muscle,allOutPitch,infieldWall 로 카드 셋 고르기 */
const ids = (new URLSearchParams(location.search).get('ids') || 'muscle,allOutPitch,infieldWall').split(',');
/* ?lv=muscle:2,centerLine:5 — 강화 레벨 흉내 */
const lvs = Object.fromEntries((new URLSearchParams(location.search).get('lv') || '').split(',').filter(Boolean).map((x) => x.split(':')).map(([k, v]) => [k, Number(v)]));
const options = ids.map((id) => AUGMENTS.find((a) => a.id === id)).filter(Boolean).map((a) => ({ ...a, lv: lvs[a.id] || 0 }));
createRoot(document.getElementById('root')).render(
  <>
    <style>{KEYFRAMES}</style>
    <ChoiceOverlay choice={{ kind: 'augment', options, free: 1 }} onChoose={() => {}} total={1} picksLeft={1} rerolls={2} onReroll={() => {}} />
  </>,
);
