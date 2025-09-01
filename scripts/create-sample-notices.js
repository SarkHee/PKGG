const { PrismaClient } = require('@prisma/client');
const { createUpdateNotice, createMaintenanceNotice, createEventNotice, examples } = require('../utils/noticeManager.js');

const prisma = new PrismaClient();

async function createSampleNotices() {
  try {
    console.log('🚀 샘플 공지사항 생성 시작...');

    // 1. 일반 공지사항
    const welcomeNotice = await prisma.notice.create({
      data: {
        title: '🎉 PKGG 공지사항 시스템 오픈!',
        content: `## 안녕하세요! PKGG입니다.

새로운 **공지사항 시스템**이 오픈되었습니다!

### ✨ 주요 기능
- 사이트 업데이트 소식을 실시간으로 확인
- 점검 및 이벤트 공지 제공
- 중요 공지사항 상단 고정 기능
- 모바일 최적화된 반응형 디자인

### 📍 이용 방법
1. 상단 헤더의 **📋 공지사항** 메뉴 클릭
2. 원하는 공지사항을 선택하여 상세 내용 확인
3. 공유 기능을 통해 다른 사용자와 정보 공유

앞으로도 더 나은 서비스를 제공하기 위해 최선을 다하겠습니다.

문의사항이 있으시면 언제든지 **📧 문의하기** 메뉴를 이용해주세요!`,
        summary: '새로운 공지사항 시스템이 오픈되었습니다. 사이트 업데이트 소식을 실시간으로 확인하세요!',
        type: 'GENERAL',
        priority: 'HIGH',
        isPinned: true,
        author: '관리자'
      }
    });
    console.log('✅ 환영 공지사항 생성 완료');

    // 2. 업데이트 공지사항
    const updateNotice = await createUpdateNotice(examples.updateNotice);
    console.log('✅ 업데이트 공지사항 생성 완료');

    // 3. 점검 공지사항 (내일 새벽 2시-4시)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const maintenanceStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 2, 0);
    const maintenanceEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 4, 0);

    const maintenanceNotice = await createMaintenanceNotice({
      ...examples.maintenanceNotice,
      startTime: maintenanceStart,
      endTime: maintenanceEnd
    });
    console.log('✅ 점검 공지사항 생성 완료');

    // 4. 이벤트 공지사항
    const eventStart = new Date();
    const eventEnd = new Date();
    eventEnd.setDate(eventEnd.getDate() + 30);

    const eventNotice = await createEventNotice({
      ...examples.eventNotice,
      startDate: eventStart,
      endDate: eventEnd
    });
    console.log('✅ 이벤트 공지사항 생성 완료');

    // 5. 추가 일반 공지사항들
    const additionalNotices = [
      {
        title: '📊 클랜 랭킹 시스템 안내',
        content: `## 클랜 랭킹 시스템 소개

PKGG의 새로운 클랜 랭킹 시스템을 소개합니다!

### 🏆 랭킹 기준
- **평균 점수**: 클랜 멤버들의 평균 점수
- **멤버 수**: 활성 멤버 수
- **활동도**: 최근 매치 참여도
- **승률**: 클랜 전체 승률

### 📈 업데이트 주기
- 매일 자정에 자동 업데이트
- 실시간 데이터 반영

더 정확하고 공정한 랭킹 시스템을 위해 지속적으로 개선해나가겠습니다.`,
        type: 'GENERAL',
        priority: 'NORMAL',
        isPinned: false
      },
      {
        title: '🔧 서비스 개선 사항 안내',
        content: `## 최근 서비스 개선 사항

사용자 여러분의 소중한 의견을 반영하여 다음과 같은 개선을 완료했습니다:

### ✅ 완료된 개선사항
- 페이지 로딩 속도 최적화
- 검색 기능 정확도 향상  
- 모바일 화면 표시 개선
- 데이터 갱신 주기 단축

### 🔜 예정된 개선사항
- 플레이어 상세 통계 추가
- 클랜 비교 기능 개발
- 커뮤니티 기능 확장

계속해서 더 나은 서비스를 제공하기 위해 노력하겠습니다!`,
        type: 'UPDATE',
        priority: 'NORMAL',
        isPinned: false
      }
    ];

    for (const noticeData of additionalNotices) {
      await prisma.notice.create({
        data: {
          ...noticeData,
          summary: noticeData.content.substring(0, 100) + '...',
          author: '관리자'
        }
      });
    }
    console.log('✅ 추가 공지사항들 생성 완료');

    console.log('\n🎉 샘플 공지사항 생성이 모두 완료되었습니다!');
    console.log('📋 총 생성된 공지사항 수:', await prisma.notice.count());

  } catch (error) {
    console.error('❌ 샘플 공지사항 생성 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  createSampleNotices();
}

module.exports = { createSampleNotices };
