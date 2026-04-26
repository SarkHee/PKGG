// pages/api/clans/directory.js
// 공개 클랜 디렉토리 — 전체 멤버 평균 MMR 기준 정렬
//
// MMR 계산 방식 (clan-analytics와 동일):
//   전체 활성 멤버(score > 0)의 avgDamage/avgKills/winRate/top10Rate/avgSurviveTime/avgAssists를
//   각각 평균 낸 뒤 calculateMMR() 공식으로 환산.
//   clan-analytics 페이지와 동일한 방식이므로 두 페이지 간 MMR 값이 일치함.

import prisma from '../../../utils/prisma.js';
import { calculateMMR } from '../../../utils/mmrCalculator.js';

// 전체 활성 멤버 평균으로 클랜 MMR 계산 (clan-analytics와 동일 로직)
function clanAvgMMR(members) {
  const active = members.filter(m => m.score > 0);
  if (active.length === 0) return null;
  const n = active.length;
  const avg = (key) => active.reduce((s, m) => s + (m[key] || 0), 0) / n;
  return calculateMMR({
    avgDamage:      avg('avgDamage'),
    avgKills:       avg('avgKills'),
    winRate:        avg('winRate'),
    top10Rate:      avg('top10Rate'),
    avgSurviveTime: avg('avgSurviveTime'),
    avgAssists:     avg('avgAssists'),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { region, q, page = '1', limit = '20', shard } = req.query;
  const take = Math.min(parseInt(limit, 10) || 20, 50);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);

  const where = { NOT: { name: '무소속' } };
  if (shard && shard !== 'all') where.shard = shard;
  if (region && region !== 'all') where.region = region;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  try {
    // 전체 조회 후 메모리 정렬 (정확한 MMR 기반 순위를 위해)
    const clans = await prisma.clan.findMany({
      where,
      select: {
        name:          true,
        memberCount:   true,
        mainStyle:     true,
        region:        true,
        pubgClanTag:   true,
        pubgClanLevel: true,
        pubgClanId:    true,
        members: {
          select: {
            score:          true,
            avgDamage:      true,
            avgKills:       true,
            winRate:        true,
            top10Rate:      true,
            avgSurviveTime: true,
            avgAssists:     true,
            pubgClanId:     true,
          },
        },
      },
    });

    const result = clans
      .map(({ members, pubgClanId, ...clan }) => {
        // clan-analytics와 동일: pubgClanId 필터 적용
        const activeMembers = pubgClanId
          ? members.filter(m => m.pubgClanId === pubgClanId)
          : members;
        const avgScore = clanAvgMMR(activeMembers);
        return { ...clan, avgScore };
      })
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

    const total = result.length;
    const skip = (pageNum - 1) * take;
    const paginated = result.slice(skip, skip + take);

    res.status(200).json({ clans: paginated, total, page: pageNum, take });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
