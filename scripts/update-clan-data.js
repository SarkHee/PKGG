import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const API_KEY = process.env.PUBG_API_KEY;
const CLANS_FILE = path.join(process.cwd(), 'data', 'clans.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'clanStats.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeFetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      });
      if (res.ok) return await res.json();
    } catch {}
    await delay(1000);
  }
  return null;
}

async function getPlayerStats(nickname) {
  try {
    const playerData = await safeFetchWithRetry(
      `https://api.pubg.com/shards/steam/players?filter[playerNames]=${encodeURIComponent(nickname)}`
    );
    if (!playerData?.data?.length) throw new Error('플레이어 없음');

    const accountId = playerData.data[0].id;

    const seasonData = await safeFetchWithRetry(
      'https://api.pubg.com/shards/steam/seasons'
    );
    const currentSeason = seasonData?.data?.find(
      (s) => s.attributes.isCurrentSeason
    );
    if (!currentSeason) throw new Error('시즌 정보 없음');

    const statsData = await safeFetchWithRetry(
      `https://api.pubg.com/shards/steam/players/${accountId}/seasons/${currentSeason.id}`
    );
    const squad = statsData?.data?.attributes?.gameModeStats?.squad;
    if (!squad || squad.roundsPlayed === 0) throw new Error('스쿼드 없음');

    const avgDamage = squad.damageDealt / squad.roundsPlayed;
    const score = Math.round(avgDamage / 1.33);

    let style = '-';
    if (score >= 200) style = '🔥 캐리형';
    else if (score >= 130) style = '👀 안정형';
    else if (score > 0) style = '⚡ 교전 기피형';

    return { score, style, avgDamage: parseFloat(avgDamage.toFixed(1)) };
  } catch (e) {
    console.log(`⚠ ${nickname} 불러오기 실패 → ${e.message}`);
    return { score: 0, style: '-', avgDamage: 0 };
  }
}

async function run() {
  if (!fs.existsSync(CLANS_FILE)) {
    console.error('❌ data/clans.json 파일이 없습니다.');
    process.exit(1);
  }

  const raw = fs.readFileSync(CLANS_FILE, 'utf-8');
  const clans = JSON.parse(raw);
  const output = {};

  for (const [clanName, clanInfo] of Object.entries(clans)) {
    const members = clanInfo.members || clanInfo;
    const clanData = {
      name: clanName,
      leader: clanInfo.leader || null,
      description: clanInfo.description || '',
      announcement: clanInfo.announcement || '',
      memberCount: members.length,
      members: [],
    };

    console.log(`📊 ${clanName} 클랜 처리 중... (${members.length}명)`);

    for (const name of members) {
      await delay(1500);
      const stat = await getPlayerStats(name);
      clanData.members.push({ nickname: name, ...stat });
    }

    const valid = clanData.members.filter((m) => m.score > 0);
    clanData.avgScore = valid.length
      ? Math.round(valid.reduce((sum, m) => sum + m.score, 0) / valid.length)
      : 0;

    const styleCounts = {};
    for (const m of valid) {
      if (m.style !== '-')
        styleCounts[m.style] = (styleCounts[m.style] || 0) + 1;
    }

    const topStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0];
    clanData.mainStyle = topStyle ? topStyle[0] : '-';

    output[clanName] = clanData;
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(
    `✅ clanStats.json 저장 완료 (${Object.keys(output).length}개 클랜)`
  );
}

run();
