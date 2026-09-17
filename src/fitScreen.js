/* 화면 맞춤 — 태블릿·휴대폰 가로에서도 데스크톱 배치를 그대로 본다.
 *
 * 이 게임의 배치는 넓은 화면을 전제로 짜여 있다 (좌 17rem · 우 24rem 3단, h-dvh 한 화면).
 * 태블릿은 폭도 좁고 무엇보다 세로가 납작해서, 같은 배치를 그대로 그리면 잘린다.
 * 그래서 화면이 최소치(FIT_W × FIT_H)보다 작으면 "배치는 최소치대로 크게 잡고,
 * 그려진 결과를 화면 크기에 맞춰 줄여" 보여준다. 비율은 기기 화면 그대로라 여백이 안 생긴다.
 *
 *   1순위 — <meta name="viewport"> 의 width 를 키운다. 축소는 브라우저가 알아서 하고
 *           미디어 쿼리(lg:)·vh 단위까지 넓은 화면 기준으로 맞아떨어진다.
 *   2순위 — iframe 안처럼 meta viewport 가 무시되는 곳에서는 CSS zoom 으로 줄인다.
 *           터치 기기에서만 쓴다 — 데스크톱 작은 창은 지금까지 하던 대로 둔다.
 *
 * 너무 작다 싶으면 아래 두 값만 바꾸면 된다. 키우면 더 많이 보이고 글씨는 작아진다. */
const FIT_W = 1440; // 3단 배치가 답답하지 않은 최소 폭
const FIT_H = 860;  // 한 화면 배치가 잘리지 않는 최소 높이

const BASE = 'width=device-width, initial-scale=1';
const COARSE = '(pointer: coarse)';

/* 기기 화면 비율은 그대로 두고, 가로·세로 모두 최소치를 넘기는 배치 크기 */
function stageOf(w, h) {
  if (!w || !h) return null;
  if (w >= FIT_W && h >= FIT_H) return null; // 충분히 크면 손대지 않는다
  const sw = Math.round(Math.max(FIT_W, FIT_H * (w / h)));
  return { w: sw, h: Math.round((sw * h) / w) };
}

function zoom(root, stage, viewW) {
  root.style.setProperty('--fit-h', `${stage.h}px`);
  root.style.width = `${stage.w}px`;
  root.style.minHeight = `${stage.h}px`;
  root.style.zoom = String(viewW / stage.w);
  root.classList.add('fit-zoom');
}

function unzoom(root) {
  root.classList.remove('fit-zoom');
  root.style.removeProperty('--fit-h');
  root.style.width = '';
  root.style.minHeight = '';
  root.style.zoom = '';
}

export default function fitScreen() {
  const meta = document.querySelector('meta[name="viewport"]');
  const root = document.getElementById('root');
  if (!meta || !root || !window.matchMedia) return;

  let busy = false;   // 아래에서 meta 를 건드려 생긴 resize 인지 (그건 무시한다)
  let width = null;   // 맞춘 뒤의 innerWidth — 이 값 그대로면 진짜 변화가 아니다
  let timer = 0;

  const frame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  const run = () => {
    busy = true;
    meta.content = BASE; // 실제 화면 크기를 재려면 먼저 원래 크기로 되돌린다
    frame(() => {
      const stage = stageOf(window.innerWidth, window.innerHeight);
      const view = window.innerWidth;
      if (!stage) { unzoom(root); busy = false; width = view; return; }
      meta.content = `width=${stage.w}`;
      frame(() => {
        // meta viewport 가 먹히지 않는 자리(iframe 등)인지 재서 확인한다
        const took = Math.abs(document.documentElement.clientWidth - stage.w) <= 2;
        if (!took && window.matchMedia(COARSE).matches) zoom(root, stage, view);
        else unzoom(root);
        width = window.innerWidth;
        setTimeout(() => { busy = false; }, 300);
      });
    });
  };

  const schedule = (delay) => { clearTimeout(timer); timer = setTimeout(run, delay); };

  window.addEventListener('resize', () => {
    if (busy) return;
    if (width !== null && Math.abs(window.innerWidth - width) <= 2) return; // 세로만 흔들린 것(주소창 등)
    schedule(120);
  });
  window.addEventListener('orientationchange', () => schedule(250));
  run();
}
