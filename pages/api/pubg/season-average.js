// ✅ /pages/api/pubg/season-average.js
// 시즌별 평균 대미지를 계산하는 API

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { accountId, shardId } = req.body;

  if (!accountId || !shardId) {
    return res.status(400).json({ error: 'accountId, shardId는 필수입니다.' });
  }

  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

  try {
    // 1. 현재 시즌 가져오기
    const seasonRes = await axios.get(`https://api.pubg.com/shards/${shardId}/seasons`, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
    });

    const currentSeason = seasonRes.data.data.find(season => season.attributes.isCurrentSeason);
    const seasonId = currentSeason.id;

    // 2. 유저의 시즌 통계 가져오기
    const statsRes = await axios.get(`https://api.pubg.com/shards/${shardId}/players/${accountId}/seasons/${seasonId}`, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
    });

    const stats = statsRes.data.data.attributes.gameModeStats;
    const soloStats = stats['squad'] || stats['solo'] || stats['duo']; // 우선순위: squad → solo → duo

    const totalDamage = soloStats.damageDealt;
    const matchesPlayed = soloStats.roundsPlayed;

    const average = matchesPlayed ? (totalDamage / matchesPlayed).toFixed(1) : '0.0';

    return res.status(200).json({ seasonAverage: average });
  } catch (err) {
    console.error('❌ 시즌 대미지 API 오류:', err);
    return res.status(500).json({ error: '시즌 평균 대미지를 불러오지 못했습니다.' });
  }
}
