// 치지직 PUBG 라이브 목록 조회
// - 검색 키워드: '배틀그라운드'
// - liveCategory === 'Player_Unknowns_Battle_Grounds' 필터
// - 시청자 수 내림차순 정렬

import { redisGet, redisSet } from '../../../utils/redis.js'

const CACHE_KEY = 'streamers:chzzk:v5'
const CACHE_TTL = 300 // 5분
const BASE      = 'https://api.chzzk.naver.com'
const UA        = 'Mozilla/5.0 (compatible; PKGG/1.0)'
const PAGE_SIZE = 50  // 최대 50

async function fetchChzzkPubgLives() {
  // 두 키워드로 검색 후 합산 (더 많은 스트림 수집)
  const keywords = ['배틀그라운드', '배그']
  const seen = new Set()
  const all  = []

  for (const keyword of keywords) {
    try {
      const res = await fetch(
        `${BASE}/service/v1/search/lives?keyword=${encodeURIComponent(keyword)}&size=${PAGE_SIZE}`,
        { headers: { 'User-Agent': UA } }
      )
      if (!res.ok) continue
      const json = await res.json()
      const items = json?.content?.data || []
      for (const item of items) {
        const live = item.live
        const channel = item.channel
        if (!live || !channel) continue
        if (live.liveCategory !== 'Player_Unknowns_Battle_Grounds') continue
        if (seen.has(live.liveId)) continue
        seen.add(live.liveId)
        // liveImageUrl = Chzzk CDN 인증 필요 (400) → 사용 불가
        // defaultThumbnailImageUrl = 채널 설정 커스텀 썸네일 (없는 경우 null)
        // channelImageUrl = 프로필 이미지 (항상 존재)
        const customThumb   = live.defaultThumbnailImageUrl
          ? live.defaultThumbnailImageUrl.replace(/\?.*$/, '')
          : null
        const profileImage  = channel.channelImageUrl || null
        // 커스텀 썸네일 없으면 프로필 이미지로 폴백
        const thumbnail     = customThumb || profileImage

        all.push({
          platform:       'chzzk',
          streamerId:     channel.channelId,
          streamerName:   channel.channelName,
          streamerImage:  profileImage,
          verified:       channel.verifiedMark || false,
          title:          live.liveTitle,
          viewers:        live.concurrentUserCount ?? 0,
          thumbnail,
          hasCustomThumb: !!customThumb,
          hasDrops:       !!live.dropsCampaignNo,
          dropsCampaignNo: live.dropsCampaignNo || null,
          tags:           live.tags || [],
          streamUrl:      `https://chzzk.naver.com/live/${channel.channelId}`,
          channelUrl:     `https://chzzk.naver.com/${channel.channelId}`,
          startedAt:      live.openDate,
        })
      }
    } catch {}
  }

  return all.sort((a, b) => b.viewers - a.viewers)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  try {
    const streamers = await fetchChzzkPubgLives()
    const data = { streamers, platform: 'chzzk', updatedAt: new Date().toISOString() }
    await redisSet(CACHE_KEY, data, CACHE_TTL)
    return res.status(200).json(data)
  } catch (e) {
    return res.status(200).json({ streamers: [], platform: 'chzzk', error: e.message, updatedAt: new Date().toISOString() })
  }
}
