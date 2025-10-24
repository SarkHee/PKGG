# PUBG API 배치 처리 가이드

## 개요

PUBG API의 Rate Limit을 효율적으로 관리하고 여러 플레이어의 데이터를 한 번에 조회할 수 있는 배치 처리 시스템입니다.

## 주요 개선사항

### 1. API 호출 최적화

- **기존**: 각 플레이어마다 개별 API 호출 → 10명 = 10회 API 호출
- **개선**: 배치 요청으로 최대 10명 동시 처리 → 10명 = 1회 API 호출

### 2. Rate Limit 관리

- 분당 API 호출 횟수 제한 관리
- 자동 대기 시간 계산
- 요청 실패 시 개별 재시도 로직

## 사용 방법

### 1. 플레이어 기본 정보 배치 조회

```javascript
// 최대 10명의 플레이어 정보를 한 번에 조회
GET /api/pubg/batch/players/steam?names=player1,player2,player3

// 응답 예시
{
  "success": true,
  "count": 3,
  "players": [
    {
      "id": "account.player1id",
      "name": "player1",
      "matches": ["match1", "match2", ...],
      "shardId": "steam",
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### 2. 시즌 통계 배치 조회

```javascript
// 특정 시즌, 특정 게임모드의 통계를 배치로 조회
GET /api/pubg/batch/stats/steam/division.bro.official.pc-2018-05/squad-fpp?ids=id1,id2,id3

// 응답 예시
{
  "success": true,
  "seasonId": "division.bro.official.pc-2018-05",
  "gameMode": "squad-fpp",
  "count": 3,
  "stats": [
    {
      "playerId": "account.player1id",
      "attributes": {
        "assists": 10,
        "boosts": 5,
        "damageDealt": 15000.5,
        "kills": 25,
        "roundsPlayed": 100,
        "wins": 15,
        "top10s": 45
      }
    }
  ]
}
```

### 3. 라이프타임 통계 배치 조회

```javascript
// 라이프타임 통계를 배치로 조회
GET /api/pubg/batch/lifetime/steam/squad-fpp?ids=id1,id2,id3

// 응답 예시
{
  "success": true,
  "seasonId": "lifetime",
  "gameMode": "squad-fpp",
  "count": 3,
  "stats": [...]
}
```

### 4. 클랜 멤버 일괄 업데이트

```javascript
// 클랜 전체 멤버의 데이터를 효율적으로 업데이트
POST /api/clan/batch-update

{
  "clanName": "MyAwesomeClan",
  "memberNames": ["player1", "player2", "player3", ...],
  "shard": "steam"
}

// 응답 예시
{
  "success": true,
  "message": "배치 업데이트 완료",
  "results": {
    "total": 15,
    "updated": 14,
    "errors": 1
  }
}
```

## 기존 코드와의 호환성

### 기존 개별 API 사용

```javascript
// 기존 방식 - 여전히 사용 가능
const response = await fetch('/api/pubg/player1?shard=steam');
```

### 새로운 배치 API 활용

```javascript
// 새로운 방식 - 더 효율적
const response = await fetch(
  '/api/pubg/batch/players/steam?names=player1,player2,player3'
);
```

## 실제 적용 예시

### 클랜 페이지에서 배치 처리 활용

```javascript
// /pages/clan/[clanName].js에서 사용
export async function getServerSideProps(context) {
  const { clanName } = context.query;

  // 1. 클랜 멤버 목록 조회
  const clan = await prisma.clan.findUnique({
    where: { name: clanName },
    include: { members: true },
  });

  const memberNames = clan.members.map((m) => m.nickname);

  // 2. 배치로 멤버들의 최신 데이터 조회 (최대 10명씩)
  const chunks = [];
  for (let i = 0; i < memberNames.length; i += 10) {
    chunks.push(memberNames.slice(i, i + 10));
  }

  const allMemberData = {};
  for (const chunk of chunks) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/pubg/batch/players/steam?names=${chunk.join(',')}`
    );

    if (response.ok) {
      const data = await response.json();
      data.players.forEach((player) => {
        allMemberData[player.name] = player;
      });
    }
  }

  return {
    props: {
      clan,
      memberData: allMemberData,
    },
  };
}
```

## Rate Limit 관리

### 자동 제한 관리

```javascript
const rateLimitManager = new RateLimitManager(10); // 분당 10회 제한

// 사용 전 자동으로 대기 시간 확인
await rateLimitManager.waitIfNeeded();

// API 호출 실행
const response = await fetchPlayersBatch(shard, playerNames);
```

### 수동 지연 처리

```javascript
// 필요시 수동으로 지연 추가
import { delay } from '../utils/pubgBatchApi.js';

await delay(1000); // 1초 대기
```

## 에러 처리

### 배치 요청 실패 시 개별 재시도

```javascript
try {
  // 배치 요청 시도
  const batchResult = await fetchPlayersBatch(shard, playerNames);
  return batchResult;
} catch (error) {
  console.warn('배치 요청 실패, 개별 요청으로 전환:', error.message);

  // 개별 요청으로 폴백
  const individualResults = [];
  for (const name of playerNames) {
    try {
      const result = await fetchPlayersBatch(shard, [name]);
      individualResults.push(result.data[0]);
    } catch (individualError) {
      console.error(`개별 요청 실패: ${name}`, individualError);
    }
  }

  return { data: individualResults };
}
```

## 성능 향상 효과

### API 호출 횟수 감소

- **클랜 20명 업데이트**:
  - 기존: 20회 API 호출
  - 개선: 2회 API 호출 (10명씩 2번)
  - **90% 감소**

### Rate Limit 회피

- 자동 대기 시간 관리로 API 제한 오류 방지
- 안정적인 대용량 데이터 처리 가능

### 사용자 경험 개선

- 더 빠른 데이터 로딩
- 안정적인 서비스 제공
- 실시간 업데이트 가능

## 주의사항

1. **최대 10명 제한**: PUBG API 배치 요청은 최대 10명까지만 지원
2. **Rate Limit**: 여전히 API 제한이 있으므로 적절한 간격 유지 필요
3. **에러 처리**: 배치 요청 실패 시 개별 재시도 로직 구현 권장
4. **데이터 검증**: 배치 응답에서 일부 플레이어 데이터가 누락될 수 있음
