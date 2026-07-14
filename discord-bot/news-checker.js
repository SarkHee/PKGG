// discord-bot/news-checker.js
// pubg.com/ko/news 크롤링 → 새 글 감지 → 디스코드 채널 자동 알림

const fs   = require('fs')
const path = require('path')

const STATE_FILE = path.join(__dirname, 'data', 'news-state.json')
const NEWS_URL   = 'https://www.pubg.com/ko/news'

const CATEGORY_COLOR = {
  '패치노트': 0x3B82F6,   // 파란색
  '공지':     0xF59E0B,   // 노란색
  '개발일지': 0x10B981,   // 초록색
}
const DEFAULT_COLOR = 0x8B5CF6  // 보라색 (이벤트 등 기타)

// ── 상태 파일 읽기/쓰기 ────────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {}
  return { lastSeenIds: [], channelIds: [] }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

// ── HTML 파싱 (cheerio 의존 없이 regex 사용) ───────────────────────────────
function extractPostIds(html) {
  // __NUXT__ JS 리터럴: postId:12345 (따옴표 없음)
  return [...html.matchAll(/\bpostId\s*:\s*(\d+)/g)].map((m) => parseInt(m[1]))
}

function extractCards(html) {
  const cards = []
  const re    = /<li class="post-contents__card"[^>]*>([\s\S]*?)<\/li>/g
  let m
  while ((m = re.exec(html)) !== null) cards.push(m[1])
  return cards
}

function parseCard(card) {
  // 썸네일
  const imgM  = card.match(/<div class="post__thumb"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/)
  const thumbnail = imgM ? imgM[1] : null

  // 제목
  const titleM = card.match(/<dl class="post__description"[^>]*>[\s\S]*?<dt[^>]*>([\s\S]*?)<\/dt>/)
  const title  = titleM ? titleM[1].trim() : null

  // 카테고리 & 날짜 (post__bottom dt/dd)
  const bottomM = card.match(/<dl class="post__bottom"[^>]*>([\s\S]*?)<\/dl>/)
  let category = null, dateStr = null
  if (bottomM) {
    const dtM = bottomM[1].match(/<dt[^>]*>([\s\S]*?)<\/dt>/)
    const ddM = bottomM[1].match(/<dd[^>]*>([\s\S]*?)<\/dd>/)
    category = dtM ? dtM[1].trim() : null
    dateStr  = ddM ? ddM[1].trim() : null
  }

  // 플랫폼 태그
  const platforms = []
  const pfRe = /class="[^"]*label[^"]*post__label[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/g
  let pm
  while ((pm = pfRe.exec(card)) !== null) {
    const t = pm[1].replace(/<[^>]+>/g, '').trim()
    if (t) platforms.push(t)
  }

  return { thumbnail, title, category, dateStr, platforms }
}

async function fetchNews() {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(NEWS_URL, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Accept':          'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })
    clearTimeout(tid)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html    = await res.text()
    const postIds = extractPostIds(html)
    const cards   = extractCards(html)

    return cards
      .map((card, i) => {
        const { thumbnail, title, category, dateStr, platforms } = parseCard(card)
        const id = postIds[i] || null
        return { id, title, category, dateStr, thumbnail, url: id ? `${NEWS_URL}/${id}` : null, platforms }
      })
      .filter((item) => item.id && item.title)
  } catch (err) {
    clearTimeout(tid)
    throw err
  }
}

// ── 디스코드 임베드 생성 ──────────────────────────────────────────────────
function buildEmbed(item, EmbedBuilder) {
  const color    = CATEGORY_COLOR[item.category] ?? DEFAULT_COLOR
  const catLabel = item.category ? `[${item.category}]` : ''

  const embed = new EmbedBuilder()
    .setTitle(`${catLabel} ${item.title}`.trim())
    .setColor(color)
    .setURL(item.url)
    .setFooter({ text: 'PUBG 공식 뉴스 • pubg.com' })

  if (item.thumbnail) embed.setImage(item.thumbnail)
  if (item.dateStr)    embed.addFields({ name: '📅 날짜',    value: item.dateStr,                  inline: true })
  if (item.category)   embed.addFields({ name: '📂 카테고리', value: item.category,                inline: true })
  if (item.platforms?.length)
                        embed.addFields({ name: '🎮 플랫폼',  value: item.platforms.join(' · '), inline: true })
  return embed
}

