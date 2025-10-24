# PUBG API 통계 시스템 완전 가이드

## 📋 개요

PUBG API의 다양한 통계 유형을 효율적으로 조회하고 표시하는 종합 시스템입니다.

## 🔧 구현된 기능

### 1. 통계 타입별 API 엔드포인트

#### ✅ 시즌 통계 (Season Stats)

```javascript
GET / api / pubg / stats / season / steam / playerId / seasonId;
```

- **특징**: 특정 시즌의 게임모드별 통계
- **포함**: 매치 ID (14일 이내), 게임모드별 상세 통계
- **응답 예시**:

```json
{
  "success": true,
  "type": "season",
  "data": {
    "gameModeStats": {
      "squad-fpp": {
        "assists": 45,
        "boosts": 123,
        "damageDealt": 45678.5,
        "kills": 89,
        "roundsPlayed": 50,
        "wins": 8
      }
    },
    "matchIds": ["match1", "match2"],
    "matchCount": 15
  }
}
```

#### ✅ 랭크 통계 (Ranked Stats)

```javascript
GET / api / pubg / stats / ranked / steam / playerId / seasonId;
```

- **특징**: 시즌 7부터 제공되는 경쟁전 통계
- **포함**: RP, 티어, 랭크별 상세 통계
- **주의**: 매치 ID는 포함되지 않음

#### ✅ 라이프타임 통계 (Lifetime Stats)

```javascript
GET / api / pubg / stats / lifetime / steam / playerId;
```

- **특징**: Survival Title 시스템 도입 이후 전체 통계
- **포함**: 전체 기간 누적 통계

#### ✅ 숙련도 통계 (Mastery Stats)

```javascript
GET / api / pubg / stats / mastery / steam / playerId / weapon; // 무기 숙련도
GET / api / pubg / stats / mastery / steam / playerId / survival; // 생존 숙련도
```

### 2. 시즌 정보 조회

```javascript
GET /api/pubg/seasons/steam?current=true  // 현재 시즌만
GET /api/pubg/seasons/steam               // 전체 시즌 목록
```

### 3. 배치 처리 지원

```javascript
GET /api/pubg/batch/players/steam?names=player1,player2,player3
GET /api/pubg/batch/stats/steam/seasonId/gameMode?ids=id1,id2,id3
```

## 🚀 사용 방법

### 1. 기본 사용법

#### 플레이어 종합 통계 조회

```javascript
import {
  getPlayerComprehensiveStats,
  convertStatsToLegacyFormat,
} from '../utils/playerStatsUtils';

// 종합 통계 조회
const comprehensiveStats = await getPlayerComprehensiveStats(
  'PlayerName',
  'steam'
);

if (comprehensiveStats.success) {
  console.log('시즌 통계:', comprehensiveStats.seasonStats);
  console.log('랭크 통계:', comprehensiveStats.rankedStats);
  console.log('라이프타임:', comprehensiveStats.lifetimeStats);
  console.log('무기 숙련도:', comprehensiveStats.weaponMastery);
  console.log('생존 숙련도:', comprehensiveStats.survivalMastery);
}
```

#### 개별 통계 조회

```javascript
import {
  getCurrentSeason,
  getPlayerSeasonStats,
  getPlayerRankedStats,
} from '../utils/playerStatsUtils';

// 현재 시즌 조회
const seasonInfo = await getCurrentSeason('steam');
const currentSeasonId = seasonInfo.currentSeason.id;

// 시즌 통계 조회
const seasonStats = await getPlayerSeasonStats(
  playerId,
  currentSeasonId,
  'steam'
);

// 랭크 통계 조회
const rankedStats = await getPlayerRankedStats(
  playerId,
  currentSeasonId,
  'steam'
);
```

### 2. 서버사이드에서 사용

#### getServerSideProps에서 활용

```javascript
export async function getServerSideProps(context) {
  const { nickname, server } = context.query;

  try {
    // 종합 통계 조회
    const comprehensiveStats = await getPlayerComprehensiveStats(
      nickname,
      server
    );

    if (comprehensiveStats.success) {
      // 기존 형식으로 변환
      const playerData = convertStatsToLegacyFormat(comprehensiveStats);

      return {
        props: {
          playerData: {
            ...playerData,
            enhancedStats: comprehensiveStats, // 향상된 통계 추가
          },
          error: null,
          dataSource: 'enhanced_api',
        },
      };
    }
  } catch (error) {
    console.error('통계 조회 실패:', error);
  }

  // 기존 방식 폴백
  return await getExistingPlayerData(nickname, server);
}
```

### 3. 컴포넌트에서 표시

#### React 컴포넌트

```jsx
import EnhancedPlayerStats from '../components/EnhancedPlayerStats';

function PlayerPage({ playerData }) {
  return (
    <div>
      {/* 기존 통계 섹션들 */}

      {/* 향상된 통계 */}
      {playerData?.enhancedStats && (
        <EnhancedPlayerStats
          enhancedStats={playerData.enhancedStats}
          player={playerData.profile}
          currentSeason={playerData.profile?.currentSeason}
        />
      )}
    </div>
  );
}
```

