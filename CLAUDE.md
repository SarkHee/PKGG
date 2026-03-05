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
| `playstyle-matchup.js` | 14가지 플레이스타일 상성 매트릭스 (1-5점 척도, 클릭으로 행/열 강조) |
| `forum/index.js` | 포럼 메인 (카테고리 + 최근 게시글 목록 — 제목만 표시) |
| `forum/category/[categoryId].js` | 카테고리별 게시글 목록 (제목만 표시) |
| `forum/post/[postId].js` | 게시글 상세 (이미지 풀-와이드 렌더링) |
| `forum/create.js` | 글 작성 (이미지 드래그 앤 드롭 업로드 지원) |
| `admin/moderation.js` | 관리자: 신고 처리 |
| `admin/notices.js` | 관리자: 공지 관리 |
| `admin/index.js` | 관리자 대시보드 |
| `about.js` | PK.GG 소개 (주요 기능, 데이터 출처, 면책 고지) |
| `terms.js` | 이용약관 |
| `contact.js` | 문의 페이지 (이메일 복사/전송, 문의 유형별 안내) |

### pages/api/
| 경로 | 설명 |
|------|------|
| `pubg/[nickname].js` | 플레이어 기본 정보 |
| `pubg/stats/[...params].js` | 시즌/랭크/무기/생존 통계 |
| `pubg/player-id.js` | accountId 조회 |
| `pubg/compare.js` | 두 플레이어 시즌 스탯 비교 (`GET ?a=A&b=B&shard=steam`). DB캐시→PUBG API 순으로 playerId 조회, 시즌 스탯 병렬 fetch. |
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
| `player/PlayerShareCard.jsx` | 플레이어 전적 공유 카드 (PNG 저장용, html-to-image 캡처). PlayerHeader에서 `cardRef` prop으로 연결 |
| `player/GrowthChart.jsx` | 성장 추적 차트 (Line chart). `nickname` + `shard` props. 클랜 배치업데이트 시 스냅샷 저장, 5개 지표 탭(MMR/딜/킬/승률/Top10) |
| `player/PlayerDashboard.jsx` | 플레이어 대시보드 |
| `player/PlayerHeader.jsx` | 플레이어 헤더 |
| `player/EnhancedPlayerStats.jsx` | 향상된 플레이어 통계 |
| `layout/Footer.jsx` | 공통 푸터 |
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

---

## 환경변수 (Vercel)
- `PUBG_API_KEY` — PUBG API 키
- `DATABASE_URL` — PostgreSQL 연결 문자열
- `ADMIN_PASSWORD` — 관리자 패스워드 (admin/auth.js)
- `CRON_SECRET` — Vercel cron 작업 인증

> **중요**: `.env.local`은 로컬 전용. Vercel 배포 시 위 변수를 반드시 **Vercel 대시보드 → Settings → Environment Variables** 에 등록해야 함. 미등록 시 PUBG API 및 배치 업데이트 실패.

---

## 최근 주요 변경 이력
- **PlayerHeader 스탯 카드 UI 통일 + 상세통계 버튼 추가**: 시즌 성과(blue)·최근 N경기(cyan)·경쟁전(amber) 3섹션 디자인 공통화. 각 섹션에 `▼ 상세 통계 보기` 버튼 추가. 시즌 성과 → 모드별(squad-fpp/squad/duo 등) 분리 통계, 최근 N경기 → 최고딜·K/D·총딜·평균생존 추가. `showSeasonDetails`, `showRecentDetails` state 추가
- **MMR 계산 v3 (정규화 복합지수)**: `utils/mmrCalculator.js` 완전 재작성. 6개 지표 정규화(0-1) 후 가중합산 × 15 + 1000. 범위 1000-2500, 7단계 티어(Bronze~Legend). `PlayerHeader` 인라인 공식 제거 → `calculateMMR()` 통일. `clan-analytics.js` avgAssists·avgSurviveTime 누락 버그 수정
- **즐겨찾기 기능**: `PlayerHeader` ☆/★ 버튼(localStorage `pkgg_favorites`). 홈 인라인 목록 + `FloatingFavorites` 사이드 패널(`_app.js`, 우측 하단 고정, 非홈·非어드민 전역 노출)
- **전적 공유 카드 PNG 저장**: `components/player/PlayerShareCard.jsx` + `PlayerHeader` 📷 버튼. `html-to-image` 캡처 (outer wrapper 오프스크린, ref는 inner 카드). `compare.js` BattleShareCard 동일 버그 수정
- **공개 클랜 디렉토리 추가** (`/clans`): `pages/clans.js` + `pages/api/clans/directory.js`. MMR 내림차순 랭킹, 지역·클랜명 필터, 20개씩 페이지네이션. 티어 뱃지(`getMMRTier`). 헤더 nav 링크 추가. i18n 4개 언어 `clans.*` 키 추가
- **플레이어 비교 페이지 추가** (`/compare?a=A&b=B`): `pages/compare.js` + `pages/api/pubg/compare.js`. Chart.js 레이더 차트(실제수치 툴팁·축별 실제값 테이블), 스탯 비교 바, 공유 URL. 헤더 nav 추가. `BattleShareCard` 컴포넌트 + `html-to-image` 라이브러리로 PNG 카드 저장 기능 추가 (`position: fixed, left: -9999px`로 캡처)
- **클랜 내부 랭킹 탭 추가** (`/clan/[clanName]` → 🏆 랭킹 탭): `pages/api/clan/[clanName]/ranking.js` + `ClanRankingTab` 컴포넌트. 3가지 서브탭: 전체 리더보드(정렬 기준 선택), 이번 주 MVP(PlayerMatch 7일 집계), 성장왕(PlayerStatSnapshot 비교). 1위 하이라이트 카드 UI
- **플레이스타일 분류기 v3**: 11종 → 14종으로 확장. 신규: 정밀 사수형(headshotRate≥40%), 초반 러셔(킬높음+생존짧음), 전술 리더형(승률+어시스트+Top10). `playstyle.js` API에서 `headshotKills` 집계 및 `headshotRate` 계산 후 분류기에 전달
- **성장 추적 기능 추가**: `PlayerStatSnapshot` DB 모델, `components/player/GrowthChart.jsx`, `pages/api/pubg/growth.js`. 클랜 배치업데이트(`batch-update.js`) 시 hasData=true인 경우 스냅샷 자동 저장. 플레이어 상세 페이지에 `GrowthChart` 컴포넌트 삽입. **DB 마이그레이션 필요**: Supabase SQL Editor에서 `player_stat_snapshots` 테이블 생성
- **클랜 상세 페이지 커스텀 탭 추가**: `pages/clan/[clanName].js` 하단 `SquadCustomTab` + 알고리즘 함수들 (normalize, classifyRole, calcBalanceScore, recommendAllSquads, teamBalanceScore)
  - 스쿼드 추천: `recommendAllSquads(members)` → `{ squads: [[...4명], ...], unassigned: [...] }` 구조로 전체 클랜원을 4인 스쿼드로 분배
  - 역할 분배 로직: Phase1(각 역할별 상위 N명을 스쿼드에 1명씩), Phase2(나머지를 스코어순으로 채움)
  - 미배정 멤버: `members.length % 4` 나머지 → 하단에 별도 표시
  - state: `allSquads` (부모) → `setAllSquads` props로 전달
  - 역할 분류: dealer/fragger/survivor/support (정규화 기반)
  - 수동 교체: 슬롯 클릭 → 벤치 멤버 선택으로 swap
