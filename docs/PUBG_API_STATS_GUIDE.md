# PUBG API 통계 및 매치 데이터 가이드

## 1. 통계 데이터 종류

### 🔄 매치별 통계 (Match Stats)

- **설명**: 특정 매치에서의 개별 플레이어 성과
- **특징**: 매치 응답의 participant 객체에 포함
- **보존 기간**: 14일

### 🗓 시즌 통계 (Season Stats)

- **설명**: 특정 시즌 동안의 플레이어 누적 통계
- **필요 정보**: playerId + seasonId
- **게임모드별**: squad-fpp, duo-fpp, solo-fpp 등

### 🏆 랭크 통계 (Ranked Stats)

- **설명**: 시즌 7부터 제공되는 경쟁전 통계
- **특징**: 시즌 통계 URL에 `/ranked` 추가
- **매치 ID**: 제공되지 않음

### 📊 라이프타임 통계 (Lifetime Stats)

- **설명**: 전체 게임 기간 통계 (게임 내 "Overall")
- **시작점**: Survival Title 시스템 도입 시점부터
- **seasonId**: "lifetime" 사용

## 2. API 엔드포인트

### 시즌 목록 조회

```bash
curl -g "https://api.pubg.com/shards/$platform/seasons" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

### 플레이어 시즌 통계

```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/seasons/$seasonId" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

### 플레이어 랭크 통계

```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/seasons/$seasonId/ranked" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

### 플레이어 라이프타임 통계

```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/seasons/lifetime" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

## 3. 배치 요청 (최대 10명)

### 시즌 통계 배치

```bash
curl -g "https://api.pubg.com/shards/$platform/seasons/$seasonId/gameMode/$gameMode/players?filter[playerIds]=$playerId-1,$playerId-2" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```

### 라이프타임 통계 배치

```bash
curl -g "https://api.pubg.com/shards/$platform/seasons/lifetime/gameMode/$gameMode/players?filter[playerIds]=$playerId-1,$playerId-2" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```

### 플레이어 매치 목록 배치

```bash
# 닉네임으로 조회
curl -g "https://api.pubg.com/shards/$platform/players?filter[playerNames]=$playerName-1,$playerName-2" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"

# 플레이어 ID로 조회
curl -g "https://api.pubg.com/shards/$platform/players?filter[playerIds]=$playerId-1,$playerId-2" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

## 4. 추가 기능

### 매치 상세 정보

```bash
curl -g "https://api.pubg.com/shards/$platform/matches/$matchId" \
-H "Accept: application/vnd.api+json"
```

### 매치 샘플 (무작위 매치 목록)

```bash
curl -g "https://api.pubg.com/shards/$platform/samples?filter[createdAt-start]=$startTime" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```

### 무기/생존 숙련도

```bash
# 무기 숙련도
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/weapon_mastery" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"

# 생존 숙련도
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/survival_mastery" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

### 리더보드

```bash
curl -g "https://api.pubg.com/shards/$platform-region/leaderboards/$seasonId/$gameMode" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```

## 5. 중요 사항

### 데이터 보존 기간

- **매치 데이터**: 14일
- **시즌 통계**: 영구 보존
- **매치 ID (시즌 통계 내)**: 14일 이내 매치만

### 플랫폼별 라이프타임 시작 시즌

- **PC**: division.bro.official.pc-2018-01
- **PSN**: division.bro.official.playstation-01
- **Xbox**: division.bro.official.xbox-01
- **Stadia**: division.bro.official.console-07

### Rate Limiting

- 시즌 목록: 월 1회 이하 조회 권장
- 배치 요청 적극 활용 (최대 10명)
- 샘플 요청: 24시간 이상 과거 데이터만

### Stadia 특수사항

- 키보드/마우스 vs 게임패드 별도 통계
- 게임패드: console 샤드 또는 stadia 샤드 + Gamepad Filter

## 6. 텔레메트리 및 추가 데이터

- **압축**: gzip 압축 응답 권장
- **위치**: 매치 Asset Object에서 URL 확인
- **상세 정보**: 매치별 상세 이벤트 데이터
