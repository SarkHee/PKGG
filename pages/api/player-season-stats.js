// API endpoint for player season-specific stats
// /Users/mac/Desktop/PKGG/pages/api/player-season-stats.js

export default async function handler(req, res) {
  const { nickname, season } = req.query;

  if (!nickname || !season) {
    return res
      .status(400)
      .json({ error: 'nickname과 season 파라미터가 필요합니다.' });
  }

  try {
    // PUBG API에서 특정 시즌 데이터 조회
    // 실제로는 PUBG API의 player season stats endpoint를 호출해야 합니다.

    // 임시로 테스트 데이터 반환
    const mockSeasonData = {
      season: {
        gameModeStats: {
          'squad-fpp': {
            roundsPlayed: Math.floor(Math.random() * 100) + 20,
            wins: Math.floor(Math.random() * 20) + 5,
            top10s: Math.floor(Math.random() * 40) + 15,
            kills: Math.floor(Math.random() * 200) + 50,
            damageDealt: Math.floor(Math.random() * 20000) + 5000,
            assists: Math.floor(Math.random() * 100) + 20,
            winRatio: Math.random() * 0.3 + 0.1,
            top10Ratio: Math.random() * 0.6 + 0.3,
            timeSurvived: Math.floor(Math.random() * 200000) + 50000,
            rideDistance: Math.floor(Math.random() * 100000) + 20000,
          },
          squad: {
            roundsPlayed: Math.floor(Math.random() * 80) + 15,
            wins: Math.floor(Math.random() * 15) + 3,
            top10s: Math.floor(Math.random() * 30) + 10,
            kills: Math.floor(Math.random() * 150) + 30,
            damageDealt: Math.floor(Math.random() * 15000) + 3000,
            assists: Math.floor(Math.random() * 80) + 15,
            winRatio: Math.random() * 0.25 + 0.08,
            top10Ratio: Math.random() * 0.5 + 0.25,
            timeSurvived: Math.floor(Math.random() * 150000) + 30000,
            rideDistance: Math.floor(Math.random() * 80000) + 15000,
          },
          'duo-fpp': {
            roundsPlayed: Math.floor(Math.random() * 60) + 10,
            wins: Math.floor(Math.random() * 12) + 2,
            top10s: Math.floor(Math.random() * 25) + 8,
            kills: Math.floor(Math.random() * 120) + 25,
            damageDealt: Math.floor(Math.random() * 12000) + 2500,
            assists: Math.floor(Math.random() * 60) + 10,
            winRatio: Math.random() * 0.2 + 0.05,
            top10Ratio: Math.random() * 0.4 + 0.2,
            timeSurvived: Math.floor(Math.random() * 120000) + 25000,
            rideDistance: Math.floor(Math.random() * 60000) + 12000,
          },
          'solo-fpp': {
            roundsPlayed: Math.floor(Math.random() * 40) + 5,
            wins: Math.floor(Math.random() * 8) + 1,
            top10s: Math.floor(Math.random() * 15) + 5,
            kills: Math.floor(Math.random() * 80) + 15,
            damageDealt: Math.floor(Math.random() * 8000) + 1500,
            assists: Math.floor(Math.random() * 20) + 2,
            winRatio: Math.random() * 0.15 + 0.02,
            top10Ratio: Math.random() * 0.3 + 0.15,
            timeSurvived: Math.floor(Math.random() * 80000) + 15000,
            rideDistance: Math.floor(Math.random() * 40000) + 8000,
          },
        },
        player: { id: `player-${nickname}`, name: nickname },
        season: {
          id: season,
          isCurrentSeason: season === 'division.bro.official.pc-2024-01',
        },
        matchCount: Math.floor(Math.random() * 50) + 10,
      },
      ranked:
        season === 'division.bro.official.pc-2024-01'
          ? {
              // 현재 시즌에만 랭크 데이터 제공
              currentTier: 'Master',
              currentRp: Math.floor(Math.random() * 1000) + 2000,
              totalGames: Math.floor(Math.random() * 200) + 50,
              wins: Math.floor(Math.random() * 50) + 10,
              winRate: Math.random() * 0.3 + 0.15,
              avgKills: Math.random() * 3 + 1,
              avgDamage: Math.floor(Math.random() * 200) + 300,
            }
          : null,
      lifetime: {
        gameModeStats: {
          'squad-fpp': {
            roundsPlayed: Math.floor(Math.random() * 2000) + 500,
            wins: Math.floor(Math.random() * 300) + 80,
            top10s: Math.floor(Math.random() * 800) + 250,
            kills: Math.floor(Math.random() * 3000) + 890,
            damageDealt: Math.floor(Math.random() * 300000) + 125000,
            assists: Math.floor(Math.random() * 1000) + 450,
            winRatio: Math.random() * 0.3 + 0.1,
            top10Ratio: Math.random() * 0.6 + 0.3,
            timeSurvived: Math.floor(Math.random() * 2000000) + 1200000,
            rideDistance: Math.floor(Math.random() * 1000000) + 500000,
          },
        },
        startingSeason: 'division.bro.official.pc-2018-01',
      },
    };

    // 시즌에 따른 데이터 변화 시뮬레이션
    const seasonIndex = parseInt(season.split('-').pop()) || 1;
    const currentSeasonIndex = 30; // 시즌 30이 현재
    const seasonsAgo = currentSeasonIndex - seasonIndex;

    // 오래된 시즌일수록 낮은 스탯
    if (seasonsAgo > 0) {
      Object.keys(mockSeasonData.season.gameModeStats).forEach((mode) => {
        const stats = mockSeasonData.season.gameModeStats[mode];
        const degradationFactor = Math.max(0.3, 1 - seasonsAgo * 0.1);

        stats.roundsPlayed = Math.floor(stats.roundsPlayed * degradationFactor);
        stats.wins = Math.floor(stats.wins * degradationFactor);
        stats.top10s = Math.floor(stats.top10s * degradationFactor);
        stats.kills = Math.floor(stats.kills * degradationFactor);
        stats.damageDealt = Math.floor(stats.damageDealt * degradationFactor);
        stats.assists = Math.floor(stats.assists * degradationFactor);
        stats.timeSurvived = Math.floor(stats.timeSurvived * degradationFactor);
        stats.rideDistance = Math.floor(stats.rideDistance * degradationFactor);
      });
    }

    console.log(`${nickname}의 ${season} 시즌 데이터 조회 완료`);

    res.status(200).json(mockSeasonData);
  } catch (error) {
    console.error('시즌 데이터 조회 실패:', error);
    res
      .status(500)
      .json({ error: '시즌 데이터를 가져오는 중 오류가 발생했습니다.' });
  }
}
