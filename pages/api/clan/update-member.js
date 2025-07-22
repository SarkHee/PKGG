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
    // 1. 플레이어 ID 조회
    const playerRes = await fetch(`${PUBG_BASE_URL}/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(nickname)}`, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json'
      }
    });
    if (!playerRes.ok) return null;
    const playerData = await playerRes.json();
    const player = playerData.data && playerData.data[0];
    if (!player) return null;
    const playerId = player.id;

    // 2. 최근 매치 ID 목록 추출 (최대 20개)
    const matchIds = (player.relationships?.matches?.data || []).slice(0, 20).map(m => m.id);
    if (matchIds.length === 0) return null;

    // 3. 매치 상세 데이터 병렬 요청
    const matchDetails = await Promise.all(
      matchIds.map(async (matchId) => {
        const matchRes = await fetch(`${PUBG_BASE_URL}/${PUBG_SHARD}/matches/${matchId}`, {
          headers: {
            Authorization: `Bearer ${PUBG_API_KEY}`,
            Accept: 'application/vnd.api+json'
          }
        });
        if (!matchRes.ok) return null;
        return matchRes.json();
      })
    );

    // 4. 플레이어의 매치별 통계 추출
    let totalDamage = 0, totalKills = 0, totalAssists = 0, totalSurviveTime = 0, winCount = 0, top10Count = 0, matchCount = 0;
    let styleCounts = { "aggressive": 0, "survivor": 0, "support": 0 };
    const matchStats = [];
    const modeStatsMap = {};
    for (let i = 0; i < matchDetails.length; i++) {
      const match = matchDetails[i];
      if (!match || !match.included) continue;
      // 플레이어의 participant 데이터 찾기
      const participant = match.included.find(
        (p) => p.type === 'participant' && p.attributes && p.attributes.stats && p.attributes.stats.name === nickname
      );
      if (!participant) continue;
      const stats = participant.attributes.stats;
      const mode = match.data.attributes.gameMode || 'unknown';
      matchStats.push({
        matchId: match.data.id,
        mode,
        mapName: match.data.attributes.mapName,
        placement: stats.winPlace,
        kills: stats.kills,
        assists: stats.assists,
        damage: stats.damageDealt,
        surviveTime: stats.timeSurvived,
        createdAt: match.data.attributes.createdAt
      });
      // 모드별 집계
      if (!modeStatsMap[mode]) {
        modeStatsMap[mode] = {
          matches: 0, wins: 0, top10s: 0, totalDamage: 0, totalKills: 0, totalAssists: 0
        };
      }
      modeStatsMap[mode].matches++;
      if (stats.winPlace === 1) modeStatsMap[mode].wins++;
      if (stats.winPlace <= 10) modeStatsMap[mode].top10s++;
      modeStatsMap[mode].totalDamage += stats.damageDealt || 0;
      modeStatsMap[mode].totalKills += stats.kills || 0;
      modeStatsMap[mode].totalAssists += stats.assists || 0;

      totalDamage += stats.damageDealt || 0;
      totalKills += stats.kills || 0;
      totalAssists += stats.assists || 0;
      totalSurviveTime += stats.timeSurvived || 0;
      if (stats.winPlace === 1) winCount++;
      if (stats.winPlace <= 10) top10Count++;
      // 스타일 분류 예시(킬 위주: aggressive, 생존시간 위주: survivor, 어시스트 위주: support)
      if ((stats.kills || 0) >= 5) styleCounts.aggressive++;
      else if ((stats.timeSurvived || 0) > 1200) styleCounts.survivor++;
      else if ((stats.assists || 0) >= 3) styleCounts.support++;
      matchCount++;
    }
    if (matchCount === 0) return null;

    // 5. 평균값 및 비율 계산
    const avgDamage = +(totalDamage / matchCount).toFixed(1);
    const avgKills = +(totalKills / matchCount).toFixed(2);
    const avgAssists = +(totalAssists / matchCount).toFixed(2);
    const avgSurviveTime = +(totalSurviveTime / matchCount).toFixed(1);
    const winRate = +(winCount / matchCount * 100).toFixed(1);
    const top10Rate = +(top10Count / matchCount * 100).toFixed(1);
    // 스타일 결정
    let style = '-';
    const maxStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0];
    if (maxStyle && maxStyle[1] > 0) style = maxStyle[0];
    // 점수 예시(평균 데미지*0.5 + 평균 킬*10 + 승률*2)
    const score = Math.round(avgDamage * 0.5 + avgKills * 10 + winRate * 2);

    // 모드별 통계 가공
    const modeStats = Object.entries(modeStatsMap).map(([mode, s]) => {
      return {
        mode,
        matches: s.matches,
        wins: s.wins,
        top10s: s.top10s,
        avgDamage: +(s.totalDamage / s.matches).toFixed(1),
        avgKills: +(s.totalKills / s.matches).toFixed(2),
        avgAssists: +(s.totalAssists / s.matches).toFixed(2),
        winRate: +(s.wins / s.matches * 100).toFixed(1),
        top10Rate: +(s.top10s / s.matches * 100).toFixed(1)
      };
    });

    return {
      score,
      style,
      avgDamage,
      avgKills,
      avgAssists,
      avgSurviveTime,
      winRate,
      top10Rate,
      matches: matchStats,
      modeStats
    };
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 지원' });
  const { clanName, nickname } = req.body;
  if (!clanName || !nickname) return res.status(400).json({ error: 'clanName, nickname 필요' });
  console.log('[update-member] 요청:', { clanName, nickname });


  // nickname이 일치하는 모든 멤버를 찾음 (여러 클랜에 있을 수 있음)
  const members = await prisma.clanMember.findMany({ where: { nickname } });
  console.log('[update-member] 찾은 멤버:', members.map(m => ({ id: m.id, nickname: m.nickname, clanId: m.clanId })));
  if (!members || members.length === 0) {
    console.log('[update-member] DB에 멤버 없음');
    return res.status(404).json({ error: '멤버 없음' });
  }

  // PUBG API에서 최신 통계 가져오기
  const stats = await getPubgStats(nickname);
  console.log('[update-member] getPubgStats 결과:', stats);
  if (!stats) {
    console.log('[update-member] PUBG API에서 통계 불러오기 실패');
    return res.status(500).json({ error: 'PUBG API에서 통계 불러오기 실패' });
  }

  // 모든 멤버 DB 업데이트
  try {
    await Promise.all(
      members.map(async (member) => {
        // 1. ClanMember 업데이트
        await prisma.clanMember.update({
          where: { id: member.id },
          data: {
            score: stats.score,
            style: stats.style,
            avgDamage: stats.avgDamage,
            avgKills: stats.avgKills,
            avgAssists: stats.avgAssists,
            avgSurviveTime: stats.avgSurviveTime,
            winRate: stats.winRate,
            top10Rate: stats.top10Rate
          }
        });
        // 2. PlayerMatch: 기존 삭제 후 일괄 insert
        await prisma.playerMatch.deleteMany({ where: { clanMemberId: member.id } });
        if (Array.isArray(stats.matches) && stats.matches.length > 0) {
          await prisma.playerMatch.createMany({
            data: stats.matches.map(m => ({
              clanMemberId: member.id,
              matchId: m.matchId,
              mode: m.mode,
              mapName: m.mapName,
              placement: m.placement,
              kills: m.kills,
              assists: m.assists,
              damage: m.damage,
              surviveTime: m.surviveTime,
              createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
            })),
            skipDuplicates: true
          });
        }
        // 3. PlayerModeStats: 기존 삭제 후 일괄 insert
        await prisma.playerModeStats.deleteMany({ where: { clanMemberId: member.id } });
        if (Array.isArray(stats.modeStats) && stats.modeStats.length > 0) {
          await prisma.playerModeStats.createMany({
            data: stats.modeStats.map(s => ({
              clanMemberId: member.id,
              mode: s.mode,
              matches: s.matches,
              wins: s.wins,
              top10s: s.top10s,
              avgDamage: s.avgDamage,
              avgKills: s.avgKills,
              avgAssists: s.avgAssists,
              winRate: s.winRate,
              top10Rate: s.top10Rate
            })),
            skipDuplicates: true
          });
        }
      })
    );
    console.log('[update-member] DB 업데이트 완료:', members.length);
    return res.status(200).json({ message: '업데이트 완료', stats, updatedCount: members.length });
  } catch (err) {
    console.error('[update-member] DB 업데이트 에러:', err);
    return res.status(500).json({ error: 'DB 업데이트 실패', err: String(err) });
  }
}
