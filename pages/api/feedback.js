import prisma from '../../utils/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, message } = req.body
  if (!message || message.trim().length < 2) {
    return res.status(400).json({ error: '내용을 입력해주세요.' })
  }

  try {
    await prisma.inquiry.create({
      data: {
        topic: type === 'suggest' ? 'feature' : 'bug',
        message: message.trim(),
        email: null,
      },
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[feedback]', e.message)
    return res.status(500).json({ error: '저장 실패' })
  }
}
