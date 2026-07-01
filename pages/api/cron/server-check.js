import { redisGet, redisSet } from '../../../utils/redis.js'

const PREV_KEY    = 'pubg:server-status:prev'
const HISTORY_KEY = 'pubg:server-status:history'
const MAX_HISTORY = 20

const STATUS_KO = {
  online:      '🟢 정상 운영',
  maintenance: '🔴 점검 중',
  offline:     '⚫ 접속 불가',
  degraded:    '🟡 일부 불안정',
}

async function getServerStatus() {
  try {
    const base = process.env.PKGG_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const res = await fetch(`${base}/api/pubg/server-status?_fresh=1`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (e) {
    console.error('[server-check] status fetch error:', e.message)
    return null
  }
}

async function sendDiscordWebhook(prevStatus, currStatus, data) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const isDown    = currStatus === 'maintenance' || currStatus === 'offline'
  const isRecovery = (prevStatus === 'maintenance' || prevStatus === 'offline') && currStatus === 'online'

  const color = isDown ? 0xFF4444 : isRecovery ? 0x44FF88 : 0xFFAA00
  const title = isDown
    ? '⚠️ PUBG 서버 상태 변경 감지'
    : isRecovery
      ? '✅ PUBG 서버 복구 완료'
      : '📡 PUBG 서버 상태 변경'

  const embed = {
    title,
    color,
    fields: [
      { name: '이전 상태', value: STATUS_KO[prevStatus] || prevStatus, inline: true },
      { name: '현재 상태', value: STATUS_KO[currStatus] || currStatus, inline: true },
      { name: '​', value: '​', inline: true },
      { name: '아시아', value: STATUS_KO[data.regions?.as] || '—', inline: true },
      { name: '북미',   value: STATUS_KO[data.regions?.na] || '—', inline: true },
      { name: '유럽',   value: STATUS_KO[data.regions?.eu] || '—', inline: true },
    ],
    footer: { text: 'PKGG 서버 모니터 · 5분 주기 체크' },
    timestamp: new Date().toISOString(),
    url: 'https://pkgg.vercel.app/server-status',
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch (e) {
    console.error('[server-check] webhook error:', e.message)
  }
}

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1. 캐시 무효화 후 최신 상태 조회 (쿼리 파람으로 5분 캐시 우회)
    const current = await getServerStatus()
    if (!current) return res.status(200).json({ ok: false, error: 'fetch failed' })

    // 2. 이전 상태 조회
    const prev = await redisGet(PREV_KEY)

    // 3. 변화 감지
    const changed = prev && prev.status !== current.status

    if (changed) {
      console.log(`[server-check] 상태 변경: ${prev.status} → ${current.status}`)

      // 히스토리 업데이트
      const history = (await redisGet(HISTORY_KEY)) || []
      history.unshift({
        from:      prev.status,
        to:        current.status,
        timestamp: new Date().toISOString(),
        regions:   current.regions,
      })
      if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)
      await redisSet(HISTORY_KEY, history, 60 * 60 * 24 * 7) // 7일

      // 디스코드 알림
      await sendDiscordWebhook(prev.status, current.status, current)
    }

    // 4. 현재 상태 저장 (이전값으로)
    await redisSet(PREV_KEY, current, 60 * 60 * 24) // 24시간

    return res.status(200).json({
      ok: true,
      changed,
      prev: prev?.status || 'unknown',
      current: current.status,
    })
  } catch (e) {
    console.error('[server-check]', e)
    return res.status(500).json({ error: e.message })
  }
}
