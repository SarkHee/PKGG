// discord-bot/weapon-tier.js
// 최근 7일간 무기 픽률/킬 비중 기준 S/A/B/C 티어 분류 + 매주 월요일 등록 채널 자동 발행

const fs   = require('fs')
const path = require('path')
const cron = require('node-cron')

const STATE_FILE = path.join(__dirname, 'data', 'weapon-tier-state.json')
const PKGG_URL   = process.env.PKGG_URL || 'https://pkgg.vercel.app'

const SHARD_LABEL = { all: '전체', steam: '🎮 Steam', kakao: '🟡 카카오' }

const TIER_META = {
  S: { color: 0xef4444, label: '🔥 S티어' },
  A: { color: 0xf59e0b, label: '🥇 A티어' },
  B: { color: 0x3b82f6, label: '🥈 B티어' },
  C: { color: 0x6b7280, label: '🥉 C티어' },
}

// ── 채널 등록 상태 (뉴스채널과 동일한 파일 기반 패턴) ─────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {}
  return { channelIds: [] }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function addTierChannel(channelId) {
  const state = loadState()
  if (!state.channelIds.includes(channelId)) {
    state.channelIds.push(channelId)
    saveState(state)
  }
}

function removeTierChannel(channelId) {
  const state = loadState()
  state.channelIds = state.channelIds.filter((id) => id !== channelId)
  saveState(state)
}

// ── 무기 메타 조회 + 티어 분류 ────────────────────────────────────────────
// 시즌 아카이브(WeaponMetaSeason)는 시즌 전체 요약이라 "최근 7일" 개념이 없어서
// 이번주 티어는 항상 실시간 주간 집계(period=week)를 쓴다.
async function fetchWeaponTierWeek(shard = 'all') {
  const res = await fetch(`${PKGG_URL}/api/weapon-meta-live?period=week&shard=${shard}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 픽률+킬 비중 합산 점수로 재정렬 후 상위 비율(15/40/75%)로 S/A/B/C 분류
function classifyTiers(weapons) {
  const scored = weapons
    .map((w) => ({ ...w, score: (w.pickRate || 0) + (w.killRate || 0) }))
    .sort((a, b) => b.score - a.score)

  const n = scored.length
  const sCut = Math.ceil(n * 0.15)
  const aCut = Math.ceil(n * 0.40)
  const bCut = Math.ceil(n * 0.75)

  return scored.map((w, i) => ({
    ...w,
    tier: i < sCut ? 'S' : i < aCut ? 'A' : i < bCut ? 'B' : 'C',
  }))
}

function buildTierEmbed(tiered, meta, shard, EmbedBuilder) {
  const grouped = { S: [], A: [], B: [], C: [] }
  for (const w of tiered) grouped[w.tier].push(w)

  const embed = new EmbedBuilder()
    .setTitle('🔫 이번주 무기 티어')
    .setColor(TIER_META.S.color)
    .setURL(`${PKGG_URL}/weapon-meta-live`)
    .setFooter({ text: `PKGG.vercel.app • 최근 7일 · ${SHARD_LABEL[shard] || shard} · 총 ${meta.totalKills?.toLocaleString() ?? 0}킬 기준` })
    .setTimestamp()

  for (const tier of ['S', 'A', 'B', 'C']) {
    const list = grouped[tier]
    if (list.length === 0) continue
    const value = list.map((w) => `**${w.key}**`).join(', ')
    embed.addFields({ name: TIER_META[tier].label, value, inline: false })
  }

  return embed
}

async function buildTierReply(shard, { EmbedBuilder }) {
  const { weapons, meta } = await fetchWeaponTierWeek(shard)
  if (!weapons?.length) {
    return { content: '❌ 최근 7일간 집계된 무기 데이터가 없습니다.', embeds: [] }
  }
  const tiered = classifyTiers(weapons)
  const embed  = buildTierEmbed(tiered, meta, shard, EmbedBuilder)
  return { content: null, embeds: [embed] }
}

// ── 매주 월요일 자동 발행 (크론) ──────────────────────────────────────────
async function sendWeeklyTierToChannels(client, components) {
  const state = loadState()
  if (state.channelIds.length === 0) return

  let reply
  try {
    reply = await buildTierReply('all', components)
  } catch (err) {
    console.error('[무기티어] 주간 집계 조회 실패:', err.message)
    return
  }
  if (!reply.embeds.length) return

  for (const channelId of state.channelIds) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null)
      if (!channel?.isTextBased()) continue
      await channel.send({ embeds: reply.embeds })
      console.log(`[무기티어] ${channelId} 채널 발행 완료`)
    } catch (err) {
      console.error(`[무기티어] 채널 ${channelId} 발행 실패:`, err.message)
    }
  }
}

// 매주 월요일 오전 10시(KST)에 등록된 채널로 자동 발행
function startWeeklyTierCron(client, components) {
  cron.schedule(
    '0 10 * * 1',
    () => {
      console.log('[무기티어] 주간 자동 발행 시작')
      sendWeeklyTierToChannels(client, components).catch((e) => console.error('[무기티어] 자동 발행 오류:', e.message))
    },
    { timezone: 'Asia/Seoul' }
  )
  console.log('⏰ 무기 티어 주간 자동 발행 예약됨 (매주 월 10:00 KST)')
}

module.exports = {
  buildTierReply,
  addTierChannel,
  removeTierChannel,
  loadState,
  startWeeklyTierCron,
}
