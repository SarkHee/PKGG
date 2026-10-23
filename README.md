# PKGG

PUBG 전적·클랜 분석 웹앱. Next.js(pages router) + Prisma(PostgreSQL) + Tailwind.

## 다른 컴퓨터에서 시작하기

```bash
git clone https://github.com/SarkHee/PKGG.git
cd PKGG
nvm use            # Node 20 (.nvmrc). nvm이 없으면 Node 18.17~22 설치
npm install        # postinstall에서 prisma generate 자동 실행
cp .env.example .env.local   # 값 채우기 (아래 참고)
npm run dev        # http://localhost:3000
```

### 환경변수
- 가장 쉬운 방법: `npx vercel login` → `npx vercel link` → `npx vercel env pull .env.local`
- 수동: `.env.example`를 복사해 값을 채웁니다. 최소 `PUBG_API_KEY`, `DATABASE_URL`이 필요합니다.
- `.env.local`은 git에 올라가지 않습니다. 비밀값은 메신저·커밋에 붙여 넣지 마세요.

### DB가 없을 때
`DATABASE_URL`이 막혀 있어도 닉네임 검색은 PUBG API로 동작합니다. 클랜·리더보드·포럼처럼 DB가 필요한 화면은 비어 보입니다.

## 디자인
`styles/globals.css`의 `.crate-*` 클래스가 글라스/벤토 디자인 시스템입니다. 라이트/다크는 헤더의 토글(`pkgg_theme`)을 따릅니다.
`PRODUCT.md`에 제품 개요가 있습니다.

## 자주 쓰는 명령
| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드(prisma generate 포함) |
| `npm run lint` | ESLint |
