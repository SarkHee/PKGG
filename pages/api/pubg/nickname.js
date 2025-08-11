// pages/api/pubg/nickname.js
export default async function handler(req, res) {
  const { nickname, shard = 'steam' } = req.query;
  
  if (!nickname) {
    return res.status(400).json({ error: 'Nickname is required' });
  }

  console.log(`API 호출: nickname=${nickname}, shard=${shard}`);

  try {
    // 기본 응답 반환 (임시)
    res.status(200).json({
      profile: {
        nickname: nickname,
        lastUpdated: new Date().toISOString(),
        accountId: `account-${nickname}`,
        clan: {
          name: 'UBD',
          tag: 'UBD',
          level: 15,
          memberCount: 57,
          description: '우리는 UBD입니다.'
        }
      },
      summary: {
        avgDamage: 200,
        avgKills: 1.5,
        avgAssists: 0.5,
        avgSurviveTime: 1000,
        winRate: 10,
        top10Rate: 40,
        score: 1200,
        style: '🔥 지속 전투형'
      },
      rankedStats: [
        { mode: "squad-fpp", tier: "Gold IV", rp: 1850, kd: 1.2, avgDamage: 180, winRate: 12, survivalTime: 900, rounds: 45 },
        { mode: "squad", tier: "Silver II", rp: 1420, kd: 0.9, avgDamage: 150, winRate: 8, survivalTime: 850, rounds: 32 }, 
        { mode: "duo-fpp", tier: "Platinum V", rp: 2100, kd: 1.8, avgDamage: 220, winRate: 18, survivalTime: 1100, rounds: 28 },
        { mode: "solo-fpp", tier: "Bronze I", rp: 1180, kd: 0.7, avgDamage: 120, winRate: 5, survivalTime: 700, rounds: 15 }
      ],
      rankedSummary: {
        mode: "duo-fpp",
        tier: "Platinum V", 
        rp: 2100,
        games: 28,
        wins: 5,
        kd: 1.8,
        avgDamage: 220,
        winRate: 18,
        top10Rate: 45,
        kda: 2.1,
        avgAssist: 0.6,
        avgKill: 1.8,
        avgRank: 25,
        survivalTime: 1100
      },
      seasonStats: {},
      recentMatches: [
        {
          matchId: 'sample-match-1',
          mode: 'SQUAD',
          mapName: 'Erangel',
          placement: 3,
          kills: 4,
          assists: 2,
          damage: 350,
          surviveTime: 1200,
          matchTimestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          matchId: 'sample-match-2',
          mode: 'SQUAD',
          mapName: 'Miramar',
          placement: 8,
          kills: 1,
          assists: 0,
          damage: 120,
          surviveTime: 800,
          matchTimestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ],
      modeDistribution: { ranked: 30, normal: 60, event: 10 },
      clanMembers: [],
      clanAverage: 150,
      clanMatchPercentage: 0,
      aboveAvgWithClan: 0,
      clanTop3WithMe: [],
      synergyAnalysis: [],
      synergyTop: [],
      clanSynergyStatusList: [],
      recommendedSquad: null,
      bestSquad: null,
      killMapTelemetryUrl: null,
      timeActivityGraph: null
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
