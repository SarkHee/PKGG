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
| `index.js` | 메인 홈 (오로라 CSS 그라디언트 배경) |
| `compare.js` | 플레이어 비교 (`/compare?a=A&b=B&shard=steam`). 스탯 비교 바 + Chart.js 레이더 차트. 공유 URL 지원. |
| `clans.js` | 공개 클랜 디렉토리 (`/clans`). MMR 랭킹 순, 지역·클랜명 필터, 페이지네이션 (20개씩). |
| `player/[server]/[nickname].js` | 플레이어 상세 (무기, 시즌, 랭크 등) |
| `clan/[clanName].js` | 클랜 상세 |
| `clan-analytics.js` | 클랜 분석 |
| `weapon-test/index.js` | 무기 성향 테스트 (결과 포함) |
| `weapon-test/result/[id].js` | 무기 테스트 공유 결과 페이지 |
| `weapon-damage.js` | 무기 데미지 표 (57종, 타입 필터·정렬·DPS·방어구/헬멧 시뮬레이터·킬샷 계산·비교 모드) |
| `party.js` | 파티 찾기 게시판. 포럼 `party` 카테고리 사용. 모드/서버/마이크 필터 |
| `party/create.js` | 파티 모집 글 작성 폼 (JSON 구조화 데이터를 forum content에 저장) |
| `aim-trainer.js` | 에임 트레이너 미니게임. 3모드: 반응속도(5라운드·DOM), 플리커 에임(Canvas 30초), 이동 타겟(Canvas 30초). 결과 클립보드 공유 |
| `sensitivity-analyzer.js` | 연습실 영상 업로드 → 브라우저 내 Canvas API로 크로스헤어 이동 패턴 분석 → eDPI 역산 + 감도 추천. 서버 전송 없음. 크로스헤어 색상 5종 선택, DPI/인게임 감도 입력, 과보정/안정성 판정, 현재 vs 추천 eDPI 비교 |
| `recoil-quiz.js` | 반동 패턴 퀴즈. 8종 무기 패턴을 Canvas로 표시 → 4지선다 맞추기. 8라운드, 연속 정답(스트릭) 추적 |
| `crosshair-trainer.js` | 크로스헤어 배치 트레이너. 문·창문·코너 등 5가지 상황 Canvas. 클릭 → 정답 존과 거리 측정 → 0~3점 채점 |
| `daily-goals.js` | 일일 목표 트래커. K/D·데미지·킬·치킨 등 8종 목표 선택, 타겟 수치 설정. localStorage 저장, 날짜별 리셋 |
| `sens-preset.js` | 감도 프리셋 저장/공유. DPI·일반감도·수직감도·스코프감도 5종 저장. URL 공유(btoa). localStorage 최대 20개 |
| `weapon-meta.js` | 무기 메타 표. Update 40.1 기준 23종 픽률·승률·평균킬 정적 데이터. 테이블/티어 뷰 전환, 종류 필터, 컬럼 정렬 |
| `clan-war.js` | 클랜 내전 기록. 두 클랜 스코어·맵·모드·선수별 킬/딜/생존 입력. DB 저장(ClanWar + ClanWarPlayer). 클랜명 검색 |
| `settings-share.js` | 인게임 세팅 공유 게시판. 유형 필터(풀세팅/그래픽/마우스/키바인딩). 포럼 `settings` 카테고리 사용. SettingsCard 컴포넌트. |
| `settings-share/create.js` | 세팅 공유 글 작성. 유형별 섹션 분기(그래픽: 해상도·Hz·프리셋·AA / 마우스: DPI·감도·스코프감도5종 / 키바인딩: 자유텍스트). 이미지 URL 첨부. JSON contentJson(`__settings:true`) → forum content에 저장 |
| `recoil-pattern.js` | 반동 패턴 시뮬레이터. 8종 무기 20발 정규화 패턴. Canvas 애니메이션(RPM 기반). 부착물 토글(보정기/수직그립/앵글드그립). 보정 가이드·방향 화살표. **연습 모드** 탭: DPI 설정(100-16000, 프리셋)/스코프 모드(기본~6배)/3·2·1 카운트다운/Canvas 오버레이 버튼/착탄 정확도 채점 |
| `drop-calculator.js` | 낙하 지점 최적화 계산기. 7개 맵 선택. Canvas 3단계 클릭(경로시작→끝→목표). 낙하 범위 부채꼴 표시. 점프 타이밍·낙하 시간 계산 |
| `playstyle-matchup.js` | 14가지 플레이스타일 상성 매트릭스 (1-5점 척도, 클릭으로 행/열 강조) |
| `peek-trainer.js` | 피킹 트레이너 미니게임. Canvas 기반. SPACE/Q/E 피킹(200ms 딜레이 노출) → 마우스 클릭 사격. 헤드샷/바디샷/미스/피격 판정. 20초 게임, 점수·반응속도·헤드샷률 결과 |
| `battle-sim.js` | 능선 전략 시뮬레이터. 12×8 그리드 턴제 전술 게임 (현재 WIP, nav 숨김) |
| `pubg-survivors.js` | PUBG 테마 뱀파이어 서바이벌. Canvas 800×560. WASD 이동·자동 사격. **8캐릭터 선택 시스템**. **5단계 무기 강화** (Lv4:+발사체, Lv5:전설효과). **보급품 시스템** (50~80초 랜덤 투하, 낙하산 애니메이션, 전설무기 5종+사기급 아이템 5종, 전설진화 7종). **페이즈 기반 적 강화** (`getPhase()` 0~3단계: HP×8/DMG×2.8/SPD×1.38, eliteBoss/megaBoss 타입 추가, 스폰속도 phase별 가속). **카드뉴스 알림** (보스출현·보급품 투하 시 우측 상단 미니맵 하단 비차단 카드, `state.notifications[]` 배열+자동 소멸). `AIRDROP_WEAPONS/ITEMS/EVOS` 상수. 미니맵 금색 마커. 전설 진화 발광 연출 |
| `forum/index.js` | 포럼 메인 (카테고리 + 최근 게시글 목록 — 제목만 표시) |
| `forum/category/[categoryId].js` | 카테고리별 게시글 목록 (제목만 표시) |
| `forum/post/[postId].js` | 게시글 상세 (이미지 풀-와이드 렌더링) |
| `forum/create.js` | 글 작성 (이미지 드래그 앤 드롭 업로드 지원) |
| `admin/moderation.js` | 관리자: 신고 처리 |
| `admin/notices.js` | 관리자: 공지 관리 |
| `admin/index.js` | 관리자 대시보드. Google 세션(`sssyck123@gmail.com`) 자동 인증 + 비밀번호 폴백. 탭: 📬 문의함 / 👑 리더 변경 요청 / 👤 구글 로그인 유저. 헤더에 "← 메인" 버튼 |
| `about.js` | PK.GG 소개 (주요 기능, 데이터 출처, 면책 고지) |
| `terms.js` | 이용약관 |
| `contact.js` | 문의 폼. 유형 선택(5종) + 메시지 + 선택적 이메일. POST `/api/contact/submit` → `inquiries` 테이블 저장. 성공 시 "추가 문의하기" 리셋 |
| `mypage.js` | 마이페이지. 소속 클랜 카드: 태그·레벨·멤버수·평균MMR·지역·리더 표시. "상세보기 →" 링크(`/clan/[name]`). 클랜 리더 등록/변경 문의 UI |
| `_error.js` | SSR 에러 페이지 (Next.js 필수 — 없으면 "missing required error components" 루프 발생) |
| `404.js` | 404 Not Found 페이지 |
| `500.js` | 500 Internal Server Error 페이지 |

