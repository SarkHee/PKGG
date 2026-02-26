# PKGG 프로젝트 — Claude 컨텍스트 파일

## 프로젝트 개요
PUBG(배그) 플레이어 통계/전적 조회 웹앱. Next.js + Prisma + Tailwind CSS.
배포: Vercel | DB: PostgreSQL (Prisma ORM) | API: PUBG Official API (api.pubg.com)

## 핵심 스택
- Next.js (pages router), React, Tailwind CSS
- Prisma (`prisma/schema.prisma`)
- PUBG API → `utils/pubgApiCache.js`로 캐싱 처리

---

## 주요 디렉토리/파일 맵

### pages/
| 경로 | 설명 |
|------|------|
| `index.js` | 메인 홈 |
| `player/[server]/[nickname].js` | 플레이어 상세 (무기, 시즌, 랭크 등) |
| `clan/[clanName].js` | 클랜 상세 |
| `clan-analytics.js` | 클랜 분석 |
| `weapon-test/index.js` | 무기 성향 테스트 (결과 포함) |
| `weapon-test/result/[id].js` | 무기 테스트 공유 결과 페이지 |
| `admin/moderation.js` | 관리자: 신고 처리 |
| `admin/notices.js` | 관리자: 공지 관리 |
| `admin/index.js` | 관리자 대시보드 |

### pages/api/
| 경로 | 설명 |
|------|------|
| `pubg/[nickname].js` | 플레이어 기본 정보 |
| `pubg/stats/[...params].js` | 시즌/랭크/무기/생존 통계 |
| `pubg/player-id.js` | accountId 조회 |
| `pubg/playstyle.js` | 플레이스타일 분석 |
| `clan/batch-update.js` | 클랜 멤버 일괄 업데이트 |
| `clan/update-rankings.js` | 클랜 랭킹 업데이트 |
| `clan/get-members.js` | 클랜 멤버 조회 |
| `admin/auth.js` | 관리자 인증 |
| `cron/` | Vercel cron 작업들 |

### components/
| 경로 | 설명 |
|------|------|
| `player/WeaponMasteryCard.jsx` | 무기 숙련도 카드 (force prop으로 캐시 우회) |
| `player/PlayerDashboard.jsx` | 플레이어 대시보드 |
| `player/PlayerHeader.jsx` | 플레이어 헤더 |
| `player/EnhancedPlayerStats.jsx` | 향상된 플레이어 통계 |
| `layout/Footer.jsx` | 공통 푸터 |
| `AdUnit.jsx` | 광고 유닛 |

### utils/
| 파일 | 설명 |
|------|------|
| `pubgApiCache.js` | PUBG API 인메모리 캐시 (TTL: PLAYER 10분, MATCH 30분, CLAN 15분, SEASON 60분). `cachedPubgFetch(url, {ttl, force})` |
| `weaponTestData.js` | 무기 성향 테스트 데이터 (12가지 타입, 각 type.weapons 3개) |
| `playerStatsUtils.js` | 플레이어 통계 유틸 |
| `pubgBatchApi.js` | 배치 API 처리 |
| `clanRegionAnalyzer.js` | 클랜 지역 분석 |

---

## 핵심 구현 패턴

### PUBG API v22 통계 결합 (중요!)
`StatsTotal`은 패치 18.2 이후 frozen → 세 소스를 합산해야 함:
```js
kills = (StatsTotal.Kills||0) + (OfficialStatsTotal.Kills||0) + (CompetitiveStatsTotal.Kills||0)
damage = (StatsTotal.DamageDealt||0) + (OfficialStatsTotal.DamageDealt||0) + (CompetitiveStatsTotal.DamageDealt||0)
```

### 캐시 우회 (force)
- `WeaponMasteryCard`에 `force={true}` prop → API URL에 `?force=1` 추가
- `player/[server]/[nickname].js`에서 `router.query.force === '1'`로 전달

### WeaponSlider (weapon-test)
- `weapon-test/index.js`와 `result/[id].js` 양쪽에 동일하게 인라인 정의
- `WEAPON_IMG` 맵: 무기명 → `/public/weapons/` PNG 파일명
- `RANK_META`: 1순위(금), 2순위(은), 3순위(동) 스타일
- 위치: 성향 타입 카드 하단, 레이더 차트 상단

### weaponsummaries 키 (대소문자 처리)
```js
const ws = data?.weaponsummaries ?? data?.WeaponSummaries ?? data?.weaponSummaries ?? {};
```

---

## 환경변수 (Vercel)
- `PUBG_API_KEY` — PUBG API 키
- `DATABASE_URL` — PostgreSQL 연결 문자열
- `ADMIN_PASSWORD` — 관리자 패스워드 (admin/auth.js)

---

## 최근 주요 변경 이력
- WeaponMasteryCard: 헤드샷 기능 제거 (PUBG Headshots 필드 = 킬이 아닌 히트 수)
- weapon-test: WeaponSlider 컴포넌트 추가 (PNG 이미지 + 탭 네비게이션)
- PUBG API: 세 소스 합산으로 무기 킬/데미지 통계 정확도 개선
