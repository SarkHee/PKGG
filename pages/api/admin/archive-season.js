// POST /api/admin/archive-season { season: 41, deleteAfter?: true, includeOlder?: false }
// 지난 시즌 PlayerMatch를 MapStatSeason/WeaponMetaSeason/PlayerSeasonSummary로 요약 저장한 뒤 원본 삭제.
// includeOlder:true면 이 시즌 시작일 이전(시즌 구분 안 되는 옛 꼬리 데이터)의 PlayerMatch도 함께 삭제.
// 관리자 수동 트리거용 — 자동 실행은 pages/api/cron/season-archive.js가 담당(같은 utils/seasonArchive.js 공유).
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import { archiveSeason } from '../../../utils/seasonArchive.js';

export const config = { maxDuration: 300 };

const ADMIN_EMAIL = 'sssyck123@gmail.com';

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw;
  if (pw && pw === process.env.ADMIN_PASSWORD) return true;
  const session = await getServerSession(req, res, authOptions);
  return session?.user?.email === ADMIN_EMAIL;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  if (!(await checkAdmin(req, res))) return res.status(401).json({ error: '인증 필요' });

  const season = parseInt(req.body?.season, 10);
  if (!season) return res.status(400).json({ error: 'season이 필요합니다.' });
  const deleteAfter = req.body?.deleteAfter !== false; // 기본 true, false로 넘기면 저장만 하고 삭제는 건너뜀
  const includeOlder = req.body?.includeOlder === true; // 기본 false, true면 이 시즌 이전 꼬리 데이터도 함께 삭제

  try {
    const result = await archiveSeason(season, { deleteAfter, includeOlder });
    return res.status(200).json(result);
  } catch (e) {
    console.error('[admin/archive-season] 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
