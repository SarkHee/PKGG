// POST /api/clan-battle/[battleId]/import-match — PUBG 매치 상세 조회 후 참가자 자동 매칭 (생성자만)
// body: { matchId }
// type==='battle'    → matchType==='custom'인 사용자 지정 게임만 허용
// type==='killmatch' → 이벤트/연습장이 아닌 일반 게임만 허용 (custom 제외 대상에 포함됨)
import prisma from '../../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../../utils/clanBattleAuth.js';
import { cachedPubgFetch, TTL } from '../../../../utils/pubgApiCache.js';

const PUBG_BASE = 'https://api.pubg.com/shards';

const EVENT_MATCH_TYPES = new Set(['event', 'casual', 'airoyale', 'arcade', 'custom', 'training', 'trainingroom']);
const EVENT_MODE_KEYWORDS = ['tdm', 'ibr', 'arcade', 'training', 'clansolo', 'clansquad', 'heistroyale'];
const EVENT_MAP_KEYWORDS = ['range_main', '_tdm_', '_training_', 'pillarcompound', 'boardwalk', 'safehouse'];
const isEventOrPractice = (matchType, mode, mapName) => {
  const mt = (matchType || '').toLowerCase();
  const gm = (mode || '').toLowerCase();
  const mn = (mapName || '').toLowerCase();
  return EVENT_MATCH_TYPES.has(mt) || EVENT_MODE_KEYWORDS.some((k) => gm.includes(k)) || EVENT_MAP_KEYWORDS.some((k) => mn.includes(k));
};

async function fetchMatchAnyShard(matchId) {
  for (const shard of ['steam', 'kakao']) {
    try {
      const json = await cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, { ttl: TTL.MATCH });
      if (json?.data) return json;
    } catch { /* 다음 shard 시도 */ }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { matchId } = req.body || {};
  if (!matchId) return res.status(400).json({ error: 'matchId가 필요합니다.' });

  try {
    const battle = await prisma.clanBattle.findUnique({ where: { id } });
    if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
    if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 매치를 불러올 수 있습니다.' });

    const matchJson = await fetchMatchAnyShard(matchId);
    if (!matchJson) return res.status(404).json({ error: '매치를 찾을 수 없습니다.' });

    const attrs = matchJson.data.attributes;
    if (battle.type === 'killmatch') {
      if (isEventOrPractice(attrs.matchType, attrs.gameMode, attrs.mapName)) {
        return res.status(400).json({ error: '일반 게임만 등록 가능합니다 (이벤트/연습장/사용자 지정 게임 제외).' });
      }
    } else if (attrs.matchType !== 'custom') {
      return res.status(400).json({ error: '사용자 지정 게임만 등록 가능합니다.' });
    }

    const included = matchJson.included || [];
    const participants = included.filter((i) => i.type === 'participant');
    const rosters = included.filter((i) => i.type === 'roster');

    // participantId -> roster (같은 roster = 같은 팀 = 동일 스쿼드 등수)
    const participantToRoster = new Map();
    rosters.forEach((r) => {
      const refs = r.relationships?.participants?.data || [];
      refs.forEach((ref) => participantToRoster.set(ref.id, r));
    });

    const players = await prisma.clanBattlePlayer.findMany({ where: { battleId: id } });

    const matched = [];
    const matchedIds = new Set();

    for (const player of players) {
      const p = participants.find(
        (part) => (part.attributes?.stats?.name || '').toLowerCase() === player.nickname.toLowerCase()
      );
      if (!p) continue;

      const roster = participantToRoster.get(p.id);
      const squadPlacement = roster?.attributes?.stats?.rank ?? roster?.attributes?.rank ?? null;
      const stats = p.attributes.stats || {};
      const rawKills = stats.kills ?? 0;

      const entry = {
        playerId: player.id,
        nickname: player.nickname,
        placement: stats.winPlace ?? null,
        kills: rawKills,
        damage: Math.round(stats.damageDealt || 0),
        assists: stats.assists ?? 0,
        squadPlacement,
      };

      if (battle.type === 'killmatch') {
        // 봇킬 분석이 이미 완료된 기록이 있으면 실킬 기준으로 초기값 채움
        const pm = await prisma.playerMatch.findFirst({
          where: { pubgAccountId: stats.playerId, matchId, isBotCorrected: true },
          select: { realKills: true },
        });
        entry.rawKills = rawKills;
        entry.realKills = pm?.realKills ?? null;
        entry.botAnalysisStatus = pm ? 'completed' : 'pending';
        if (pm?.realKills != null) entry.kills = pm.realKills;
      }

      matched.push(entry);
      matchedIds.add(player.id);
    }

    const unmatched = players
      .filter((p) => !matchedIds.has(p.id))
      .map((p) => ({ nickname: p.nickname }));

    return res.status(200).json({
      matched,
      unmatched,
      matchInfo: {
        mapName: attrs.mapName,
        playedAt: attrs.createdAt,
        totalParticipants: participants.length,
      },
    });
  } catch (e) {
    console.error('[clan-battle/import-match] POST 오류:', e.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
