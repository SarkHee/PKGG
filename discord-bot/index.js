require('dotenv').config()
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const PKGG = 'https://pkgg.vercel.app'

// PKGG style 코드 → 한국어 라벨
const STYLE_LABEL = {
  HYPER_CARRY:      '하이퍼 캐리형',
  AGGRESSIVE:       '공격형',
  PASSIVE:          '생존형',
  SNIPER:           '저격수형',
  SUPPORT:          '지원형',
  BALANCED:         '균형형',
  PRECISION_SNIPER: '정밀 사수형',
  EARLY_RUSHER:     '초반 러셔',
  TACTICAL_LEADER:  '전술 리더형',
  UNKNOWN:          '분석 중',
}

// MMR 값 → 티어 이모지 + 라벨
function tierInfo(mmr) {
  if (!mmr) return { emoji: '', label: '' }
  if (mmr >= 2000) return { emoji: '👑', label: 'Legend' }
  if (mmr >= 1800) return { emoji: '💎', label: 'Diamond' }
  if (mmr >= 1600) return { emoji: '🏆', label: 'Platinum' }
  if (mmr >= 1400) return { emoji: '🥇', label: 'Gold' }
  if (mmr >= 1200) return { emoji: '🥈', label: 'Silver' }
  if (mmr >= 1000) return { emoji: '🥉', label: 'Bronze' }
  return { emoji: '🥉', label: 'Bronze' }
}

// 클랜 임베드용 단순 이모지
function tierEmoji(mmr) {
  return tierInfo(mmr).emoji
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 100)}`)
  }
  return res.json()
}

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} 온라인`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  // ──────────────────────────────────────────────────
  // /전적 [닉네임]
  // ──────────────────────────────────────────────────
  if (interaction.commandName === '전적') {
    const nickname = interaction.options.getString('닉네임')
    await interaction.deferReply()

    try {
      const data = await fetchJson(
        `${PKGG}/api/pubg/search?nickname=${encodeURIComponent(nickname)}&shard=steam`
      )

      if (!data.results?.length) {
        return interaction.editReply(`❌ **${nickname}** 플레이어를 찾을 수 없습니다.\n닉네임을 정확히 입력해 주세요.`)
      }

      const p = data.results[0]
      const s = p.stats
      const name = p.nickname

      const mmr      = s?.mmr         ?? null
      const damage   = s?.avgDamage   ?? null
      const kills    = s?.avgKills    ?? null
      const winRate  = s?.winRate     ?? null
      const top10    = s?.top10Rate   ?? null
      const styleRaw = s?.style       ?? null
      const style    = STYLE_LABEL[styleRaw] || styleRaw || '정보 없음'

      const tier      = tierInfo(mmr)
      const mmrStr    = mmr    != null ? `${tier.emoji} ${mmr.toLocaleString()} (${tier.label})` : '정보 없음'
      const damageStr = damage != null ? String(damage)                                           : '정보 없음'
      const killsStr  = kills  != null ? String(kills)                                            : '정보 없음'
      const winStr    = winRate != null ? `${winRate}%`                                           : '정보 없음'
      const top10Str  = top10  != null ? `${top10}%`                                             : '정보 없음'

      const clanStr   = p.clanName ? `[${p.clanTag || p.clanName}] ${p.clanName}` : '클랜 없음'
      const profileUrl = `${PKGG}/player/steam/${encodeURIComponent(name)}`

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${name}`)
        .setColor(0x7f77dd)
        .setURL(profileUrl)
        .setThumbnail(`${PKGG}/logo.png`)
        .addFields(
          { name: '📊 PKGG 점수',     value: mmrStr,    inline: true },
          { name: '💥 평균 딜량',     value: damageStr,  inline: true },
          { name: '⚔️  평균 킬',      value: killsStr,   inline: true },
          { name: '🏆 승률',          value: winStr,     inline: true },
          { name: '📈 Top10 진입률',  value: top10Str,   inline: true },
          { name: '🎯 플레이스타일',  value: style,      inline: true },
          { name: '🛡️  클랜',         value: clanStr,    inline: false },
        )
        .setFooter({ text: 'PKGG.vercel.app • PUBG 전적 조회' })
        .setTimestamp()

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('자세히 보기')
          .setStyle(ButtonStyle.Link)
          .setURL(profileUrl)
          .setEmoji('🔍'),
      )

      await interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      console.error('[전적] 오류:', err.message)
      await interaction.editReply('❌ 전적 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  // ──────────────────────────────────────────────────
  // /클랜 [클랜명]
  // ──────────────────────────────────────────────────
  if (interaction.commandName === '클랜') {
    const clanName = interaction.options.getString('클랜명')
    await interaction.deferReply()

    try {
      const data = await fetchJson(`${PKGG}/api/clan/${encodeURIComponent(clanName)}`)

      const clan    = data.clan
      const stats   = data.stats
      const ranking = data.ranking
      const top3    = data.topPerformers?.byMMR?.slice(0, 3) ?? []

      if (!clan) {
        return interaction.editReply(`❌ **${clanName}** 클랜을 찾을 수 없습니다.`)
      }

      const tag         = clan.tag ? `[${clan.tag}] ` : ''
      const memberCount = stats?.memberCount ?? clan.apiMemberCount ?? 0
      const avgMMR      = stats?.avgMMR      ? `${tierEmoji(stats.avgMMR)} ${stats.avgMMR.toLocaleString()}` : '정보 없음'
      const avgDamage   = stats?.avgDamage   ? String(stats.avgDamage) : '정보 없음'
      const winRate     = stats?.winRate     ? `${stats.winRate}%`     : '정보 없음'
      const rankStr     = ranking?.overall   ? `${ranking.overall}위`  : '정보 없음'
      const region      = clan.region || '미설정'
      const level       = clan.level  ? `Lv.${clan.level}` : '-'

      const embed = new EmbedBuilder()
        .setTitle(`🛡️  ${tag}${clan.name}`)
        .setColor(0x10b981)
        .setURL(`${PKGG}/clan/${encodeURIComponent(clanName)}`)
        .addFields(
          { name: '👥 활성 멤버 수',  value: String(memberCount), inline: true },
          { name: '📊 평균 MMR',      value: avgMMR,               inline: true },
          { name: '🏅 클랜 랭킹',     value: rankStr,              inline: true },
          { name: '💥 평균 딜량',     value: avgDamage,            inline: true },
          { name: '🏆 평균 승률',     value: winRate,              inline: true },
          { name: '🌍 지역 / 레벨',   value: `${region} / ${level}`, inline: true },
        )
        .setFooter({ text: 'PKGG.vercel.app • PUBG 클랜 조회' })
        .setTimestamp()

      if (top3.length > 0) {
        const medals = ['🥇', '🥈', '🥉']
        const top3str = top3
          .map((m, i) => {
            const mmrVal = typeof m.value === 'number' ? m.value.toLocaleString() : m.value
            return `${medals[i]} **${m.name}** — ${mmrVal} MMR`
          })
          .join('\n')
        embed.addFields({ name: '👑 MMR 상위 멤버', value: top3str, inline: false })
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('클랜 상세보기')
          .setStyle(ButtonStyle.Link)
          .setURL(`${PKGG}/clan/${encodeURIComponent(clanName)}`)
          .setEmoji('🔍'),
      )

      await interaction.editReply({ embeds: [embed], components: [row] })
    } catch (err) {
      console.error('[클랜] 오류:', err.message)
      await interaction.editReply('❌ 클랜 조회 중 오류가 발생했습니다. 클랜명을 다시 확인해 주세요.')
    }
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
