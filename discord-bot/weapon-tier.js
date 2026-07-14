// discord-bot/weapon-tier.js
// 최근 7일간 무기 픽률/킬 비중 기준 S/A/B/C 티어 분류 + 매주 월요일 등록 채널 자동 발행
// S티어는 아이콘 콜라주 이미지로, A/B/C는 기존처럼 텍스트로 표시한다.

const fs   = require('fs')
const path = require('path')
const cron = require('node-cron')
const { createCanvas, loadImage } = require('canvas')
const { AttachmentBuilder } = require('discord.js')

const STATE_FILE = path.join(__dirname, 'data', 'weapon-tier-state.json')
const PKGG_URL   = process.env.PKGG_URL || 'https://pkgg.vercel.app'

const SHARD_LABEL = { all: '전체', steam: '🎮 Steam', kakao: '🟡 카카오' }

const TIER_META = {
  S: { color: 0xef4444, label: '🔥 S티어' },
  A: { color: 0xf59e0b, label: '🥇 A티어' },
  B: { color: 0x3b82f6, label: '🥈 B티어' },
  C: { color: 0x6b7280, label: '🥉 C티어' },
}

// utils/weaponMetaFilter.js의 normalizeId() 결과(canonical 이름)와 public/weapons/의
// Item_Weapon_<이름>_C.png 파일명이 다른 예외만 여기서 보정한다.
const ICON_STUB_OVERRIDE = {
  SCAR_L: 'SCAR-L',
  Win94:  'Win1894',
}

function iconUrl(weaponKey) {
  const stub = ICON_STUB_OVERRIDE[weaponKey] || weaponKey
  return `${PKGG_URL}/weapons/Item_Weapon_${stub}_C.png`
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

// S티어 무기 아이콘을 가로로 나열한 콜라주 PNG 버퍼 생성. 아이콘을 못 받아오면(멜리 무기 등
// public/weapons/에 파일이 없거나 네트워크 실패) 회색 박스로 자리만 채워서 레이아웃은 안 깨지게 한다.
async function buildSTierCollage(sTierWeapons) {
  const ICON_SIZE    = 96
  const PADDING      = 14
  const LABEL_HEIGHT = 26
  const cellWidth    = ICON_SIZE + PADDING
  const width        = sTierWeapons.length * cellWidth + PADDING
  const height       = ICON_SIZE + LABEL_HEIGHT + PADDING * 2

  const canvas = createCanvas(width, height)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#111827' // gray-900 — Discord 다크 임베드와 어울리는 배경
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < sTierWeapons.length; i++) {
    const w = sTierWeapons[i]
    const x = PADDING + i * cellWidth

    try {
      const img = await loadImage(iconUrl(w.key))
      ctx.drawImage(img, x, PADDING, ICON_SIZE, ICON_SIZE)
    } catch {
      ctx.fillStyle = '#374151' // gray-700 플레이스홀더
      ctx.fillRect(x, PADDING, ICON_SIZE, ICON_SIZE)
    }

    ctx.fillStyle = '#f9fafb'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(w.key, x + ICON_SIZE / 2, PADDING + ICON_SIZE + 18)
  }

  return canvas.toBuffer('image/png')
}

async function buildTierEmbed(tiered, meta, shard, EmbedBuilder) {
  const grouped = { S: [], A: [], B: [], C: [] }
  for (const w of tiered) grouped[w.tier].push(w)

  const embed = new EmbedBuilder()
    .setTitle('🔫 이번주 무기 티어')
    .setColor(TIER_META.S.color)
    .setURL(`${PKGG_URL}/weapon-meta-live`)
    .setFooter({ text: `PKGG.vercel.app • 최근 7일 · ${SHARD_LABEL[shard] || shard} · 총 ${meta.totalKills?.toLocaleString() ?? 0}킬 기준` })
    .setTimestamp()

  // S티어는 아이콘 콜라주 이미지로 대체하고, 목록 필드는 두지 않는다(중복 표시 방지).
  let attachment = null
  if (grouped.S.length > 0) {
    try {
      const buffer = await buildSTierCollage(grouped.S)
      attachment = new AttachmentBuilder(buffer, { name: 's-tier.png' })
      embed.setImage('attachment://s-tier.png')
      embed.addFields({ name: TIER_META.S.label, value: '👆 이미지 참고', inline: false })
    } catch (err) {
      console.error('[무기티어] S티어 콜라주 생성 실패, 텍스트로 폴백:', err.message)
      embed.addFields({ name: TIER_META.S.label, value: grouped.S.map((w) => `**${w.key}**`).join(', '), inline: false })
    }
  }

  for (const tier of ['A', 'B', 'C']) {
    const list = grouped[tier]
    if (list.length === 0) continue
    const value = list.map((w) => `**${w.key}**`).join(', ')
    embed.addFields({ name: TIER_META[tier].label, value, inline: false })
  }

  return { embed, attachment }
}

async function buildTierReply(shard, { EmbedBuilder }) {
  const { weapons, meta } = await fetchWeaponTierWeek(shard)
  if (!weapons?.length) {
    return { content: '❌ 최근 7일간 집계된 무기 데이터가 없습니다.', embeds: [], files: [] }
  }
  const tiered = classifyTiers(weapons)
  const { embed, attachment } = await buildTierEmbed(tiered, meta, shard, EmbedBuilder)
  return { content: null, embeds: [embed], files: attachment ? [attachment] : [] }
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
      await channel.send({ embeds: reply.embeds, files: reply.files })
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
