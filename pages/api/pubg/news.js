// pages/api/pubg/news.js
// pubg.com/ko/news 크롤링 — 1시간 인메모리 캐시
// 카테고리: patch_notes / notice / dev_notes

import * as cheerio from 'cheerio'

const PUBG_NEWS_BASE = 'https://www.pubg.com/ko/news'
const CACHE_TTL_MS   = 60 * 60 * 1000  // 1시간

// category key → { data, ts }
const memCache = new Map()

const FETCH_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept':          'text/html,application/xhtml+xml',
}

// __NUXT__ payload에서 postId 목록 순서대로 추출
// __NUXT__는 JS 리터럴 형태(따옴표 없음): postId:10079
function extractPostIds(html) {
  const matches = [...html.matchAll(/\bpostId\s*:\s*(\d+)/g)]
  if (matches.length > 0) return matches.map((m) => m[1])
  // SSR href fallback
  const hrefs = [...html.matchAll(/href="\/ko\/news\/(\d+)"/g)]
  return hrefs.map((m) => m[1])
}

// Cheerio로 카드 파싱
function parseNewsHTML(html) {
  const $       = cheerio.load(html)
  const postIds = extractPostIds(html)
  const items   = []

  $('.post-contents__card').each((i, el) => {
    const $card = $(el)

    // 썸네일 (wstatic-prod-boc.krafton.com/... 형태)
    const thumbnail = $card.find('.post__thumb img').attr('src') || null

    // 제목
    const title = $card.find('.post__description dt').first().text().trim()
    if (!title) return

    // 카테고리 & 날짜 (post__bottom: dt=카테고리, dd=날짜 YYYY.MM.DD)
    const $bottom  = $card.find('.post__bottom')
    const category = $bottom.find('dt').first().text().trim() || null
    const dateStr  = $bottom.find('dd').first().text().trim() || null
    // YYYY.MM.DD → ISO
    const date = dateStr ? new Date(dateStr.replace(/\./g, '-')).toISOString() : null

    // 플랫폼 태그 (PC / 콘솔 / 이스포츠)
    const platforms = []
    $card.find('.post__labels .label').each((_, lbl) => {
      const text = $(lbl).text().trim()
      if (text) platforms.push(text)
    })

    // 링크: __NUXT__에서 추출한 postId로 구성
    const postId = postIds[i] || null
    const url    = postId ? `${PUBG_NEWS_BASE}/${postId}` : null

    items.push({ title, category, date, dateStr, thumbnail, url, platforms })
  })

  return items
}

async function fetchAndParse(category) {
  const cacheKey = category || 'all'
  const cached   = memCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { data: cached.data, fromCache: true }
  }

  const targetUrl = category
    ? `${PUBG_NEWS_BASE}?category=${category}`
    : PUBG_NEWS_BASE

  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(targetUrl, { headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(tid)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const data = parseNewsHTML(html)
    memCache.set(cacheKey, { data, ts: Date.now() })
    return { data, fromCache: false }
  } catch (err) {
    clearTimeout(tid)
    // 만료된 캐시라도 반환 (네트워크 오류 시 stale 응답)
    if (cached) return { data: cached.data, fromCache: true, stale: true }
    throw err
  }
}

const VALID_CATEGORIES = new Set(['patch_notes', 'notice', 'dev_notes'])

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { category } = req.query
  const validCategory = VALID_CATEGORIES.has(category) ? category : null

  try {
    const { data, fromCache, stale } = await fetchAndParse(validCategory)

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
    return res.status(200).json({
      success:  true,
      data,
      count:    data.length,
      category: validCategory || 'all',
      fromCache,
      ...(stale ? { stale: true } : {}),
    })
  } catch (err) {
    console.error('[news] 크롤링 실패:', err.message)
    return res.status(500).json({ success: false, error: err.message, data: [] })
  }
}
