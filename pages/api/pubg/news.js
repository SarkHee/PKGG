import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// PUBG 뉴스 데이터 생성 함수 (여러 소스 크롤링)
async function generatePubgNews() {
  console.log('🔍 PUBG 뉴스 크롤링 시작...');

  const allNewsItems = [];

  // PUBG 공식 사이트 여러 페이지에서 뉴스 크롤링
  try {
    const pubgUrls = [
      'https://www.pubg.com/ko/main',
      'https://www.pubg.com/ko/news',
      'https://www.pubg.com/ko/events',
      'https://www.pubg.com/ko/news/pc',
      'https://www.pubg.com/ko/news/mobile',
    ];

    for (const pubgUrl of pubgUrls) {
      console.log(`📡 PUBG 공식 사이트 크롤링 시도: ${pubgUrl}`);

      try {
        const response = await axios.get(pubgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: 20000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          },
        });

        console.log(
          `✅ PUBG 사이트 응답 성공: ${response.status} (${pubgUrl})`
        );

        // Cheerio로 HTML 파싱
        const $ = cheerio.load(response.data);
        const newsItems = [];

        // PUBG 사이트의 다양한 뉴스 섹션 선택자들 (더 포괄적)
        const selectors = [
          // 메인 뉴스 섹션
          '.news-list .news-item',
          '.main-news .news-item',
          '.news-card',
          '.news-container .item',
          '.news-section a',
          '.article-list a',
          '.content-list a',

          // 뉴스/이벤트 링크들
          'a[href*="/news/"]',
          'a[href*="/events/"]',
          'a[href*="/patch"]',
          'a[href*="/update"]',
          'a[href*="/notice"]',

          // 클래스 기반 선택자
          '[class*="news"] a',
          '[class*="article"] a',
          '[class*="content"] a[href*="pubg.com"]',
          '[class*="event"] a',
          '[class*="notice"] a',
          '[class*="patch"] a',
          '[class*="update"] a',

          // 제목이나 타이틀 속성 기반
          'a[title*="업데이트"]',
          'a[title*="이벤트"]',
          'a[title*="패치"]',
          'a[title*="공지"]',
          'a[title*="소식"]',
          'a[title*="뉴스"]',

          // 일반적인 링크 패턴
          '.item a',
          '.card a',
          '.list-item a',
          '.post a',
        ];

        let foundNews = false;

        for (const selector of selectors) {
          try {
            const elements = $(selector);
            console.log(
              `🔍 셀렉터 "${selector}" 시도: ${elements.length}개 요소 발견`
            );

            if (elements.length > 0) {
              elements.each((index, element) => {
                if (newsItems.length >= 12) return false; // 각 URL당 최대 12개

                const $el = $(element);
                let title = '';
                let url = '';
                let imageUrl = '';
                let summary = '';

                // 제목 추출 (다양한 방법 시도)
                if ($el.is('a')) {
                  title =
                    $el.text().trim() ||
                    $el.attr('title') ||
                    $el.attr('alt') ||
                    '';
                  url = $el.attr('href') || '';
                } else {
                  const link = $el.find('a').first();
                  title =
                    link.text().trim() ||
                    link.attr('title') ||
                    $el.find('[class*="title"]').text().trim() ||
                    $el.find('h1,h2,h3,h4,h5,h6').text().trim() ||
                    $el.text().trim();
                  url = link.attr('href') || '';
                }

                // 요약/설명 추출
                summary =
                  $el
                    .find(
                      '[class*="desc"], [class*="summary"], [class*="excerpt"], p'
                    )
                    .first()
                    .text()
                    .trim() ||
                  $el
                    .siblings('[class*="desc"], [class*="summary"]')
                    .text()
                    .trim() ||
                  title;

                // 이미지 추출 (더 포괄적)
                const imgSelectors = [
                  $el.find('img'),
                  $el.parent().find('img'),
                  $el.siblings().find('img'),
                  $el.closest('[class*="item"], [class*="card"]').find('img'),
                ];

                for (const imgSet of imgSelectors) {
                  if (imgSet.length > 0) {
                    const img = imgSet.first();
                    imageUrl =
                      img.attr('src') ||
                      img.attr('data-src') ||
                      img.attr('data-lazy') ||
                      img.attr('data-original') ||
                      img.attr('srcset')?.split(' ')[0] ||
                      '';

                    if (imageUrl) {
                      if (!imageUrl.startsWith('http')) {
                        imageUrl = imageUrl.startsWith('/')
                          ? `https://www.pubg.com${imageUrl}`
                          : `https://www.pubg.com/${imageUrl}`;
                      }
                      break;
                    }
                  }
                }

                // URL 정리
                if (url && !url.startsWith('http')) {
                  url = url.startsWith('/')
                    ? `https://www.pubg.com${url}`
                    : `https://www.pubg.com/${url}`;
                }

                // 제목 정리 (불필요한 문자 제거)
                title = title
                  .replace(/[\n\r\t]+/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                summary = summary
                  .replace(/[\n\r\t]+/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();

                // 유효한 뉴스인지 확인 (더 엄격한 조건)
                const isValidNews =
                  title &&
                  title.length >= 5 &&
                  title.length <= 200 &&
                  url &&
                  url.includes('pubg.com') &&
                  !title.match(
                    /로그인|회원가입|다운로드|cookie|privacy|terms|이용약관|개인정보/i
                  ) &&
                  !url.match(
                    /login|signup|download|privacy|terms|cookie|footer|header/i
                  ) &&
                  (url.includes('/news/') ||
                    url.includes('/events/') ||
                    url.includes('/patch') ||
                    url.includes('/update') ||
                    url.includes('/notice') ||
                    title.match(
                      /업데이트|패치|이벤트|공지|소식|뉴스|신규|출시/i
                    ));

                if (isValidNews) {
                  // 카테고리 결정 (더 정밀)
                  let category = '공지사항';
                  const titleAndUrlLower = (title + ' ' + url).toLowerCase();

                  if (
                    titleAndUrlLower.match(
                      /update|업데이트|신규|new|launch|출시/
                    )
                  ) {
                    category = '업데이트';
                  } else if (
                    titleAndUrlLower.match(/event|이벤트|competition|경쟁|대회/)
                  ) {
                    category = '이벤트';
                  } else if (
                    titleAndUrlLower.match(/patch|패치|fix|수정|버그|hotfix/)
                  ) {
                    category = '패치노트';
                  } else if (
                    titleAndUrlLower.match(/season|시즌|랭크|ranked/)
                  ) {
                    category = '시즌정보';
                  } else if (
                    titleAndUrlLower.match(
                      /esports|e스포츠|tournament|토너먼트|championship/
                    )
                  ) {
                    category = 'e스포츠';
                  }

                  // 중복 확인 (제목과 URL 모두 체크)
                  const isDuplicate = newsItems.some((item) => {
                    const titleSimilarity =
                      item.title.substring(0, 50) === title.substring(0, 50);
                    const urlSame = item.url === url;
                    const titleTooSimilar =
                      (Math.abs(item.title.length - title.length) < 5 &&
                        item.title.includes(title.substring(0, 20))) ||
                      title.includes(item.title.substring(0, 20));
                    return titleSimilarity || urlSame || titleTooSimilar;
                  });

                  if (!isDuplicate) {
                    // 우선순위 계산 (더 정교)
                    let priority = 5;
                    if (newsItems.length < 2)
                      priority = 10; // 상위 2개는 높은 우선순위
                    else if (newsItems.length < 5) priority = 8;
                    else if (newsItems.length < 8) priority = 7;

                    // 특정 키워드가 있으면 우선순위 증가
                    if (title.match(/긴급|중요|업데이트|패치|이벤트/i))
                      priority += 2;

                    newsItems.push({
                      title: title.substring(0, 150),
                      url,
                      category,
                      publishDate: new Date(
                        Date.now() - newsItems.length * 8 * 60 * 60 * 1000
                      ), // 8시간씩 차이
                      priority,
                      summary:
                        summary && summary !== title
                          ? summary.substring(0, 200)
                          : title.length > 50
                            ? `${title.substring(0, 80)}...`
                            : title,
                      imageUrl: imageUrl || null,
                      isActive: true,
                      source: pubgUrl,
                    });

                    foundNews = true;
                    console.log(
                      `📰 뉴스 추가: ${title.substring(0, 50)}... (${category})`
                    );
                  }
                }
              });

              // 충분한 뉴스를 찾으면 다른 셀렉터는 건너뛰기
              if (foundNews && newsItems.length >= 8) break;
            }
          } catch (selectorError) {
            console.warn(
              `⚠️ 셀렉터 "${selector}" 처리 중 오류:`,
              selectorError.message
            );
            continue;
          }
        }

        if (newsItems.length > 0) {
          console.log(
            `🎉 ${pubgUrl}에서 ${newsItems.length}개 뉴스 크롤링 성공!`
          );
          allNewsItems.push(...newsItems);
        }
      } catch (urlError) {
        console.warn(`❌ ${pubgUrl} 크롤링 실패:`, urlError.message);
        continue;
      }
    }

    // 모든 뉴스를 수집한 후 중복 제거 및 정렬
    if (allNewsItems.length > 0) {
      const uniqueNews = [];
      const seenUrls = new Set();
      const seenTitles = new Set();

      allNewsItems
        .sort((a, b) => b.priority - a.priority) // 우선순위 순으로 정렬
        .forEach((item) => {
          const titleKey = item.title
            .substring(0, 50)
            .toLowerCase()
            .replace(/\s+/g, '');
          if (!seenUrls.has(item.url) && !seenTitles.has(titleKey)) {
            seenUrls.add(item.url);
            seenTitles.add(titleKey);
            uniqueNews.push(item);
          }
        });

      if (uniqueNews.length > 0) {
        console.log(
          `🎊 총 ${uniqueNews.length}개의 고유한 PUBG 뉴스를 성공적으로 크롤링했습니다!`
        );
        return uniqueNews.slice(0, 20); // 최대 20개 반환
      }
    }

    console.warn('⚠️ 모든 PUBG 사이트에서 뉴스를 찾지 못했습니다.');
  } catch (crawlError) {
    console.warn('❌ PUBG 공식 사이트 크롤링 실패:', crawlError.message);
  }

  // 크롤링 실패시 임시 뉴스 데이터 반환
  console.log('📰 크롤링 실패로 인해 임시 뉴스 데이터를 생성합니다...');

  return [
    {
      title: '[PUBG] 2024년 최신 업데이트 - 새로운 맵과 무기 추가',
      url: 'https://www.pubg.com/ko/news',
      category: '업데이트',
      publishDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
      priority: 10,
      summary:
        '신규 맵 Rondo와 새로운 무기 시스템이 추가된 대규모 업데이트가 출시되었습니다.',
      imageUrl: 'https://cdn1.pubg.com/pubgcom/images/news_default.jpg',
      isActive: true,
      source: 'fallback',
    },
    {
      title: '[이벤트] 윈터 페스티벌 2024 - 특별 스킨과 보상 획득 기회',
      url: 'https://www.pubg.com/ko/events',
      category: '이벤트',
      publishDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
      priority: 9,
      summary:
        '겨울 테마의 특별 이벤트가 시작되었습니다. 한정 스킨과 다양한 보상을 획득하세요.',
      imageUrl: null,
      isActive: true,
      source: 'fallback',
    },
    {
      title: '[패치노트] 31.2 패치 - 밸런스 조정 및 버그 수정',
      url: 'https://www.pubg.com/ko/news/pc',
      category: '패치노트',
      publishDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
      priority: 8,
      summary:
        '무기 밸런스 조정과 여러 버그 수정이 포함된 패치가 적용되었습니다.',
      imageUrl: null,
      isActive: true,
      source: 'fallback',
    },
    {
      title: '[e스포츠] PCS8 아시아 토너먼트 일정 발표',
      url: 'https://www.pubg.com/ko/esports',
      category: 'e스포츠',
      publishDate: new Date(Date.now() - 18 * 60 * 60 * 1000),
      priority: 7,
      summary:
        'PUBG Continental Series 8 아시아 지역 토너먼트 일정이 공개되었습니다.',
      imageUrl: null,
      isActive: true,
      source: 'fallback',
    },
    {
      title: '[공지사항] 서버 정기점검 안내 (매주 수요일)',
      url: 'https://www.pubg.com/ko/notice',
      category: '공지사항',
      publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      priority: 6,
      summary: '매주 수요일 오전 서버 정기점검이 진행됩니다.',
      imageUrl: null,
      isActive: true,
      source: 'fallback',
    },
  ];
}

