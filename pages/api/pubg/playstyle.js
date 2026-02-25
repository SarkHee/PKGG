import axios from 'axios';
import { calculateMMR } from '../../../utils/mmrCalculator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { matchIds, playerName, shardId } = req.body;

  if (!matchIds || !playerName || !shardId) {
    return res
      .status(400)
      .json({ error: '필수 데이터 누락: matchIds, playerName, shardId' });
  }

  const API_KEY =
    'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o'; // ← 본인의 PUBG API 키로 바꿔주세요

  try {
    const matchResponses = await Promise.all(
      matchIds.slice(0, 20).map((id) =>
        axios.get(`https://api.pubg.com/shards/${shardId}/matches/${id}`, {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
        })
      )
    );

    const statsList = matchResponses
      .map((res) => {
        const participant = res.data.included.find(
          (el) =>
            el.type === 'participant' &&
            el.attributes.stats.name.toLowerCase() === playerName.toLowerCase()
        );
        return participant?.attributes.stats;
      })
      .filter(Boolean);

    const total = statsList.reduce(
      (acc, cur) => {
        acc.damage += cur.damageDealt;
        acc.kills += cur.kills;
        acc.survival += cur.timeSurvived;
        acc.top10 += cur.winPlace <= 10 ? 1 : 0;
        return acc;
      },
      { damage: 0, kills: 0, survival: 0, top10: 0 }
    );

    const count = statsList.length || 1;
    const avgDamage = total.damage / count;
    const avgKills = total.kills / count;
    const avgSurvival = total.survival / count;
    const top10Ratio = total.top10 / count;

    // ✅ MMR 계산 — calculateMMR 통일 공식 사용
    const mmrScore = calculateMMR({
      avgDamage,
      avgKills,
      avgSurviveTime: avgSurvival,
      top10Rate: top10Ratio * 100, // 0~1 → 0~100%
    });

    // ✅ 스타일 판별
    let style = '⚙️ 분석 불가';

    if (
      avgDamage > 250 &&
      avgKills > 2 &&
      avgSurvival > 800 &&
      top10Ratio > 0.5
    ) {
      style = '👑 슈퍼 캐리형';
    } else if (avgDamage > 200 && avgKills >= 1 && avgSurvival >= 700) {
      style = '🔥 캐리형';
    } else if (avgKills >= 2) {
      style = '🔫 공격적 전투형';
    } else if (avgSurvival >= 900 && avgKills < 1) {
      style = '🛡️ 생존형';
    } else if (avgDamage < 100 && avgKills < 1) {
      style = '☠️ 무력형';
    } else {
      style = '⚖️ 밸런스형';
    }

    return res.status(200).json({
      style,
      avgDamage: avgDamage.toFixed(1),
      avgKills: avgKills.toFixed(1),
      avgSurvival: Math.round(avgSurvival),
      top10Ratio: top10Ratio.toFixed(1),
      mmrScore: Math.round(mmrScore), // ✅ 꼭 포함!
    });
  } catch (error) {
    console.error('❌ 플레이스타일 분석 실패:', error);
    return res.status(500).json({ error: '플레이스타일 분석 실패' });
  }
}