### pages/api/
| 경로 | 설명 |
|------|------|
| `pubg/[nickname].js` | 플레이어 기본 정보 |
| `pubg/stats/[...params].js` | 시즌/랭크/무기/생존 통계 |
| `pubg/player-id.js` | accountId 조회 |
| `pubg/compare.js` | 두 플레이어 시즌 스탯 비교 (`GET ?a=A&b=B&shard=steam`). DB캐시→PUBG API 순으로 playerId 조회, 시즌 스탯 병렬 fetch. |
| `pubg/playstyle.js` | 플레이스타일 분석 |
| `pubg/search.js` | 플레이어 검색. DB 먼저 조회 후 PUBG API 폴백. Redis 캐시(`search:{shard}:{nick}`, TTL 600s). `Cache-Control: s-maxage=60, stale-while-revalidate=300` |
| `player/ai-analysis.js` | AI 코칭 분석 결과 DB 저장/조회 (GROQ 아님 — 순수 DB 영속화). Redis 캐시(`ai-analysis:{playerId}:{shard}` 또는 `ai-analysis:nick:{nick}:{shard}`, TTL 3600s). POST: upsert → redisSet. GET: Redis HIT 우선, MISS → DB 조회 |
| `clan/batch-update.js` | 클랜 멤버 일괄 업데이트 |
| `clan/update-rankings.js` | 클랜 랭킹 업데이트 |
| `clan/get-members.js` | 클랜 멤버 조회 |
| `admin/auth.js` | 관리자 인증 (비밀번호 토큰) |
| `admin/clan-leader-requests.js` | 클랜 리더 변경 요청 관리. GET: 요청 목록. POST: `action=approve`(트랜잭션: 요청 승인 + clan.leader 업데이트) / `action=reject`. Google 세션 or 비밀번호 토큰 인증 |
| `admin/inquiries-panel.js` | 관리자 문의 목록 조회 (GET). Google 세션 인증 전용 |
| `admin/delete-inquiry.js` | 문의 삭제 (DELETE). Google 세션 인증 전용 |
| `user/set-clan-leader.js` | 클랜 리더 최초 등록. 이미 리더 있으면 409 `alreadyHasLeader: true` 반환 |
| `user/request-clan-leader.js` | 클랜 리더 변경 문의 제출. reason 5자 이상 필수. pending 중복 방지. `ClanLeaderRequest` 생성 |
| `contact/submit.js` | 문의 폼 제출. POST → `prisma.inquiry` 생성 |
| `cron/` | Vercel cron 작업들 |

