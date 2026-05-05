// POST /api/user/reset-daily-goals — 일일 목표 초기화 (클라이언트 localStorage 기반)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  // 일일 목표는 localStorage에 저장되므로 서버는 OK만 반환
  // 클라이언트에서 localStorage 키를 삭제해 초기화
  return res.status(200).json({ ok: true });
}
