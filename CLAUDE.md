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
| `player/[server]/[nickname].js` | 플레이어 상세 (무기, 시즌, 랭크 등) |
| `clan/[clanName].js` | 클랜 상세 |
| `clan-analytics.js` | 클랜 분석 |
| `weapon-test/index.js` | 무기 성향 테스트 (결과 포함) |
| `weapon-test/result/[id].js` | 무기 테스트 공유 결과 페이지 |
| `weapon-damage.js` | 무기 데미지 표 (57종, 타입 필터·정렬·DPS·방어구/헬멧 시뮬레이터·킬샷 계산) |
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
| `i18n.js` | 다국어 지원 (ko/en/ja/zh). `LanguageProvider` + `useT()` hook. localStorage `pkgg_lang`에 언어 저장. flat dot-notation 키 |

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
