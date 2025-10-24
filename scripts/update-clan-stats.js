// scripts/update-clan-stats.js
// 모든 클랜원 시즌 평균딜, 평균킬 등 주요 통계를 주기적으로 수집하여 clanStats.json에 저장

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards/steam';

async function getCurrentSeasonId() {
  const url = `${PUBG_BASE_URL}/seasons`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!res.ok) throw new Error('시즌 정보 조회 실패');
  const data = await res.json();
  const current = data.data.find((s) => s.attributes.isCurrentSeason);
  return current?.id;
}

async function getPlayerStats(nickname, seasonId) {
  // 닉네임으로 accountId 조회
  const playerUrl = `${PUBG_BASE_URL}/players?filter[playerNames]=${encodeURIComponent(nickname)}`;
  const playerRes = await fetch(playerUrl, {
    headers: {
      Authorization: `Bearer ${PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!playerRes.ok) return null;
  const playerData = await playerRes.json();
  const player = playerData.data?.[0];
  if (!player) return null;
  const accountId = player.id;

  // 시즌 통계 조회
  const statsUrl = `${PUBG_BASE_URL}/players/${accountId}/seasons/${seasonId}`;
  const statsRes = await fetch(statsUrl, {
    headers: {
      Authorization: `Bearer ${PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!statsRes.ok) return null;
  const statsData = await statsRes.json();
  const s =
    statsData.data.attributes.gameModeStats['squad'] ||
    statsData.data.attributes.gameModeStats['squad-fpp'];
  if (!s) return null;
  return {
    avgDamage:
      s.roundsPlayed > 0
        ? parseFloat((s.damageDealt / s.roundsPlayed).toFixed(1))
        : 0,
    avgKills:
      s.roundsPlayed > 0
        ? parseFloat((s.kills / s.roundsPlayed).toFixed(2))
        : 0,
    rounds: s.roundsPlayed,
    wins: s.wins,
    kd:
      s.roundsPlayed > 0
        ? parseFloat((s.kills / (s.losses > 0 ? s.losses : 1)).toFixed(2))
        : 0,
  };
}

async function main() {
  const clansPath = path.join(__dirname, '../data/clans.json');
  const statsPath = path.join(__dirname, '../data/clanStats.json');
  const raw = await fs.readFile(clansPath, 'utf-8');
  const clans = JSON.parse(raw);
  const seasonId = await getCurrentSeasonId();
  const result = {};
  for (const clan of Object.values(clans)) {
    for (const nickname of clan.members) {
      const lower = nickname.toLowerCase();
      try {
        const stats = await getPlayerStats(nickname, seasonId);
        if (stats) result[lower] = stats;
        else result[lower] = null;
        console.log(`[OK] ${nickname} =>`, stats);
      } catch (e) {
        result[lower] = null;
        console.warn(`[FAIL] ${nickname}:`, e.message);
      }
      // API rate limit 대응: 1초 대기
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await fs.writeFile(statsPath, JSON.stringify(result, null, 2));
  console.log('클랜원 시즌 통계 저장 완료:', statsPath);
}

if (require.main === module) {
  main();
}