### components/
| 경로 | 설명 |
|------|------|
| `player/WeaponMasteryCard.jsx` | 무기 숙련도 카드 (force prop으로 캐시 우회). `onReady(resolvedId, parsedWeapons[])` 콜백 prop — 로드 완료 시 상위 컴포넌트에 playerId + 무기 목록 전달 (AICoachingCard 중복 fetch 제거용) |
| `player/AICoachingCard.jsx` | AI 코칭 카드. `playerStats`, `playerInfo`, `masteryWeapons` props. `masteryWeapons`는 WeaponMasteryCard `onReady`에서 받음 → 내부 `/api/pubg/player-id`, `/api/pubg/stats/mastery` 중복 호출 없음. 분석 결과는 `/api/player/ai-analysis` POST로 저장 |
| `player/PlayerShareCard.jsx` | 플레이어 전적 공유 카드 (PNG 저장용, html-to-image 캡처). PlayerHeader에서 `cardRef` prop으로 연결 |
| `player/GrowthChart.jsx` | 성장 추적 차트 (Line chart). `nickname` + `shard` props. 클랜 배치업데이트 시 스냅샷 저장, 5개 지표 탭(MMR/딜/킬/승률/Top10) |
| `player/PlayerDashboard.jsx` | 플레이어 대시보드 |
| `player/PlayerHeader.jsx` | 플레이어 헤더 |
| `player/EnhancedPlayerStats.jsx` | 향상된 플레이어 통계 |
| `layout/Footer.jsx` | 공통 푸터. `useSession` — `session?.user?.isAdmin`일 때 "관리자 모드 보기" 버튼 표시. 숨겨진 admin 링크 제거됨 |
| `AdUnit.jsx` | 광고 유닛 |

### utils/
| 파일 | 설명 |
|------|------|
| `pubgApiCache.js` | PUBG API 인메모리 캐시 (TTL: PLAYER 10분, MATCH 30분, CLAN 15분, SEASON 60분). `cachedPubgFetch(url, {ttl, force})` |
| `weaponTestData.js` | 무기 성향 테스트 데이터 (v2). 12가지 타입, 각 타입에 `weaknesses`·`situationalGuide(3단계)`·`teamSynergy`·`counterType` 추가. 12문항(Q11 스코프배율·Q12 억울한상황 추가). `findTopTypes(vector, n)` — 유사도 상위 N개 반환 |
| `playerStatsUtils.js` | 플레이어 통계 유틸 |
| `pubgBatchApi.js` | 배치 API 처리 |
| `clanRegionAnalyzer.js` | 클랜 지역 분석 |
| `i18n.js` | 다국어 지원 (ko/en/ja/zh). `LanguageProvider` + `useT()` hook. localStorage `pkgg_lang`에 언어 저장. flat dot-notation 키 |
| `playstyleClassifier.js` | **통합 플레이스타일 분류기 (v3)**. `classifyPlaystyle(stats)` → `{ label, code, desc, color, bg, border, primary }`. 14가지 타입 (HYPER_CARRY~UNKNOWN). v3 신규: PRECISION_SNIPER(정밀 사수형)·EARLY_RUSHER(초반 러셔)·TACTICAL_LEADER(전술 리더형) 추가, `headshotRate` 입력 지원. `playstyle.js` / `aiCoaching.js` / `clan-analytics.js` 3곳에서 공용 사용 |
| `mmrCalculator.js` | PKGG 커스텀 MMR 계산. `calculateMMR(summary)` → number. `getMMRTier(mmr)` → 티어 정보 객체 |
| `aiCoaching.js` | AI 코칭 유틸. `analyzePlayStyle(stats)` — 내부적으로 `playstyleClassifier` 사용. `playStyle`(영문코드) + `playstyleLabel`(한국어) 반환 |
| `redis.js` | Upstash Redis 클라이언트 싱글톤. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 환경변수 미설정 시 null → graceful fallback. `redisGet(key)`, `redisSet(key, value, ttlSeconds)` 헬퍼. TTL 상수: `REDIS_TTL.PLAYER=600`, `REDIS_TTL.AI_ANALYSIS=3600`. `playerCacheKey(shard, nickname)` 키 헬퍼 |

### locales/
| 파일 | 설명 |
|------|------|
| `ko.json` | 한국어 번역 (기본값) |
| `en.json` | 영어 번역 |
| `ja.json` | 일본어 번역 |
| `zh.json` | 중국어(간체) 번역 |

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
- `RANK_META_STYLE`: 1순위(금), 2순위(은), 3순위(동) 스타일. `rankKey` 필드로 i18n 키 참조 (`t(meta.rankKey)`)
- 위치: 성향 타입 카드 하단, 레이더 차트 상단

### i18n 패턴
- `pages/_app.js`: `<LanguageProvider>` 로 전체 래핑
- `components/layout/Header.jsx`: 헤더 우측 언어 토글 버튼 (`KO|EN|JA|ZH`)
- 각 페이지/컴포넌트: `const { t } = useT()` 후 `t('키')` 사용
- 번역 키 네임스페이스: `nav.*`, `search.*`, `clan.*`, `player.*`, `wt.*` (weapon-test)
- **주의**: `useT()`에서 반환되는 `t`와 같은 이름 변수 충돌 방지
  - `setInterval` 반환값 → `const timer = setInterval(...)` (t 아님)
  - Array `.find()` 콜백 → `find((tp) => ...)` (t 아님)

### weaponsummaries 키 (대소문자 처리)
```js
const ws = data?.weaponsummaries ?? data?.WeaponSummaries ?? data?.weaponSummaries ?? {};
```

### Redis 캐싱 패턴
- `utils/redis.js` 싱글톤 — 환경변수 없으면 null, 호출부는 null 체크 없이 `redisGet`/`redisSet` 사용 (내부 null 가드)
- 캐시 키 규칙: `player:{shard}:{nick_lower}`, `search:{shard}:{nick_lower}`, `ai-analysis:{playerId}:{shard}`
- playerId 없을 때 ai-analysis 키: `ai-analysis:nick:{nick_lower}:{shard}`

### .next 캐시 주의사항
`git reset --hard` 또는 브랜치 전환 이후 반드시 `.next` 삭제 후 재시작:
```sh
rm -rf .next && npm run dev
```
미삭제 시 ENOENT 오류 또는 "missing required error components, refreshing..." 무한루프 발생.

