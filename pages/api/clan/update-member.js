// pages/api/clan/update-member.js
// 특정 클랜 멤버의 PUBG 통계를 DB에 수동 업데이트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards';
const PUBG_SHARD = 'steam';

async function getPubgStats(nickname) {
  if (!PUBG_API_KEY) return null;
  try {
    const res = await fetch(`${PUBG_BASE_URL}/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(nickname)}`, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    // 예시: 실제 통계 파싱은 프로젝트 구조에 맞게 수정 필요
    // 아래는 더미 값
    return {
      score: 100, // 실제 API에서 파싱
      style: '-', // 실제 API에서 파싱
      avgDamage: 120 // 실제 API에서 파싱
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원' });
  const { clanName, nickname } = req.body;
  if (!clanName || !nickname) return res.status(400).json({ error: 'clanName, nickname 필요' });

  // 클랜/멤버 찾기
  const clan = await prisma.clan.findUnique({ where: { name: clanName } });
  if (!clan) return res.status(404).json({ error: '클랜 없음' });
  const member = await prisma.clanMember.findFirst({ where: { nickname, clanId: clan.id } });
  if (!member) return res.status(404).json({ error: '멤버 없음' });

  // PUBG API에서 최신 통계 가져오기
  const stats = await getPubgStats(nickname);
  if (!stats) return res.status(500).json({ error: 'PUBG API에서 통계 불러오기 실패' });

  // DB 업데이트
  await prisma.clanMember.update({
    where: { id: member.id },
    data: {
      score: stats.score,
      style: stats.style,
      avgDamage: stats.avgDamage
    }
  });
  return res.status(200).json({ message: '업데이트 완료', stats });
}
