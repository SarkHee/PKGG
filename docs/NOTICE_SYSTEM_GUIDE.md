# 📋 PKGG 공지사항 시스템 가이드

## 개요

PKGG 공지사항 시스템은 사이트의 기능 업데이트, 점검 공지, 이벤트 등을 효율적으로 관리하고 사용자에게 알릴 수 있는 시스템입니다.

## 주요 기능

### ✨ 사용자 기능
- **다양한 공지 유형**: 기능 업데이트, 점검 공지, 이벤트, 일반 공지
- **우선순위별 표시**: HIGH, NORMAL, LOW 우선순위 지원
- **고정 공지**: 중요한 공지사항을 상단에 고정
- **필터링**: 공지 유형 및 우선순위별 필터링 가능
- **반응형 디자인**: 모바일/데스크톱 최적화
- **조회수 추적**: 공지사항별 조회수 자동 집계
- **공유 기능**: 네이티브 공유 API 지원

### 🔧 관리자 기능
- **공지사항 작성/수정/삭제**: 웹 인터페이스를 통한 관리
- **마크다운 지원**: 서식 있는 텍스트 작성 가능
- **자동 만료**: 특정 날짜에 자동으로 비활성화
- **배치 관리**: 여러 공지사항 일괄 관리

## 사용 방법

### 1. 사용자 - 공지사항 확인

```
헤더 메뉴의 "📋 공지사항" 클릭
→ 공지사항 목록에서 원하는 공지 선택
→ 상세 내용 확인
```

**URL**: `http://localhost:3000/notices`

### 2. 관리자 - 공지사항 작성

```
관리자 페이지 접속: http://localhost:3000/admin/notices
→ "새 공지사항 작성" 버튼 클릭
→ 필요 정보 입력 후 등록
```

필수 정보:
- **제목**: 공지사항 제목
- **내용**: 마크다운 형식 지원
- **유형**: GENERAL, UPDATE, MAINTENANCE, EVENT
- **우선순위**: HIGH, NORMAL, LOW
- **고정 여부**: 상단 고정 설정
- **표시 종료 시간**: 자동 만료 설정 (선택사항)

### 3. 자동 업데이트 공지 생성

기능 업데이트 시 자동으로 공지사항을 생성할 수 있습니다:

```bash
# 대화형 모드로 생성
node scripts/auto-update-notice.js

# 빠른 테스트용 생성
node scripts/auto-update-notice.js --quick

# 도움말 확인
node scripts/auto-update-notice.js --help
```

## API 엔드포인트

### 공지사항 목록 조회
```http
GET /api/notices?page=1&limit=10&type=UPDATE&priority=HIGH
```

**응답 예시**:
```json
{
  "notices": [
    {
      "id": 1,
      "title": "🚀 새로운 기능 업데이트",
      "summary": "클랜 분석 기능이 강화되었습니다...",
      "type": "UPDATE",
      "priority": "HIGH",
      "isPinned": true,
      "author": "관리자",
      "views": 1234,
      "createdAt": "2024-09-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### 개별 공지사항 조회
```http
GET /api/notices/{id}
```

### 공지사항 생성 (관리자)
```http
POST /api/notices
Content-Type: application/json

{
  "title": "새로운 공지사항",
  "content": "공지사항 내용",
  "type": "GENERAL",
  "priority": "NORMAL",
  "isPinned": false
}
```

## 공지 유형별 특징

### 📢 기능 업데이트 (UPDATE)
- **아이콘**: 🚀
- **특징**: 새 기능, 개선사항, 버그 수정 내용 포함
- **자동 생성**: `createUpdateNotice()` 함수 사용 가능

### 🔧 점검 공지 (MAINTENANCE)  
- **아이콘**: 🔧
- **특징**: 점검 시간, 영향받는 서비스 명시
- **자동 고정**: 기본적으로 상단 고정됨
- **자동 만료**: 점검 종료 시간에 자동 비활성화

### 🎉 이벤트 (EVENT)
- **아이콘**: 🎉
- **특징**: 이벤트 기간, 참여 방법, 보상 정보 포함
- **기간 제한**: 이벤트 종료 시 자동 비활성화

### 📋 일반 공지 (GENERAL)
- **아이콘**: 📋
- **특징**: 일반적인 공지사항 및 안내사항

## 개발자 가이드

### 새로운 공지 유형 추가

1. **데이터베이스 enum 수정**:
```sql
-- prisma/schema.prisma에서 type 필드의 enum에 새 값 추가
```

2. **프론트엔드 레이블 및 색상 추가**:
```javascript
// pages/notices/index.js
const getTypeLabel = (type) => {
  const typeMap = {
    // 새로운 유형 추가
    NEW_TYPE: '새로운 유형 이름'
  };
}

const getTypeColor = (type) => {
  const colorMap = {
    // 새로운 유형의 색상 추가
    NEW_TYPE: 'bg-purple-100 text-purple-800'
  };
}
```

### 자동 공지 생성 함수 추가

```javascript
// utils/noticeManager.js에 새 함수 추가
export async function createNewTypeNotice(info) {
  // 새로운 유형의 공지사항 생성 로직
}
```

## 데이터베이스 스키마

```prisma
model Notice {
  id           Int       @id @default(autoincrement())
  title        String    // 공지사항 제목
  content      String    // 공지사항 내용 (Markdown 지원)
  summary      String?   // 요약/미리보기 텍스트
  type         String    // 공지 타입 (UPDATE, MAINTENANCE, EVENT, GENERAL)
  priority     String    @default("NORMAL") // 우선순위 (HIGH, NORMAL, LOW)
  isActive     Boolean   @default(true) // 활성화 여부
  isPinned     Boolean   @default(false) // 상단 고정 여부
  showUntil    DateTime? // 표시 종료 시간 (선택적)
  author       String    @default("관리자") // 작성자
  views        Int       @default(0) // 조회수
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@map("notices")
}
```

## 모니터링 및 분석

### 조회수 추적
- 공지사항 조회 시 자동으로 조회수 증가
- 관리자 페이지에서 조회수 확인 가능

### 성능 최적화
- 페이지네이션을 통한 대량 데이터 처리
- 만료된 공지사항 자동 필터링
- 인덱스 최적화된 데이터베이스 쿼리

## 보안 고려사항

### XSS 방지
- 사용자 입력에 대한 적절한 이스케이프 처리
- `dangerouslySetInnerHTML` 사용 시 신뢰할 수 있는 내용만 허용

### 권한 관리
- 관리자 권한 확인 (향후 인증 시스템 추가 예정)
- API 엔드포인트 보호

## 향후 개선 계획

- [ ] 관리자 인증 시스템 추가
- [ ] 공지사항 카테고리 시스템
- [ ] 이메일/푸시 알림 연동
- [ ] 다국어 지원
- [ ] 공지사항 템플릿 시스템
- [ ] 통계 및 분석 대시보드

---

📞 **문의사항**: [📧 문의하기](http://localhost:3000/inquiry) 메뉴 이용
🔗 **관련 링크**: 
- [공지사항 페이지](http://localhost:3000/notices)
- [관리자 페이지](http://localhost:3000/admin/notices)