### WeaponMasteryCard → AICoachingCard prop 연결
`player/[server]/[nickname].js`에서 중복 API 호출 제거 패턴:
```jsx
// [server]/[nickname].js
const [resolvedPlayerId, setResolvedPlayerId] = useState(null);
const [masteryWeapons, setMasteryWeapons] = useState(null);

<WeaponMasteryCard onReady={(id, weapons) => {
  setResolvedPlayerId(id);
  setMasteryWeapons(weapons);
}} />

<AICoachingCard
  playerInfo={{ ..., playerId: resolvedPlayerId }}
  masteryWeapons={masteryWeapons}
/>
```
AICoachingCard 내부에서 `/api/pubg/player-id`, `/api/pubg/stats/mastery` 를 직접 호출하지 않음 — WeaponMasteryCard가 이미 호출했으므로.

### 관리자 인증 패턴 (이중 인증)
모든 admin API는 비밀번호 토큰 OR Google 세션 둘 다 허용:
```js
const ADMIN_EMAIL = 'sssyck123@gmail.com'
async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  if (pw && pw === process.env.ADMIN_PASSWORD) return true
  const session = await getServerSession(req, res, authOptions)
  return session?.user?.email === ADMIN_EMAIL
}
```
- `pages/api/auth/[...nextauth].js` JWT 콜백에서 `token.email = user.email` 저장
- 세션 콜백에서 `session.user.isAdmin = token.email === ADMIN_EMAIL`
- 프론트엔드에서 `session?.user?.isAdmin`으로 관리자 UI 분기

### 클랜 리더 시스템
- **최초 등록**: `set-clan-leader.js` — `clan.leader`가 비어있으면 현재 사용자로 등록
- **변경 요청**: `request-clan-leader.js` — 이미 리더 있으면 `ClanLeaderRequest` 생성(pending)
- **관리자 승인**: `admin/clan-leader-requests.js` POST approve → `prisma.$transaction`으로 요청 상태 + clan.leader 동시 업데이트
- **마이페이지 UI**: 리더 없으면 "클랜 리더 등록" 버튼, 타인이 리더면 "리더 변경 문의" 팝업

### localStorage 캐시 TTL 패턴 (Header donations/count)
```js
const TTL = 5 * 60 * 1000;
const raw = localStorage.getItem('pkgg_donation_cache');
if (raw) {
  const { count, ts } = JSON.parse(raw);
  if (Date.now() - ts < TTL) { setDonationCount(count); return; }
}
// fetch → localStorage.setItem('pkgg_donation_cache', JSON.stringify({ count, ts: Date.now() }))
```

---

## Prisma 스키마 주요 모델

| 모델 | 테이블 | 설명 |
|------|--------|------|
| `Inquiry` | `inquiries` | 문의 내역. `topic`, `message`, `email?`, `createdAt` |
| `ClanLeaderRequest` | `clan_leader_requests` | 클랜 리더 변경 요청. `clanId`, `clanName`, `currentLeader`, `requestNickname`, `reason`, `status`(pending/approved/rejected) |
| `ClanWar` | `clan_wars` | 클랜 내전 기록 |
| `ClanWarPlayer` | `clan_war_players` | 내전 선수별 기록 |
| `PlayerStatSnapshot` | `player_stat_snapshots` | 성장 추적 스냅샷 (하루 1회 자동 저장) |

> **스키마 변경 후 필수**: `npx prisma generate` + 개발서버 재시작 + Supabase SQL Editor에서 테이블 생성(migrate 미사용)

---

## 환경변수 (Vercel)
- `PUBG_API_KEY` — PUBG API 키
- `DATABASE_URL` — PostgreSQL 연결 문자열
- `ADMIN_PASSWORD` — 관리자 패스워드 (admin/auth.js)
- `CRON_SECRET` — Vercel cron 작업 인증
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST URL (미설정 시 Redis 비활성화, graceful fallback)
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST 토큰

> **중요**: `.env.local`은 로컬 전용. Vercel 배포 시 위 변수를 반드시 **Vercel 대시보드 → Settings → Environment Variables** 에 등록해야 함. 미등록 시 PUBG API 및 배치 업데이트 실패.

---

## 최근 주요 변경 이력

### 2026-05-19 공식 랭킹 페이지 추가
- **leaderboard.js** (`pages/leaderboard.js`): PUBG 공식 경쟁전 랭킹 TOP 500. 서버(아시아/북미/유럽/동남아/남미)·모드(스쿼드/듀오/솔로)·시점(FPP/TPP) 필터. 상위 3명 금/은/동 뱃지. 내 닉네임 강조(localStorage 자동 로드). KDA·평균딜·승률 컬러 코딩
- **pages/api/pubg/leaderboard.js**: PUBG 리더보드 API 래퍼. platform=pc-as/pc-na/pc-eu/pc-sea/pc-sa, gameMode=squad-fpp 등. 2시간 인메모리 캐시. 시즌 ID 자동 조회(30분 캐시). 500명 반환
- **헤더 네비 추가**: analysisLinks 최상단에 🏆 공식 랭킹 (highlight) 추가
- **주의**: 리더보드 API shard는 steam/kakao X → pc-as/pc-na/pc-eu 등 지역 코드 사용

