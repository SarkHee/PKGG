// POST /api/pubg/compare-analysis — 두 플레이어 비교 AI 요약 (GROQ)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { playerA, playerB } = req.body
  if (!playerA || !playerB) return res.status(400).json({ error: 'playerA, playerB required' })

  const GROQ_API_KEY = process.env.GROQ_API_KEY
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' })

  const fmt = (p) => {
    const surv = Math.floor((p.avgSurviveTime || 0) / 60)
    return `닉네임: ${p.nickname}, MMR: ${p.mmr || 0}, 평균딜: ${Math.round(p.avgDamage || 0)}, 평균킬: ${(+(p.avgKills || 0)).toFixed(2)}, 승률: ${(+(p.winRate || 0)).toFixed(1)}%, Top10: ${(+(p.top10Rate || 0)).toFixed(1)}%, 평균생존: ${surv}분, 어시스트: ${(+(p.avgAssists || 0)).toFixed(2)}, 총게임: ${p.roundsPlayed || 0}`
  }

  const prompt = `두 PUBG 플레이어 스탯을 비교해줘.

[플레이어 A] ${fmt(playerA)}
[플레이어 B] ${fmt(playerB)}

아래 형식 그대로 두 줄만 출력해. 다른 말은 절대 쓰지 마.

제목: [재밌고 생생한 한 줄 판정]
이유: [왜 그런지 핵심 근거 한 문장, 구체적인 수치 포함]

제목 작성 규칙:
- 닉네임을 반드시 포함할 것
- "압도적 우세" 같은 딱딱한 표현 금지
- 배그 느낌 나게 재밌고 직관적으로 (예: "XXX, 총도 잘 쏘고 살아남기도 잘하는 사람", "XXX한테 걸리면 무조건 죽는다", "YYY는 XXX 앞에선 그냥 밥", "두 사람 실력 거의 똑같아서 만나면 운빨 싸움")
- 격차가 클수록 더 강하게, 비슷하면 팽팽하게 표현
이유는 친절하고 읽기 쉽게, 딜량·킬·승률 등 차이 나는 수치를 자연스럽게 녹여서 써줘.`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.5,
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
