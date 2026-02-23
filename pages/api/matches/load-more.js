// 더보기 매치 조회 API
// GET /api/matches/load-more?nickname=xxx&shard=steam&offset=10

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { nickname, shard = 'steam', offset = '10' } = req.query;

  if (!nickname) {
    return res.status(400).json({ error: 'nickname이 필요합니다.' });
  }

  const skip = parseInt(offset, 10) || 10;
  const PUBG_API_KEY = `Bearer ${process.env.PUBG_API_KEY}`;
  const PUBG_HEADERS = { Authorization: PUBG_API_KEY, Accept: 'application/vnd.api+json' };

  try {
    const axios = require('axios');

    // 1. 플레이어 매치 목록 조회
    const playerRes = await axios.get(
      `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
      { headers: PUBG_HEADERS, timeout: 8000 }
    );

    const pubgPlayer = playerRes.data.data?.[0];
    if (!pubgPlayer) {
      return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    }

    const allMatchIds = (pubgPlayer.relationships?.matches?.data || []).map(m => m.id);
    const matchIds = allMatchIds.slice(skip, skip + 5); // offset부터 5개

    if (matchIds.length === 0) {
      return res.status(200).json({ matches: [] });
    }

    // 2. 매치 상세 병렬 조회
    const matchResults = await Promise.allSettled(
      matchIds.map(matchId =>
        axios.get(
          `https://api.pubg.com/shards/${shard}/matches/${matchId}`,
          { headers: PUBG_HEADERS, timeout: 8000 }
        )
      )
    );

    const matches = matchResults
      .filter(r => r.status === 'fulfilled')
      .map(r => {
        const data = r.value.data;
        const matchId = data.data.id;
        const attrs = data.data.attributes;
        const included = data.included || [];
        const participants = included.filter(i => i.type === 'participant');
        const rosters = included.filter(i => i.type === 'roster');

        const me = participants.find(p =>
          p.attributes.stats.name?.toLowerCase() === nickname.toLowerCase()
        );
        if (!me) return null;

        const myRoster = rosters.find(r =>
          r.relationships?.participants?.data?.some(ref => ref.id === me.id)
        );
        const teammateRefs = myRoster?.relationships?.participants?.data || [{ id: me.id }];
        const teammatesDetail = teammateRefs
          .map(ref => participants.find(p => p.id === ref.id))
          .filter(Boolean)
          .map(t => {
            const ts = t.attributes.stats;
            return {
              name: ts.name,
              kills: ts.kills || 0,
              assists: ts.assists || 0,
              damage: Math.round(ts.damageDealt || 0),
              dbnos: ts.DBNOs || 0,
              survivalTime: ts.timeSurvived || 0,
              rank: ts.winPlace || 0,
              isSelf: t.id === me.id,
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
          mode: attrs.gameMode,
          matchType: attrs.matchType,
          mapName: attrs.mapName,
          placement: s.winPlace || 0,
          kills: s.kills || 0,
          assists: s.assists || 0,
          damage: Math.round(s.damageDealt || 0),
          surviveTime: s.timeSurvived || 0,
          matchTimestamp: attrs.createdAt || new Date().toISOString(),
          teammatesDetail,
        };
      })
      .filter(m => m !== null);

    // 3. teammate 클랜 정보 DB 조회
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const allTeammateNames = [
        ...new Set(
          matches.flatMap(m =>
            (m.teammatesDetail || []).filter(t => !t.isSelf).map(t => t.name)
          )
        ),
      ];

      if (allTeammateNames.length > 0) {
        const teammateRows = await prisma.clanMember.findMany({
          where: { nickname: { in: allTeammateNames, mode: 'insensitive' } },
          select: {
            nickname: true,
            pubgClanId: true,
            clan: { select: { name: true, pubgClanTag: true, pubgClanId: true } },
          },
        });

        const clanMap = {};
        for (const row of teammateRows) {
          if (row.clan && row.pubgClanId && row.clan.pubgClanId === row.pubgClanId) {
            clanMap[row.nickname.toLowerCase()] = {
              clanTag: row.clan.pubgClanTag || '',
              clanName: row.clan.name || '',
            };
          }
        }

        for (const match of matches) {
          if (Array.isArray(match.teammatesDetail)) {
            match.teammatesDetail = match.teammatesDetail.map(t => ({
              ...t,
              ...(clanMap[t.name?.toLowerCase()] || {}),
            }));
          }
        }
      }

      await prisma.$disconnect();
    } catch (dbErr) {
      console.warn('teammate 클랜 조회 실패:', dbErr.message);
    }

    return res.status(200).json({ matches });
  } catch (error) {
    console.error('load-more 오류:', error.message);
    return res.status(500).json({ error: '매치 조회 중 오류가 발생했습니다.' });
  }
}
