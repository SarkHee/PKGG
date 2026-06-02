// discord-bot/server-checker.js
// PUBG 서버 상태 변화 감지 → 뉴스채널 자동 알림

const fs   = require('fs')
const path = require('path')

const STATE_FILE = path.join(__dirname, 'data', 'server-state.json')
const PKGG_URL   = process.env.PKGG_URL || 'https://pkgg.vercel.app'

const STATUS_META = {
  online:      { icon: '🟢', label: '정상 운영',   color: 0x22c55e },
  maintenance: { icon: '🔴', label: '점검 중',     color: 0xef4444 },
  offline:     { icon: '⚫', label: '접속 불가',   color: 0x6b7280 },
  degraded:    { icon: '🟡', label: '일부 불안정', color: 0xf59e0b },
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {}
  return { lastStatus: null }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

async function checkServerStatus(client, { EmbedBuilder }, channelIds) {
  try {
    const res = await fetch(`${PKGG_URL}/api/pubg/server-status`)
    if (!res.ok) return

    const data      = await res.json()
    const state     = loadState()
    const prevStatus = state.lastStatus
    const currStatus = data.status

    // 최초 실행 — 상태 저장만, 알림 없음
    if (!prevStatus) {
      saveState({ lastStatus: currStatus, lastChecked: new Date().toISOString() })
      console.log(`[서버체커] 초기 상태 저장: ${currStatus}`)
      return
    }

    // 변화 없으면 종료
    if (prevStatus === currStatus) return

    // 상태 변경 감지!
    saveState({ lastStatus: currStatus, lastChecked: new Date().toISOString() })
    console.log(`[서버체커] 상태 변경: ${prevStatus} → ${currStatus}`)

    const currMeta = STATUS_META[currStatus] || { icon: '⚪', label: '알 수 없음', color: 0x6b7280 }
    const prevMeta = STATUS_META[prevStatus] || { icon: '⚪', label: '알 수 없음', color: 0x6b7280 }

    const isDown     = currStatus === 'maintenance' || currStatus === 'offline'
    const isRecovery = (prevStatus === 'maintenance' || prevStatus === 'offline') && currStatus === 'online'

    let title, description
    if (isRecovery) {
      title       = '✅ PUBG 서버가 정상화됐습니다'
      description = '서버 점검이 완료되어 정상 운영 중입니다.'
    } else if (isDown) {
      title       = '⚠️ PUBG 서버가 현재 점검 중입니다'
      description = '서버 점검 또는 장애가 감지됐습니다. 공식 채널에서 공지를 확인해주세요.'
    } else {
      title       = '📡 PUBG 서버 상태 변경'
      description = `**${prevMeta.label}** → **${currMeta.label}**`
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(currMeta.color)
      .addFields(
        { name: '🌏 아시아', value: `${STATUS_META[data.regions?.as]?.icon || '⚪'} ${STATUS_META[data.regions?.as]?.label || '—'}`, inline: true },
        { name: '🌎 북미',   value: `${STATUS_META[data.regions?.na]?.icon || '⚪'} ${STATUS_META[data.regions?.na]?.label || '—'}`, inline: true },
        { name: '🌍 유럽',   value: `${STATUS_META[data.regions?.eu]?.icon || '⚪'} ${STATUS_META[data.regions?.eu]?.label || '—'}`, inline: true },
      )
      .setURL(`${PKGG_URL}/server-status`)
      .setFooter({ text: 'PKGG 서버 모니터 · 3분 주기 체크' })
      .setTimestamp()

    // 설정된 뉴스 채널 전체에 전송
    if (!channelIds || channelIds.length === 0) {
      console.log('[서버체커] 설정된 채널 없음 — 알림 스킵')
      return
    }

    for (const channelId of channelIds) {
      try {
        const channel = await client.channels.fetch(channelId)
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [embed] })
          console.log(`[서버체커] 알림 전송 완료 → #${channel.name} (${channelId})`)
        }
      } catch (e) {
        console.error(`[서버체커] 채널 ${channelId} 전송 실패:`, e.message)
      }
    }
  } catch (e) {
    console.error('[서버체커] 체크 실패:', e.message)
  }
}

module.exports = { checkServerStatus, loadState }
