# 시즌 기록 자료

`src/data/series/*.json`(구단 시즌 시리즈)을 만드는 재료다. 게임이 읽는 파일이 아니라 만들 때만 쓴다.

| 파일 | 무엇 |
|---|---|
| `1982.txt` … `2026.txt` | KBO 기록실에서 받은 그해 팀별 타자·투수 기록 |
| `hands.json` | 이름 → `RL`(앞이 투구, 뒤가 타석) |
| `positions.json` | `'1999-OB' → { 김민호: 'SS' }` — 기록실이 '내야수'로만 주는 자리를 손으로 정한 것 |
| `foreign.json` | 외국인 선수 이름 |
| `dupes.json` | 같은 해 같은 이름의 다른 선수를 가르는 구분자 (`'2019-LT' → '윌슨(타자)'`) |
| `meta.json` | 시리즈 제목 아래 들어갈 `subtitle`·`blurb`·우승 여부 |

## 새 시즌 넣기

```bash
node scripts/kbo-fetch.mjs data/kbo 2027          # 기록 받기
node scripts/kbo-hands.mjs data/kbo 2027          # 좌우 모르는 선수 채우기(위키백과)
node scripts/series-from-records.mjs data/kbo 2027   # 시리즈 만들기
node scripts/validate-series.mjs                  # 규격 확인
node scripts/series-catalog.mjs                   # 목록 갱신
```

`meta.json`에 그 시즌 항목이 없으면 `subtitle`·`blurb`가 비어 검증이 걸린다. 먼저 채우고 만든다.
이미 있는 시리즈는 건드리지 않는다 — 다시 만들려면 그 파일을 지우거나 `--force`를 준다.

2000년까지는 기록실에 수비 기록이 없어 내야수 자리를 따로 채워야 한다.

```bash
node scripts/kbo-positions.mjs data/kbo 1999
```

위키백과에도 없는 선수는 이름이 남는다. 그건 `positions.json`에 손으로 적는다.
