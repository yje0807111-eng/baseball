/* 메인 '내 팀 에이스' · 프로필 대표 선수(따로 고르지 않았을 때)가 같은 선수 */
import { useEffect, useState } from 'react';
import { artId } from '../data/artAlias.js';

/** 에이스 고르기 — 카드 그림이 있는 선수 가운데 종합이 가장 높은 선수(그림이 없으면 다음 선수) */
export function useAce(squad) {
  const [ace, setAce] = useState(null);
  useEffect(() => {
    let live = true;
    const sorted = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 12);
    const tryOne = (i) => {
      if (!live) return;
      if (i >= sorted.length) { setAce(sorted[0] ? { p: sorted[0], art: null } : null); return; }
      const src = `cards/${encodeURIComponent(artId(sorted[i].id))}.webp`;
      const im = new Image();
      im.onload = () => { if (live) setAce({ p: sorted[i], art: src }); };
      im.onerror = () => tryOne(i + 1);
      im.src = src;
    };
    tryOne(0);
    return () => { live = false; };
  }, [squad.map((p) => p.id).join()]);
  return ace;
}
