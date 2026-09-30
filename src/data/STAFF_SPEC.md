# 감독·코치 데이터 규칙

내 라커(본 게임)의 코치진 네 자리 — 감독 · 수석코치 · 타격코치 · 수비·투수코치 — 에 선임할 후보.
데이터는 `src/data/staff/managers.json`(감독)과 `src/data/staff/coaches.json`(코치 셋)에 두고, `src/myteam/staff.js`가 읽는다.
**CP 는 데이터에 적지 않는다** — 효과가 올리는 승률로 `staff.js`가 매긴다(1%p ≈ 4 CP, 최소 15). 값 표: `npx vite-node scripts/staff-table.mjs`

## 감독

```json
{ "id": "mg-kimeungyong", "name": "김응용", "role": "manager", "era": "1983-2004",
  "style": "attack", "grade": 3, "clubs": ["kia", "samsung"],
  "note": "한국시리즈 10회 우승", "source": "해태 1983~2000·삼성 2001~2004 감독, KS 우승 10회 — namu" }
```

| 필드 | 설명 |
|---|---|
| `style` | 야구 색깔 하나 — `staff.js` `STYLES` 의 키. 효과(과 대가)는 색깔이 정한다 |
| `grade` | 1~3. + 효과 ×1 · ×1.15 · ×1.3 (대가는 그대로). KS 우승 3회↑ 3 · 1~2회 2 · 그 밖의 뚜렷한 성과 1 |
| `clubs` | 감독을 맡은 구단 키(`kia` `samsung` `lotte` `lg` `doosan` `hanwha` `sk` `hyundai` `kiwoom` `nc` `kt`). 옛 이름은 같은 키(해태 → kia, MBC → lg, OB → doosan, 빙그레 → hanwha, 삼미·청보·태평양 → hyundai, 넥센·히어로즈 → kiwoom) |

색깔(`STYLES`): 공격 야구 · 지키는 야구 · 선발 야구 · 벌떼 불펜 · 투수 관리 · 믿음의 야구 · 육성 · 외국인 활용 · 뛰는 야구.
그 감독의 알려진 야구 색깔로 고른다(예: 벌떼 불펜 → 김성근, 뛰는 야구 → 염경엽 · 김경문).

**구단 궁합**: 엔트리에 감독 `clubs` 선수가 6명 이상이면 + 효과 ×1.5.

## 코치

```json
{ "id": "bc-kimmugwan", "name": "김무관", "role": "batting", "era": "…",
  "rules": [{ "who": "L", "stat": "contact", "v": 8 }, { "who": "L", "stat": "power", "v": 5 }],
  "note": "…", "source": "…" }
```

`rules` 한 줄 = `{ who, stat, v }` 또는 팀 운영 `{ team, v }`.

| `who` | 뜻 | | `stat` | | `team` | 뜻 |
|---|---|---|---|---|---|---|
| `batter` · `pitcher` | 타자 · 투수 전원 | | `contact` 컨택 | | `steal` | 도루 성공 확률 + (0.01 = 1%p) |
| `SP` · `RP` | 선발 · 불펜 | | `power` 파워 | | `rest` | 투수 휴식 경기 수 − |
| `C` · `IF` · `OF` | 포수 · 내야 · 외야 | | `speed` 주루 | | `calm` | 나쁜 날 흔들림 비율 − (좋은 날은 그 절반만) |
| `L` · `R` | 좌타 · 우타 | | `defense` 수비 | | | |
| `slugger` · `hitter` | 파워 90↑ · 컨택 90↑ | | `stuff` 구위 · `control` 제구 | | | |
| `foreign` · `cheap` | 외국인 · 80 CP 이하 | | `stamina` 체력(1 = 1구) | | | |

역할에 맞게: 타격코치 → 타자 조건(좌타 · 장타자 · 교타자 …), 투수코치 → 선발 · 불펜 구위 · 제구 · 체력, 수비코치 → 포지션 수비, 수석 → 두세 갈래.

## 강화

레벨마다 + 효과 ×(1 + 0.2 × (Lv − 1)), Lv.5 = ×1.8. 대가 · 휴식 · 흔들림은 커지지 않는다.
교체 · 해임하면 레벨 · 계약서는 사라진다(화면이 먼저 묻는다).

## 조사 원칙

- WebSearch / WebFetch 로 **KBO 1군에서 그 역할을 맡은 구단·연도**를 직접 확인한다 (namu.wiki, 위키백과, 구단 발표 기사).
- 확인이 안 되는 사람은 넣지 않는다. 역할이 섞였던 사람은 가장 대표적인 역할 하나로.
- 같은 사람은 한 역할로 한 번만 (감독과 코치 모두 했다면 감독 목록에만 넣는다).
- **id 는 절대 바꾸지 않는다** (사용자 저장 데이터가 id로 기억함).
