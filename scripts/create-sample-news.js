// 배그 뉴스 더미 데이터 생성
// scripts/create-sample-news.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleNews = [
  {
    title: '[공지] 배틀그라운드 윈터 업데이트 - 새로운 무기 및 차량 추가',
    url: 'https://pubg.game.daum.net/news/winter-update',
    category: '업데이트',
    publishDate: new Date('2024-12-15'),
    priority: 10,
    summary: '새로운 윈터 맵과 무기가 추가된 대규모 업데이트가 진행됩니다.'
  },
  {
    title: '[이벤트] 크리스마스 특별 이벤트 - 한정 스킨 지급',
    url: 'https://pubg.game.daum.net/news/christmas-event',
    category: '이벤트',
    publishDate: new Date('2024-12-20'),
    priority: 8,
    summary: '크리스마스를 맞아 특별한 스킨과 아이템을 획득할 수 있는 이벤트가 시작됩니다.'
  },
  {
    title: '[패치노트] 12월 정기 밸런스 패치',
    url: 'https://pubg.game.daum.net/news/december-patch',
    category: '패치노트',
    publishDate: new Date('2024-12-10'),
    priority: 7,
    summary: '무기 밸런싱 및 버그 수정 사항이 포함된 정기 패치가 적용됩니다.'
  },
  {
    title: '[공지] 서버 점검 안내 - 12월 25일',
    url: 'https://pubg.game.daum.net/news/maintenance-notice',
    category: '공지사항',
    publishDate: new Date('2024-12-23'),
    priority: 9,
    summary: '크리스마스 이벤트 적용을 위한 서버 점검이 진행됩니다.'
  },
  {
    title: '[경쟁전] 시즌 20 랭킹 시스템 개편',
    url: 'https://pubg.game.daum.net/news/season20-ranking',
    category: '경쟁전',
    publishDate: new Date('2024-12-18'),
    priority: 6,
    summary: '새로운 시즌과 함께 더욱 공정한 랭킹 시스템이 도입됩니다.'
  }
];

async function createSampleNews() {
  try {
    console.log('📝 배그 뉴스 샘플 데이터 생성 시작...');
    
    for (const newsItem of sampleNews) {
      await prisma.pubgNews.upsert({
        where: { url: newsItem.url },
        update: newsItem,
        create: newsItem
      });
      console.log(`✅ 생성: ${newsItem.title}`);
    }
    
    console.log(`\n🎉 총 ${sampleNews.length}개의 샘플 뉴스가 생성되었습니다!`);
    
    // 생성된 뉴스 확인
    const allNews = await prisma.pubgNews.findMany({
      orderBy: [
        { priority: 'desc' },
        { publishDate: 'desc' }
      ]
    });
    
    console.log('\n📚 저장된 전체 뉴스:');
    allNews.forEach((news, idx) => {
      console.log(`  ${idx + 1}. [${news.category}] ${news.title}`);
      console.log(`     우선순위: ${news.priority}, 날짜: ${news.publishDate?.toLocaleDateString('ko-KR') || '미상'}`);
    });
    
  } catch (error) {
    console.error('❌ 샘플 데이터 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
createSampleNews();
