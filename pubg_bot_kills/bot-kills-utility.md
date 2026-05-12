# PUBG 봇 킬 분리 유틸 (`bot_kills.ts`)

## 한 줄 요약

PUBG 매치 ID와 플랫폼을 인자로 받아, 매치에 참여한 **실제 플레이어**별로 `총 킬 / 봇 킬 / 실제 플레이어 킬 / 데미지 / 순위`를 계산해 반환하는 유틸.

```ts
import { analyzeMatch, type AnalyzeResult } from "./bot_kills";
const result = await analyzeMatch(matchId, "steam");
// result.status: "ok" | "telemetry_missing" | "telemetry_failed"
//              | "match_failed" | "invalid_args" | "unknown_error"
// result.rows : PlayerRow[]
// result.error: unknown (있을 수 있음, 디버깅용)
```

> **실패 처리 정책 (예외 던지지 않음):** 호출은 어떤 상황에서도 throw하지 않습니다.
> 대신 반환값의 `status`로 성공/실패 종류를 알려줍니다. 호출부에서 `try/catch` 불필요.
>
> 자세한 정책 매트릭스와 retry 가이드는 아래 "실패 처리 및 Fallback" 섹션 참조.

---

## 작성 배경

PUBG 매치 응답의 `stats.kills`는 **봇 킬과 실제 플레이어 킬을 구분하지 않습니다.** 봇 비중이 큰 매치(특히 카쥬얼 모드, 저티어 노멀)에서는 stats만으론 플레이어 실력을 가늠하기 어려워, 봇 킬을 분리하는 보정 로직이 필요했습니다.

---

## 핵심 알고리즘

### 1. 봇/실제 플레이어 식별
- PUBG는 모든 참여자에게 `accountId`를 부여
  - **봇**: `ai.` 접두사 (예: `ai.7b3c...`)
  - **실제 플레이어**: `account.` 접두사 (예: `account.b44c...`)

### 2. 매치 메타 조회
- 엔드포인트: `GET https://api.pubg.com/shards/{platform}/matches/{matchId}`
- **인증 불필요** (공개 엔드포인트)
- 응답의 `included[]`에서:
  - `type: "participant"` → 각 플레이어의 stats (kills, damageDealt, winPlace 등)
  - `type: "asset"` → 텔레메트리 JSON URL

### 3. 텔레메트리 파싱
- 매치당 ~20~50MB, 수만 개의 이벤트
- 봇 킬 카운팅에 필요한 이벤트: **`LogPlayerKillV2`**
  - `event.killer.accountId` — 누가 죽였는지
  - `event.victim.accountId` — 누가 죽었는지

### 4. 봇 킬 집계 로직
```
LogPlayerKillV2 이벤트 중
  victim.accountId.startsWith("ai.")     ← 봇이 죽은 이벤트
  AND killer.accountId.startsWith("account.")  ← 실제 플레이어가 죽인 경우
인 것만 필터 → killer.accountId 로 group by → count
= 플레이어별 봇 킬 수
```

### 5. 최종 계산
- `RealKills = stats.kills - 봇 킬 카운트` (단순 뺄셈, 정확함)
- `Damage = stats.damageDealt` (그대로 사용, 분리하지 않음 — 사유는 아래 히스토리 참조)

---

## 반환 데이터 구조

```ts
interface PlayerRow {
  accountId: string;        // "account.xxxxx"
  name: string;             // 플레이어 닉네임
  total: number;            // stats.kills (전체 킬)
  bot: number;              // 텔레메트리로 계산한 봇 킬
  real: number;             // total - bot (실제 플레이어 킬)
  damage: number;           // stats.damageDealt
  rank: number | null;      // stats.winPlace (팀 순위)
}
```

정렬: `real desc → total desc → rank asc`

---

## ⚠️ 중요 히스토리: 데미지 분리는 왜 하지 않는가

초기에는 `BotDmg / RealDmg` 컬럼을 분리하려고 시도했지만, **여러 시행착오를 거쳐 "그냥 stats를 신뢰한다"로 결론** 났습니다. 아래는 그 과정과 이유입니다.

### 시도 1: 텔레메트리에서 직접 분리

```ts
// LogPlayerTakeDamage 이벤트로 봇/실제 데미지 분리
if (victim.accountId.startsWith("ai.")) botDmg += damage;
else realDmg += damage;
```

**문제 발견:** `botDmg + realDmg ≠ stats.damageDealt`

실제 데이터 예시 (매치 `37b3c86a-...` 기준):

| Player | stats.Damage | telemetry 합 | 차이 |
|---|---:|---:|---:|
| AW_JOJAES | 988 | 1000 | +12 |
| Defectio | 965 | 982 | +17 |
| bugouyongg | 511 | 524 | +13 |
| RyeonmL | 653 | 654 | +1 |

### 차이의 원인 (PUBG 텔레메트리 vs Match Stats)

1. **HP 캡 (가장 큰 원인)**
   - `stats.damageDealt` = 실제로 깎인 HP
   - `telemetry.damage` = 원본 데미지 (HP 캡 미적용)
   - 예: 30HP 남은 적에게 100 데미지 → stats +30 / telemetry +100

