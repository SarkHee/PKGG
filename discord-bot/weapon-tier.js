// discord-bot/weapon-tier.js
// 최근 7일간 킬수 기준 TOP5 무기 순위 + 매주 월요일 등록 채널 자동 발행
// TOP5 아이콘+이름은 콜라주 이미지로, 순위/타입/킬수/킬률/평균딜은 임베드 텍스트 필드로 표시한다.

const fs   = require('fs')
const path = require('path')
const cron = require('node-cron')
const { createCanvas, loadImage, registerFont } = require('canvas')
const { AttachmentBuilder } = require('discord.js')

const STATE_FILE = path.join(__dirname, 'data', 'weapon-tier-state.json')
const PKGG_URL   = process.env.PKGG_URL || 'https://pkgg.vercel.app'

const SHARD_LABEL = { all: '전체', steam: '🎮 Steam', kakao: '🟡 카카오' }
const RANK_MEDAL  = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣', 5: '5️⃣' }

// node-canvas의 기본 sans-serif는 배포 환경(특히 폰트 없는 리눅스 컨테이너)에 따라 한글이
// 깨지거나 아예 안 나올 수 있어, 폰트 파일을 직접 등록해서 어떤 환경에서도 동일하게 렌더링되게 한다.
const FONT_FAMILY = 'NanumGothic'
const FONT_PATH   = path.join(__dirname, 'assets', 'fonts', 'NanumGothic-Regular.ttf')
try {
  registerFont(FONT_PATH, { family: FONT_FAMILY })
} catch (err) {
  console.error('[무기티어] 폰트 등록 실패, 시스템 기본 폰트로 대체됨:', err.message)
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

// weapon-damage.js(웹사이트 무기 데미지표)의 타입 분류를 그대로 재사용한다.
// AR=돌격소총 DMR=고정밀사격소총 SR=저격소총 SMG=기관단총 LMG=경기관총 SGN=샷건 PST=권총 MELEE=근접무기
const WEAPON_TYPE = {
  AUG: 'AR', HK416: 'AR', BerylM762: 'AR', ACE32: 'AR', AK47: 'AR', SCAR_L: 'AR',
  QBZ95: 'AR', M16A4: 'AR', Groza: 'AR', FAMASG2: 'AR', Mk47Mutant: 'AR', K2: 'AR', G36C: 'AR',
  Mini14: 'DMR', Mk12: 'DMR', FNFal: 'DMR', Dragunov: 'DMR', VSS: 'DMR', SKS: 'DMR', Mk14: 'DMR', QBU88: 'DMR',
  Win94: 'SR', M24: 'SR', Kar98k: 'SR', AWM: 'SR', L6: 'SR', Crossbow: 'SR', Mosin: 'SR',
  MP5K: 'SMG', UMP: 'SMG', Vector: 'SMG', UZI: 'SMG', Thompson: 'SMG', P90: 'SMG', JS9: 'SMG', MP9: 'SMG', BizonPP19: 'SMG',
  M249: 'LMG', MG3: 'LMG', DP28: 'LMG',
  Saiga12: 'SGN', Berreta686: 'SGN', DP12: 'SGN', OriginS12: 'SGN', Sawnoff: 'SGN',
  M9: 'PST', DesertEagle: 'PST', G18: 'PST', Skorpion: 'PST', NagantM1895: 'PST', M1911: 'PST', R45: 'PST',
  Cowbar: 'MELEE',
}
const TYPE_LABEL = {
  AR: '돌격소총', DMR: '고정밀 사격소총', SR: '저격소총', SMG: '기관단총',
  LMG: '경기관총', SGN: '샷건', PST: '권총', MELEE: '근접무기',
}

function weaponTypeLabel(key) {
  const code = WEAPON_TYPE[key]
  return code ? `${TYPE_LABEL[code]} (${code})` : '기타'
}

// ── 채널 등록 상태 (뉴스체커와 동일한 파일 기반 패턴) ─────────────────────
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

// ── 무기 메타 조회 + TOP5 산출 ─────────────────────────────────────────────
// 시즌 아카이브(WeaponMetaSeason)는 시즌 전체 요약이라 "최근 7일" 개념이 없어서
// 이번주 순위는 항상 실시간 주간 집계(period=week)를 쓴다.
async function fetchWeaponTierWeek(shard = 'all') {
  const res = await fetch(`${PKGG_URL}/api/weapon-meta-live?period=week&shard=${shard}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 킬수 기준 내림차순 정렬 후 상위 5개만 사용 (API가 이미 킬수 내림차순으로 주지만 방어적으로 재정렬)
function getTop5(weapons) {
  return [...weapons]
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5)
    .map((w, i) => ({ ...w, rank: i + 1 }))
}

// TOP5 무기 아이콘 + 이름을 가로로 나열한 콜라주 PNG 버퍼 생성. 아이콘을 못 받아오면(멜리 무기 등
// public/weapons/에 파일이 없거나 네트워크 실패) 회색 박스로 자리만 채워서 레이아웃은 안 깨지게 한다.
// 셀 구조: [셀 120px 폭 안에 96x96 아이콘을 상단 중앙(좌우 12px씩 여백)에 배치 → 8px 간격 →
//          이름 라벨(셀 폭 안에서 가운데 정렬, 13px에서 시작해 넘치면 자동 축소)]
async function buildTop5Collage(top5) {
  const CELL_WIDTH   = 120
  const ICON_SIZE    = 96
  const ICON_MARGIN  = (CELL_WIDTH - ICON_SIZE) / 2 // 12 — 좌우 여백
  const ICON_GAP     = 8   // 아이콘-이름 라벨 사이 간격
  const LABEL_HEIGHT = 20
  const MARGIN       = 16  // 캔버스 상하좌우 바깥 여백
  const BASE_FONT    = 13
  const MIN_FONT     = 8

  const width  = MARGIN * 2 + CELL_WIDTH * top5.length
  const height = MARGIN + ICON_SIZE + ICON_GAP + LABEL_HEIGHT + MARGIN

  const canvas = createCanvas(width, height)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#111827' // gray-900 — Discord 다크 임베드와 어울리는 배경
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < top5.length; i++) {
    const w = top5[i]
    const cellX = MARGIN + i * CELL_WIDTH
    const iconX = cellX + ICON_MARGIN
    const iconY = MARGIN

    try {
      const img = await loadImage(iconUrl(w.key))
      ctx.drawImage(img, iconX, iconY, ICON_SIZE, ICON_SIZE)
    } catch {
      ctx.fillStyle = '#374151' // gray-700 플레이스홀더
      ctx.fillRect(iconX, iconY, ICON_SIZE, ICON_SIZE)
    }

    // 이름 라벨 — 셀 폭(120px) 안에서 가운데 정렬. 13px에서 시작해 셀 폭을 넘으면 한 단계씩 축소.
    let fontSize = BASE_FONT
    ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
    while (fontSize > MIN_FONT && ctx.measureText(w.key).width > CELL_WIDTH - 8) {
      fontSize -= 1
      ctx.font = `bold ${fontSize}px "${FONT_FAMILY}"`
    }

    ctx.fillStyle = '#f9fafb'
    ctx.textAlign = 'center'
    const labelBaselineY = MARGIN + ICON_SIZE + ICON_GAP + LABEL_HEIGHT - 6
    ctx.fillText(w.key, cellX + CELL_WIDTH / 2, labelBaselineY)
  }

  return canvas.toBuffer('image/png')
}

async function buildTierEmbed(top5, meta, shard, EmbedBuilder) {
  const embed = new EmbedBuilder()
    .setTitle('🔫 이번주 무기 TOP5')
    .setColor(0xef4444)
    .setURL(`${PKGG_URL}/weapon-meta-live`)
    .setFooter({ text: `PKGG.vercel.app • 최근 7일 · ${SHARD_LABEL[shard] || shard} · 총 ${meta.totalKills?.toLocaleString() ?? 0}킬 기준` })
    .setTimestamp()

  let attachment = null
  try {
    const buffer = await buildTop5Collage(top5)
    attachment = new AttachmentBuilder(buffer, { name: 'top5.png' })
    embed.setImage('attachment://top5.png')
  } catch (err) {
    console.error('[무기티어] TOP5 콜라주 생성 실패, 텍스트로만 표시:', err.message)
  }

  // 콜라주 이미지 아래에 순위별 상세(타입/킬수/킬률/평균딜)를 텍스트 필드로 정리
  for (const w of top5) {
    const medal = RANK_MEDAL[w.rank] || `${w.rank}위`
    embed.addFields({
      name: `${medal} ${w.rank}위 · ${w.key}`,
      value:
        `🎯 타입: ${weaponTypeLabel(w.key)}\n` +
        `🔫 킬수: ${w.kills.toLocaleString()}\n` +
        `📊 킬률: ${w.killRate}%\n` +
        `💥 평균딜: ${w.avgDmg}`,
      inline: true,
    })
  }

  return { embed, attachment }
}

async function buildTierReply(shard, { EmbedBuilder }) {
  const { weapons, meta } = await fetchWeaponTierWeek(shard)
  if (!weapons?.length) {
    return { content: '❌ 최근 7일간 집계된 무기 데이터가 없습니다.', embeds: [], files: [] }
  }
  const top5 = getTop5(weapons)
  const { embed, attachment } = await buildTierEmbed(top5, meta, shard, EmbedBuilder)
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
  buildTop5Collage,
  addTierChannel,
  removeTierChannel,
  loadState,
  startWeeklyTierCron,
}
