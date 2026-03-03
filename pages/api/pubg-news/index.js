import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// PUBG 이벤트 페이지 크롤링 함수
async function crawlPubgEvents() {
  try {
    console.log('🔄 PUBG 이벤트 페이지 크롤링 시작...');

    // PUBG 이벤트 페이지
    const response = await fetch(
      'https://www.pubg.com/ko/events/g-dragonxpubg',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const newsItems = [];

    // 페이지 메인 타이틀과 설명 추출
    const mainTitle =
      $('h1').first().text().trim() ||
      $('.main-title, .page-title, .event-title').first().text().trim() ||
      $('title').text().trim();

    const mainDescription =
      $('meta[name="description"]').attr('content') ||
      $('.main-content p').first().text().trim() ||
      $('.description, .summary').first().text().trim();

    const mainImage =
      $('meta[property="og:image"]').attr('content') ||
      $('.main-image img, .hero-image img').first().attr('src') ||
      $('img').first().attr('src');

    // 메인 이벤트 정보를 첫 번째 아이템으로 추가
    if (mainTitle && mainTitle.length > 5) {
      newsItems.push({
        title: mainTitle,
        summary:
          mainDescription ||
          'PUBG x DRAGON 특별 콜라보레이션 이벤트에 참여하세요!',
        link: 'https://www.pubg.com/ko/events/g-dragonxpubg',
        imageUrl: mainImage
          ? mainImage.startsWith('http')
            ? mainImage
            : `https://www.pubg.com${mainImage}`
          : null,
        publishedAt: new Date(),
        source: 'PUBG_EVENTS',
        category: '이벤트',
      });
    }

    // 추가적인 컨텐츠/섹션들 크롤링
    $(
      '.content-section, .event-section, .info-section, section, .card, article'
    ).each((index, element) => {
      const $item = $(element);

      // 제목 추출 (더 구체적인 셀렉터)
      const title = $item
        .find(
          'h1, h2, h3, h4, .title, .headline, .section-title, .card-title, .event-name'
        )
        .first()
        .text()
        .trim();

      // 내용 추출
      const summary = $item
        .find('.description, .content, .summary, .text, p')
        .first()
        .text()
        .trim();

      // 이미지 추출
      let imageUrl = $item.find('img').first().attr('src');
      if (!imageUrl) {
        const bgImage = $item
          .find('.image, .thumbnail, .banner')
          .css('background-image');
        if (bgImage && bgImage.includes('url(')) {
          const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (urlMatch) imageUrl = urlMatch[1];
        }
      }

      // 링크 추출
      let link = $item.find('a').first().attr('href');
      if (!link && $item.closest('a').length) {
        link = $item.closest('a').attr('href');
      }

      if (title && title.length > 5 && title !== mainTitle) {
        const fullLink = link
          ? link.startsWith('http')
            ? link
            : `https://www.pubg.com${link}`
          : 'https://www.pubg.com/ko/events/g-dragonxpubg';
        const fullImageUrl = imageUrl
          ? imageUrl.startsWith('http')
            ? imageUrl
            : `https://www.pubg.com${imageUrl}`
          : null;

        newsItems.push({
          title,
          summary: summary || '',
          link: fullLink,
          imageUrl: fullImageUrl,
          publishedAt: new Date(),
          source: 'PUBG_EVENTS',
          category: '이벤트',
        });
      }
    });

    // 만약 특별한 컨텐츠가 없다면 기본 샘플 데이터 추가
    if (newsItems.length === 0) {
      newsItems.push({
        title: 'PUBG x DRAGON 콜라보레이션 이벤트',
        summary:
          '특별한 PUBG와 DRAGON의 콜라보레이션 이벤트가 진행 중입니다. 독특한 보상과 새로운 콘텐츠를 경험해보세요!',
        link: 'https://www.pubg.com/ko/events/g-dragonxpubg',
        imageUrl: null,
        publishedAt: new Date(),
        source: 'PUBG_EVENTS',
        category: '이벤트',
      });
    }

    console.log(`✅ PUBG 이벤트 ${newsItems.length}개 크롤링 완료`);
    console.log(
      '크롤링된 항목들:',
      newsItems.map((item) => ({
        title: item.title,
        hasImage: !!item.imageUrl,
      }))
    );

    return newsItems;
  } catch (error) {
    console.error('❌ PUBG 이벤트 크롤링 실패:', error);

    // 크롤링 실패 시 기본 이벤트 정보 반환
    return [
      {
        title: 'PUBG x DRAGON 특별 이벤트',
        summary:
          '현재 진행 중인 PUBG와 DRAGON의 특별한 콜라보레이션 이벤트입니다.',
        link: 'https://www.pubg.com/ko/events/g-dragonxpubg',
        imageUrl: null,
        publishedAt: new Date(),
        source: 'PUBG_EVENTS',
        category: '이벤트',
      },
    ];
  }
}

// 날짜 파싱 함수
function parseDate(dateText) {
  if (!dateText) return new Date();

  try {
    // 다양한 날짜 형식 처리
    if (dateText.includes('일 전')) {
      const days = parseInt(dateText);
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    }

    if (dateText.includes('시간 전')) {
      const hours = parseInt(dateText);
      const date = new Date();
      date.setHours(date.getHours() - hours);
      return date;
    }

    // ISO 날짜 또는 일반적인 날짜 형식
    return new Date(dateText);
  } catch (error) {
    console.error('날짜 파싱 오류:', error);
    return new Date();
  }
}

// Steam 뉴스 API를 통한 PUBG 뉴스 가져오기 (대안)
async function fetchSteamPubgNews() {
  try {
    console.log('🔄 Steam PUBG 뉴스 가져오기 시작...');

    // PUBG Steam 앱 ID: 578080
    const response = await fetch(
      'https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=578080&count=10&maxlength=300&format=json'
    );

    if (!response.ok) {
      throw new Error(`Steam API error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.appnews || !data.appnews.newsitems) {
      return [];
    }

    const newsItems = data.appnews.newsitems.map((item) => ({
      title: item.title,
      summary: item.contents.substring(0, 200) + '...',
      link: item.url,
      imageUrl: null,
      publishedAt: new Date(item.date * 1000), // Unix timestamp
      source: 'STEAM_PUBG',
    }));

    console.log(`✅ Steam PUBG 뉴스 ${newsItems.length}개 가져오기 완료`);
    return newsItems;
  } catch (error) {
    console.error('❌ Steam PUBG 뉴스 가져오기 실패:', error);
    return [];
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { refresh = false } = req.query;

      // 캐시된 뉴스 조회 (최근 1시간 이내)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (!refresh) {
        const cachedNews = await prisma.pubgNews.findMany({
          where: {
            createdAt: { gte: oneHourAgo },
          },
          orderBy: { publishedAt: 'desc' },
          take: 20,
        });

        if (cachedNews.length > 0) {
          console.log(`📦 캐시된 PUBG 뉴스 ${cachedNews.length}개 반환`);
          return res.status(200).json({
            success: true,
            data: cachedNews,
            cached: true,
            count: cachedNews.length,
          });
        }
      }

      // 새로운 뉴스 크롤링
      const [eventNews, steamNews] = await Promise.all([
        crawlPubgEvents(),
        fetchSteamPubgNews(),
      ]);

      const allNews = [...eventNews, ...steamNews];

      if (allNews.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: '새로운 뉴스를 찾을 수 없습니다.',
          count: 0,
        });
      }

      // 중복 제거 (제목 기준)
      const uniqueNews = allNews.filter(
        (news, index, self) =>
          index === self.findIndex((n) => n.title === news.title)
      );

      // DB에 저장
      const savedNews = [];
      for (const newsItem of uniqueNews) {
        try {
          // 기존 뉴스 확인 (제목과 링크로 중복 체크)
          const existing = await prisma.pubgNews.findFirst({
            where: {
              OR: [{ title: newsItem.title }, { link: newsItem.link }],
            },
          });

          if (!existing) {
            const saved = await prisma.pubgNews.create({
              data: {
                title: newsItem.title,
                summary: newsItem.summary,
                link: newsItem.link,
                imageUrl: newsItem.imageUrl,
                publishedAt: newsItem.publishedAt,
                source: newsItem.source,
              },
            });
            savedNews.push(saved);
          }
        } catch (saveError) {
          console.error('뉴스 저장 오류:', saveError);
        }
      }

      console.log(`💾 새로운 PUBG 뉴스 ${savedNews.length}개 저장 완료`);

      // 최신 뉴스 목록 반환
      const latestNews = await prisma.pubgNews.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 20,
      });

      return res.status(200).json({
        success: true,
        data: latestNews,
        cached: false,
        newItems: savedNews.length,
        count: latestNews.length,
      });
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} Not Allowed`,
      });
    }
  } catch (error) {
    console.error('PUBG 뉴스 API 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'PUBG 뉴스를 가져오는 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
}
