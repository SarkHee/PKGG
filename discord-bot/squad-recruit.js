// discord-bot/squad-recruit.js
// /스쿼드예약 — 채널에 모집 임베드 게시 → "참석하기" 클릭 시 승인 절차 없이 선착순 즉시 확정
//
// 상태는 뉴스체커/무기티어와 동일한 파일 기반 JSON 패턴으로 관리한다.
// 버튼 customId에 recruitId를 실어서 여러 모집글이 동시에 떠 있어도 서로 안 섞이게 한다.
//   sq|join|<recruitId>   — 공개 채널 "참석하기" 버튼 (클릭 즉시 참가 확정)
//   sq|leave|<recruitId>  — 공개 채널 "불참하기" 버튼 (본인 확정만 취소)
//   sq|cancel|<recruitId> — 공개 채널 "취소" 버튼 (주최자 전용, 모집 전체 취소)

const fs   = require('fs')
const path = require('path')

const STATE_FILE = path.join(__dirname, 'data', 'squad-recruit-state.json')

// ── 상태 파일 읽기/쓰기 ────────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {}
  return { recruits: {} }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function genId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function getRecruit(id) {
  return loadState().recruits[id] || null
}

function saveRecruit(recruit) {
  const state = loadState()
  state.recruits[recruit.id] = recruit
  saveState(state)
}

// 모집글 생성 — 주최자는 자동으로 참가자 1번(본인 포함 총원 기준)이 된다.
function createRecruit({ hostId, hostName, scheduledTime, capacity, guildId, channelId }) {
  const recruit = {
    id: genId(),
    hostId,
    hostName,
    guildId,
    channelId,
    messageId: null, // 게시 직후 index.js에서 채워 넣음
    scheduledTime,
    capacity,
    participants: [hostId],
    status: 'open', // 'open' | 'closed' | 'canceled'
    createdAt: new Date().toISOString(),
  }
  saveRecruit(recruit)
  return recruit
}

function isFull(recruit) {
  return recruit.participants.length >= recruit.capacity
}

// ── 임베드/버튼 빌더 ───────────────────────────────────────────────────────
function buildRecruitEmbed(recruit, { EmbedBuilder }) {
  const canceled = recruit.status === 'canceled'
  const closed   = recruit.status === 'closed'
  const participantsText = recruit.participants.map((id) => `<@${id}>`).join('\n') || '아직 없음'

  const title = canceled ? '❌ 취소된 모집' : closed ? '🔒 스쿼드 모집 마감' : '🎮 스쿼드 모집'
  const color = canceled ? 0xef4444 : closed ? 0x6b7280 : 0x22c55e

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields(
      { name: '👑 주최자', value: `<@${recruit.hostId}>`, inline: true },
      { name: '⏰ 진행 예정 시간', value: recruit.scheduledTime, inline: true },
      { name: '👥 참여 인원', value: `${recruit.participants.length}/${recruit.capacity}명`, inline: true },
      { name: '참가자 목록', value: participantsText, inline: false },
    )
    .setFooter({ text: `모집 ID: ${recruit.id}` })
    .setTimestamp(new Date(recruit.createdAt))
}