2. **팀 데미지** — stats는 제외, 텔레메트리는 포함 가능
3. **출혈 데미지 (`Damage_Groggy`)** — DBNO 출혈사, attacker가 null인 경우 많음
4. **차량 파괴 데미지** — `LogVehicleDamage` 별도 이벤트라 미포함
5. **환경 데미지** — 폭발/낙뎀/존뎀은 attacker null
6. **부동소수점 합산 오차** — telemetry는 float, 1~2 차이 발생
7. **DBNO/Finish 처리 차이** — 다운 시킨 사람과 마무리한 사람 데미지 귀속 차이

### 시도 2: 단순 뺄셈

```
RealDmg = stats.damageDealt - telemetry.BotDmg
```

**치명적 결함 발견:** 봇에 오버킬이 발생하면 RealDmg가 음수로 떨어지거나 부당하게 작아짐.

> **시나리오 (뺄셈 실패 케이스):**
> - 플레이어 행동: 30HP 봇에 100 데미지 + 50HP 실제 플레이어에 50 데미지
> - `stats.damageDealt` = 30 + 50 = **80** (HP 캡)
> - `telemetry.BotDmg` = **100** (원본)
> - 계산: RealDmg = 80 − 100 = **−20** → clamp(0) → **0**
> - **실제 정답: 50** ❌ (완전히 잘못 나옴)

수학적으로:
```
RealDmg_뺄셈
= stats총합 − telemetry봇
= (실제봇 + 실제리얼) − (실제봇 + 봇오버킬손실)
= 실제리얼 − 봇오버킬손실
```
→ 봇 오버킬 손실만큼 RealDmg가 깎이는 **편향(bias)**. 항상 한 방향(실제 플레이어 데미지 과소평가).

### 시도 3: 비율 기반 분할

```
bot_ratio = telemetry.BotDmg / (telemetry.BotDmg + telemetry.RealDmg)
BotDmg_final  = stats.damageDealt × bot_ratio
RealDmg_final = stats.damageDealt × (1 − bot_ratio)
```

**가정:** 오버킬 손실이 봇/실제에 비슷한 비율로 발생.

**장점:**
- stats 총합 100% 보존
- 음수/clamp 불필요
- 같은 시나리오에서 뺄셈보다 오차 절반 수준

**한계:** 가정이 깨질 경우 (봇에 오버킬이 편향된 경우) 약간 부정확하지만, 절대 오차는 작음 (1~3%).

### 시도 4: HP 시뮬레이션 (검토 후 기각)

이벤트 시간순으로 각 플레이어의 HP 상태를 추적하면서 매 데미지 인스턴스의 실제 적용량을 계산.

**기각 이유:**
- 처리 부하 자체는 작음 (+100~200ms/매치)
- 하지만 **구현 복잡도가 폭증**:
  - `LogPlayerTakeDamage`, `LogHeal`, `LogPlayerMakeGroggy`, `LogPlayerRevive`, `LogPlayerKillV2`, `LogPlayerLogin` 등 다수 이벤트 통합 처리
  - HP > 100 부스트 상태, DBNO 별도 체력바, 재접속 등 엣지 케이스 다수
  - PUBG 텔레메트리 포맷 변경 시 깨질 위험
- 정확도 이득은 비율 방식 대비 ~1% 수준 → ROI 매우 낮음

### 최종 결정: 데미지는 stats만 신뢰

위 시도들을 거쳐, **데미지는 봇/실제로 분리하지 않고 `stats.damageDealt`를 그대로 사용**하기로 결정.

| 항목 | 처리 방식 | 신뢰도 |
|---|---|---|
| 킬 (kills) | stats.kills − 텔레메트리 봇 킬 카운트 | ✅ 정확 (이벤트 1:1 매핑) |
| 데미지 (damage) | stats.damageDealt 그대로 | ✅ PUBG 공식값 |

**향후 누군가가 봇/실제 데미지 분리를 다시 시도하려 한다면**:
- 단순 뺄셈은 함정 — 피할 것
- 비율 분할이 차선책
- HP 시뮬레이션은 정확하지만 유지보수 부담 큼
- 우선 "정말 분리가 필요한가?" 부터 재검토 권장

---

## 실패 처리 및 Fallback

이 유틸은 **어떤 상황에서도 예외를 던지지 않습니다.** 대신 반환값의 `status`로 결과 유형을 알려줍니다. 호출부는 `try/catch` 불필요.

### 반환 타입

```ts
type AnalyzeStatus =
  | "ok"               // 매치 + 텔레메트리 모두 성공
  | "telemetry_missing" // 매치 OK, 텔레메트리 URL 없음 (보존 기간 초과 가능성)
  | "telemetry_failed"  // 매치 OK, 텔레메트리 호출 실패
  | "match_failed"     // 매치 호출 자체 실패
  | "invalid_args"     // 인자 누락
  | "unknown_error";   // 예기치 못한 내부 오류 (코드 버그 가능성)

interface AnalyzeResult {
  status: AnalyzeStatus;
  rows: PlayerRow[];
  error?: unknown;  // 원본 에러 객체 (있을 때만, 로깅/디버깅용)
}
```

