const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function testPubgEventsCrawling() {
  try {
    console.log('🔄 PUBG 이벤트 페이지 크롤링 테스트 시작...');
    
    const response = await fetch('https://www.pubg.com/ko/events/g-dragonxpubg', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('📄 페이지 제목:', $('title').text());
    console.log('📝 메타 설명:', $('meta[name="description"]').attr('content'));
    console.log('🖼️ OG 이미지:', $('meta[property="og:image"]').attr('content'));
    
    // 모든 h1, h2, h3 태그 찾기
    console.log('\n📋 발견된 제목들:');
    $('h1, h2, h3').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 0) {
        console.log(`  ${$(el).prop('tagName')}: ${text}`);
      }
    });
    
    // 모든 이미지 찾기
    console.log('\n🖼️ 발견된 이미지들:');
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt');
      if (src) {
        console.log(`  ${src} (alt: ${alt || 'N/A'})`);
      }
    });
    
    console.log('\n✅ 크롤링 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 크롤링 테스트 실패:', error.message);
  }
}

testPubgEventsCrawling();
