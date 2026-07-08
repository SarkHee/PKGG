// GET  /api/clan-battle?mine=1&type=battle|killmatch  — 내전 목록 (mine=1이면 내가 만든 것만)
// POST /api/clan-battle                                — 내전 생성 (로그인 필수, 참가자는 빈 상태로 시작)
import prisma from '../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../utils/clanBattleAuth.js';

// datetime-local 입력값("YYYY-MM-DDTHH:mm", 타임존 없음)을 KST(+09:00)로 고정 파싱.
// new Date(str)에 그대로 넘기면 서버 프로세스의 로컬 타임존으로 해석되어(Vercel은 보통 UTC)
// 배포 환경에 따라 값이 9시간씩 어긋나는 문제가 있어, 항상 KST로 명시한다.
function parseKST(str) {
  if (!str) return null;
  const hasSeconds = /T\d{2}:\d{2}:\d{2}/.test(str);
  return new Date(hasSeconds ? `${str}+09:00` : `${str}:00+09:00`);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { mine, type } = req.query;
      const where = {};

      if (mine === '1') {
        const authUser = await getSessionAuthUser(req, res);
        if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });
        where.createdBy = authUser.id;
      }
      if (type === 'battle' || type === 'killmatch') where.type = type;

      const battles = await prisma.clanBattle.findMany({
        where,
        include: {
          rule: true,
          _count: { select: { players: true, matches: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ battles });
    } catch (e) {
      console.error('[clan-battle] GET 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'POST') {
    const authUser = await getSessionAuthUser(req, res);
    if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

    const { title, memo, placePoints, killBasePoint, tierMultipliers, useTierMultiplier, placementPointMode, type, startTime, endTime, targetScore } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: '내전 이름이 필요합니다.' });
    const battleType = type === 'killmatch' ? 'killmatch' : 'battle';
    if (battleType === 'killmatch' && !startTime) {
      return res.status(400).json({ error: '킬내기는 시작 시간이 필요합니다.' });
    }

    try {
      const battle = await prisma.clanBattle.create({
        data: {
          title: title.trim(),
          createdBy: authUser.id,
          memo: memo || null,
          type: battleType,
          startTime: parseKST(startTime),
          endTime: parseKST(endTime),
          targetScore: targetScore != null && targetScore !== '' ? parseInt(targetScore) : null,
          rule: {
            create: {
              placePoints: placePoints || {},
              killBasePoint: killBasePoint != null ? parseFloat(killBasePoint) : 1.0,
              tierMultipliers: tierMultipliers || {},
              useTierMultiplier: useTierMultiplier ?? true,
              placementPointMode: placementPointMode === 'squad' ? 'squad' : 'individual',
            },
          },
        },
        include: { rule: true },
      });

      // 참가자는 자동 참가 없이 빈 상태로 시작 — "내 클랜원 불러오기" 버튼을 눌렀을 때만 추가된다.
      return res.status(201).json({ battle, autoAddedPlayers: 0 });
    } catch (e) {
      console.error('[clan-battle] POST 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