// 체크 1회의 결과를 상태 파일에 남긴다 (마지막 실행 시각/결과를 나중에 조회할 수 있도록)
function recordCheck(result, extra = {}) {
  const state = loadState()
  state.lastCheckedAt = new Date().toISOString()
  state.lastResult     = result
  Object.assign(state, extra)
  saveState(state)
  return state
}

// ── 새 글 체크 & 전송 (크론에서 호출) ────────────────────────────────────
async function checkAndSendNews(client, { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle }) {
  console.log(`[뉴스체커] 체크 시작 (${new Date().toISOString()})`)

  const state = loadState()
  if (state.channelIds.length === 0) {
    console.log('[뉴스체커] 등록된 채널 없음 — 체크 스킵')
    recordCheck('no_channels')
    return
  }

  let items
  try {
    items = await fetchNews()
  } catch (err) {
    console.error('[뉴스체커] 크롤링 실패:', err.message)
    recordCheck('fetch_error', { lastError: err.message })
    return
  }

  if (!items.length) {
    // 크롤링 자체는 200을 받았지만 글 목록을 파싱하지 못한 경우 — pubg.com 페이지 구조가
    // 바뀌었을 가능성이 높음. 조용히 넘어가면 원인 파악이 안 되므로 반드시 로그를 남긴다.
    console.warn('[뉴스체커] 응답은 받았으나 파싱된 글이 0개 — pubg.com 페이지 구조 변경 의심')
    recordCheck('empty_parse')
    return
  }

  const lastSeenSet = new Set(state.lastSeenIds)
  const newItems    = items.filter((item) => !lastSeenSet.has(item.id))

  if (!newItems.length) {
    console.log(`[뉴스체커] 새 글 없음 (조회된 글 ${items.length}개 모두 기존과 동일)`)
    recordCheck('no_new', { lastSeenIds: [...new Set([...items.map((i) => i.id), ...state.lastSeenIds])].slice(0, 50) })
    return
  }

  console.log(`[뉴스체커] 새 글 ${newItems.length}개 발견`)

  // 채널별 전송 (오래된 글부터 순서대로)
  for (const channelId of state.channelIds) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null)
      if (!channel?.isTextBased()) continue

      for (const item of [...newItems].reverse()) {
        const embed = buildEmbed(item, EmbedBuilder)
        const row   = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('원문 보기')
            .setStyle(ButtonStyle.Link)
            .setURL(item.url)
            .setEmoji('🔗')
        )
        await channel.send({ embeds: [embed], components: [row] })
        await new Promise((r) => setTimeout(r, 500))  // rate limit 방지
      }
      console.log(`[뉴스체커] ${channelId} 채널 전송 완료`)
    } catch (err) {
      console.error(`[뉴스체커] 채널 ${channelId} 전송 실패:`, err.message)
    }
  }

  // 현재 페이지 전체 ID 저장 (최대 50개)
  recordCheck('sent', {
    lastSeenIds: [...new Set([...items.map((i) => i.id), ...state.lastSeenIds])].slice(0, 50),
  })
}

// ── 채널 등록/제거 ──────────────────────────────────────────────────────
function addNewsChannel(channelId) {
  const state = loadState()
  if (!state.channelIds.includes(channelId)) {
    state.channelIds.push(channelId)
    saveState(state)
  }
}

function removeNewsChannel(channelId) {
  const state = loadState()
  state.channelIds = state.channelIds.filter((id) => id !== channelId)
  saveState(state)
}

// 마지막 실행 시각/결과 + (setInterval 주기 기준) 다음 실행 예정 시각 조회
function getNewsCheckerStatus() {
  const state    = loadState()
  const interval = parseInt(process.env.NEWS_CHECK_INTERVAL) || 3_600_000
  const lastCheckedAt = state.lastCheckedAt ? new Date(state.lastCheckedAt) : null
  const nextCheckAt   = lastCheckedAt ? new Date(lastCheckedAt.getTime() + interval) : null

  return {
    lastCheckedAt,
    lastResult: state.lastResult ?? null,
    lastError:  state.lastError ?? null,
    nextCheckAt,
    intervalMs: interval,
    channelCount: state.channelIds.length,
  }
}

module.exports = { checkAndSendNews, addNewsChannel, removeNewsChannel, loadState, getNewsCheckerStatus }