### 2026-05-19 팀 분석 개선
- **RecentTeammatesCard 신규** (`components/charts/RecentTeammatesCard.jsx`): 최근 경기에서 함께한 모든 플레이어 집계 (클랜 여부 무관). 함께한 경기 수 순 정렬, 내 딜량 평균·승률·평균 등수 표시. 상위 10명 노출
- **팀 분석 탭 구성 변경** (`player/[server]/[nickname].js`): 클랜원 시너지(SynergyHeatmap) 위에 RecentTeammatesCard 항상 표시. 클랜 소속 시 클랜원 시너지 추가 노출

### 2026-05-07 관리자·인증·클랜 리더 시스템
- **관리자 Google 인증 통합**: `pages/api/auth/[...nextauth].js` — JWT/세션 콜백에서 `isAdmin` 플래그(`sssyck123@gmail.com`). Footer에 관리자 모드 보기 버튼(조건부 노출). Footer 숨겨진 admin 링크 제거
- **관리자 대시보드 탭 개편**: 탭 3종 (📬 문의함 / 👑 리더 변경 요청 / 👤 구글 로그인 유저). "← 메인" 버튼 추가. Google 세션 자동 인증 (비밀번호 입력 불필요)
- **관리자 API 이중 인증**: `admin/inquiries.js`, `admin/users.js`, `admin/clan-leader-requests.js` — 비밀번호 토큰 OR Google 세션 모두 허용하는 `checkAdmin(req, res)` 패턴
- **FloatingInquiryPanel 추가** (`pages/_app.js`): 관리자(`isAdmin`) 로그인 시 좌측 하단 "피드백확인" 플로팅 버튼. 클릭 시 문의 목록 패널 (항목별 펼침/접힘, 🗑 삭제). `/api/admin/inquiries-panel` + `/api/admin/delete-inquiry` API 신규
- **문의 폼 실제 기능화** (`pages/contact.js`): 유형 선택 + 메시지 + 선택 이메일 폼. `/api/contact/submit` → `inquiries` 테이블. 성공 상태 UI
- **FloatingFeedback → inquiries 저장**: `/api/feedback.js` — 버그/제안 피드백을 `inquiries` 테이블에 저장
- **Prisma 스키마 추가**: `Inquiry` (`inquiries`) + `ClanLeaderRequest` (`clan_leader_requests`) 모델. Supabase SQL Editor로 직접 테이블 생성
- **클랜 리더 시스템**:
  - `set-clan-leader.js`: 최초 등록 전용 (이미 리더 있으면 409)
  - `request-clan-leader.js`: 리더 변경 문의 생성 (reason 5자↑, pending 중복 방지)
  - `admin/clan-leader-requests.js`: 승인 시 `$transaction`으로 요청 상태 + `clan.leader` 동시 업데이트
- **마이페이지 클랜 카드** (`pages/mypage.js`): 태그·레벨·멤버수·평균MMR·지역·리더 표시. "상세보기 →" 링크(`/clan/[name]`). 리더 없으면 "클랜 리더 등록", 타인이 리더면 "리더 변경 문의" 팝업(현 리더 → 신청자 표시 + 사유 입력)
- **`/api/user/me.js` 확장**: clan 쿼리에 `pubgClanTag`, `pubgClanLevel`, `memberCount`, `avgScore`, `region`, `leader`, `description` 포함

### 2026-05-05 성능·안정성 개선
- **SSR 에러 페이지 추가** (`pages/_error.js`, `pages/404.js`, `pages/500.js`): 없으면 플레이어 검색 시 "missing required error components, refreshing..." 무한루프 발생. Next.js 필수 파일
- **`player/[server]/[nickname].js` 에러 처리 강화**: `getPlayerFromDB()` 호출을 main try-catch 블록 안으로 이동. `playerData` null + `error` prop 있을 때 스피너 대신 "뒤로 가기" 버튼 UI 표시
- **`utils/redis.js` 복원 + AI_ANALYSIS TTL 추가**: backup/2026-05-05-before-rollback 브랜치에서 복원. `REDIS_TTL.AI_ANALYSIS = 3600` 추가
- **`pages/api/pubg/search.js` 복원**: DB 먼저 조회 후 PUBG API 폴백. Redis 캐시(`search:{shard}:{nick}`, TTL 600s)
- **`pages/api/clan-analytics.js` 복원**: DB 쓰기 `Promise.all` 병렬화, `select` 최소화로 쿼리 최적화
- **메인 홈 뉴스 섹션 제거** (`pages/index.js`): `recentNews` 상태·로딩 함수·UI 블록 전체 삭제. 번들 6.57kB → 5.73kB
- **WeaponMasteryCard `onReady` 콜백 추가**: 무기 파싱 완료 시 `onReady(resolvedId, parsedWeapons[])` 호출 → 상위 컴포넌트에 playerId + 무기 목록 전달
- **AICoachingCard 중복 API 호출 제거**: `/api/pubg/player-id`, `/api/pubg/stats/mastery` 내부 fetch 제거. `masteryWeapons` prop으로 WeaponMasteryCard에서 데이터 수신. `WEAPON_CAT` 상수 38줄 제거. `playerId` POST body에 포함
- **`/api/player/ai-analysis` Redis 캐싱**: POST: Redis HIT 시 DB write 스킵. MISS 시 upsert → `redisSet(..., 3600)`. GET: Redis HIT 우선. 키: `ai-analysis:{playerId}:{shard}` (playerId 없으면 `ai-analysis:nick:{nick}:{shard}`)
- **Header `/api/donations/count` localStorage 5분 캐싱**: 매 페이지마다 DB 호출 방지. 키: `pkgg_donation_cache`, 값: `{ count, ts }`. `handleDonationComplete`도 캐시 갱신

