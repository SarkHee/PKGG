// 관리자 인증 후 텔레메트리 배치를 서버 내부에서 호출하는 프록시
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 인증 확인 (Google 세션 OR 비밀번호 토큰)
  const pw = req.headers['x-admin-token']
  const session = await getServerSession(req, res, authOptions)
  const isAdmin = (pw && pw === process.env.ADMIN_PASSWORD) || session?.user?.email === ADMIN_EMAIL
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

  // 내부에서 telemetry-batch 호출 (CRON_SECRET 사용)
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`
  try {
    const batchRes = await fetch(`${baseUrl}/api/cron/telemetry-batch`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const text = await batchRes.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error('[run-batch] telemetry-batch 응답이 JSON 아님:', text.slice(0, 200))
      return res.status(500).json({ error: `배치 서버 오류 (HTTP ${batchRes.status})` })
    }
    return res.status(batchRes.status).json(data)
  } catch (err) {
    console.error('[run-batch] fetch 실패:', err.message)
    return res.status(500).json({ error: `배치 호출 실패: ${err.message}` })
  }
}
