/* 화면 맞춤 — 어느 화면에서든 데스크톱 배치를 그대로 본다 (노트북 · 태블릿 · 휴대폰 가로).
 *
 * 이 게임의 배치는 넓은 화면을 전제로 짜여 있다 (좌 17rem · 우 24rem 3단, h-dvh 한 화면).
 * 좁거나 납작한 화면에 그대로 그리면 글자가 줄바꿈되고 아래가 잘린다.
 * 그래서 화면이 최소치(FIT_W × FIT_H)보다 작으면 "배치는 최소치대로 크게 잡고,
 * 그려진 결과를 화면 크기에 맞춰 줄여" 보여준다. 비율은 기기 화면 그대로라 여백이 안 생긴다.
 *
 *   1순위 — <meta name="viewport"> 의 width 를 키운다. 축소는 브라우저가 알아서 하고
 *           미디어 쿼리(lg:)·vh 단위까지 넓은 화면 기준으로 맞아떨어진다.
 *           휴대폰 · 태블릿 브라우저만 이 값을 본다.
 *   2순위 — meta viewport 를 보지 않는 곳(데스크톱 브라우저 · iframe 안)에서는 CSS zoom 으로 줄인다.
 *           맥북처럼 가로 1700 이 안 되는 노트북이 여기에 걸린다 — 손으로 브라우저를 축소하지 않아도 된다.
 *
 * 너무 작다 싶으면 아래 두 값만 바꾸면 된다. 키우면 더 많이 보이고 글씨는 작아진다. */
/* 배치가 깨지지 않는 최소 폭 — 라커가 정한다(윗줄 바 + 선수 줄).
   좁아져도 글자를 쪼개지 않게 고친 뒤 재서 1440: 윗줄 바가 1440 에 꼭 맞고 1366 은 27px 모자란다.
   맥북(1440 · 1470 · 1512 · 1728)은 모두 줄이지 않고 그대로 나온다 */
const FIT_W = 1440;
/* 한 화면 배치가 잘리지 않는 최소 높이 — 화면마다 안에서 구르게 되어 있어 폭보다 너그럽다.
   맥북 창 높이(774 ~ 991)에서 화면 밖으로 나가는 칸이 없음을 재서 확인했다 */
const FIT_H = 740;

const BASE = 'width=device-width, initial-scale=1';

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
        // meta 를 본 곳이면 브라우저가 알아서 줄여 준다. 보지 않은 곳(데스크톱 · iframe)만 zoom 으로 줄인다
        const took = Math.abs(document.documentElement.clientWidth - stage.w) <= 2;
        if (took) unzoom(root);
        else zoom(root, stage, view);
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
