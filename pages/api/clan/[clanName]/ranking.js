// pages/api/clan/[clanName]/ranking.js
// 클랜 내부 랭킹 데이터 — 이번 주 MVP + 성장왕

import prisma from '../../../../utils/prisma.js';
import { calculateMMR } from '../../../../utils/mmrCalculator.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { clanName } = req.query;

  try {
    // 클랜 조회
    const clan = await prisma.clan.findFirst({
      where: { name: decodeURIComponent(clanName) },
      include: { members: true },
    });
    if (!clan) return res.status(404).json({ error: '클랜을 찾을 수 없습니다.' });

    const members = clan.pubgClanId
      ? clan.members.filter((m) => m.pubgClanId === clan.pubgClanId)
      : clan.members;

    const memberIds = members.map((m) => m.id);
    const nicknames = members.map((m) => m.nickname);
    const playerIds = members.map((m) => m.pubgPlayerId).filter(Boolean);

    // ── 봇 비율 배치 조회 ────────────────────────────────────────────
    const botMap = {};
    if (playerIds.length > 0) {
      const botRows = await prisma.playerMatch.groupBy({
        by: ['pubgAccountId'],
        where: {
          pubgAccountId: { in: playerIds },
          isBotCorrected: true,
          NOT: {
            OR: [
              { mapName: { contains: 'safehouse',   mode: 'insensitive' } },
              { mapName: { contains: 'range_main',  mode: 'insensitive' } },
              { mode:    { contains: 'heistroyale', mode: 'insensitive' } },
              { mode:    { contains: 'clansolo',    mode: 'insensitive' } },
              { mode:    { contains: 'clansquad',   mode: 'insensitive' } },
              { mode:    { contains: 'training',    mode: 'insensitive' } },
            ],
          },
        },
        _sum: { kills: true, botKills: true, damage: true, botDamage: true },
      });
      for (const row of botRows) {
        const tk = row._sum.kills    ?? 0, bk = row._sum.botKills  ?? 0;
        const td = row._sum.damage   ?? 0, bd = row._sum.botDamage ?? 0;
        botMap[row.pubgAccountId] = {
          botKillRatio:   tk > 0 ? Math.min(bk / tk, 0.95) : 0,
          botDamageRatio: td > 0 ? Math.min(bd / td, 0.95) : 0,
        };
      }
    }

    function calcMMRWithBot(m) {
      const bot = m.pubgPlayerId ? (botMap[m.pubgPlayerId] || {}) : {};
      const kr = bot.botKillRatio   ?? 0;
      const dr = bot.botDamageRatio ?? 0;
      return calculateMMR({
        avgDamage:      dr > 0 ? Math.max(0, (m.avgDamage || 0) * (1 - dr)) : (m.avgDamage || 0),
        avgKills:       kr > 0 ? Math.max(0, (m.avgKills  || 0) * (1 - kr)) : (m.avgKills  || 0),
        winRate:        m.winRate,
        top10Rate:      m.top10Rate,
        avgSurviveTime: m.avgSurviveTime,
        avgAssists:     m.avgAssists,
      });
    }

    // ── 이번 주 MVP (최근 7일 PlayerMatch) ──────────────────────────────
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentMatches = await prisma.playerMatch.findMany({
      where: {
        clanMemberId: { in: memberIds },
        createdAt: { gte: since },
      },
    });

    // 멤버별 집계
    const weeklyMap = {};
    for (const match of recentMatches) {
      if (!weeklyMap[match.clanMemberId]) {
        weeklyMap[match.clanMemberId] = { matches: 0, kills: 0, damage: 0, wins: 0, assists: 0 };
      }
      const w = weeklyMap[match.clanMemberId];
      w.matches++;
      w.kills    += match.kills;
      w.damage   += match.damage;
      w.wins     += match.placement === 1 ? 1 : 0;
      w.assists  += match.assists;
    }

    const weeklyMvp = members
      .filter((m) => weeklyMap[m.id] && weeklyMap[m.id].matches > 0)
      .map((m) => {
        const w = weeklyMap[m.id];
        const avgDmg = w.damage / w.matches;
        const avgKill = w.kills / w.matches;
        const winRate = (w.wins / w.matches) * 100;
        // MVP 점수 (클랜 내 주간 성과 기준)
        const mvpScore = Math.round(avgDmg * 0.35 + avgKill * 35 + winRate * 12);
        return {
          id: m.id,
          nickname: m.nickname,
          server: m.pubgShardId || 'steam',
          matches: w.matches,
          avgDamage: Math.round(avgDmg),
          avgKills: avgKill.toFixed(2),
          winRate: winRate.toFixed(1),
          wins: w.wins,
          mvpScore,
        };
      })
      .sort((a, b) => b.mvpScore - a.mvpScore);

    // ── 성장왕 (PlayerStatSnapshot 비교) ──────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 각 닉네임의 최신 스냅샷 + 7일 전 이전 스냅샷
    const snapshots = await prisma.playerStatSnapshot.findMany({
      where: { nickname: { in: nicknames } },
      orderBy: { capturedAt: 'desc' },
    });

    // 닉네임별 그룹화
    const snapByNick = {};
    for (const s of snapshots) {
      if (!snapByNick[s.nickname]) snapByNick[s.nickname] = [];
      snapByNick[s.nickname].push(s);
    }

    const growthKing = members
      .map((m) => {
        const snaps = snapByNick[m.nickname] || [];
        if (snaps.length < 2) return null;

        const latest = snaps[0]; // 최신
        // 7일 이전 스냅샷 중 가장 최신것
        const older = snaps.find((s) => new Date(s.capturedAt) <= sevenDaysAgo);
        if (!older) return null;

        const playerId = m.pubgPlayerId;
        const bot = playerId ? (botMap[playerId] || {}) : {};
        const kr = bot.botKillRatio   ?? 0;
        const dr = bot.botDamageRatio ?? 0;
        const applyBot = (val, ratio) => ratio > 0 ? Math.max(0, val * (1 - ratio)) : val;

        const latestMmr = calculateMMR({
          avgDamage: applyBot(latest.avgDamage, dr),
          avgKills:  applyBot(latest.avgKills,  kr),
          winRate: latest.winRate,
          top10Rate: latest.top10Rate,
          avgSurviveTime: latest.avgSurviveTime,
          avgAssists: latest.avgAssists,
        });
        const olderMmr = calculateMMR({
          avgDamage: applyBot(older.avgDamage, dr),
          avgKills:  applyBot(older.avgKills,  kr),
          winRate: older.winRate,
          top10Rate: older.top10Rate,
          avgSurviveTime: older.avgSurviveTime,
          avgAssists: older.avgAssists,
        });

        const mmrDelta = latestMmr - olderMmr;
        const dmgDelta = Math.round(latest.avgDamage - older.avgDamage);
        const killDelta = (latest.avgKills - older.avgKills).toFixed(2);

        return {
          nickname: m.nickname,
          server: m.pubgShardId || 'steam',
          currentMmr: latestMmr,
          mmrDelta,
          dmgDelta,
          killDelta,
          snapshotDate: older.capturedAt,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.mmrDelta - a.mmrDelta);

    // ── 전체 리더보드 ──────────────────────────────────────────────────
    const leaderboard = members
      .map((m) => ({
        id: m.id,
        nickname: m.nickname,
        server: m.pubgShardId || 'steam',
        mmr: calcMMRWithBot(m),
        score: m.score,
        avgDamage: Math.round(m.avgDamage || 0),
        avgKills: Number(m.avgKills || 0).toFixed(2),
        avgAssists: Number(m.avgAssists || 0).toFixed(2),
        winRate: Number(m.winRate || 0).toFixed(1),
        top10Rate: Number(m.top10Rate || 0).toFixed(1),
        hasData: m.score > 0,
      }))
      .sort((a, b) => b.mmr - a.mmr);

    res.status(200).json({ leaderboard, weeklyMvp, growthKing });
  } catch (error) {
    console.error('[ranking]', error);
    res.status(500).json({ error: error.message });
  }
}
