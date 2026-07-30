// POST /api/target-shooting/submit { nickname?, score }
// 로그인+연동 유저: 세션에서 직접 닉네임/식별자를 결정하고, 기존 최고점수보다 높을 때만 갱신.
// 비로그인/미연동 유저: 클라이언트가 보낸 닉네임으로 매번 새 기록 추가 (최고점수 로직 미적용).
import prisma from '../../../utils/prisma.js'
import { getSessionAuthUser } from '../../../utils/clanBattleAuth.js'

const MAX_PLAUSIBLE_SCORE = 2000 // 60초 게임에서 현실적으로 나올 수 없는 값 방어용 느슨한 상한선

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { score } = req.body || {}
  if (!Number.isInteger(score) || score < 0 || score > MAX_PLAUSIBLE_SCORE) {
    return res.status(400).json({ error: '유효하지 않은 점수입니다.' })
  }

  const authUser = await getSessionAuthUser(req, res)
  const linkedAccount = authUser
    ? (authUser.pubgAccounts || []).find((a) => a.id === authUser.mainAccountId) || authUser.pubgAccounts?.[0]
    : null

  try {
    if (authUser && linkedAccount) {
      // 로그인 + 연동 유저 — 기존 최고점수보다 높을 때만 갱신
      const existing = await prisma.targetShootingScore.findUnique({ where: { userId: authUser.id } })
      if (!existing) {
        await prisma.targetShootingScore.create({
          data: { userId: authUser.id, nickname: linkedAccount.nickname, score },
        })
        return res.status(200).json({ ok: true, updated: true, bestScore: score })
      }
      if (score > existing.score) {
        await prisma.targetShootingScore.update({
          where: { id: existing.id },
          data: { score, nickname: linkedAccount.nickname, createdAt: new Date() },
        })
        return res.status(200).json({ ok: true, updated: true, bestScore: score })
      }
      return res.status(200).json({ ok: true, updated: false, bestScore: existing.score })
    }

    // 비로그인/미연동 — 닉네임 직접 입력, 매번 새 기록으로 추가
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : ''
    if (!nickname || nickname.length > 20) {
      return res.status(400).json({ error: '닉네임은 1~20자로 입력해주세요.' })
    }
    await prisma.targetShootingScore.create({ data: { nickname, score } })
    return res.status(200).json({ ok: true, updated: true, bestScore: score })
  } catch (e) {
    console.error('[target-shooting/submit] 오류:', e.message)
    return res.status(500).json({ error: '기록 저장에 실패했습니다.' })
  }
}
