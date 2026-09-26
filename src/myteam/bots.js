/*
 * 감독 봇 — 랭크전 빈자리를 채우는 '다른 감독이 짠 것 같은' 26인 팀.
 * 시리즈 팀(한 구단 시즌 그대로)과 달리 여러 시대 선수를 캡 안에서 섞는다. 시즌에는 { cap, seed } 만 담고
 * 경기 때 같은 값으로 다시 만든다 — 같은 cap · seed 면 늘 같은 팀.
 */
import { buildAiTeam, buildMyTeam } from './match.js';
import { seeded } from '../engine/rng.js';

const CITY = ['서울', '부산', '대구', '광주', '대전', '인천', '수원', '창원', '울산', '전주', '청주', '제주', '포항', '춘천'];
const NICK = ['썬더', '스톰', '타이탄스', '피닉스', '울브스', '호크스', '샤크스', '드래곤즈', '레인저스', '파이어', '나이츠', '블레이즈'];

/** 봇 팀 이름 — seed 로 정해진다 */
export function botName(seed) {
  const r = seeded(seed ^ 0x5bd1e995);
  return `${CITY[Math.floor(r() * CITY.length)]} ${NICK[Math.floor(r() * NICK.length)]}`;
}

/** { cap, seed } → 경기 팀 */
export function botTeam({ cap, seed }) {
  const { roster } = buildAiTeam(cap, seeded(seed));
  return { ...buildMyTeam({ squad: roster, staff: {}, name: botName(seed) }), bot: true };
}