### (이전 변경 이력)
- **신규 페이지 8종 추가**: 반동퀴즈·크로스헤어트레이너·일일목표·감도프리셋·무기메타·클랜내전·플레이어리뷰·매치히트맵. Header 훈련/nav 메뉴에 링크 추가. i18n 4개 언어 키 추가
- **DB 스키마 추가**: `ClanWar`, `ClanWarPlayer`, `PlayerReview` 모델 (Supabase SQL Editor에서 `prisma migrate` 필요)
- **API 추가**: `/api/clan-war` (GET/POST), `/api/clan-war/[id]` (GET/DELETE), `/api/player-review` (GET/POST/DELETE)
- **PlayerHeader 플레이어 리뷰 섹션**: 하단 토글 패널. 종합/팀플레이/소통 별점(1-5), 코멘트, 하루 1회 제한, 페이지네이션
- **감도 분석기 개선**: 반동 경로 → 배경 광학 흐름(Background Optical Flow) 기반으로 변경. `crossSensHint` 상태에 따라 현재 감도 기준 수직감도·스코프감도 추천 표시
- **PlayerHeader 스탯 카드 UI 통일 + 상세통계 버튼 추가**: 시즌 성과(blue)·최근 N경기(cyan)·경쟁전(amber) 3섹션 디자인 공통화. 각 섹션에 `▼ 상세 통계 보기` 버튼 추가. 시즌 성과 → 모드별(squad-fpp/squad/duo 등) 분리 통계, 최근 N경기 → 최고딜·K/D·총딜·평균생존 추가. `showSeasonDetails`, `showRecentDetails` state 추가
- **MMR 계산 v3 (정규화 복합지수)**: `utils/mmrCalculator.js` 완전 재작성. 6개 지표 정규화(0-1) 후 가중합산 × 15 + 1000. 범위 1000-2500, 7단계 티어(Bronze~Legend). `PlayerHeader` 인라인 공식 제거 → `calculateMMR()` 통일. `clan-analytics.js` avgAssists·avgSurviveTime 누락 버그 수정
- **즐겨찾기 기능**: `PlayerHeader` ☆/★ 버튼(localStorage `pkgg_favorites`). 홈 인라인 목록 + `FloatingFavorites` 사이드 패널(`_app.js`, 우측 하단 고정, 非홈·非어드민 전역 노출)
- **전적 공유 카드 PNG 저장**: `components/player/PlayerShareCard.jsx` + `PlayerHeader` 📷 버튼. `html-to-image` 캡처 (outer wrapper 오프스크린, ref는 inner 카드). `compare.js` BattleShareCard 동일 버그 수정
- **공개 클랜 디렉토리 추가** (`/clans`): `pages/clans.js` + `pages/api/clans/directory.js`. MMR 내림차순 랭킹, 지역·클랜명 필터, 20개씩 페이지네이션. 티어 뱃지(`getMMRTier`). 헤더 nav 링크 추가. i18n 4개 언어 `clans.*` 키 추가
- **플레이어 비교 페이지 추가** (`/compare?a=A&b=B`): `pages/compare.js` + `pages/api/pubg/compare.js`. Chart.js 레이더 차트(실제수치 툴팁·축별 실제값 테이블), 스탯 비교 바, 공유 URL. 헤더 nav 추가. `BattleShareCard` 컴포넌트 + `html-to-image` 라이브러리로 PNG 카드 저장 기능 추가 (`position: fixed, left: -9999px`로 캡처)
- **클랜 내부 랭킹 탭 추가** (`/clan/[clanName]` → 🏆 랭킹 탭): `pages/api/clan/[clanName]/ranking.js` + `ClanRankingTab` 컴포넌트. 3가지 서브탭: 전체 리더보드(정렬 기준 선택), 이번 주 MVP(PlayerMatch 7일 집계), 성장왕(PlayerStatSnapshot 비교). 1위 하이라이트 카드 UI
- **플레이스타일 분류기 v3**: 11종 → 14종으로 확장. 신규: 정밀 사수형(headshotRate≥40%), 초반 러셔(킬높음+생존짧음), 전술 리더형(승률+어시스트+Top10). `playstyle.js` API에서 `headshotKills` 집계 및 `headshotRate` 계산 후 분류기에 전달
- **성장 추적 기능 추가**: `PlayerStatSnapshot` DB 모델, `components/player/GrowthChart.jsx`, `pages/api/pubg/growth.js`. 클랜 배치업데이트(`batch-update.js`) 시 hasData=true인 경우 스냅샷 자동 저장. 플레이어 상세 페이지에 `GrowthChart` 컴포넌트 삽입. **DB 마이그레이션 필요**: Supabase SQL Editor에서 `player_stat_snapshots` 테이블 생성
- **클랜 상세 스쿼드 빌더 전면 개편**: `pages/clan/[clanName].js` `SquadCustomTab` 완전 재작성
  - 클랜원 다중선택 체크박스 리스트 (전체선택/해제, MMR 순 정렬)
  - 스쿼드 크기: 4인/3인/듀오 선택
  - 분류 방식: **밸런스형**(역할 균등분배) / **1군·2군·3군**(점수 상위·중·하 1/3 분리 후 각 그룹 내 스쿼드 편성)
  - 핵심 함수: `packSquads(members,size)`, `assignTiers(scored)`, `recommendSquads(members,size,mode)`
  - 서브컴포넌트: `MemberCard`, `SquadBlock`, `UnassignedRow`, `TIER_META`
