// scripts/update-single-clan-member.js
// 사용법: node scripts/update-single-clan-member.js 닉네임

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

async function updateClanStats(nickname) {
  const statsPath = path.join(__dirname, '../data/clanStats.json');
  const raw = await fs.readFile(statsPath, 'utf-8');
  const clanStats = JSON.parse(raw);
  const seasonId = await getCurrentSeasonId();
  let updated = false;
  for (const clanName of Object.keys(clanStats)) {
    const clan = clanStats[clanName];
    if (!Array.isArray(clan.members)) continue;
    for (const member of clan.members) {
      if (
        typeof member === 'object' &&
        member.nickname &&
        member.nickname.toLowerCase() === nickname.toLowerCase()
      ) {
        const stats = await getPlayerStats(member.nickname, seasonId);
        if (stats) {
          Object.assign(member, stats);
          updated = true;
          console.log(`[OK] ${member.nickname} =>`, stats);
        } else {
          console.warn(`[FAIL] ${member.nickname}: API 데이터 없음`);
        }
      }
    }
  }
  if (updated) {
    await fs.writeFile(statsPath, JSON.stringify(clanStats, null, 2));
    console.log('clanStats.json 업데이트 완료');
  } else {
    console.log('해당 닉네임을 clanStats.json에서 찾을 수 없습니다.');
  }
}

if (require.main === module) {
  const nickname = process.argv[2];
  if (!nickname) {
    console.error('사용법: node scripts/update-single-clan-member.js 닉네임');
    process.exit(1);
  }
  updateClanStats(nickname);
}
