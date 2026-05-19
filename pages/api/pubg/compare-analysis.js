// POST /api/pubg/compare-analysis — 두 플레이어 비교 AI 요약 (GROQ)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { playerA, playerB } = req.body
  if (!playerA || !playerB) return res.status(400).json({ error: 'playerA, playerB required' })

  const GROQ_API_KEY = process.env.GROQ_API_KEY
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const fmt = (p) => {
    const surv = Math.floor((p.avgSurviveTime || 0) / 60)
    return `닉네임: ${p.nickname} / MMR: ${p.mmr || 0} / 평균딜: ${Math.round(p.avgDamage || 0)} / 평균킬: ${(+(p.avgKills || 0)).toFixed(2)} / 승률: ${(+(p.winRate || 0)).toFixed(1)}% / Top10: ${(+(p.top10Rate || 0)).toFixed(1)}% / 평균생존: ${surv}분 / 어시스트: ${(+(p.avgAssists || 0)).toFixed(2)} / 총게임: ${p.roundsPlayed || 0}`
  }

  // 스탯 우위 판단 (판정 근거 제공)
  const pA = playerA, pB = playerB
  const aWins = [
    (pA.avgDamage||0) > (pB.avgDamage||0),
    (pA.avgKills||0)  > (pB.avgKills||0),
    (pA.winRate||0)   > (pB.winRate||0),
    (pA.top10Rate||0) > (pB.top10Rate||0),
    (pA.mmr||0)       > (pB.mmr||0),
  ].filter(Boolean).length
  const better = aWins >= 3 ? pA.nickname : aWins <= 2 ? pB.nickname : null
  const hint = better
    ? `스탯 우위: ${better}가 5개 항목 중 ${better === pA.nickname ? aWins : 5 - aWins}개 앞섬`
    : '스탯이 비슷해서 팽팽한 구도'

  const prompt = `너는 PUBG 전적 비교 봇이야. 두 플레이어 스탯을 보고 한국어로 판정을 내려줘.

[플레이어 A] ${fmt(playerA)}
[플레이어 B] ${fmt(playerB)}
[참고] ${hint}

반드시 아래 형식 딱 두 줄만 출력해. 앞에 설명 붙이지 말고, 다른 텍스트 절대 쓰지 마.

제목: (닉네임 포함, 배그 감성으로 재밌게 한 줄 판정)
이유: (실제 수치 차이를 근거로 한 문장 설명)

예시:
제목: PlayerX한테 걸리면 무조건 죽는다
이유: 평균딜 580 vs 210, 킬 4.2 vs 1.1로 모든 지표에서 압도적이다.`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      return res.status(502).json({ error: 'GROQ 오류: ' + err })
    }

    const groqData = await groqRes.json()
    const summary = groqData.choices?.[0]?.message?.content?.trim() || ''
    return res.json({ summary })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
