require('dotenv').config()
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { checkAndSendNews, addNewsChannel, removeNewsChannel, loadState } = require('./news-checker')
const { checkServerStatus } = require('./server-checker')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const PKGG   = 'https://pkgg.vercel.app'

const DISCORD_COMPONENTS = { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle }

// PlayerCache.style DB값 → 이모지 포함 라벨
const STYLE_LABEL = {
  '교전형': '⚔️ 교전형',
  '수비형': '🛡️ 수비형',
  '안정형': '🎯 안정형',
  '밸런스': '⚖️ 밸런스',
}

function tierInfo(mmr) {
  if (!mmr) return { emoji: '', label: '' }
  if (mmr >= 2000) return { emoji: '👑', label: 'Legend' }
  if (mmr >= 1800) return { emoji: '💎', label: 'Diamond' }
  if (mmr >= 1600) return { emoji: '🏆', label: 'Platinum' }
  if (mmr >= 1400) return { emoji: '🥇', label: 'Gold' }
  if (mmr >= 1200) return { emoji: '🥈', label: 'Silver' }
  return              { emoji: '🥉', label: 'Bronze' }
}

function tierEmoji(mmr) { return tierInfo(mmr).emoji }

// PUBG 경쟁전 티어 → 한국어 + 이모지
const RANKED_TIER_KO = {
  Bronze:   { label: '브론즈',   emoji: '🥉' },
  Silver:   { label: '실버',     emoji: '🥈' },
  Gold:     { label: '골드',     emoji: '🥇' },
  Platinum: { label: '플래티넘', emoji: '💠' },
  Diamond:  { label: '다이아',   emoji: '💎' },
  Master:   { label: '마스터',   emoji: '👑' },
}