// 공개 모집글에 붙는 버튼들: 참석하기 / 불참하기 / 취소. 취소된 모집이면 버튼을 아예 없앤다.
function buildButtonRows(recruit, { ActionRowBuilder, ButtonBuilder, ButtonStyle }) {
  if (recruit.status === 'canceled') return []

  const joinDisabled = recruit.status === 'closed' || isFull(recruit)
  const joinButton = new ButtonBuilder()
    .setCustomId(`sq|join|${recruit.id}`)
    .setLabel(joinDisabled ? '모집 마감' : '✋ 참석하기')
    .setStyle(joinDisabled ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(joinDisabled)

  const leaveButton = new ButtonBuilder()
    .setCustomId(`sq|leave|${recruit.id}`)
    .setLabel('🙋 불참하기')
    .setStyle(ButtonStyle.Secondary)

  const cancelButton = new ButtonBuilder()
    .setCustomId(`sq|cancel|${recruit.id}`)
    .setLabel('🗑️ 모집 취소')
    .setStyle(ButtonStyle.Danger)

  return [new ActionRowBuilder().addComponents(joinButton, leaveButton, cancelButton)]
}

// 공개 채널의 모집글 메시지를 최신 상태로 다시 그린다.
async function refreshRecruitMessage(client, recruit, components) {
  try {
    const channel = await client.channels.fetch(recruit.channelId).catch(() => null)
    if (!channel?.isTextBased()) return
    const message = await channel.messages.fetch(recruit.messageId).catch(() => null)
    if (!message) return
    await message.edit({
      embeds: [buildRecruitEmbed(recruit, components)],
      components: buildButtonRows(recruit, components),
    })
  } catch (err) {
    console.error(`[스쿼드예약] 모집글(${recruit.id}) 갱신 실패:`, err.message)
  }
}

// ── 커맨드: /스쿼드예약 시간:<텍스트> 인원:<숫자> ──────────────────────────
async function handleCreateCommand(interaction, components) {
  const scheduledTime = interaction.options.getString('시간')
  const capacity      = interaction.options.getInteger('인원')

  const recruit = createRecruit({
    hostId: interaction.user.id,
    hostName: interaction.user.displayName || interaction.user.username,
    scheduledTime,
    capacity,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
  })

  await interaction.reply({
    embeds: [buildRecruitEmbed(recruit, components)],
    components: buildButtonRows(recruit, components),
  })
  const message = await interaction.fetchReply()
  recruit.messageId = message.id
  saveRecruit(recruit)
}

// ── 버튼: 참석하기 (승인 절차 없이 클릭 즉시 선착순 확정) ──────────────────
async function handleJoinButton(interaction, recruitId, components) {
  const recruit = getRecruit(recruitId)
  if (!recruit) {
    return interaction.reply({ content: '❌ 이미 삭제되었거나 존재하지 않는 모집글입니다.', ephemeral: true })
  }

  const userId = interaction.user.id

  if (userId === recruit.hostId) {
    return interaction.reply({ content: '❌ 본인이 주최한 모집에는 참여 신청할 수 없습니다.', ephemeral: true })
  }
  if (recruit.participants.includes(userId)) {
    return interaction.reply({ content: '이미 참가 확정된 모집입니다.', ephemeral: true })
  }
  if (recruit.status === 'canceled') {
    return interaction.reply({ content: '❌ 취소된 모집입니다.', ephemeral: true })
  }
  if (recruit.status === 'closed' || isFull(recruit)) {
    return interaction.reply({ content: '❌ 이미 인원이 마감된 모집입니다.', ephemeral: true })
  }

  recruit.participants.push(userId)
  if (isFull(recruit)) recruit.status = 'closed'
  saveRecruit(recruit)

  await interaction.reply({ content: '✅ 참가 확정되었습니다!', ephemeral: true })
  await refreshRecruitMessage(interaction.client, recruit, components)
}

// ── 버튼: 모집 취소 (주최자 전용) ────────────────────────────────────────────
async function handleCancelButton(interaction, recruitId, components) {
  const recruit = getRecruit(recruitId)
  if (!recruit) {
    return interaction.reply({ content: '❌ 존재하지 않는 모집글입니다.', ephemeral: true })
  }
  if (interaction.user.id !== recruit.hostId) {
    return interaction.reply({ content: '❌ 주최자만 모집을 취소할 수 있습니다.', ephemeral: true })
  }
  if (recruit.status === 'canceled') {
    return interaction.reply({ content: '이미 취소된 모집입니다.', ephemeral: true })
  }

  // 주최자를 제외한 확정 참가자에게만 취소 알림 (본인이 취소한 거라 본인에겐 안 보냄)
  const notifyTargets = recruit.participants.filter((id) => id !== recruit.hostId)

  recruit.status = 'canceled'
  saveRecruit(recruit)

  await interaction.reply({ content: '🗑️ 모집을 취소했습니다.', ephemeral: true })
  await refreshRecruitMessage(interaction.client, recruit, components)

  for (const userId of notifyTargets) {
    try {
      const user = await interaction.client.users.fetch(userId)
      await user.send(`❌ **${recruit.hostName}**님의 스쿼드 모집(${recruit.scheduledTime})이 취소되었습니다.`)
    } catch (err) {
      console.error(`[스쿼드예약] 취소 알림 DM 실패(${userId}):`, err.message)
    }
  }
}

// ── 버튼: 불참하기 (본인 확정만 취소 가능) ──────────────────────────────────
async function handleLeaveButton(interaction, recruitId, components) {
  const recruit = getRecruit(recruitId)
  if (!recruit) {
    return interaction.reply({ content: '❌ 존재하지 않는 모집글입니다.', ephemeral: true })
  }
  if (recruit.status === 'canceled') {
    return interaction.reply({ content: '❌ 취소된 모집입니다.', ephemeral: true })
  }

  const userId = interaction.user.id
  if (userId === recruit.hostId) {
    return interaction.reply({ content: '❌ 주최자는 불참 대신 "모집 취소"를 사용해주세요.', ephemeral: true })
  }
  if (!recruit.participants.includes(userId)) {
    return interaction.reply({ content: '❌ 참가 확정된 상태가 아닙니다.', ephemeral: true })
  }

  const wasClosed = recruit.status === 'closed'
  recruit.participants = recruit.participants.filter((id) => id !== userId)
  if (wasClosed && !isFull(recruit)) recruit.status = 'open' // 마감 상태였으면 정원 미달로 다시 오픈
  saveRecruit(recruit)

  const nickname = interaction.user.displayName || interaction.user.username
  await interaction.reply({ content: '🙋 불참 처리했습니다.', ephemeral: true })
  await refreshRecruitMessage(interaction.client, recruit, components)

  try {
    const host = await interaction.client.users.fetch(recruit.hostId)
    await host.send(`🙋 **${nickname}**님이 모집(${recruit.scheduledTime})에 불참 처리했습니다. (${recruit.participants.length}/${recruit.capacity}명)`)
  } catch (err) {
    console.error(`[스쿼드예약] 주최자(${recruit.hostId}) 불참 알림 DM 실패:`, err.message)
  }
}

// customId 라우팅 (index.js interactionCreate에서 호출)
async function handleButton(interaction, components) {
  const [prefix, action, recruitId] = interaction.customId.split('|')
  if (prefix !== 'sq') return false

  if (action === 'join')        await handleJoinButton(interaction, recruitId, components)
  else if (action === 'leave')  await handleLeaveButton(interaction, recruitId, components)
  else if (action === 'cancel') await handleCancelButton(interaction, recruitId, components)

  return true
}

module.exports = {
  handleCreateCommand,
  handleButton,
  // 테스트/디버깅용
  loadState,
  getRecruit,
  createRecruit,
}
