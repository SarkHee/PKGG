// pages/api/pubg-news/index.js
// pubg.com/ko/news 크롤링 — 1시간 인메모리 캐시
// PubgNewsCard 필드 형식으로 반환

import * as cheerio from 'cheerio'

const PUBG_NEWS_BASE = 'https://www.pubg.com/ko/news'
const CACHE_TTL_MS   = 60 * 60 * 1000

const memCache = new Map()  // key: 'all'|'patch_notes'|'notice'|'dev_notes' → { data, ts }

const FETCH_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept':          'text/html,application/xhtml+xml',
}

function extractPostIds(html) {
  const matches = [...html.matchAll(/\bpostId\s*:\s*(\d+)/g)]
  if (matches.length > 0) return matches.map((m) => m[1])
  const hrefs = [...html.matchAll(/href="\/ko\/news\/(\d+)"/g)]
  return hrefs.map((m) => m[1])
}

function parseNewsHTML(html) {
  const $       = cheerio.load(html)
  const postIds = extractPostIds(html)
  const items   = []

  $('.post-contents__card').each((i, el) => {
    const $card = $(el)

    const thumbnail = $card.find('.post__thumb img').attr('src') || null
    const title     = $card.find('.post__description dt').first().text().trim()
    if (!title) return

    const $bottom  = $card.find('.post__bottom')
    const category = $bottom.find('dt').first().text().trim() || null
    const dateStr  = $bottom.find('dd').first().text().trim() || null
    const date     = dateStr ? new Date(dateStr.replace(/\./g, '-')).toISOString() : null

    const platforms = []
    $card.find('.post__labels .label').each((_, lbl) => {
      const text = $(lbl).text().trim()
      if (text) platforms.push(text)
    })

    const postId = postIds[i] || null
    const link   = postId ? `${PUBG_NEWS_BASE}/${postId}` : null

    items.push({
      id:          postId ? parseInt(postId) : i,
      title,
      summary:     platforms.length ? platforms.join(' · ') : (category || ''),
      imageUrl:    thumbnail,
      link,
      publishedAt: date,
      category,
      source:      'PUBG_OFFICIAL',
      platforms,
    })
  })

  return items
}

// 프론트 카테고리 → pubg.com category param
const CATEGORY_MAP = {
  'patch_notes': 'patch_notes',
  '패치노트':    'patch_notes',
  'notice':      'notice',
  '공지':        'notice',
  'dev_notes':   'dev_notes',
  '개발일지':    'dev_notes',
}

async function fetchAndParse(pubgCategory) {
  const cacheKey = pubgCategory || 'all'
  const cached   = memCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const targetUrl = pubgCategory
    ? `${PUBG_NEWS_BASE}?category=${pubgCategory}`
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
    return data
  } catch (err) {
    clearTimeout(tid)
    if (cached) return cached.data
    throw err
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` })
  }

  const { category, limit = '20' } = req.query
  const pubgCategory = CATEGORY_MAP[category] || null

  try {
    const data    = await fetchAndParse(pubgCategory)
    const limited = data.slice(0, parseInt(limit) || 20)

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
    return res.status(200).json({
      success: true,
      data:    limited,
      count:   limited.length,
      cached:  false,
    })
  } catch (err) {
    console.error('[pubg-news] 크롤링 실패:', err.message)
    return res.status(500).json({
      success: false,
      message: 'PUBG 뉴스를 가져오는 중 오류가 발생했습니다.',
      error:   err.message,
      data:    [],
    })
  }
}
