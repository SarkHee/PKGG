# PostgreSQL 데이터베이스 설정 가이드

## 🚀 가장 쉬운 방법: Supabase (무료)

Supabase는 PostgreSQL을 자동으로 제공하는 오픈소스 Firebase 대체재입니다.

### Step 1: Supabase 회원가입
1. https://supabase.com 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. 프로젝트명: pkgg-database
5. 비밀번호 설정
6. 리전: 서울 선택 (Asia Pacific - Seoul)
7. "Create new project" 클릭

### Step 2: 데이터베이스 연결 정보 복사
Supabase 대시보드에서:
1. 왼쪽 메뉴 "Settings" → "Database"
2. "Connection string" 섹션 찾기
3. URI 탭 선택 (기본값)
4. 전체 문자열 복사

### Step 3: .env.local 업데이트
복사한 연결 문자열을 .env.local에 붙여넣기:

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

예시:
```
DATABASE_URL="postgresql://postgres:myPassword123@db.abcdefg.supabase.co:5432/postgres"
```

### Step 4: 마이그레이션 실행
터미널에서:
```bash
cd /Users/mac/Desktop/PKGG
npx prisma migrate deploy
```

---

## 대안: Docker로 로컬 PostgreSQL

### Step 1: Docker 설치
```bash
brew install docker
```

### Step 2: PostgreSQL 컨테이너 실행
```bash
docker run --name pkgg-postgres \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=pkgg_db \
  -p 5432:5432 \
  -d postgres:15
```

### Step 3: .env.local 업데이트
```
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/pkgg_db"
```

### Step 4: 마이그레이션 실행
```bash
npx prisma migrate deploy
```

---

## 권장: Railway.app (배포 단계에서 자동 설정)

배포할 때 Railway가 PostgreSQL을 자동으로 제공합니다.
지금은 Supabase로 테스트하고 배포 시 Railway 사용하세요.

---

**지금 Supabase로 진행하시겠습니까? (가장 간단함)**
