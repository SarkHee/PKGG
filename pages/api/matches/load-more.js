// 더보기 매치 조회 API
// GET /api/matches/load-more?nickname=xxx&shard=steam&offset=10
//
// 캐시 정책:
//   - 플레이어 매치 목록: 10분
//   - 개별 매치 상세:    30분

import { cachedPubgFetch, TTL, PubgApiError } from '../../../utils/pubgApiCache';

const PUBG_BASE = 'https://api.pubg.com/shards';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { nickname, shard = 'steam', offset = '10', force } = req.query;
  if (!nickname) {
    return res.status(400).json({ error: 'nickname이 필요합니다.' });
  }

  const skip     = parseInt(offset, 10) || 10;
  const forceRefresh = force === '1';

  try {
    // ── 1. 플레이어 매치 목록 조회 (10분 캐시) ────────────────────────────
    const playerUrl = `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`;
    const playerJson = await cachedPubgFetch(playerUrl, {
      ttl: TTL.PLAYER,
      force: forceRefresh,
    });

    const pubgPlayer = playerJson.data?.[0];
    if (!pubgPlayer) {
      return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    }

    const allMatchIds = (pubgPlayer.relationships?.matches?.data || []).map((m) => m.id);
    const matchIds    = allMatchIds.slice(skip, skip + 5);

    if (matchIds.length === 0) {
      return res.status(200).json({ matches: [] });
    }

    // ── 2. 개별 매치 상세 병렬 조회 (30분 캐시) ──────────────────────────
    const matchResults = await Promise.allSettled(
      matchIds.map((matchId) =>
        cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, {
          ttl: TTL.MATCH,
          force: false, // 매치는 불변 데이터이므로 force bypass 없음
        })
      )
    );

    const matches = matchResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => {
        const data   = r.value;
        const matchId = data.data.id;
        const attrs  = data.data.attributes;
        const included    = data.included || [];
        const participants = included.filter((i) => i.type === 'participant');
        const rosters      = included.filter((i) => i.type === 'roster');

        const me = participants.find(
          (p) => p.attributes.stats.name?.toLowerCase() === nickname.toLowerCase()
        );
        if (!me) return null;

        const myRoster = rosters.find((r) =>
          r.relationships?.participants?.data?.some((ref) => ref.id === me.id)
        );
        const teammateRefs = myRoster?.relationships?.participants?.data || [{ id: me.id }];
        const teammatesDetail = teammateRefs
          .map((ref) => participants.find((p) => p.id === ref.id))
          .filter(Boolean)
          .map((t) => {
            const ts = t.attributes.stats;
            return {
              name:         ts.name,
              kills:        ts.kills || 0,
              assists:      ts.assists || 0,
              damage:       Math.round(ts.damageDealt || 0),
              dbnos:        ts.DBNOs || 0,
              survivalTime: ts.timeSurvived || 0,
              rank:         ts.winPlace || 0,
              isSelf:       t.id === me.id,
            };
          })
          .sort((a, b) => {
            if (a.isSelf) return -1;
            if (b.isSelf) return 1;
            return b.damage - a.damage;
          });

        const s = me.attributes.stats;
        return {
          matchId,
          mode:           attrs.gameMode,
          matchType:      attrs.matchType,
          mapName:        attrs.mapName,
          placement:      s.winPlace || 0,
          kills:          s.kills || 0,
          assists:        s.assists || 0,
          damage:         Math.round(s.damageDealt || 0),
          surviveTime:    s.timeSurvived || 0,
          matchTimestamp: attrs.createdAt || new Date().toISOString(),
          teammatesDetail,
        };
      })
      .filter((m) => m !== null);

    // ── 3. teammate 클랜 정보 DB 조회 (추가 PUBG API 호출 없음) ──────────
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const allTeammateNames = [
        ...new Set(
          matches.flatMap((m) =>
            (m.teammatesDetail || []).filter((t) => !t.isSelf).map((t) => t.name)
          )
        ),
      ];

      if (allTeammateNames.length > 0) {
        const rows = await prisma.clanMember.findMany({
          where: { nickname: { in: allTeammateNames, mode: 'insensitive' } },
          select: {
            nickname:    true,
            pubgClanId:  true,
            clan: { select: { name: true, pubgClanTag: true, pubgClanId: true } },
          },
        });

        const clanMap = {};
        for (const row of rows) {
          if (row.clan && row.pubgClanId && row.clan.pubgClanId === row.pubgClanId) {
            clanMap[row.nickname.toLowerCase()] = {
              clanTag:  row.clan.pubgClanTag || '',
              clanName: row.clan.name || '',
            };
          }
        }

        for (const match of matches) {
          if (Array.isArray(match.teammatesDetail)) {
            match.teammatesDetail = match.teammatesDetail.map((t) => ({
              ...t,
              ...(clanMap[t.name?.toLowerCase()] || {}),
            }));
          }
        }
      }

      await prisma.$disconnect();
    } catch (dbErr) {
      console.warn('[load-more] teammate 클랜 조회 실패:', dbErr.message);
    }

    return res.status(200).json({ matches });

  } catch (err) {
    if (err instanceof PubgApiError) {
      const httpStatus = err.status === 0 ? 503 : (err.status || 500);
      return res.status(httpStatus).json({ error: err.message, code: err.code });
    }
    console.error('[load-more] 예상치 못한 오류:', err.message);
    return res.status(500).json({ error: '매치 조회 중 오류가 발생했습니다.' });
  }
}
