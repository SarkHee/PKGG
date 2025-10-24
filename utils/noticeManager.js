import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 기능 업데이트 공지사항을 자동으로 생성하는 함수
 * @param {Object} updateInfo - 업데이트 정보
 * @param {string} updateInfo.title - 업데이트 제목
 * @param {string} updateInfo.description - 업데이트 설명
 * @param {string} updateInfo.version - 버전 정보 (선택사항)
 * @param {Array<string>} updateInfo.features - 새 기능 목록
 * @param {Array<string>} updateInfo.improvements - 개선사항 목록
 * @param {Array<string>} updateInfo.fixes - 버그 수정 목록
 * @param {string} updateInfo.priority - 우선순위 (HIGH, NORMAL, LOW)
 * @param {boolean} updateInfo.isPinned - 고정 여부
 */
export async function createUpdateNotice(updateInfo) {
  try {
    const {
      title,
      description,
      version,
      features = [],
      improvements = [],
      fixes = [],
      priority = 'NORMAL',
      isPinned = false,
    } = updateInfo;

    // 공지사항 내용 자동 생성
    let content = description ? `${description}\n\n` : '';

    if (version) {
      content += `## 📦 버전: ${version}\n\n`;
    }

    if (features.length > 0) {
      content += `## ✨ 새로운 기능\n`;
      features.forEach((feature) => {
        content += `- ${feature}\n`;
      });
      content += '\n';
    }

    if (improvements.length > 0) {
      content += `## 🔧 개선사항\n`;
      improvements.forEach((improvement) => {
        content += `- ${improvement}\n`;
      });
      content += '\n';
    }

    if (fixes.length > 0) {
      content += `## 🐛 버그 수정\n`;
      fixes.forEach((fix) => {
        content += `- ${fix}\n`;
      });
      content += '\n';
    }

    content += `---\n\n업데이트가 적용되었습니다. 더 나은 서비스를 위해 지속적으로 개선해나가겠습니다.\n\n문의사항이 있으시면 **문의하기** 메뉴를 이용해주세요.`;

    // 요약 생성
    const summary =
      `${description || ''} ${features.length > 0 ? `새 기능 ${features.length}개` : ''} ${improvements.length > 0 ? `개선사항 ${improvements.length}개` : ''} ${fixes.length > 0 ? `버그수정 ${fixes.length}개` : ''}`.trim();

    // 데이터베이스에 저장
    const notice = await prisma.notice.create({
      data: {
        title: `🚀 ${title}`,
        content,
        summary: summary || title,
        type: 'UPDATE',
        priority,
        isPinned,
        author: '시스템',
      },
    });

    console.log(`✅ 업데이트 공지사항이 생성되었습니다 (ID: ${notice.id})`);
    return notice;
  } catch (error) {
    console.error('❌ 업데이트 공지사항 생성 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 점검 공지사항을 생성하는 함수
 * @param {Object} maintenanceInfo - 점검 정보
 * @param {string} maintenanceInfo.title - 점검 제목
 * @param {Date} maintenanceInfo.startTime - 점검 시작 시간
 * @param {Date} maintenanceInfo.endTime - 점검 종료 시간
 * @param {string} maintenanceInfo.reason - 점검 사유
 * @param {Array<string>} maintenanceInfo.affectedServices - 영향받는 서비스 목록
 */
export async function createMaintenanceNotice(maintenanceInfo) {
  try {
    const {
      title,
      startTime,
      endTime,
      reason,
      affectedServices = [],
    } = maintenanceInfo;

    const startStr = new Date(startTime).toLocaleString('ko-KR');
    const endStr = new Date(endTime).toLocaleString('ko-KR');
    const duration = Math.ceil(
      (new Date(endTime) - new Date(startTime)) / (1000 * 60)
    ); // 분 단위

    let content = `## 🔧 점검 안내\n\n`;
    content += `**점검 시간:** ${startStr} ~ ${endStr} (약 ${duration}분)\n\n`;

    if (reason) {
      content += `**점검 사유:** ${reason}\n\n`;
    }

    if (affectedServices.length > 0) {
      content += `**영향받는 서비스:**\n`;
      affectedServices.forEach((service) => {
        content += `- ${service}\n`;
      });
      content += '\n';
    }

    content += `점검 시간 동안 일시적으로 서비스 이용이 제한될 수 있습니다.\n\n`;
    content += `이용에 불편을 드려 죄송하며, 더 나은 서비스를 위해 최선을 다하겠습니다.`;

    const notice = await prisma.notice.create({
      data: {
        title: `🔧 ${title}`,
        content,
        summary: `${startStr} ~ ${endStr} 점검 예정`,
        type: 'MAINTENANCE',
        priority: 'HIGH',
        isPinned: true,
        showUntil: endTime,
        author: '시스템',
      },
    });

    console.log(`✅ 점검 공지사항이 생성되었습니다 (ID: ${notice.id})`);
    return notice;
  } catch (error) {
    console.error('❌ 점검 공지사항 생성 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 이벤트 공지사항을 생성하는 함수
 * @param {Object} eventInfo - 이벤트 정보
 * @param {string} eventInfo.title - 이벤트 제목
 * @param {string} eventInfo.description - 이벤트 설명
 * @param {Date} eventInfo.startDate - 이벤트 시작일
 * @param {Date} eventInfo.endDate - 이벤트 종료일
 * @param {Array<string>} eventInfo.rewards - 보상 목록
 * @param {string} eventInfo.howToParticipate - 참여 방법
 */
export async function createEventNotice(eventInfo) {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      rewards = [],
      howToParticipate,
    } = eventInfo;

    const startStr = new Date(startDate).toLocaleDateString('ko-KR');
    const endStr = new Date(endDate).toLocaleDateString('ko-KR');

    let content = `## 🎉 이벤트 안내\n\n`;
    content += `**이벤트 기간:** ${startStr} ~ ${endStr}\n\n`;

    if (description) {
      content += `${description}\n\n`;
    }

    if (howToParticipate) {
      content += `## 📋 참여 방법\n${howToParticipate}\n\n`;
    }

    if (rewards.length > 0) {
      content += `## 🎁 보상\n`;
      rewards.forEach((reward) => {
        content += `- ${reward}\n`;
      });
      content += '\n';
    }

    content += `많은 참여 부탁드립니다!`;

    const notice = await prisma.notice.create({
      data: {
        title: `🎉 ${title}`,
        content,
        summary: `${startStr} ~ ${endStr} 이벤트 진행`,
        type: 'EVENT',
        priority: 'NORMAL',
        isPinned: false,
        showUntil: endDate,
        author: '시스템',
      },
    });

    console.log(`✅ 이벤트 공지사항이 생성되었습니다 (ID: ${notice.id})`);
    return notice;
  } catch (error) {
    console.error('❌ 이벤트 공지사항 생성 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 사용 예시들을 export
export const examples = {
  updateNotice: {
    title: '클랜 분석 기능 대폭 업데이트',
    description: '클랜 분석 페이지가 더욱 강력해졌습니다!',
    version: 'v2.1.0',
    features: [
      '새로운 클랜 랭킹 시스템 추가',
      '클랜 멤버 상세 통계 확인 가능',
      '클랜 활동 트렌드 차트 추가',
    ],
    improvements: [
      '페이지 로딩 속도 50% 개선',
      '모바일 화면 최적화',
      '데이터 정확도 향상',
    ],
    fixes: [
      '일부 클랜 데이터가 표시되지 않는 문제 수정',
      '검색 기능 오류 수정',
    ],
    priority: 'HIGH',
    isPinned: true,
  },

  maintenanceNotice: {
    title: '정기 서버 점검',
    startTime: new Date('2024-09-02 02:00:00'),
    endTime: new Date('2024-09-02 04:00:00'),
    reason: '서버 성능 최적화 및 보안 업데이트',
    affectedServices: ['클랜 분석 서비스', '플레이어 검색 기능', '포럼 서비스'],
  },

  eventNotice: {
    title: '클랜 등록 이벤트',
    description: '새로운 클랜을 등록하고 특별 혜택을 받아보세요!',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-09-30'),
    rewards: [
      '클랜 프리미엄 배지 지급',
      '클랜 상세 통계 무료 제공',
      '우선 업데이트 알림 서비스',
    ],
    howToParticipate:
      '1. 클랜 분석 페이지에서 새 클랜 등록\n2. 클랜 멤버 5명 이상 확인\n3. 자동으로 이벤트 참여 완료',
  },
};
