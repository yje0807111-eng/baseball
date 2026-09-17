# KBO 드림 드래프트

## 병렬 작업 (bb-1 · bb-2 · bb-3)

같은 저장소를 git worktree 셋으로 나눠 동시에 작업한다. **구역 제한은 없다** — 어느 폴더에서든 어느 파일·영역이든 고친다.

| 폴더 | 브랜치 | 미리보기 포트 |
|---|---|---|
| `Desktop/baseball` | `main` (합치는 곳) | 5173 |
| `Desktop/bb-1` | `work/1` | 5174 |
| `Desktop/bb-2` | `work/2` | 5175 |
| `Desktop/bb-3` | `work/3` | 5176 |

- **시작 전에** `git merge main` — 다른 작업이 들어온 main 위에서 시작한다.
- **작게 자주 커밋**한다. `src/KboAugmentDraft.jsx` 는 한 파일에 몰려 있어 같은 줄을 고치면 충돌한다.
- **끝나면 main에 합친다**: 작업 폴더에서 커밋 → `git merge main`(충돌은 여기서 푼다) → `npm run build` 통과 →
  `baseball` 폴더에서 `git merge work/N`.
- 충돌이 나면 **양쪽 의도를 다 살린다**. 한쪽을 통째로 버리지 말 것.
- `.claude/launch.json` 은 폴더마다 포트가 달라 `skip-worktree` 로 묶어 두었다 — ⛔ 커밋하지 말 것.
- `art-src/` 는 gitignore라 `baseball` 에만 있다 — 아트 스크립트는 `baseball` 에서 돌린다.

## 태블릿 작업 (tab/1 · tab/2 · tab/3)

태블릿(Claude Code 웹)에서는 세션마다 컨테이너가 따로 뜬다 — worktree 도 미리보기 포트도 없다.
**세션 하나 = 브랜치 하나**로 나눠 동시에 돌린다. 여기도 **구역 제한은 없다**.

| 세션 | 브랜치 |
|---|---|
| 태블릿 1 | `tab/1` |
| 태블릿 2 | `tab/2` |
| 태블릿 3 | `tab/3` |

- **시작 전에** `git fetch origin && git merge origin/main` — 최신 main 위에서 시작한다.
- **작게 자주 커밋**하고 `git push -u origin tab/N` 으로 바로 올린다. 컨테이너는 세션이 끝나면 사라지니
  **올리지 않은 작업은 날아간다**.
- **끝나면**: `git merge origin/main`(충돌은 여기서 푼다) → `npm run build` 통과 → push →
  GitHub에서 PR로 main에 합치거나, 데스크톱 `baseball` 폴더에서 `git fetch origin && git merge origin/tab/N`.
- 충돌이 나면 **양쪽 의도를 다 살린다**. 데스크톱 `work/N` 과 태블릿 `tab/N` 이 같은 줄을 건드릴 수 있다.
- 미리보기 포트가 없으니 확인은 `npm run build` 로 한다.
