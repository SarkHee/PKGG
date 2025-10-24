#!/usr/bin/env node

/**
 * 기능 업데이트 시 자동으로 공지사항을 생성하는 스크립트
 * 사용법: node scripts/auto-update-notice.js
 */

const { createUpdateNotice } = require('../utils/noticeManager.js');

async function createUpdateNoticeFromInput() {
  try {
    console.log('🚀 새로운 업데이트 공지사항을 생성합니다.');
    console.log('각 항목을 입력하세요 (빈 값은 Enter로 건너뛸 수 있습니다):\n');

    // Node.js의 readline을 사용하여 사용자 입력 받기
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt) => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    // 기본 정보 입력
    const title = await question('업데이트 제목: ');
    const description = await question('업데이트 설명: ');
    const version = await question('버전 (예: v2.1.0): ');

    // 새 기능들 입력
    console.log('\n새로운 기능들을 입력하세요 (빈 줄 입력시 종료):');
    const features = [];
    while (true) {
      const feature = await question(`기능 ${features.length + 1}: `);
      if (!feature.trim()) break;
      features.push(feature);
    }

    // 개선사항들 입력
    console.log('\n개선사항들을 입력하세요 (빈 줄 입력시 종료):');
    const improvements = [];
    while (true) {
      const improvement = await question(
        `개선사항 ${improvements.length + 1}: `
      );
      if (!improvement.trim()) break;
      improvements.push(improvement);
    }

    // 버그 수정들 입력
    console.log('\n버그 수정 사항들을 입력하세요 (빈 줄 입력시 종료):');
    const fixes = [];
    while (true) {
      const fix = await question(`수정 ${fixes.length + 1}: `);
      if (!fix.trim()) break;
      fixes.push(fix);
    }

    // 우선순위 및 고정 여부
    const priorityInput = await question(
      '우선순위 (HIGH/NORMAL/LOW) [NORMAL]: '
    );
    const priority = priorityInput.toUpperCase() || 'NORMAL';

    const pinnedInput = await question('상단 고정? (y/N) [N]: ');
    const isPinned = pinnedInput.toLowerCase() === 'y';

    rl.close();

    if (!title.trim()) {
      console.log('❌ 제목은 필수입니다.');
      process.exit(1);
    }

    // 공지사항 생성
    console.log('\n📝 공지사항을 생성중...');

    const updateInfo = {
      title,
      description: description || undefined,
      version: version || undefined,
      features: features.length > 0 ? features : undefined,
      improvements: improvements.length > 0 ? improvements : undefined,
      fixes: fixes.length > 0 ? fixes : undefined,
      priority: ['HIGH', 'NORMAL', 'LOW'].includes(priority)
        ? priority
        : 'NORMAL',
      isPinned,
    };

    const notice = await createUpdateNotice(updateInfo);

    console.log('\n🎉 업데이트 공지사항이 성공적으로 생성되었습니다!');
    console.log(`📋 공지사항 ID: ${notice.id}`);
    console.log(`📝 제목: ${notice.title}`);
    console.log(`🔗 링크: http://localhost:3000/notices/${notice.id}`);
  } catch (error) {
    console.error('❌ 공지사항 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

// 미리 정의된 예시로 빠른 생성
async function createQuickUpdateNotice() {
  const quickUpdate = {
    title: '사용자 인터페이스 개선 업데이트',
    description: '더 나은 사용자 경험을 위한 UI/UX 개선을 완료했습니다.',
    version: `v${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}`,
    features: [
      '새로운 다크 모드 테마 추가',
      '반응형 디자인 최적화',
      '검색 결과 필터링 기능 강화',
    ],
    improvements: [
      '페이지 로딩 속도 30% 개선',
      '모바일 화면 터치 영역 확대',
      '접근성 개선 (키보드 네비게이션 지원)',
    ],
    fixes: [
      '일부 브라우저에서 발생하는 레이아웃 깨짐 현상 수정',
      '검색어 입력 시 발생하는 지연 문제 해결',
    ],
    priority: 'HIGH',
    isPinned: true,
  };

  try {
    const notice = await createUpdateNotice(quickUpdate);
    console.log('🎉 빠른 업데이트 공지사항이 생성되었습니다!');
    console.log(`📋 ID: ${notice.id}, 제목: ${notice.title}`);
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

// 명령행 인수 확인
const args = process.argv.slice(2);

if (args.includes('--quick') || args.includes('-q')) {
  createQuickUpdateNotice();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
사용법:
  node scripts/auto-update-notice.js          # 대화형 모드로 공지사항 생성
  node scripts/auto-update-notice.js --quick  # 미리 정의된 예시로 빠른 생성
  node scripts/auto-update-notice.js --help   # 이 도움말 표시

예시:
  # 대화형으로 상세 정보 입력하여 생성
  node scripts/auto-update-notice.js
  
  # 빠른 테스트용 공지사항 생성
  node scripts/auto-update-notice.js --quick
`);
} else {
  createUpdateNoticeFromInput();
}
