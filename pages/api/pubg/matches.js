import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원됩니다.' });
  }

  const { matchIds, playerName, shardId } = req.body;

  if (!matchIds || !playerName || !shardId) {
    return res
      .status(400)
      .json({ error: '필수 데이터 누락: matchIds, playerName, shardId' });
  }

  const API_KEY =
    'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o'; // ← 여기에 본인의 PUBG API 키 입력

  try {
    const matchPromises = matchIds.slice(0, 20).map((id) =>
      axios.get(`https://api.pubg.com/shards/${shardId}/matches/${id}`, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      })
    );

    const matchResponses = await Promise.all(matchPromises);

    const damages = matchResponses.map((res) => {
      const participant = res.data.included.find(
        (el) =>
          el.type === 'participant' &&
          el.attributes.stats.name.toLowerCase() === playerName.toLowerCase()
      );

      return participant?.attributes.stats.damageDealt || 0;
    });

    const totalDamage = damages.reduce((sum, dmg) => sum + dmg, 0);
    const count = damages.filter((d) => d > 0).length || 1;
    const average = totalDamage / count;

    return res.status(200).json({ averageDamage: average.toFixed(1) });
  } catch (error) {
    console.error('❌ match 데이터 처리 실패:', error);
    return res
      .status(500)
      .json({ error: '서버 오류: 경기 데이터 처리 중 문제 발생' });
  }
}
