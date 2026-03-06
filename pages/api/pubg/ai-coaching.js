// pages/api/pubg/ai-coaching.js
// Groq AI 코칭 API — 플레이어 stats → Llama 3.1 → 맞춤 조언 3줄
// DB(PlayerAnalysis)에 7일 캐시

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CACHE_DAYS = 7;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { nickname, shard = 'steam', stats } = req.body;
  if (!nickname || !stats) return res.status(400).json({ error: 'nickname, stats required' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  try {
    // 캐시 확인 (7일 이내)
    const cutoff = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000);
    const cached = await prisma.playerAnalysis.findUnique({
      where: { playerNickname_playerServer: { playerNickname: nickname, playerServer: shard } },
    });

    if (cached && cached.lastAnalyzed > cutoff && cached.recommendations?.startsWith('[AI]')) {
      return res.json({ advice: cached.recommendations.replace('[AI]', '').trim(), cached: true });
    }

    // Groq API 호출
    const { avgDamage = 0, avgKills = 0, winRate = 0, top10Rate = 0, avgSurvivalTime = 0, playstyle = '' } = stats;
    const survMin = Math.floor(avgSurvivalTime / 60);

    const prompt = `PUBG 플레이어 "${nickname}" 분석:
- 평균딜: ${Math.round(avgDamage)}, 평균킬: ${(+avgKills).toFixed(1)}, 승률: ${(+winRate).toFixed(1)}%
- Top10: ${(+top10Rate).toFixed(1)}%, 평균생존: ${survMin}분, 플레이스타일: ${playstyle || '분석중'}

위 데이터를 바탕으로 이 플레이어에게 가장 도움이 될 PUBG 실전 개선 조언을 한국어로 3가지만 작성해줘.
각 조언은 "• "으로 시작하고, 구체적이고 실용적으로 50자 이내로 작성해줘. 인사말이나 설명 없이 조언만 출력해.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq API error:', err);
      return res.status(502).json({ error: 'AI 분석 실패. 잠시 후 다시 시도해주세요.' });
    }

    const groqData = await groqRes.json();
    const advice = groqData.choices?.[0]?.message?.content?.trim() || '';

    if (!advice) return res.status(502).json({ error: 'AI 응답 없음' });

    // DB 캐시 저장
    await prisma.playerAnalysis.upsert({
      where: { playerNickname_playerServer: { playerNickname: nickname, playerServer: shard } },
      update: {
        recommendations: '[AI]' + advice,
        lastAnalyzed: new Date(),
        playStyle: playstyle || 'BALANCED',
        damagePerGame: avgDamage,
        killDeathRatio: avgKills,
        survivalRate: winRate,
        playstyleScore: top10Rate,
        aggressionIndex: 0,
        consistencyIndex: 0,
        strengths: '',
        weaknesses: '',
        trainingPlan: '',
      },
      create: {
        playerNickname: nickname,
        playerServer: shard,
        recommendations: '[AI]' + advice,
        playStyle: playstyle || 'BALANCED',
        damagePerGame: avgDamage,
        killDeathRatio: avgKills,
        survivalRate: winRate,
        playstyleScore: top10Rate,
        aggressionIndex: 0,
        consistencyIndex: 0,
        strengths: '',
        weaknesses: '',
        trainingPlan: '',
        lastAnalyzed: new Date(),
      },
    });

    return res.json({ advice, cached: false });
  } catch (e) {
    console.error('ai-coaching error:', e);
    return res.status(500).json({ error: '서버 오류' });
  }
}
