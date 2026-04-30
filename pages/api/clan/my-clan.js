// 로그인 유저의 클랜 ID 조회 (users.clanId가 null일 때 ClanMember에서 fallback)
import { getSession } from '../../../utils/session'
import prisma from '../../../utils/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = getSession(req)
  if (!session?.userId) return res.status(401).json({ clanId: null })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { clanId: true, pubgAccountId: true, pubgNickname: true },
    })

    if (!user) return res.json({ clanId: null })

    // 이미 clanId가 있으면 바로 반환
    if (user.clanId) return res.json({ clanId: user.clanId })

    // ClanMember에서 pubgPlayerId 또는 닉네임으로 찾기
    let member = null
    if (user.pubgAccountId) {
      member = await prisma.clanMember.findFirst({
        where: { pubgPlayerId: user.pubgAccountId },
        select: { clanId: true },
      })
    }
    if (!member && user.pubgNickname) {
      member = await prisma.clanMember.findFirst({
        where: { nickname: { equals: user.pubgNickname, mode: 'insensitive' } },
        select: { clanId: true },
      })
    }

    const clanId = member?.clanId || null

    // 찾았으면 users 테이블도 업데이트
    if (clanId) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { clanId },
      }).catch(() => {})
    }

    return res.json({ clanId })
  } catch (e) {
    console.error('my-clan 조회 오류:', e.message)
    return res.json({ clanId: null })
  }
}
