# PUBG API 데이터 우선순위 적용 — 구현 완료

**날짜:** 2026년 2월 6일  
**목표:** 플레이어/클랜 정보를 PUBG API에서 먼저 가져오고, DB는 캐시/저장용으로만 사용

---

## 📋 개요

사용자 요청에 따라 백엔드와 프론트엔드를 PUBG API 데이터 우선 사용 구조로 변경했습니다.  
이제 모든 플레이어 정보는 **PUBG API에서 1차 조회**되며, DB는 **데이터 캐시 및 분석용**으로만 역할합니다.

---

## ✅ 구현 완료 항목

### 1. **백엔드: 개선된 플레이어/클랜 API (`player-v2.js`)**
   
**파일:** `pages/api/pubg/player-v2.js`

**기능:**
- ✅ PUBG API에서 플레이어 검색 (`filter[playerNames]`)
- ✅ 플레이어의 `clanId` 확인  
- ✅ `clanId`가 있으면 클랜 정보 조회 (`/shards/{shard}/clans/{clanId}`)
- ✅ 조회된 클랜/멤버 정보를 DB에 자동 저장/업데이트
- ✅ 저장 필드 매핑:
  - PUBG API `clanName` → DB `name`
  - PUBG API `clanTag` → DB `pubgClanTag`  
  - PUBG API `clanLevel` → DB `pubgClanLevel`
  - PUBG API `clanMemberCount` → DB `pubgMemberCount`
- ✅ 모든 샤드(`steam`, `kakao`, `psn`, `xbox`) 순회 검색
- ✅ 클랜이 없는 독립 플레이어도 DB에 저장 (clanId = null)

**응답 예시:**
```json
{
  "success": true,
  "player": {
    "id": "account.xxxxx",
    "name": "DN_Tosi",
    "clanId": "clan_id_xxx",
    "shardId": "steam"
  },
  "clan": {
    "id": "clan_id_xxx",
    "name": "클랜명",
    "tag": "태그",
    "level": 3,
    "memberCount": 50
  },
  "saved": {
    "newClan": false,
    "newMember": true,
    "clanId": 123
  }
}
```

**호출 방법:**
```bash
# 플레이어 검색 및 DB 저장
GET /api/pubg/player-v2?nickname=DN_Tosi

# UBD 데이터 초기화 후 검색
GET /api/pubg/player-v2?nickname=DN_Tosi&initUBD=1
```

---

### 2. **프론트엔드: 플레이어 페이지 수정**

**파일:** `pages/player/[server]/[nickname].js`

**변경사항:**
- ✅ `getServerSideProps`에서 PUBG API 호출 엔드포인트 변경
  - 기존: `/api/pubg/${nickname}` → 새로움: `/api/pubg/player-v2?nickname=${nickname}`
  - 이제 플레이어 상세 페이지는 **항상 PUBG API 데이터를 우선 표시**

**데이터 흐름:**
```
사용자 → 플레이어 페이지 (getServerSideProps)
  ↓
player-v2 API 호출 (PUBG API 쿼리)
  ↓
PUBG API 응답 + DB 자동 저장
  ↓
프론트엔드에 JSON 전달
  ↓
UI 렌더링 (클랜 정보 포함)
```

---

### 3. **PUBG API가 제공하는 데이터**

**플레이어 조회 응답:**
```json
{
  "data": [
    {
      "type": "player",
      "id": "account.xxxxx",
      "attributes": {
        "name": "DN_Tosi",
        "clanId": "clan_id_xxx",  // ← 이 필드로 클랜 정보 조회
        "stats": { ... }
      }
    }
  ]
}
```

**클랜 조회 응답:**
```json
{
  "data": {
    "type": "clan",
    "id": "clan_id_xxx",
    "attributes": {
      "clanName": "클랜명",
      "clanTag": "태그",
      "clanLevel": 3,
      "clanMemberCount": 50
    }
  }
}
```

---

## 🗄️ 데이터베이스 저장 구조