- **PlayerDashboard 클랜원 목록 섹션 제거**: 클랜 접근 제어 설계와 충돌 방지
- **시너지 딜량 명칭 변경**: `SynergyHeatmap.jsx` "평균 딜량" → "파티 시 나의 평균 딜량" / `PlayerDashboard.jsx` "클랜원과 딜량" → "파티 시 내 평균 딜량"
- WeaponMasteryCard: 헤드샷 기능 제거 (PUBG Headshots 필드 = 킬이 아닌 히트 수)
- weapon-test: WeaponSlider 컴포넌트 추가 (PNG 이미지 + 탭 네비게이션)
- PUBG API: 세 소스 합산으로 무기 킬/데미지 통계 정확도 개선
- **i18n 다국어 지원 추가** (ko/en/ja/zh): `utils/i18n.js`, `pages/_app.js` LanguageProvider, Header 언어 토글
  - 적용 완료: Header, Footer, index.js, clan-analytics.js, clan/[clanName].js, weapon-test/index.js, weapon-test/result/[id].js
- **로고/파비콘/OG 이미지 적용**: `/public/logo.png`, `/public/favicon.png`, `/public/og.png`. `pages/_document.js` 에서 전역 파비콘·OG 설정
- **메인 홈 리디자인**: hero 로고 이미지 교체, 오로라 그라디언트 CSS 배경으로 변경 (`styles/globals.css` aurora1/2/3 keyframes)
- **포럼 UI 개선**:
  - 게시글 목록 (category, 최근 목록): 미리보기 텍스트 제거 → 제목만 표시
  - 게시글 상세: 이미지 `-mx-6 w-full` 풀-와이드 렌더링
  - 글 작성: 이미지 드래그 앤 드롭 업로드 (`onDrop` → `uploadFile()`)
- **무기 데미지 표** (`pages/weapon-damage.js`): 공식 패치노트 기반, Update 40.1 기준. 타입 필터·정렬·DPS·방어구 시뮬레이터. ⚡(최신 패치 변경) / ℹ(이전 패치 이력) 툴팁 뱃지
  - 패치 이력 반영: U34.1(Mk12 추가), U36.1(VSS 43→45, AUG 41→40), U37.1(DMR 전체 피해량 ~12%·발사속도 ~45% 감소), U38.1(MP5K 34→32), U39.1(SLR·SKS·AUG·M416·VSS 반동 조정), U40.1(Mk12·SLR 변경)
  - `historyNote` 필드: 이전 패치 이력 기록 → ℹ 뱃지 툴팁으로 표시
  - RPM/DPS 컬럼 헤더 마우스오버 툴팁 설명 추가 (`Tooltip` 컴포넌트 인라인 정의)
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
- **다크/라이트 테마 토글**: Header 🌙/☀️ 버튼. `pkgg_theme` localStorage 저장. `_app.js`에서 초기화 (저장값 → OS 설정 순). `tailwind.config.cjs` `darkMode: 'class'` 활용. `nav.playstyle_matchup` i18n 키 4개 언어 추가
