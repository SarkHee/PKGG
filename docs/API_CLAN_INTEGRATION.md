# 플레이어/클랜 검색 API 가이드

## 🎯 개선 사항

### 1. API 엔드포인트
- **기존**: `/api/pubg/player?nickname={name}` (player.js)
- **신규**: `/api/pubg/player-v2?nickname={name}` (player-v2.js)
- **관리**: `/api/debug/check-ubd-clan?action=check|clear` (UBD 데이터 확인/초기화)

### 2. 개선 기능
✅ Prisma 클라이언트 싱글톤 패턴 (HMR 중복 인스턴스 방지)
✅ 클랜 정보 PUBG API에서 자동 조회
✅ 클랜 정보 DB에 자동 저장/업데이트
✅ 없는 유저 검색 시 클랜 정보도 함께 저장
✅ UBD 클랜 데이터 초기화 옵션
✅ 상세 로깅 및 디버깅 정보 제공

---

## 📍 사용 방법

### 1️⃣ 플레이어 검색 (클랜 정보 자동 저장)
```bash
# 기본 검색 (클랜 정보 자동으로 조회 및 DB 저장)
GET /api/pubg/player-v2?nickname=PlayerName

# 응답 예시
{
  "success": true,
  "player": {
    "id": "account.xxx",
    "name": "PlayerName",
    "clanId": "clan.xxx",
    "shardId": "steam"
  },
  "clan": {
    "id": "clan.xxx",
    "name": "UBD",
    "tag": "UBD",
    "level": 5,
    "memberCount": 150
  },
  "saved": {
    "newClan": false,  // 기존 클랜
    "newMember": true  // 새 멤버 저장됨
  }
}
```

### 2️⃣ UBD 클랜 데이터 확인
```bash
GET /api/debug/check-ubd-clan?action=check

# 응답 예시
{
  "status": "checked",
  "ubdClanFound": true,
  "clanStats": {
    "id": 1,
    "name": "UBD",
    "pubgClanId": "clan.xxx",
    "pubgClanTag": "UBD",
    "memberCount": 15,
    "lastSynced": "2026-02-06T14:00:00Z"
  },
  "members": [
    {
      "id": 1,
      "nickname": "Player1",
      "pubgPlayerId": "account.xxx",
      "pubgShardId": "steam"
    }
  ],
  "totalStats": {
    "totalClans": 50,
    "totalMembers": 500
  }
}
```

### 3️⃣ UBD 클랜 데이터 초기화
```bash
GET /api/debug/check-ubd-clan?action=clear

# 응답 예시
{
  "message": "UBD 클랜 데이터 초기화 완료",
  "status": "cleared"
}
```

### 4️⃣ 플레이어 검색 + UBD 초기화 (한 번에)
```bash
GET /api/pubg/player-v2?nickname=PlayerName&initUBD=1

# 절차:
# 1. UBD 클랜 및 멤버 삭제
# 2. 플레이어 검색
# 3. 클랜 정보 조회
# 4. DB에 신규로 저장
```

---

## 📊 DB 저장 로직

### 클랜 정보 저장
```javascript
// Clan 테이블에 저장되는 정보
{
  name: "UBD",                    // 클랜명
  pubgClanId: "clan.xxx",         // PUBG API ID
  pubgClanTag: "UBD",             // 클랜 태그
  pubgClanLevel: 5,               // 클랜 레벨
  pubgMemberCount: 150,           // PUBG API에서 조회한 멤버 수
  memberCount: 15,                // DB에 실제 저장된 멤버 수
  lastSynced: new Date()          // 마지막 동기화 시간
}
```

### 멤버 정보 저장
```javascript
// ClanMember 테이블에 저장되는 정보
{
  nickname: "PlayerName",
  pubgPlayerId: "account.xxx",    // PUBG Account ID
  pubgClanId: "clan.xxx",         // 플레이어가 속한 클랜 ID
  pubgShardId: "steam",           // 플레이어 샤드 (steam/kakao/psn/xbox)
  clanId: 1,                      // DB Clan 테이블의 ID (외래키)
  lastUpdated: new Date()
}
```

---

## 🔍 로그 확인

### 성공 시 로그
```
✅ 플레이어 발견: PlayerName (steam)
✅ 클랜 정보 조회 성공: UBD (UBD)
✅ 새 멤버 생성: PlayerName
📊 DB 통계: 50개 클랜, 500명 멤버
```

### 오류 시 로그
```
❌ steam 샤드에서 플레이어 찾지 못함
⚠️ 클랜 정보 조회 실패 (clan.xxx): 404
🔥 DB 저장 실패: [오류 메시지]
```

---

## 🚀 프론트엔드 연동

### 예시 코드 (React)
```javascript
// 플레이어 검색
const searchPlayer = async (nickname) => {
  try {
    const res = await fetch(
      `/api/pubg/player-v2?nickname=${encodeURIComponent(nickname)}`
    );
    const data = await res.json();

    if (data.success) {
      console.log('플레이어:', data.player);
      console.log('클랜:', data.clan);
      console.log('저장 결과:', data.saved);
      
      // UI 업데이트
      setPlayerInfo(data.player);
      setClanInfo(data.clan);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('검색 실패:', error);
  }
};

// UBD 초기화 (선택사항)
const initUBD = async () => {
  const res = await fetch('/api/debug/check-ubd-clan?action=clear');
  const data = await res.json();
  console.log(data.message);
};
```

---

## ⚠️ 주의사항

1. **API 키**: `PUBG_API_KEY` 환경변수 필수
2. **DB 연결**: `DATABASE_URL` 환경변수 필수 (Supabase)
3. **프로덕션**: `/api/debug/*` 엔드포인트는 인증 추가 권장
4. **레이트 리미팅**: PUBG API는 분당 요청 제한 있음

---

## ✅ 체크리스트

- [ ] `player-v2.js` API 테스트됨
- [ ] `check-ubd-clan.js` 관리 API 테스트됨
- [ ] 클랜 정보가 DB에 저장됨 확인
- [ ] 없는 유저 검색 시 클랜 정보 함께 저장됨 확인
- [ ] UBD 데이터 초기화 기능 작동 확인
