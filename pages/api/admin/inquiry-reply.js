// POST /api/admin/inquiry-reply { inquiryId, replyText }
// 문의 답변 저장(인앱). userId가 연결된 문의면 마이페이지 "내 문의"에서 답변을 확인할 수 있다.
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import prisma from '../../../utils/prisma.js';

const ADMIN_EMAIL = 'sssyck123@gmail.com';

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw;
  if (pw && pw === process.env.ADMIN_PASSWORD) return true;
  const session = await getServerSession(req, res, authOptions);
  return session?.user?.email === ADMIN_EMAIL;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  if (!(await checkAdmin(req, res))) return res.status(401).json({ error: '인증 필요' });

  const inquiryId = parseInt(req.body?.inquiryId, 10);
  const replyText = (req.body?.replyText || '').trim();
  if (!inquiryId) return res.status(400).json({ error: 'inquiryId가 필요합니다.' });
  if (replyText.length < 2) return res.status(400).json({ error: '답변 내용을 입력해주세요.' });

  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });

    const updated = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { reply: replyText, repliedAt: new Date(), status: 'replied' },
    });

    return res.status(200).json({ inquiry: updated });
  } catch (e) {
    console.error('[admin/inquiry-reply] 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