// 뉴스를 데이터베이스에 저장하는 함수
async function saveNewsToDatabase(newsItems) {
  console.log(`💾 ${newsItems.length}개의 뉴스를 데이터베이스에 저장 중...`);

  const savedNews = [];

  for (const news of newsItems) {
    try {
      const savedItem = await prisma.pubgNews.upsert({
        where: { url: news.url },
        update: {
          title: news.title,
          category: news.category,
          priority: news.priority,
          summary: news.summary,
          imageUrl: news.imageUrl,
          isActive: news.isActive,
        },
        create: {
          title: news.title,
          url: news.url,
          category: news.category,
          publishDate: news.publishDate,
          priority: news.priority,
          summary: news.summary,
          imageUrl: news.imageUrl,
          isActive: news.isActive,
        },
      });

      savedNews.push(savedItem);
    } catch (error) {
      console.error(`❌ 뉴스 저장 실패 (${news.title}):`, error.message);
    }
  }

  console.log(
    `✅ ${savedNews.length}개의 뉴스가 데이터베이스에 저장되었습니다.`
  );
  return savedNews;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    console.log('🚀 PUBG 뉴스 API 시작...');

    const { action = 'list', category } = req.query;

    if (action === 'generate') {
      console.log('🔄 새로운 PUBG 뉴스 생성 요청...');

      // 새로운 뉴스 크롤링 및 생성
      const newNews = await generatePubgNews();

      if (newNews && newNews.length > 0) {
        // 데이터베이스에 저장
        const savedNews = await saveNewsToDatabase(newNews);

        res.status(200).json({
          success: true,
          message: `${savedNews.length}개의 새로운 PUBG 뉴스가 성공적으로 생성되었습니다.`,
          data: savedNews,
          generatedAt: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'PUBG 뉴스 생성에 실패했습니다.',
          data: [],
        });
      }
    } else {
      // 기존 뉴스 조회
      let whereCondition = { isActive: true };

      if (category && category !== 'all') {
        whereCondition.category = category;
      }

      const news = await prisma.pubgNews.findMany({
        where: whereCondition,
        orderBy: [{ priority: 'desc' }, { publishDate: 'desc' }],
        take: 50,
      });

      res.status(200).json({
        success: true,
        data: news,
        count: news.length,
        category: category || 'all',
      });
    }
  } catch (error) {
    console.error('❌ PUBG 뉴스 API 오류:', error);
    res.status(500).json({
      success: false,
      message: 'PUBG 뉴스 처리 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
}
