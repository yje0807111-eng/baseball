/*
 * 나눠 받는 화면들 — React.lazy 대신 미리 받을 수 있는 틀.
 * lazy 는 이미 받아 둔 화면이라도 처음 그릴 때 한 번 멈춰(빈 화면) 모션 사이에 검은 판이 끼었다.
 * 여기서는 받은 모듈을 기억해 두고, 받은 뒤에는 멈추지 않고 바로 그린다.
 * 화면 이동(App setView)은 갈 화면을 먼저 받은 다음 모션을 시작한다 — 옛 화면이 그대로 있다가 넘어간다.
 */
import React, { use } from 'react';

function lazyNow(factory) {
  let p = null;
  const load = () => {
    if (!p) {
      p = factory();
      p.then((m) => { p.status = 'fulfilled'; p.value = m; }, (e) => { p.status = 'rejected'; p.reason = e; p = null; });
    }
    return p;
  };
  function Screen(props) {
    const D = use(load()).default;
    return <D {...props} />;
  }
  Screen.preload = load;
  return Screen;
}

export const GameApp = lazyNow(() => import('./GameApp.jsx'));
export const KboAugmentDraft = lazyNow(() => import('./KboAugmentDraft.jsx'));
export const LockerScreen = lazyNow(() => import('./myteam/LockerScreen.jsx'));
export const ShopScreen = lazyNow(() => import('./myteam/ShopScreen.jsx'));
export const RecordScreen = lazyNow(() => import('./myteam/RecordScreen.jsx'));
export const AugmentScreen = lazyNow(() => import('./myteam/AugmentScreen.jsx'));
export const BroadcastGame = lazyNow(() => import('./BroadcastGame.jsx'));
export const TournamentBracket = lazyNow(() => import('./myteam/TournamentBracket.jsx'));
export const RankedHub = lazyNow(() => import('./myteam/RankedHub.jsx'));
export const PrepScreen = lazyNow(() => import('./myteam/PrepScreen.jsx'));

/* 화면 이름 → 그 화면을 그리는 데 필요한 조각 */
const NEEDS = {
  modes: [KboAugmentDraft], locker: [LockerScreen], shop: [ShopScreen], record: [RecordScreen], augments: [AugmentScreen],
  bracket: [TournamentBracket], ranked: [RankedHub], prep: [PrepScreen], play: [BroadcastGame], result: [],
};

/** 갈 화면을 받아 둔다 — 이미 받았으면 바로 끝나는 약속 */
export const preloadView = (view) => (view === 'lobby' ? Promise.resolve() : Promise.all([GameApp.preload(), ...(NEEDS[view] || []).map((s) => s.preload())]));
