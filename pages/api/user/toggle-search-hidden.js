// POST /api/user/toggle-search-hidden { accountId, hidden }
// 로그인 유저 본인의 연동 PUBG 계정에 한해 검색 노출 여부를 토글한다.
// accountId는 PubgAccount.id (연동 계정 레코드) — 본인 소유인지 반드시 확인 후 처리.
import prisma from '../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../utils/clanBattleAuth.js';
import { invalidatePlayerCache } from '../../../utils/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { accountId, hidden } = req.body || {};
  if (!accountId) return res.status(400).json({ error: 'accountId가 필요합니다.' });
  if (typeof hidden !== 'boolean') return res.status(400).json({ error: 'hidden 값이 필요합니다.' });

  const account = (authUser.pubgAccounts || []).find((a) => a.id === accountId);
  if (!account) return res.status(403).json({ error: '본인 소유의 연동 계정만 설정할 수 있습니다.' });

  try {
    const data = { isSearchHidden: hidden, searchHiddenAt: hidden ? new Date() : null };
    const cache = await prisma.playerCache.upsert({
      where: { nickname_pubgShardId: { nickname: account.nickname, pubgShardId: account.platform } },
      create: {
        nickname: account.nickname,
        pubgShardId: account.platform,
        pubgPlayerId: account.pubgAccountId,
        ...data,
      },
      update: data,
    });

    // 검색 비활성화로 전환 시, 이미 캐시된 검색 결과에 남아있지 않도록 즉시 무효화
    if (hidden) {
      await invalidatePlayerCache(account.platform, account.nickname);
    }

    return res.status(200).json({ ok: true, isSearchHidden: cache.isSearchHidden });
  } catch (e) {
    console.error('[user/toggle-search-hidden] 오류:', e.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
