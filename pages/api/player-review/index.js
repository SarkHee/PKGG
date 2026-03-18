// pages/api/player-review/index.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { nick, shard = 'steam', page = 1 } = req.query;
    if (!nick) return res.status(400).json({ error: 'nick required' });
    const skip = (parseInt(page) - 1) * 10;
    const [reviews, total] = await Promise.all([
      prisma.playerReview.findMany({
        where: { targetNick: nick, shard },
        orderBy: { createdAt: 'desc' },
        skip,
        take: 10,
        select: { id: true, authorNick: true, rating: true, teamplay: true, communication: true, comment: true, createdAt: true },
      }),
      prisma.playerReview.count({ where: { targetNick: nick, shard } }),
    ]);
    const avg = reviews.length > 0
      ? { rating: +(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1),
          teamplay: +(reviews.reduce((s,r)=>s+r.teamplay,0)/reviews.length).toFixed(1),
          communication: +(reviews.reduce((s,r)=>s+r.communication,0)/reviews.length).toFixed(1) }
      : null;
    return res.json({ reviews, total, avg });
  }

  if (req.method === 'POST') {
    const { targetNick, shard = 'steam', authorNick, rating, teamplay, communication, comment, password } = req.body;
    if (!targetNick || !authorNick || !rating) return res.status(400).json({ error: '필수 항목 누락' });
    if (parseInt(rating) < 1 || parseInt(rating) > 5) return res.status(400).json({ error: '평점 1-5 범위' });
    if (!password || String(password).length < 4) return res.status(400).json({ error: '삭제 비밀번호 4자 이상' });
    // 같은 닉네임 하루 1회 제한
    const today = new Date(); today.setHours(0,0,0,0);
    const existing = await prisma.playerReview.findFirst({
      where: { targetNick, shard, authorNick, createdAt: { gte: today } },
    });
    if (existing) return res.status(429).json({ error: '하루 1회만 리뷰 가능합니다' });
    const review = await prisma.playerReview.create({
      data: { targetNick: String(targetNick).trim(), shard, authorNick: String(authorNick).trim(),
              rating: parseInt(rating), teamplay: parseInt(teamplay) || 3,
              communication: parseInt(communication) || 3,
              comment: String(comment || '').slice(0, 200), password: String(password) },
      select: { id: true, authorNick: true, rating: true, teamplay: true, communication: true, comment: true, createdAt: true },
    });
    return res.status(201).json({ review });
  }

  if (req.method === 'DELETE') {
    const { id, password } = req.body;
    const review = await prisma.playerReview.findUnique({ where: { id: parseInt(id) } });
    if (!review) return res.status(404).json({ error: 'not found' });
    if (review.password !== password) return res.status(403).json({ error: '비밀번호 오류' });
    await prisma.playerReview.delete({ where: { id: parseInt(id) } });
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
