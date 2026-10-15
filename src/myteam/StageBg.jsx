/*
 * 경기 앞 무대 배경(mockups/stage-bg 2안) — 밤 구장을 흑백으로 깔고 왼쪽은 내 색 · 오른쪽은 상대 색으로 반반 물들임(중계 매치업 그래픽).
 * 구단 정복 '다음 상대' 무대 · 정비 화면이 같이 쓴다. 자리(absolute · fixed)는 부모가 정한다 — 이 조각은 inset-0 겹 셋만.
 * 색은 6자리 #rrggbb(뒤에 투명도 두 자리를 붙인다). bottom: 아래쪽을 얼마나 어둡게(막대 · 표가 놓이는 자리)
 */
import React from 'react';

/** 이 배경 위 판 — 배경이 비쳐 보이게 mt-glass 보다 조금 옅게 */
export const GLASS = 'linear-gradient(180deg,rgba(30,26,56,.6),rgba(10,9,22,.74))';

export default function StageBg({ me = '#e879f9', opp = '#60a5fa', bottom = 0.85 }) {
  return (
    <>
      <span className="pointer-events-none absolute inset-0 bg-cover" style={{ backgroundImage: 'url(ui/stadium.webp)', backgroundPosition: 'center 60%', filter: 'grayscale(1) brightness(.75)', opacity: 0.5 }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(100deg, ${me}52 0%, ${me}14 46%, ${opp}14 54%, ${opp}55 100%)`, mixBlendMode: 'color' }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(100deg, ${me}2e, transparent 45%, transparent 55%, ${opp}2e), linear-gradient(180deg, transparent 40%, rgba(5,8,15,${bottom}))` }} aria-hidden="true" />
    </>
  );
}