### 정책 매트릭스

| 상황 | `status` | `rows` | `bot/real` 신뢰도 | retry 권장? |
|---|---|---|---|---|
| 매치 + 텔레메트리 정상 | `"ok"` | 정상 | ✅ 정확 | — |
| 텔레메트리 URL 없음 | `"telemetry_missing"` | stats만 | ⚠️ `bot=0` (보정 안 됨) | ❌ (만료 가능성, 무한 retry 위험) |
| 텔레메트리 호출 실패 | `"telemetry_failed"` | stats만 | ⚠️ `bot=0` (보정 안 됨) | ✅ 재시도 후보 |
| 매치 호출 실패 | `"match_failed"` | `[]` | — | ✅ 재시도 후보 |
| 인자 누락 | `"invalid_args"` | `[]` | — | ❌ (프로그래머 버그) |
| 알 수 없는 오류 | `"unknown_error"` | `[]` | — | △ 코드 점검 권장 |

### 호출부 사용 패턴

**기본 사용:**
```ts
const result = await analyzeMatch(matchId, "steam");

if (result.status === "ok") {
  render(result.rows);  // 정확한 봇/실제 분리
} else if (
  result.status === "telemetry_missing" ||
  result.status === "telemetry_failed"
) {
  render(result.rows);  // stats만 있는 데이터, "봇 보정 미적용" 배지 등 표시
} else {
  showEmptyState();     // match_failed / invalid_args / unknown_error
}
```

**Retry 큐 적재:**
```ts
const result = await analyzeMatch(matchId, "steam");

if (result.status === "match_failed" || result.status === "telemetry_failed") {
  retryQueue.push({
    matchId,
    platform: "steam",
    failedAt: Date.now(),
    reason: result.status,
    error: result.error,
  });
}
// telemetry_missing은 retry해도 의미 없음 (보존 기간 만료)
// invalid_args는 코드 수정해야 함 → retry 금지
```

### 설계 이유

- PUBG 텔레메트리는 매치 종료 후 약 14일간만 보존. 오래된 매치는 텔레메트리만 404이고 매치 메타는 살아있는 경우 흔함
- "봇 킬 보정을 못한다고 매치 정보 자체를 못 받는 건 손해" → stats 기반 정보만이라도 반환
- React 같은 UI 환경에서 예외 전파는 컴포넌트 트리를 크게 흔들 수 있어, 호출부 부담을 줄이는 게 안전함
- 단순 `boolean ok`보다 `status` 유형을 세분화한 이유: retry 의사결정 시 "재시도해도 의미 없는 실패"와 "재시도 후보"를 구분할 수 있어야 함

---

## 파일 구성

- `bot_kills.ts` — **메인 유틸 (React 프로젝트에서 import)**
  - `analyzeMatch(matchId, platform): Promise<PlayerRow[]>` export
  - Node 18+ / 브라우저 내장 `fetch` 사용, 외부 의존성 없음
  - 화살표 함수 스타일
  - 호출 실패 시 예외 던지지 않음 — "실패 처리 및 Fallback" 섹션 참조

---

## PUBG API 참고 사항

- **인증**: matches 엔드포인트는 API 키 불필요. 단, rate limit 정책은 PUBG 측 변경 가능.
- **플랫폼**: `steam`, `kakao`, `psn`, `xbox`, `console` 등
- **텔레메트리 보존 기간**: PUBG 공식 가이드상 매치 종료 후 약 14일. 오래된 매치는 텔레메트리 URL이 404일 수 있으니 호출부에서 핸들링 권장.
- **이벤트 스키마 변경**: `LogPlayerKill` → `LogPlayerKillV2` 처럼 PUBG가 주기적으로 텔레메트리 이벤트 포맷을 업데이트. 새 시즌 시작 후 동작 확인 필요.

---

## AI(예: Claude)에 작업 이어받기 위한 컨텍스트

이 문서는 한 세션 동안의 의사결정 흐름을 압축한 것입니다. 다음과 같은 작업을 의뢰할 때 이 문서를 참고하면 됩니다:

1. **새 컬럼 추가** — 예: 헤드샷 킬 분리, 어시스트, 생존시간
   → `extractRealPlayers`에서 stats 필드 추가 → `PlayerRow` 인터페이스 업데이트 → 텔레메트리에서 필요한 이벤트 파싱 추가
2. **여러 매치 일괄 처리** — `analyzeMatch`를 매치 ID 배열로 매핑, 결과 합산
3. **특정 user/팀 강조** — `PlayerRow[]` 결과에 후처리로 필터/그룹핑
4. **CSV/JSON export** — 반환된 `PlayerRow[]`를 사용하는 쪽에서 변환
5. **봇 데미지 분리 (재시도 시)** — 위 히스토리 섹션 필독. 비율 방식부터 검토.

작업 의뢰 시 함께 알려주면 좋은 정보:
- 사용 환경 (React 앱 / Node 스크립트 / 서버리스 함수 등)
- 캐싱 전략 필요 여부 (같은 매치 재조회 빈도)
- rate limit 고려 필요한지
