// utils/chzzkApi.js
// 치지직 공개 API 헬퍼 (인증 불필요 엔드포인트 사용)

const BASE      = 'https://api.chzzk.naver.com'
const UA        = 'Mozilla/5.0 (compatible; PKGG/1.0)'
const PAGE_SIZE = 50

// PUBG 라이브 목록 조회 (all.js에서 직접 import용)
export async function getPubgLives() {
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
        const live    = item.live
        const channel = item.channel
        if (!live || !channel) continue
        if (live.liveCategory !== 'Player_Unknowns_Battle_Grounds') continue
        if (seen.has(live.liveId)) continue
        seen.add(live.liveId)
        const customThumb  = live.defaultThumbnailImageUrl
          ? live.defaultThumbnailImageUrl.replace(/\?.*$/, '')
          : null
        const profileImage = channel.channelImageUrl || null
        all.push({
          platform:        'chzzk',
          streamerId:      channel.channelId,
          streamerName:    channel.channelName,
          streamerImage:   profileImage,
          verified:        channel.verifiedMark || false,
          title:           live.liveTitle,
          viewers:         live.concurrentUserCount ?? 0,
          thumbnail:       customThumb || profileImage,
          hasCustomThumb:  !!customThumb,
          hasDrops:        !!live.dropsCampaignNo,
          dropsCampaignNo: live.dropsCampaignNo || null,
          tags:            live.tags || [],
          streamUrl:       `https://chzzk.naver.com/live/${channel.channelId}`,
          channelUrl:      `https://chzzk.naver.com/${channel.channelId}`,
          startedAt:       live.openDate,
        })
      }
    } catch {}
  }

  return all.sort((a, b) => b.viewers - a.viewers)
}

async function withTimeout(promise, ms = 8000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

// 채널 방송 상태 조회 (폴링 API — 인증 불필요)
export async function getLiveStatus(channelId) {
  try {
    const res = await withTimeout(
      fetch(`${BASE}/polling/v2/channels/${channelId}/live-status`, {
        headers: { 'User-Agent': UA },
      })
    )
    if (!res.ok) return null
    const json = await res.json()
    const c = json?.content
    if (!c) return null
    return {
      isLive:      c.status === 'OPEN',
      viewerCount: c.concurrentUserCount ?? 0,
      streamTitle: c.liveTitle ?? null,
      openDate:    c.openDate ?? null,
    }
  } catch {
    return null
  }
}

// 채널 검색 — 채널 정보(프로필 이미지) 조회
export async function searchChannel(keyword, size = 5) {
  try {
    const res = await withTimeout(
      fetch(`${BASE}/service/v1/search/channels?keyword=${encodeURIComponent(keyword)}&size=${size}`, {
        headers: { 'User-Agent': UA },
      })
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json?.content?.data || []).map((item) => item.channel)
  } catch {
    return []
  }
}

// 채널 ID로 채널 기본 정보 조회 (검색 방식)
export async function getChannelInfo(channelId) {
  try {
    // 폴링 API로 기본 확인 후, 검색으로 채널명/이미지 가져오기
    const liveRes = await withTimeout(
      fetch(`${BASE}/polling/v2/channels/${channelId}/live-status`, {
        headers: { 'User-Agent': UA },
      })
    )
    if (!liveRes.ok) return null
    const liveJson = await liveRes.json()
    if (liveJson.code === 404) return null
    return { channelId, exists: true }
  } catch {
    return null
  }
}
