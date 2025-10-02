import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

// PUBG 공식 뉴스 크롤링 함수
async function crawlPubgNews() {
  try {
    console.log('🔄 PUBG 공식 뉴스 크롤링 시작...');
    
    // PUBG 공식 뉴스 페이지 (한국어)
    const response = await fetch('https://pubg.com/ko/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const newsItems = [];
    
    // PUBG 뉴스 페이지의 구조에 맞게 셀렉터 조정
    $('.news-item, .article-item, .post-item').each((index, element) => {
      const $item = $(element);
      
      const title = $item.find('h2, h3, .title, .headline').text().trim();
      const summary = $item.find('.summary, .excerpt, .description, p').first().text().trim();
      const link = $item.find('a').attr('href');
      const imageUrl = $item.find('img').attr('src');
      const dateText = $item.find('.date, time, .timestamp').text().trim();
      
      if (title && link) {
        // 상대 URL을 절대 URL로 변환
        const fullLink = link.startsWith('http') ? link : `https://pubg.com${link}`;
        const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ? `https://pubg.com${imageUrl}` : imageUrl;
        
        newsItems.push({
          title,
          summary: summary || '',
          link: fullLink,
          imageUrl: fullImageUrl,
          publishedAt: parseDate(dateText),
          source: 'PUBG_OFFICIAL'
        });
      }
    });

    console.log(`✅ PUBG 뉴스 ${newsItems.length}개 크롤링 완료`);
    return newsItems;
    
  } catch (error) {
    console.error('❌ PUBG 뉴스 크롤링 실패:', error);
    return [];
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
    const response = await fetch('https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=578080&count=10&maxlength=300&format=json');
    
    if (!response.ok) {
      throw new Error(`Steam API error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.appnews || !data.appnews.newsitems) {
      return [];
    }

    const newsItems = data.appnews.newsitems.map(item => ({
      title: item.title,
      summary: item.contents.substring(0, 200) + '...',
      link: item.url,
      imageUrl: null,
      publishedAt: new Date(item.date * 1000), // Unix timestamp
      source: 'STEAM_PUBG'
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
            createdAt: { gte: oneHourAgo }
          },
          orderBy: { publishedAt: 'desc' },
          take: 20
        });
        
        if (cachedNews.length > 0) {
          console.log(`📦 캐시된 PUBG 뉴스 ${cachedNews.length}개 반환`);
          return res.status(200).json({
            success: true,
            data: cachedNews,
            cached: true,
            count: cachedNews.length
          });
        }
      }
      
      // 새로운 뉴스 크롤링
      const [officialNews, steamNews] = await Promise.all([
        crawlPubgNews(),
        fetchSteamPubgNews()
      ]);
      
      const allNews = [...officialNews, ...steamNews];
      
      if (allNews.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: '새로운 뉴스를 찾을 수 없습니다.',
          count: 0
        });
      }
      
      // 중복 제거 (제목 기준)
      const uniqueNews = allNews.filter((news, index, self) => 
        index === self.findIndex(n => n.title === news.title)
      );
      
      // DB에 저장
      const savedNews = [];
      for (const newsItem of uniqueNews) {
        try {
          // 기존 뉴스 확인 (제목과 링크로 중복 체크)
          const existing = await prisma.pubgNews.findFirst({
            where: {
              OR: [
                { title: newsItem.title },
                { link: newsItem.link }
              ]
            }
          });
          
          if (!existing) {
            const saved = await prisma.pubgNews.create({
              data: {
                title: newsItem.title,
                summary: newsItem.summary,
                link: newsItem.link,
                imageUrl: newsItem.imageUrl,
                publishedAt: newsItem.publishedAt,
                source: newsItem.source
              }
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
        take: 20
      });
      
      return res.status(200).json({
        success: true,
        data: latestNews,
        cached: false,
        newItems: savedNews.length,
        count: latestNews.length
      });
      
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} Not Allowed` 
      });
    }
    
  } catch (error) {
    console.error('PUBG 뉴스 API 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'PUBG 뉴스를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}