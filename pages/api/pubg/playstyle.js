import axios from 'axios';
import { calculateMMR } from '../../../utils/mmrCalculator';
import { classifyPlaystyle } from '../../../utils/playstyleClassifier';

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

  const API_KEY = `Bearer ${process.env.PUBG_API_KEY}`;

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
        acc.damage        += cur.damageDealt;
        acc.kills         += cur.kills;
        acc.assists       += cur.assists || 0;
        acc.survival      += cur.timeSurvived;
        acc.top10         += cur.winPlace <= 10 ? 1 : 0;
        acc.wins          += cur.winPlace === 1 ? 1 : 0;
        acc.headshotKills += cur.headshotKills || 0;
        return acc;
      },
      { damage: 0, kills: 0, assists: 0, survival: 0, top10: 0, wins: 0, headshotKills: 0 }
    );

    const count = statsList.length || 1;
    const avgDamage      = total.damage   / count;
    const avgKills       = total.kills    / count;
    const avgAssists     = total.assists  / count;
    const avgSurviveTime = total.survival / count;
    const top10Rate      = (total.top10   / count) * 100;
    const winRate        = (total.wins    / count) * 100;
    const headshotRate   = total.kills > 0 ? (total.headshotKills / total.kills) * 100 : 0;

    const mmrScore = calculateMMR({
      avgDamage,
      avgKills,
      avgAssists,
      avgSurviveTime,
      top10Rate,
      winRate,
    });

    const playstyle = classifyPlaystyle({
      avgDamage,
      avgKills,
      avgAssists,
      avgSurviveTime,
      top10Rate,
      winRate,
      headshotRate,
    });

    return res.status(200).json({
      style:         playstyle.label,
      styleCode:     playstyle.code,
      styleDesc:     playstyle.desc,
      styleColor:    playstyle.color,
      avgDamage:     avgDamage.toFixed(1),
      avgKills:      avgKills.toFixed(1),
      avgAssists:    avgAssists.toFixed(1),
      avgSurvival:   Math.round(avgSurviveTime),
      top10Ratio:    (top10Rate / 100).toFixed(2),
      winRate:       winRate.toFixed(1),
      headshotRate:  headshotRate.toFixed(1),
      mmrScore:      Math.round(mmrScore),
    });
  } catch (error) {
    console.error('❌ 플레이스타일 분석 실패:', error);
    return res.status(500).json({ error: '플레이스타일 분석 실패' });
  }
}
