/*
 * 유니폼 시기 — 구단마다 '새 홈 유니폼을 입기 시작한 해'로 나눈 구간. 그림은 시기마다 한 벌.
 *  art-alias.mjs(다른 시즌 그림 빌려 쓰기)와 art-plan.mjs(유니폼 기준 그림 고르기)가 같이 쓴다.
 *
 * 왜 시기마다 한 벌인가(2026-10-11): 예전엔 기준 그림을 시즌마다 따로 만들었다. 선수는 한 장만 그리고 앞뒤 시즌이 빌려 쓰는데,
 *  시즌마다 기준 그림이 달라 같은 로스터에 유니폼이 섞였다(구단 시즌 373개 중 287개). 884명을 다시 고치는 데 약 890 크레딧.
 */

/**
 * 구단 → 새 홈 유니폼을 입기 시작한 해. 이 해를 사이에 두고는 그림을 빌리지 않고, 기준 그림도 따로 쓴다.
 * 출처: 나무위키 각 구단 '/유니폼' 문서 (2026-09 확인). 홈 유니폼 기준, 원정 · 이벤트는 뺐다.
 * 등번호 광택 같은 눈에 안 띄는 변경은 넣지 않았고, 모자 · 가슴 마크처럼 카드에 보이는 변경은 넣었다.
 */
export const UNIFORM_BREAKS = {
  samsung: [1983, 1984, 1989, 1995, 2008, 2016, 2024],
  lotte: [1993, 2003, 2018, 2023],
  mbc: [1983, 1984, 1986],
  lg: [1994, 2002, 2006, 2008, 2017],
  binggrae: [1986],
  hanwha: [1999, 2003, 2007, 2015, 2025],
  ob: [1983, 1992], // 1992 — 빨간 OB BEARS → 금색 Bears(그림 기준, 2026-10-11 유니폼 통일 때 나눔)
  doosan: [2002, 2010, 2025],
  haitai: [1986, 1996],
  kia: [2010, 2012, 2017, 2021, 2023],
  sk: [2002, 2006, 2015, 2019],
  ssg: [2022, 2023, 2024],
  nc: [2012, 2016, 2019, 2022, 2025],
  kt: [2017, 2020, 2021, 2024],
  heroes: [2009],
  nexen: [2012, 2013, 2016, 2018],
  kiwoom: [2025],
  ssangbangwool: [1996],
};

/** 그 해가 그 구단의 몇 번째 유니폼 시기인가(0부터). 조사하지 못한 구단(현대 · 태평양 · 삼미 · 청보)은 통째로 한 시기 */
export const eraOf = (club, year) => (UNIFORM_BREAKS[club] || []).filter((b) => b <= year).length;

/*
 * 시기의 대표 기준 그림 시즌 — 2026-10-11 시즌마다 선수 그림과 기준 그림을 대조해 고른 것(mockups/art-uniform).
 *  그 시기 선수들이 이미 이 그림의 옷을 입고 있으니, 같은 시기 새 선수도 이 그림으로 그린다. 적지 않은 시기는 refYearOf 가 고른다
 */
export const ERA_REF = {
  lotte: [1982, 2002, 2004, 2026], samsung: [1984, 1991, 1995, 2009], lg: [1991, 1998, 2012, 2021], hanwha: [1996, 1999, 2004, 2013],
  doosan: [2002, 2026], kia: [2002, 2010, 2026], sk: [2000, 2007, 2019], nexen: [2010, 2014], hyundai: [2002], ob: [1987, 1995],
  haitai: [1983, 1986, 1997], binggrae: [1986], chungbo: [1987], sammi: [1985], mbc: [1984, 1987], taepyungyang: [1995], ssangbangwool: [1992, 1997],
};

/**
 * 그 구단 · 그 해 선수가 입을 기준 그림의 시즌.
 * @param seasons 그 구단의 시즌들 [{ year, cards(그린 카드 수), hasRef(기준 그림이 이미 있는가) }]
 * 정해 둔 대표(ERA_REF) → 같은 시기에서 기준 그림이 있고 카드가 가장 많은 시즌 → 그 시기의 첫 시즌(새 시기 — 여기서 한 장 만든다)
 */
export function refYearOf(club, year, seasons = []) {
  const e = eraOf(club, year);
  const fixed = (ERA_REF[club] || []).find((y) => eraOf(club, y) === e);
  if (fixed) return fixed;
  const same = seasons.filter((s) => eraOf(club, s.year) === e).sort((a, b) => a.year - b.year);
  const drawn = same.filter((s) => s.hasRef).sort((a, b) => b.cards - a.cards || a.year - b.year)[0];
  return drawn?.year ?? same[0]?.year ?? year;
}