- **PlayerDashboard 클랜원 목록 섹션 제거**: 클랜 접근 제어 설계와 충돌 방지
- **시너지 딜량 명칭 변경**: `SynergyHeatmap.jsx` "평균 딜량" → "파티 시 나의 평균 딜량" / `PlayerDashboard.jsx` "클랜원과 딜량" → "파티 시 내 평균 딜량"
- WeaponMasteryCard: 헤드샷 기능 제거 (PUBG Headshots 필드 = 킬이 아닌 히트 수)
- weapon-test: WeaponSlider 컴포넌트 추가 (PNG 이미지 + 탭 네비게이션)
- PUBG API: 세 소스 합산으로 무기 킬/데미지 통계 정확도 개선
- **AICoachingCard 개선**: 다시 생성하기 버튼 제거. 개선 우선순위를 단계별 현실적 목표로 수정(현재 수치 → +30~40 다음 단계 목표). 무기 추천 동적화: `playerInfo.playerId`로 `/api/pubg/stats/mastery` 조회 → AR 최다킬·SR/DMR 최다킬 무기를 자동 추천(`WEAPON_CAT` 룩업테이블), 데이터 없으면 정적 추천 유지
- **성장 스냅샷 자동 저장**: `savePlayerToDatabase()`에 스냅샷 저장 로직 추가. 플레이어 상세 페이지 방문 시 하루 1회 `PlayerStatSnapshot` 자동 생성 (avgDamage/avgKills > 0 인 경우만). 이제 클랜 배치 업데이트 없이도 성장 추적 가능
- **i18n 다국어 지원 추가** (ko/en/ja/zh): `utils/i18n.js`, `pages/_app.js` LanguageProvider, Header 언어 토글
  - 적용 완료: Header, Footer, index.js, clan-analytics.js, clan/[clanName].js, weapon-test/index.js, weapon-test/result/[id].js
- **로고/파비콘/OG 이미지 적용**: `/public/logo.png`, `/public/favicon.png`, `/public/og.png`. `pages/_document.js` 에서 전역 파비콘·OG 설정
- **메인 홈 리디자인**: hero 로고 이미지 교체, 오로라 그라디언트 CSS 배경으로 변경 (`styles/globals.css` aurora1/2/3 keyframes)
- **포럼 UI 개선**:
  - 게시글 목록 (category, 최근 목록): 미리보기 텍스트 제거 → 제목만 표시
  - 게시글 상세: 이미지 `-mx-6 w-full` 풀-와이드 렌더링
  - 글 작성: 이미지 드래그 앤 드롭 업로드 (`onDrop` → `uploadFile()`)
- **무기 데미지 표** (`pages/weapon-damage.js`): 공식 패치노트 기반, Update 41.1 기준. 타입 필터·정렬·DPS·방어구 시뮬레이터. ⚡(최신 패치 변경) / ℹ(이전 패치 이력) / 🗑️(삭제 예정) 툴팁 뱃지
  - 패치 이력 반영: U34.1(Mk12 추가), U36.1(VSS·AUG), U37.1(DMR 전체 너프), U38.1(MP5K), U39.1(반동 조정), U40.1(Mk12·SLR), U41.1(하이브리드 스코프 추가, 틸티드 그립 추가, 앵글 손잡이 삭제, 하프 그립 버프, Dragunov 반동 감소)
  - `deletePending: true` 필드: 42.1(2026년 6월) 삭제 예정 총기 → 🗑️ 뱃지 + 취소선. 대상: 모신 나강·R45·DP-28·PP-19 Bizon·P1911·QBU
  - Dragunov(SVD) 신규 추가: DMR·7.62mm·damage 56·RPM 240
  - `historyNote` 필드: 이전 패치 이력 → ℹ 툴팁
  - RPM/DPS 컬럼 헤더 마우스오버 툴팁 (`Tooltip` 컴포넌트 인라인 정의)
- **포럼 댓글 비밀번호 필수화**: 댓글 작성 시 삭제 비밀번호 4자 이상 필수 (게시글 동일)
- **정보 페이지 추가**: `pages/about.js`, `pages/terms.js`, `pages/contact.js` 생성
  - Footer에 About/개인정보/이용약관/문의 링크 4개 pill 버튼 표시 (`footer.*` i18n 키)
  - Contact 페이지: 문의 유형 선택 토글 + 유형별 안내 메시지
- **Footer 전역화 + variant 분기**: `pages/_app.js`에서 모든 페이지에 자동 노출. `Footer` 컴포넌트 `variant` prop (`dark`/`light`)
  - dark 페이지: `/`, `/weapon-damage`, `/clan-analytics`, `/player/*`, `/clan/*`, `/weapon-test/*`
  - `/admin/*` 페이지는 Footer 제외
