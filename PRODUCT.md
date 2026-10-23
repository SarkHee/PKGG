# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
PUBG(배틀그라운드) 플레이어, 주로 한국어 사용자(ko/en/ja/zh 지원). 자신이나 팀원·상대의 전적을 확인하고, 클랜을 운영하고, 에임·감도 훈련 도구를 쓰는 사람. 모바일과 데스크톱 모두 사용. (추정: 코드와 CLAUDE.md 기준, 사용자 인터뷰로 확인하지 않음)

## Product Purpose
PK.GG는 PUBG 플레이어 통계·전적 조회 웹앱이다. 닉네임 검색으로 시즌·랭크·무기 숙련도·최근 경기·성장 추적·AI 코칭을 보여 주고, 클랜 디렉토리·분석, 플레이어 비교, 훈련 미니게임, 무기 데미지 표 등을 제공한다.

## Positioning
PKGG 자체 MMR(정규화 복합지수, 1000-2500, 7단계 티어)과 14종 플레이스타일 분류, 성장 스냅샷 추적, 클랜 단위 분석.

## Capabilities and Constraints
- Next.js(pages router) + Tailwind CSS(`darkMode: 'class'`), Prisma/PostgreSQL, PUBG 공식 API.
- 다크/라이트 테마 토글, i18n 4개 언어(`useT()`), 즐겨찾기, 전적 공유 카드 PNG 저장, 모바일 최적화.
- 이벤트/TDM 경기는 통계에서 제외하는 필터링 규칙 유지.
- 이번 작업은 기능·데이터·i18n 키를 모두 유지하고 레이아웃과 스타일만 교체한다.

## Brand Commitments
로고(`/public/logo.png`), 파비콘, OG 이미지, 서비스명 PK.GG는 유지. 색감은 이번 작업에서 새로 정해도 됨(사용자 확인).

## Evidence on Hand
실데이터는 PUBG API와 DB에서 온다. 후기·고객 수치 등 상업적 주장은 만들지 않는다.

## Product Principles
- 숫자가 먼저 읽혀야 한다: 핵심 지표는 한눈에, 세부는 펼쳐서.
- 기존 기능과 데이터를 잃지 않는다.
- 모바일에서도 같은 정보 우선순위를 유지한다.
