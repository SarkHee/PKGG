// PUBG 뉴스 크롤링 테스트 (서버 없이 직접 실행)
// scripts/test-crawling.js

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

// PUBG 공식사이트 URL들
const PUBG_URLS = [
  'https://pubg.game.daum.net/News/List',
  'https://na.battlegrounds.pubg.com/news/',
  'https://www.pubg.com/news/',
];

async function testCrawling() {
  console.log('🔍 PUBG 뉴스 크롤링 테스트 시작...');

  for (const url of PUBG_URLS) {
    try {
      console.log(`\n📡 테스트 URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        timeout: 10000,
      });

      console.log(`✅ 응답 상태: ${response.status}`);

      const $ = cheerio.load(response.data);

      // 다양한 선택자 테스트
      const selectors = [
        'article',
        '.news-item',
        '.list-item',
        '.post-item',
        '.news_list_item',
        '[class*="news"]',
        '[class*="post"]',
        'h1, h2, h3, h4',
        'a[href*="news"]',
        'a[href*="post"]',
      ];

      let totalFound = 0;
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`  📄 ${selector}: ${elements.length}개 요소 발견`);
          totalFound += elements.length;

          // 첫 번째 요소의 텍스트 미리보기
          const firstText = elements.first().text().trim().substring(0, 100);
          if (firstText) {
            console.log(`     미리보기: "${firstText}..."`);
          }
        }
      }

      console.log(`📊 총 발견된 요소: ${totalFound}개`);

      // 제목과 링크 추출 시도
      const newsItems = [];
      $('a').each((i, elem) => {
        const $link = $(elem);
        const text = $link.text().trim();
        const href = $link.attr('href');

        if (text && href && text.length > 10 && text.length < 200) {
          newsItems.push({
            title: text.substring(0, 100),
            url: href.startsWith('http')
              ? href
              : `${new URL(url).origin}${href.startsWith('/') ? href : '/' + href}`,
          });
        }

        if (newsItems.length >= 5) return false; // 상위 5개만
      });

      if (newsItems.length > 0) {
        console.log('🎯 추출된 뉴스 항목:');
        newsItems.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.title}`);
          console.log(`     URL: ${item.url}`);
        });

        // 데이터베이스에 테스트 데이터 저장
        try {
          for (const item of newsItems.slice(0, 3)) {
            // 상위 3개만 저장
            await prisma.pubgNews.upsert({
              where: { url: item.url },
              update: {
                title: item.title,
                category: '테스트',
                updatedAt: new Date(),
              },
              create: {
                title: item.title,
                url: item.url,
                category: '테스트',
                publishDate: new Date(),
                priority: 5,
              },
            });
          }
          console.log('✅ 테스트 데이터 저장 완료');
        } catch (dbError) {
          console.error('❌ 데이터베이스 저장 실패:', dbError.message);
        }
      }
    } catch (error) {
      console.error(`❌ ${url} 크롤링 실패:`, error.message);
    }
  }

  // 저장된 뉴스 확인
  try {
    const savedNews = await prisma.pubgNews.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('\n📚 저장된 뉴스 목록:');
    savedNews.forEach((news, idx) => {
      console.log(`  ${idx + 1}. ${news.title}`);
      console.log(
        `     카테고리: ${news.category}, 우선순위: ${news.priority}`
      );
    });
  } catch (dbError) {
    console.error('❌ 데이터베이스 조회 실패:', dbError.message);
  }

  await prisma.$disconnect();
  console.log('\n🎉 테스트 완료!');
}

// 스크립트 실행
testCrawling().catch(console.error);
