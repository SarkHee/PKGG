// pages/api/clan/[clanName].js
// 클랜 상세 정보 API

import { PrismaClient } from '@prisma/client';
import { calculateMMR } from '../../../utils/mmrCalculator';

const prisma = new PrismaClient();

// pubgPlayerId 기준 중복 멤버 제거 (점수 높은 쪽 유지)
function dedupMembers(memberList) {
  const seen = new Map();
  for (const m of memberList) {
    const key = m.pubgPlayerId || `nick_${m.nickname}`;
    if (!seen.has(key)) {
      seen.set(key, m);
    } else if ((m.score || 0) > (seen.get(key).score || 0)) {
      seen.set(key, m);
    }
  }
  return Array.from(seen.values());
}

function calcMMR(m) {
  return calculateMMR({
    avgDamage:      m.avgDamage,
    avgKills:       m.avgKills,
    winRate:        m.winRate,
    top10Rate:      m.top10Rate,
    avgSurviveTime: m.avgSurviveTime,
    avgAssists:     m.avgAssists,
  });
}

export default async function handler(req, res) {
  const { clanName } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decodedClanName = decodeURIComponent(clanName);
    const clan = await prisma.clan.findFirst({
      where: { name: decodedClanName },
      include: { members: true },
    });

    if (!clan) {
      return res.status(404).json({ error: '클랜을 찾을 수 없습니다' });
    }

    // pubgClanId 교차 검증: 이 클랜 소속 멤버만 인정
    const confirmedMembers = clan.pubgClanId
      ? clan.members.filter((m) => m.pubgClanId === clan.pubgClanId)
      : clan.members;

    const uniqueMembers = dedupMembers(confirmedMembers);
    const activeMembers = uniqueMembers.filter((m) => m.score > 0);

    // ── 전체 클랜 순위 계산 ──────────────────────────────────────────
    const allClans = await prisma.clan.findMany({ include: { members: true } });

    const clansWithMMR = allClans
      .map((c) => {
        const cConfirmed = c.pubgClanId
          ? c.members.filter((m) => m.pubgClanId === c.pubgClanId)
          : c.members;
        const cActive = dedupMembers(cConfirmed).filter((m) => m.score > 0);
        if (cActive.length === 0) return { id: c.id, avgMMR: 0 };
        const avgMMR = Math.round(cActive.reduce((s, m) => s + calcMMR(m), 0) / cActive.length);
        return { id: c.id, avgMMR };
      })
      .sort((a, b) => b.avgMMR - a.avgMMR);

    const clanRank = clansWithMMR.findIndex((c) => c.id === clan.id) + 1;

    // ── 클랜 전체 평균 통계 ───────────────────────────────────────────
    let stats = null;
    if (activeMembers.length > 0) {
      const avg = (key) =>
        activeMembers.reduce((s, m) => s + (Number(m[key]) || 0), 0) / activeMembers.length;

      const avgMMR = Math.round(activeMembers.reduce((s, m) => s + calcMMR(m), 0) / activeMembers.length);

      stats = {
        avgMMR,
        avgScore: Math.round(avg('score')),
        avgDamage: Math.round(avg('avgDamage')),
        avgKills: avg('avgKills').toFixed(2),
        avgAssists: avg('avgAssists').toFixed(2),
        avgSurviveTime: Math.round(avg('avgSurviveTime')),
        winRate: avg('winRate').toFixed(1),
        top10Rate: avg('top10Rate').toFixed(1),
        memberCount: activeMembers.length,
      };
    }

    // ── 멤버별 상세 정보 ──────────────────────────────────────────────
    const members = uniqueMembers.map((m) => ({
      id: m.id,
      playerName: m.nickname,
      server: m.pubgShardId || 'steam',
      lastActiveAt: m.lastUpdated,
      mmr: calcMMR(m),
      stats: m.score > 0
        ? {
            score: m.score,
            avgDamage: m.avgDamage,
            avgKills: Number(m.avgKills).toFixed(2),
            avgAssists: Number(m.avgAssists).toFixed(2),
            avgSurviveTime: m.avgSurviveTime,
            winRate: Number(m.winRate).toFixed(1),
            top10Rate: Number(m.top10Rate).toFixed(1),
          }
        : null,
    }));

    // ── 분포 데이터 ───────────────────────────────────────────────────
    const mmrValues = activeMembers.map(calcMMR);
    // 티어 기준 = mmrCalculator.js getMMRTier 와 동일하게 유지
    const distribution = {
      expert:       mmrValues.filter((v) => v >= 1900).length,              // S (Master)
      advanced:     mmrValues.filter((v) => v >= 1700 && v < 1900).length,  // A (Diamond)
      intermediate: mmrValues.filter((v) => v >= 1500 && v < 1700).length,  // B (Platinum)
      beginner:     mmrValues.filter((v) => v < 1500).length,               // C↓ (Gold↓)
    };

    // ── Top performers ────────────────────────────────────────────────
    const sorted = (key, fn) =>
      [...activeMembers].sort((a, b) => (fn ? fn(b) - fn(a) : (b[key] || 0) - (a[key] || 0)));

    const topPerformers = {
      byMMR: sorted(null, calcMMR).slice(0, 3).map((m) => ({ name: m.nickname, value: calcMMR(m), server: m.pubgShardId || 'steam' })),
      byDamage: sorted('avgDamage').slice(0, 3).map((m) => ({ name: m.nickname, value: Math.round(m.avgDamage), server: m.pubgShardId || 'steam' })),
      byKills: sorted('avgKills').slice(0, 3).map((m) => ({ name: m.nickname, value: Number(m.avgKills).toFixed(1), server: m.pubgShardId || 'steam' })),
      byWinRate: sorted('winRate').slice(0, 3).map((m) => ({ name: m.nickname, value: `${Number(m.winRate).toFixed(1)}%`, server: m.pubgShardId || 'steam' })),
      byTop10: sorted('top10Rate').slice(0, 3).map((m) => ({ name: m.nickname, value: `${Number(m.top10Rate).toFixed(1)}%`, server: m.pubgShardId || 'steam' })),
    };

    // ── 플레이스타일 분포 ─────────────────────────────────────────────
    let styleDistribution = { aggressive: 0, passive: 0, sniper: 0, support: 0, balanced: 0 };
    for (const m of activeMembers) {
      const kills = m.avgKills || 0;
      const dmg = m.avgDamage || 0;
      const surv = m.avgSurviveTime || 0;
      const top10 = m.top10Rate || 0;
      const assists = m.avgAssists || 0;

      if (kills >= 2.5 && dmg >= 300) styleDistribution.aggressive++;
      else if (surv >= 1200 && top10 >= 30) styleDistribution.passive++;
      else if (dmg >= 300 && kills < 2) styleDistribution.sniper++;
      else if (assists >= 1.5) styleDistribution.support++;
      else styleDistribution.balanced++;
    }

    // ── 클랜 강점/약점 ────────────────────────────────────────────────
    const strengths = [];
    const weaknesses = [];

    if (stats) {
      const avgD = Number(stats.avgDamage);
      const avgK = Number(stats.avgKills);
      const avgW = Number(stats.winRate);
      const avgT = Number(stats.top10Rate);
      const avgSurv = Number(stats.avgSurviveTime);
      const avgAst = Number(stats.avgAssists);

      if (avgD >= 350) strengths.push({ label: '높은 딜량', desc: `평균 ${Math.round(avgD)} 딜 — 상위 20% 수준의 화력` });
      else if (avgD < 180) weaknesses.push({ label: '딜량 부족', desc: `평균 ${Math.round(avgD)} 딜 — 배그 평균(200) 미달` });

      if (avgK >= 2.5) strengths.push({ label: '킬 압도', desc: `경기당 평균 ${Number(avgK).toFixed(1)}킬 — 강력한 교전 능력` });
      else if (avgK < 1.0) weaknesses.push({ label: '킬 능력 부족', desc: `경기당 평균 ${Number(avgK).toFixed(1)}킬 — 교전 참여 저조` });

      if (avgW >= 12) strengths.push({ label: '높은 승률', desc: `평균 승률 ${avgW.toFixed(1)}% — 우수한 엔드게임 실력` });
      else if (avgW < 3) weaknesses.push({ label: '낮은 승률', desc: `평균 승률 ${avgW.toFixed(1)}% — 최종 안전지대 운영 개선 필요` });

      if (avgT >= 45) strengths.push({ label: '뛰어난 생존력', desc: `Top10 진입률 ${avgT.toFixed(1)}% — 안정적인 포지셔닝` });
      else if (avgT < 15) weaknesses.push({ label: '생존율 낮음', desc: `Top10 진입률 ${avgT.toFixed(1)}% — 블루존 관리 필요` });

      if (avgSurv >= 1300) strengths.push({ label: '긴 생존시간', desc: `평균 ${Math.round(avgSurv / 60)}분 생존 — 우수한 포지셔닝` });

      if (avgAst >= 1.5) strengths.push({ label: '팀워크 우수', desc: `경기당 평균 ${Number(avgAst).toFixed(1)} 어시스트 — 협력 플레이 강점` });

      const totalActive = activeMembers.length;
      const experts = distribution.expert + distribution.advanced;
      if (totalActive > 0 && experts / totalActive >= 0.5)
        strengths.push({ label: '고수 비율 높음', desc: `전체 멤버 중 ${Math.round((experts / totalActive) * 100)}%가 A등급 이상` });
    }

    if (strengths.length === 0) strengths.push({ label: '성장 가능성', desc: '꾸준한 플레이로 지표 개선 중인 클랜' });
    if (weaknesses.length === 0) weaknesses.push({ label: '균형잡힌 스탯', desc: '특별히 취약한 영역 없음' });

    // ── 플레이스타일 분석 ─────────────────────────────────────────────
    let playStyle = null;
    if (clan.mainStyle) {
      playStyle = {
        primary: clan.mainStyle || '혼합',
        secondary: '균형잡힌',
        dominance: stats ? Math.min(100, Math.round(Number(stats.avgMMR || stats.avgScore) / 20)) : 50,
        variety: '보통',
        special: stats && Number(stats.avgMMR || stats.avgScore) > 1500 ? '고수 클랜' : null,
      };
    }

    return res.status(200).json({
      clan: {
        id: clan.id,
        name: clan.name,
        tag: clan.pubgClanTag || 'N/A',
        level: clan.pubgClanLevel || 1,
        apiMemberCount: clan.pubgMemberCount || clan.memberCount,
        region: clan.region,
        updatedAt: clan.lastSynced,
        playStyle,
      },
      ranking: { overall: clanRank },
      members,
      stats,
      distribution,
      topPerformers,
      styleDistribution,
      strengths,
      weaknesses,
    });
  } catch (error) {
    console.error('Clan detail API error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다', details: error.message });
  }
}
