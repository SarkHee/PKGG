import prisma from '../../../utils/prisma.js'

function checkAdmin(req) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  return pw === process.env.ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: '인증 필요' })
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const users = await prisma.authUser.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        pubgAccounts: {
          select: { nickname: true, platform: true },
        },
      },
    })
    return res.json({ users })
  } catch (e) {
    console.error('[admin/users]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