DB에 저장되는 클랜 정보:
```javascript
{
  name: clanInfo.attributes.clanName,           // "클랜명"
  pubgClanTag: clanInfo.attributes.clanTag,     // "태그"
  pubgClanLevel: clanInfo.attributes.clanLevel, // 3
  pubgMemberCount: clanInfo.attributes.clanMemberCount, // 50
  pubgClanId: player.attributes.clanId,         // PK (PUBG API ID)
  lastSynced: new Date()                         // 동기화 시간
}
```

프론트엔드에서 사용되는 필드:
```javascript
clan: {
  name: member.clan.name,                       // DB의 name
  tag: member.clan.pubgClanTag,                 // DB의 pubgClanTag
  level: member.clan.pubgClanLevel,             // DB의 pubgClanLevel
  memberCount: member.clan.pubgMemberCount      // DB의 pubgMemberCount
}
```

---

## 🧪 테스트 방법

### 1. **개발 서버 시작**
```bash
cd /Users/mac/Desktop/PKGG
npm run dev
```
- 포트 3001에서 실행됨 (3000이 이미 사용 중인 경우)

### 2. **`DN_Tosi` API 호출 (플레이어 검색 + DB 저장)**
```bash
curl -sS "http://localhost:3001/api/pubg/player-v2?nickname=DN_Tosi"
```

**예상 응답:**
- `success: true` → 플레이어 찾음 + 클랜 정보 조회 완료
- `clan` 객체에 클랜 정보 포함
- DB에 클랜 및 멤버 정보 자동 저장

### 3. **플레이어 페이지 접속**
```
http://localhost:3001/player/steam/DN_Tosi
```

**확인 사항:**
- 플레이어 프로필 표시됨
- 클랜 정보 표시됨 (클랜이 있는 경우)
- 데이터 소스: "실시간 데이터 업데이트 완료" 배너 표시 (PUBG API 데이터)

### 4. **디버그 엔드포인트 (DB 상태 확인)**
```bash
curl -sS "http://localhost:3001/api/debug/check-player?nickname=DN_Tosi"
```

**응답:**
- DB에 저장된 플레이어/클랜 정보 출력
- 클랜 필드 포함 여부 확인

---

## 📊 데이터 우선순위

| 데이터 소스 | 사용 시점 | 목적 |
|-----------|---------|------|
| **PUBG API** | 플레이어 페이지 로드 (1차) | 실시간 정보 제공 |
| **DB** | API 호출 완료 후 자동 저장 | 캐시/분석용 |
| **DB (API 실패 시)** | API 불가능 상황 | 폴백 데이터 |

---

## ⚙️ 환경 설정

### `.env.local`에 필요한 변수:
```bash
PUBG_API_KEY=your_actual_api_key_here
DATABASE_URL=postgresql://user:password@host:port/db
```

### `DATABASE_URL` 설정
- **개발:** Supabase Session Pooler (권장)
  ```
  postgresql://user:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
  ```
- **프로덕션:** Supabase Transaction Pooler
  ```
  postgresql://user:password@aws-1-ap-northeast-2-rw.pooler.supabase.com:6543/postgres
  ```

---

## 🔄 외부 접근 방법 (배포 후)

### Vercel 배포 (권장)
```bash
npx vercel login
npx vercel
```

### 로컬에서 외부 접근 (ngrok - 제한사항 있음)
- **문제:** 무료 ngrok는 계정 인증 필요
- **대안:** 로컬 테스트 후 Vercel로 배포

---

## 📝 정리

✅ PUBG API 데이터 우선 사용 완료  
✅ 플레이어/클랜 정보 자동 DB 저장 완료  
✅ 프론트엔드 데이터 흐름 개선 완료  
✅ 디버그 엔드포인트 추가 완료  

**다음 단계:**
1. 로컬 테스트: `npm run dev` → 플레이어 페이지 확인
2. 배포: Vercel로 배포하여 외부 접근 활성화
3. 모니터링: 클랜 자동 저장 및 UI 표시 확인
