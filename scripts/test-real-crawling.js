// 실제 크롤링 테스트 스크립트
// scripts/test-real-crawling.js

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { JSDOM } = require('jsdom');

const prisma = new PrismaClient();

async function testRealCrawling() {
  try {
    console.log('🚀 실제 PUBG 뉴스 크롤링 테스트 시작...');

    // Steam PUBG 뉴스 페이지 (가장 신뢰도가 높음)
    const url = 'https://store.steampowered.com/news/app/578080/?l=koreana';

    console.log(`📡 크롤링 URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      timeout: 10000,
    });

    console.log(`✅ HTTP 상태: ${response.status}`);
    console.log(`📊 응답 크기: ${response.data.length} bytes`);

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Steam 뉴스 페이지의 구조에 맞는 선택자
    const newsElements = document.querySelectorAll(
      '.newsPostBlock, .newsPostTitle, a[href*="announcement"]'
    );

    console.log(`🔍 발견된 뉴스 요소: ${newsElements.length}개`);

    const newsItems = [];

    newsElements.forEach((element, index) => {
      if (index >= 10) return; // 최대 10개까지만

      let title = '';
      let link = '';

      // 제목과 링크 추출
      if (element.tagName === 'A') {
        title = element.textContent?.trim();
        link = element.href;
      } else {
        const linkElement = element.querySelector('a');
        if (linkElement) {
          title = linkElement.textContent?.trim();
          link = linkElement.href;
        } else {
          title = element.textContent?.trim();
        }
      }

      if (title && title.length > 5 && title.length < 200) {
        console.log(`📰 뉴스 ${index + 1}: ${title.substring(0, 80)}...`);

        newsItems.push({
          title: title.substring(0, 150),
          url: link || `https://store.steampowered.com/news/app/578080/`,
          category:
            title.includes('Update') || title.includes('업데이트')
              ? '업데이트'
              : '공지사항',
          publishDate: new Date(),
          priority: index < 3 ? 10 : 5,
          summary: title.length > 50 ? title.substring(0, 50) + '...' : title,
        });
      }
    });

    if (newsItems.length > 0) {
      console.log(`\n🎉 ${newsItems.length}개 뉴스 항목 추출 성공!`);

      // 데이터베이스에 저장 테스트
      for (const item of newsItems.slice(0, 3)) {
        try {
          await prisma.pubgNews.upsert({
            where: { url: item.url },
            update: item,
            create: item,
          });
          console.log(`💾 저장 완료: ${item.title.substring(0, 50)}...`);
        } catch (saveError) {
          console.error('💥 저장 실패:', saveError.message);
        }
      }
    } else {
      console.log('❌ 뉴스 항목을 찾을 수 없습니다');

      // HTML 구조 분석
      console.log('\n🔍 HTML 구조 분석:');
      const allLinks = document.querySelectorAll('a');
      console.log(`- 총 링크 수: ${allLinks.length}`);

      const titles = document.querySelectorAll(
        'h1, h2, h3, h4, .title, [class*="title"]'
      );
      console.log(`- 제목 요소 수: ${titles.length}`);

      if (titles.length > 0) {
        console.log('- 제목 예시:');
        Array.from(titles)
          .slice(0, 5)
          .forEach((title, i) => {
            console.log(
              `  ${i + 1}. ${title.textContent?.trim().substring(0, 60)}...`
            );
          });
      }
    }
  } catch (error) {
    console.error('❌ 크롤링 테스트 실패:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.log('🌐 네트워크 연결을 확인해주세요.');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ 요청 시간이 초과되었습니다.');
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ 테스트 완료');
  }
}

// 스크립트 실행
testRealCrawling();
