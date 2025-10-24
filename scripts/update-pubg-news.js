// 자동 PUBG 뉴스 업데이트 스크립트
// scripts/update-pubg-news.js

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

async function crawlAndUpdateNews() {
  try {
    console.log('🚀 배그 뉴스 자동 업데이트 시작...');
    console.log('📅 시작 시간:', new Date().toLocaleString('ko-KR'));

    // localhost API 호출
    const response = await axios.post(
      'http://localhost:3000/api/pubg/news',
      {},
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success) {
      console.log('✅ 업데이트 완료!');
      console.log(
        `📊 결과: 신규 ${response.data.result.saved}개, 업데이트 ${response.data.result.updated}개`
      );
      console.log(`🎯 생성된 뉴스: ${response.data.generatedItems}개`);
    } else {
      console.error('❌ API 응답 오류:', response.data);
    }
  } catch (error) {
    console.error('❌ 자동 업데이트 실패:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('💡 서버가 실행되지 않았거나 포트가 다를 수 있습니다.');
      console.log('   `npm run dev` 명령어로 서버를 먼저 실행해주세요.');
    }
  } finally {
    console.log('📅 종료 시간:', new Date().toLocaleString('ko-KR'));
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  crawlAndUpdateNews()
    .then(() => {
      console.log('🎉 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 중 오류:', error);
      process.exit(1);
    });
}

module.exports = crawlAndUpdateNews;
