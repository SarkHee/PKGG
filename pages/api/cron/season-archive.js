// Vercel Cron: 시즌이 바뀔 때마다 방금 끝난 시즌을 자동 아카이브한다.
// utils/seasonStart.js의 SEASON_STARTS 경계를 기준으로 "현재 시즌 - 1"을 archiveSeason()에 넘긴다.
// archiveSeason은 대상 PlayerMatch가 이미 없으면 skipped:true로 끝나므로 매일 돌아도 안전(멱등)하다.
import { getSeasonStart, SEASON_STARTS } from '../../../utils/seasonStart.js';
import { archiveSeason } from '../../../utils/seasonArchive.js';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { num: currentSeasonNum } = await getSeasonStart();
    const prevSeasonNum = currentSeasonNum - 1;

    if (!SEASON_STARTS[prevSeasonNum]) {
      console.log(`[season-archive] 이전 시즌(${prevSeasonNum}) 시작일이 SEASON_STARTS에 없어 건너뜀`);
      return res.status(200).json({ skipped: true, reason: `SEASON_STARTS에 시즌 ${prevSeasonNum} 없음` });
    }

    const result = await archiveSeason(prevSeasonNum);
    console.log('[season-archive]', JSON.stringify(result));
    return res.status(200).json(result);
  } catch (e) {
    console.error('[season-archive] 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
