// pages/api/pubg/news.js — DB 저장된 뉴스만 조회 (크롤링 제거: Vercel 타임아웃)
import prisma from '../../../utils/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' })
  }

  try {
    const { category } = req.query
    const where = { isActive: true }
    if (category && category !== 'all') where.category = category

    const news = await prisma.pubgNews.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { publishDate: 'desc' }],
      take: 20,
    })

    return res.status(200).json({ success: true, data: news, count: news.length })
  } catch (err) {
    console.error('[pubg/news] DB 오류:', err.message)
    return res.status(200).json({ success: true, data: [], count: 0 })
  }
}