- **무기 데미지표 패치노트 이력 버튼 컬러 개선**: 닫힌 상태 비-최신 항목을 gray 계열로 가시성 향상
- **파티 찾기 게시판 추가** (`pages/party.js`, `pages/party/create.js`): 포럼 `party` 카테고리 활용. 게시글 content에 `{ __party: true, mode, server, slotsNeeded, playtime, mic, mmrMin, mmrMax, description }` JSON 저장. 모드/서버/마이크 필터, PartyCard 컴포넌트. `pages/api/forum/init.js`에 party 카테고리 추가
- **플레이스타일 상성표 추가** (`pages/playstyle-matchup.js`): 14×14 매트릭스, 행=내 타입/열=상대 타입, 1-5점 척도. 클릭으로 행/열 강조, 호버 툴팁. `utils/playstyleClassifier.js`의 `TYPES` 사용
- **무기 데미지 표 비교 모드 추가**: `compareMode` toggle → `compareSet`(Set, 최대 3개) → `ComparePanel` 슬라이드 바 비교 (damage/RPM/DPS/body/head)
- **홈 검색 자동완성**: localStorage `pkgg_recent_searches` (최대 8개). 검색창 포커스 시 드롭다운, 닉네임 필터링. `removeRecentSearch` + `clearAllRecent` 지원
- **GrowthChart 개선**: 7일/30일/전체 기간 필터 (`period` state + `filteredSnaps`). 5개 지표 요약 카드 (클릭으로 활성 탭 변경, 첫 스냅샷 대비 델타 표시)
- **피킹 트레이너 추가** (`pages/peek-trainer.js`): Canvas 기반 피킹 연습 게임. SPACE/Q/E → 200ms 딜레이 후 노출 → 클릭 사격. 헤드샷 +150~200점, 바디샷 +80~130점, 피격 -50점. 20초 타이머, 점수·반응속도·헤드샷률 결과 화면. Header 훈련 메뉴에 추가
- **능선 전략 시뮬레이터 추가** (`pages/battle-sim.js`): 12×8 그리드 턴제 전술 게임. setup(배치) → combat(전투) → result(분석) 화면 전환. 지형: 능선(▲ +25% 공격), 엄폐(🪨 -35% 피해). 이동/사격 액션, AI 자동 턴. Header 훈련 메뉴에 추가
- **다크/라이트 테마 토글**: Header 🌙/☀️ 버튼. `pkgg_theme` localStorage 저장. `_app.js`에서 초기화 (저장값 → OS 설정 순). `tailwind.config.cjs` `darkMode: 'class'` 활용. `nav.playstyle_matchup` i18n 키 4개 언어 추가
- **전체 페이지 모바일 최적화**: `_document.js` viewport meta 태그 추가(전체 사이트 핵심 수정). `PlayerHeader`: 패딩 `px-4 sm:px-8`, 아바타 `w-12 sm:w-16`, 닉네임 `text-xl sm:text-3xl`, 액션버튼 아이콘전용(모바일)/텍스트(sm+), 시즌선택 `hidden sm:block`, 스탯 그리드 `md:grid-cols-3`. `GrowthChart`: 지표카드 `min-w-[60px]`, 요약배너 flex-wrap, 차트 패딩 반응형. `compare.js`: 검색폼 `flex-col sm:flex-row`

---

## 알려진 버그 및 개선 대기 항목 (2026-04-24 피드백 기반)

### 버그
- **이동경로 맵 이미지 오류** (`utils/mapUtils.js`): 알 수 없는 맵코드 fallback이 항상 `/maps/erangel.jpg`. 사녹(Savage_Main) 경기에서도 에란겔 이미지 표시될 수 있음. `Heaven_Main`, `Summerland_Main`, `Chimera_Main`, `Range_Main`도 에란겔로 고정됨. `pages/api/pubg/match-telemetry.js`의 `MAP_MAX` 좌표계도 mapName 형식 불일치 시 에란겔 기준으로 계산되어 경로 좌표 오차 발생
- **이동경로 기능 미완성**: `MatchDetailLog.jsx`에서 `match.telemetryUrl`을 사용하지만, `getServerSideProps`에서 recentMatches 데이터 구조에 `telemetryUrl` 필드가 없음 → 텔레메트리 데이터 항상 없음으로 표시됨

### 개선 대기 (구현 방향)
- **플로팅 검색창 위치 변경** (`pages/_app.js:64`): 현재 `fixed bottom-0 left-0 right-0` 중앙 하단 전역 노출. 가독성 방해 → 우측 사이드 고정 패널(`fixed right-4 bottom-24`)로 이동 권장. 접힘/펼침 토글 버튼 추가 고려
- **딜량 상위% 표시**: `AICoachingCard.jsx`에서 avgDamage를 "평균 이상" 대신 상위 몇% 인지 표시. PUBG 공식 통계 기준 일반 스쿼드 평균딜 약 200~250, 상위 10%가 약 500+ 기준으로 percentile 구간 적용 권장
- **AI 코칭 추천무기 세밀화**: `AICoachingCard.jsx` 무기 추천 시 실제 mastery 데이터 없는 경우에도 플레이스타일(K/D·딜량·헤드샷률)에 따라 개인화된 추천 제공. 현재 mastery 없으면 정적 M416+UMP45로 고정되는 문제
- **AI 코칭 개선포인트 추가**:
  - 수류탄킬 0이면 "건물 진입 전 투척류(수류탄) 선활용" 팁 추가
  - 용어 툴팁 시스템: "그리네이드", "DBNOs", "eDPI" 등 전문용어 옆 `?` 아이콘 + 마우스오버 설명 (배린이 친화)
- **최근 경기내역 기여도 지표**: winPlace 외 `killPlace`(킬 순위), 팀 내 딜량 기여율, 어시스트 포함 기여 킬수 표시
- **주사용 무기 등급/상위%** (`WeaponMasteryCard.jsx`): 판수 대비 딜량·킬 기준 무기별 등급 산정 (S/A/B/C). 상위 몇% 인지 상대 지표 표시
- **팀원 상세스탯에 MMR(PPS) 표시**: 최근 경기 teammatesDetail 섹션에서 닉네임 옆 소형 MMR 뱃지 표시. PlayerCache DB 조회 필요 (닉네임으로 `playerCache.score` 조회)