// 경쟁전 티어 정보 조회 (seasons → ranked stats 순서)
async function fetchRankedInfo(shard, accountId) {
  try {
    const seasonData = await fetchJson(`${PKGG}/api/pubg/seasons?shard=${shard}`)
    const seasonId = seasonData?.currentSeasonId
    if (!seasonId) return null

    const rankedData = await fetchJson(
      `${PKGG}/api/pubg/stats/ranked/${shard}/${accountId}/${seasonId}`
    )
    const modeStats = rankedData?.data?.rankedGameModeStats || {}
    // squad-fpp 우선, 없으면 squad
    const mode = modeStats['squad-fpp'] || modeStats['squad'] || Object.values(modeStats)[0]
    if (!mode || !mode.roundsPlayed) return null

    const tier    = mode.currentTier?.tier    || ''
    const subTier = mode.currentTier?.subTier || ''
    const rp      = mode.currentRankPoint     || 0
    const games   = mode.roundsPlayed         || 0
    const wins    = mode.wins                 || 0
    const kd      = games > 0
      ? ((mode.kills || 0) / Math.max(1, games - wins)).toFixed(2)
      : '0.00'

    const info = RANKED_TIER_KO[tier]
    if (!info) return null

    return {
      label:    `${info.emoji} ${info.label}${subTier && subTier !== 'I' && tier !== 'Master' ? ' ' + subTier : ''}`,
      rp,
      games,
      kd,
    }
  } catch {
    return null
  }
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 100)}`)
  }
  return res.json()
}

// ── 봇 준비 ──────────────────────────────────────────────────────────────
client.once('clientReady', () => {
  console.log(`✅ ${client.user.tag} 온라인`)

  const interval = parseInt(process.env.NEWS_CHECK_INTERVAL) || 3_600_000  // 기본 1시간

  // 시작 후 5초 뒤 첫 체크 (봇 완전 준비 대기)
  setTimeout(() => {
    checkAndSendNews(client, DISCORD_COMPONENTS)
      .catch((e) => console.error('[뉴스체커] 초기 체크 실패:', e.message))
  }, 5_000)

  setInterval(() => {
    checkAndSendNews(client, DISCORD_COMPONENTS)
      .catch((e) => console.error('[뉴스체커] 주기 체크 실패:', e.message))
  }, interval)

  console.log(`📰 뉴스 체크 주기: ${interval / 60_000}분`)

  // ── 서버 상태 모니터링 (3분 주기) ──────────────────────────────────────
  const SERVER_CHECK_INTERVAL = 3 * 60 * 1000  // 3분

  // 시작 후 15초 뒤 첫 체크 (뉴스체커 이후)
  setTimeout(() => {
    const { channelIds } = loadState()
    checkServerStatus(client, DISCORD_COMPONENTS, channelIds)
      .catch((e) => console.error('[서버체커] 초기 체크 실패:', e.message))
  }, 15_000)

  setInterval(() => {
    const { channelIds } = loadState()
    checkServerStatus(client, DISCORD_COMPONENTS, channelIds)
      .catch((e) => console.error('[서버체커] 주기 체크 실패:', e.message))
  }, SERVER_CHECK_INTERVAL)

  console.log(`📡 서버 상태 체크 주기: ${SERVER_CHECK_INTERVAL / 60_000}분`)
})

const SHARD_LABEL = { steam: '🎮 Steam', kakao: '🟡 카카오' }

// 플레이어 결과 → Discord Embed + 버튼 빌드
// ranked: fetchRankedInfo() 결과 또는 null
function buildPlayerReply(p, ranked) {
  const s          = p.stats
  const name       = p.nickname
  const shard      = p.shard || 'steam'
  const profileUrl = `${PKGG}/player/${shard}/${encodeURIComponent(name)}`
  const shardLabel = SHARD_LABEL[shard] || shard

  if (!s) {
    return {
      content:
        `⚠️ **${name}** (${shardLabel}) 의 전적 데이터가 없습니다.\n` +
        `PKGG 사이트에서 먼저 검색하면 데이터가 수집됩니다.\n🔗 ${profileUrl}`,
      embeds: [],
      components: [],
    }
  }

  const mmr      = s.mmr       ?? null
  const damage   = s.avgDamage ?? null
  const kills    = s.avgKills  ?? null
  const winRate  = s.winRate   ?? null
  const top10    = s.top10Rate ?? null
  const style    = STYLE_LABEL[s.style] || s.style || '정보 없음'
  const tier     = tierInfo(mmr)

  // 경쟁전 티어 표시값
  const rankedValue = ranked
    ? `${ranked.label}  RP ${ranked.rp.toLocaleString()}  (${ranked.games}판 · KD ${ranked.kd})`
    : '경쟁전 기록이 없습니다'

  const embed = new EmbedBuilder()
    .setTitle(`${shardLabel}  ${name}`)
    .setColor(shard === 'kakao' ? 0xf59e0b : 0x7f77dd)
    .setURL(profileUrl)
    .addFields(
      { name: '📊 PKGG 점수',    value: mmr    != null ? `${tier.emoji} ${mmr.toLocaleString()} (${tier.label})` : '정보 없음', inline: true },
      { name: '💥 평균 딜량',    value: damage != null ? String(damage)  : '정보 없음', inline: true },
      { name: '⚔️  평균 킬',     value: kills  != null ? String(kills)   : '정보 없음', inline: true },
      { name: '🏆 승률',         value: winRate != null ? `${winRate}%`  : '정보 없음', inline: true },
      { name: '📈 Top10 진입률', value: top10  != null ? `${top10}%`     : '정보 없음', inline: true },
      { name: '🎯 플레이스타일', value: style,                                          inline: true },
      { name: '🏅 경쟁전 티어',  value: rankedValue,                                   inline: false },
    )
    .setFooter({ text: 'PKGG.vercel.app • PUBG 전적 조회', iconURL: `${PKGG}/logo.png` })
    .setTimestamp()

  if (p.clanName) {
    embed.addFields({ name: '🛡️  클랜', value: `[${p.clanTag || p.clanName}] ${p.clanName}`, inline: false })
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('자세히 보기').setStyle(ButtonStyle.Link).setURL(profileUrl).setEmoji('🔍')
  )
  return { content: null, embeds: [embed], components: [row] }
}

// ── 슬래시 커맨드 ─────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {

  // ── 플랫폼 선택 버튼 (ps|{shard}|{nickname}) ─────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('ps|')) {
    const parts    = interaction.customId.split('|')
    const shard    = parts[1]
    const nickname = parts.slice(2).join('|')
    await interaction.deferUpdate()
    try {
      const data    = await fetchJson(`${PKGG}/api/pubg/search?nickname=${encodeURIComponent(nickname)}&shard=${shard}`)
      const player  = data.results?.[0]
      if (!player) {
        return interaction.editReply({ content: `❌ **${nickname}** (${SHARD_LABEL[shard] || shard}) 플레이어를 찾을 수 없습니다.`, embeds: [], components: [] })
      }
      const ranked = await fetchRankedInfo(shard, player.accountId)
      const reply  = buildPlayerReply(player, ranked)
      return interaction.editReply(reply)
    } catch (err) {
      console.error('[플랫폼선택버튼] 오류:', err.message)
      return interaction.editReply({ content: '❌ 조회 중 오류가 발생했습니다.', embeds: [], components: [] })
    }
  }

  if (!interaction.isChatInputCommand()) return

  // ────────────────────────────────────────────────
  // /전적 [닉네임] [플랫폼?]
  // ────────────────────────────────────────────────
  if (interaction.commandName === '전적') {
    const nickname = interaction.options.getString('닉네임')
    const platform = interaction.options.getString('플랫폼') // null = 자동감지
    await interaction.deferReply()

    try {
      let results = []

      if (platform) {
        // 플랫폼 직접 지정 → 해당 shard만 조회
        const data = await fetchJson(`${PKGG}/api/pubg/search?nickname=${encodeURIComponent(nickname)}&shard=${platform}`)
        results = data.results || []
      } else {
        // 자동감지 → shard 없이 한 번 호출 (API가 steam+kakao 병렬 처리)
        const data = await fetchJson(`${PKGG}/api/pubg/search?nickname=${encodeURIComponent(nickname)}`)
        results = data.results || []
      }

      if (!results.length) {
        return interaction.editReply(`❌ **${nickname}** 플레이어를 찾을 수 없습니다.\n닉네임을 정확히 입력해 주세요.`)
      }

      // 결과 1개 → 바로 표시
      if (results.length === 1) {
        const ranked = await fetchRankedInfo(results[0].shard, results[0].accountId)
        const reply  = buildPlayerReply(results[0], ranked)
        return interaction.editReply(reply)
      }

      // 결과 2개 이상 → 플랫폼 선택 버튼 표시
      const buttons = results.map((r) =>
        new ButtonBuilder()
          .setCustomId(`ps|${r.shard}|${r.nickname}`)
          .setLabel(`${SHARD_LABEL[r.shard] || r.shard}으로 보기`)
          .setStyle(r.shard === 'kakao' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      )
      const row = new ActionRowBuilder().addComponents(...buttons)
      return interaction.editReply({
        content: `⚠️ **${results[0].nickname}** 닉네임이 여러 플랫폼에 존재합니다.\n플랫폼을 선택해주세요:`,
        components: [row],
      })

    } catch (err) {
      console.error('[전적] 오류:', err.message)
      await interaction.editReply('❌ 전적 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  // ────────────────────────────────────────────────
  // /클랜 [클랜명]
  // ────────────────────────────────────────────────
  if (interaction.commandName === '클랜') {
    const clanName = interaction.options.getString('클랜명')
    await interaction.deferReply()

    try {
      const data    = await fetchJson(`${PKGG}/api/clan/${encodeURIComponent(clanName)}`)
      const clan    = data.clan
      const stats   = data.stats
      const ranking = data.ranking
      const top3    = data.topPerformers?.byMMR?.slice(0, 3) ?? []

      if (!clan) return interaction.editReply(`❌ **${clanName}** 클랜을 찾을 수 없습니다.`)

      const tag         = clan.tag ? `[${clan.tag}] ` : ''
      const memberCount = stats?.memberCount ?? clan.apiMemberCount ?? 0
      const avgMMR      = stats?.avgMMR      ? `${tierEmoji(stats.avgMMR)} ${stats.avgMMR.toLocaleString()}` : '정보 없음'

      const embed = new EmbedBuilder()
        .setTitle(`🛡️  ${tag}${clan.name}`)
        .setColor(0x10b981)
        .setURL(`${PKGG}/clan/${encodeURIComponent(clanName)}`)
        .addFields(
          { name: '👥 활성 멤버 수',  value: String(memberCount),                                           inline: true },
          { name: '📊 평균 MMR',      value: avgMMR,                                                        inline: true },
          { name: '🏅 클랜 랭킹',     value: ranking?.overall ? `${ranking.overall}위` : '정보 없음',       inline: true },
          { name: '💥 평균 딜량',     value: stats?.avgDamage ? String(stats.avgDamage) : '정보 없음',      inline: true },
          { name: '🏆 평균 승률',     value: stats?.winRate   ? `${stats.winRate}%`     : '정보 없음',      inline: true },
          { name: '🌍 지역 / 레벨',   value: `${clan.region || '미설정'} / ${clan.level ? `Lv.${clan.level}` : '-'}`, inline: true },
        )
        .setFooter({ text: 'PKGG.vercel.app • PUBG 클랜 조회' })
        .setTimestamp()

      if (top3.length > 0) {
        const medals = ['🥇', '🥈', '🥉']
        embed.addFields({
          name:  '👑 MMR 상위 멤버',
          value: top3.map((m, i) => `${medals[i]} **${m.name}** — ${typeof m.value === 'number' ? m.value.toLocaleString() : m.value} MMR`).join('\n'),
          inline: false,
        })
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('클랜 상세보기').setStyle(ButtonStyle.Link).setURL(`${PKGG}/clan/${encodeURIComponent(clanName)}`).setEmoji('🔍')
      )
      await interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      console.error('[클랜] 오류:', err.message)
      await interaction.editReply('❌ 클랜 조회 중 오류가 발생했습니다. 클랜명을 다시 확인해 주세요.')
    }
  }

  // ────────────────────────────────────────────────
  // /서버상태
  // ────────────────────────────────────────────────
  if (interaction.commandName === '서버상태') {
    await interaction.deferReply()
    try {
      const data = await fetchJson(`${PKGG}/api/pubg/server-status`)
      const STATUS_KO = {
        online:      { icon: '🟢', label: '정상 운영',   color: 0x22c55e },
        maintenance: { icon: '🔴', label: '점검 중',     color: 0xef4444 },
        offline:     { icon: '⚫', label: '접속 불가',   color: 0x6b7280 },
        degraded:    { icon: '🟡', label: '일부 불안정', color: 0xf59e0b },
      }
      const s   = STATUS_KO[data.status] || { icon: '⚪', label: '확인 중', color: 0x6b7280 }
      const reg = data.regions || {}
      const updatedAt = data.updatedAt
        ? new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
        : '—'

      const embed = new EmbedBuilder()
        .setTitle(`${s.icon} PUBG 서버 상태: ${s.label}`)
        .setColor(s.color)
        .setDescription(data.message || '')
        .addFields(
          { name: '🌏 아시아',  value: (STATUS_KO[reg.as]?.icon || '⚪') + ' ' + (STATUS_KO[reg.as]?.label || '—'), inline: true },
          { name: '🌎 북미',    value: (STATUS_KO[reg.na]?.icon || '⚪') + ' ' + (STATUS_KO[reg.na]?.label || '—'), inline: true },
          { name: '🌍 유럽',    value: (STATUS_KO[reg.eu]?.icon || '⚪') + ' ' + (STATUS_KO[reg.eu]?.label || '—'), inline: true },
        )
        .setFooter({ text: `마지막 확인: ${updatedAt} · 5분 주기 업데이트` })
        .setURL(`${PKGG}/server-status`)

      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      console.error('[서버상태] 오류:', err.message)
      await interaction.editReply('❌ 서버 상태 조회 중 오류가 발생했습니다.')
    }
  }

  // ────────────────────────────────────────────────
  // /뉴스채널 설정 #채널명
  // ────────────────────────────────────────────────
  if (interaction.commandName === '뉴스채널') {
    const sub = interaction.options.getSubcommand()

    if (sub === '설정') {
      const channel = interaction.options.getChannel('채널')
      if (!channel?.isTextBased()) {
        return interaction.reply({ content: '❌ 텍스트 채널만 설정할 수 있습니다.', ephemeral: true })
      }
      addNewsChannel(channel.id)
      await interaction.reply(`✅ <#${channel.id}> 채널에 PUBG 뉴스 자동 알림이 설정되었습니다!\n📰 새 글이 올라오면 자동으로 전송됩니다.`)
    }

    if (sub === '해제') {
      const channel = interaction.options.getChannel('채널')
      removeNewsChannel(channel.id)
      await interaction.reply(`🔕 <#${channel.id}> 채널의 PUBG 뉴스 알림이 해제되었습니다.`)
    }

    if (sub === '목록') {
      const state   = loadState()
      if (state.channelIds.length === 0) {
        return interaction.reply({ content: '📭 설정된 뉴스 알림 채널이 없습니다.', ephemeral: true })
      }
      const list = state.channelIds.map((id) => `<#${id}>`).join('\n')
      await interaction.reply({ content: `📋 **뉴스 알림 채널 목록**\n${list}`, ephemeral: true })
    }
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