## 📊 데이터 구조

### 시즌 통계 구조

```typescript
interface SeasonStats {
  player: {
    id: string;
    name: string;
  };
  season: {
    id: string;
    isCurrentSeason: boolean;
  };
  gameModeStats: {
    [mode: string]: {
      assists: number;
      boosts: number;
      damageDealt: number;
      kills: number;
      roundsPlayed: number;
      wins: number;
      top10s: number;
      // ... 기타 통계
    };
  };
  matchIds: string[];
  matchCount: number;
}
```

### 랭크 통계 구조

```typescript
interface RankedStats {
  rankedGameModeStats: {
    [mode: string]: {
      currentRankPoint: number;
      currentTier: {
        tier: string;
        subTier: string;
      };
      roundsPlayed: number;
      wins: number;
      kills: number;
      damageDealt: number;
      bestRankPoint: number;
      // ... 기타 랭크 통계
    };
  };
}
```

## 🔧 구성 요소

### 유틸리티 함수들

- `getPlayerBasicInfo()` - 플레이어 기본 정보
- `getCurrentSeason()` - 현재 시즌 정보
- `getPlayerSeasonStats()` - 시즌 통계
- `getPlayerRankedStats()` - 랭크 통계
- `getPlayerLifetimeStats()` - 라이프타임 통계
- `getPlayerWeaponMastery()` - 무기 숙련도
- `getPlayerSurvivalMastery()` - 생존 숙련도
- `getPlayerComprehensiveStats()` - 종합 통계 (병렬 조회)

### API 엔드포인트들

- `/api/pubg/stats/[...params].js` - 통계 조회 API
- `/api/pubg/seasons/[shard].js` - 시즌 정보 API
- `/api/pubg/batch/[...params].js` - 배치 처리 API

### React 컴포넌트들

- `EnhancedPlayerStats.jsx` - 향상된 통계 표시
- `SeasonStatsDisplay` - 시즌 통계 표시
- `RankedStatsDisplay` - 랭크 통계 표시
- `LifetimeStatsDisplay` - 라이프타임 통계 표시

## ⚡ 성능 최적화

### 1. 병렬 요청 처리

```javascript
// 모든 통계를 병렬로 조회
const [seasonStats, rankedStats, lifetimeStats] = await Promise.allSettled([
  getPlayerSeasonStats(playerId, seasonId, shard),
  getPlayerRankedStats(playerId, seasonId, shard),
  getPlayerLifetimeStats(playerId, shard),
]);
```

### 2. 캐시 활용

```javascript
// 시즌 정보는 1시간 캐시
const seasonInfo = await getCurrentSeason('steam'); // 자동 캐시
```

### 3. 배치 요청 지원

```javascript
// 최대 10명까지 한 번에 조회
const batchStats = await fetch(
  '/api/pubg/batch/stats/steam/seasonId/squad-fpp?ids=id1,id2,id3'
);
```

## 🛠 에러 처리

### 1. 부분 실패 처리

```javascript
const result = await getPlayerComprehensiveStats('PlayerName');

if (result.success) {
  // 일부 통계만 실패해도 사용 가능한 데이터는 표시
  console.log('성공한 통계:', result.seasonStats);
  console.log('실패한 요청:', result.errors);
}
```

### 2. 폴백 메커니즘

```javascript
// 향상된 API 실패 시 기존 API로 폴백
try {
  const enhancedData = await getPlayerComprehensiveStats(nickname);
  return enhancedData;
} catch (error) {
  console.log('향상된 API 실패, 기존 방식 사용');
  return await getExistingPlayerData(nickname);
}
```

## 📈 마이그레이션 가이드

### 기존 코드와의 호환성

```javascript
// 기존 방식 (여전히 작동)
const oldData = await fetch('/api/pubg/player1?shard=steam');

// 새로운 방식 (더 많은 정보)
const newData = await getPlayerComprehensiveStats('player1', 'steam');

// 기존 형식으로 변환 가능
const legacyFormat = convertStatsToLegacyFormat(newData);
```

### 점진적 적용

1. **1단계**: 기존 API와 병행 사용
2. **2단계**: 향상된 통계를 추가 섹션으로 표시
3. **3단계**: 점진적으로 기존 통계를 향상된 버전으로 교체

## 🔍 디버깅 및 모니터링

### 로그 확인

```javascript
// 서버 로그에서 확인 가능한 정보
console.log('통계 조회 시작: PlayerName');
console.log('플레이어 ID: account.xxx');
console.log('현재 시즌 ID: division.bro.official.pc-2024-xx');
console.log('통계 조회 완료. 오류: 0개');
```

### API 응답 확인

```bash
# 직접 API 테스트
curl "http://localhost:3000/api/pubg/stats/season/steam/playerId/seasonId"
curl "http://localhost:3000/api/pubg/seasons/steam?current=true"
```

이 시스템을 통해 PUBG API의 모든 통계 정보를 효율적으로 조회하고 사용자에게 풍부한 정보를 제공할 수 있습니다! 🎮
