// 더보기 매치 조회 API
// GET /api/matches/load-more?nickname=xxx&shard=steam&offset=10
//
// 캐시 정책:
//   - 플레이어 매치 목록: 10분
//   - 개별 매치 상세:    30분

import { cachedPubgFetch, TTL, PubgApiError } from '../../../utils/pubgApiCache';
import prisma from '../../../utils/prisma.js';
import { analyzeMatchData } from '../../../utils/botKills.js';

const PUBG_BASE = 'https://api.pubg.com/shards';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { nickname, shard = 'steam', offset = '10', limit = '5', force } = req.query;
  if (!nickname) {
    return res.status(400).json({ error: 'nickname이 필요합니다.' });
  }

  const skip     = req.query.offset !== undefined ? parseInt(offset, 10) : 10;
  const take     = Math.min(parseInt(limit, 10) || 5, 15);
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
    const matchIds    = allMatchIds.slice(skip, skip + take);

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

    // ── 2-1. 매치 데이터 동기 추출 (_matchData, _accountId 임시 보관) ─────────
    const rawMatches = matchResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => {
        const data        = r.value;
        const matchId     = data.data.id;
        const attrs       = data.data.attributes;
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
        const telemetryAsset = included.find(
          (i) => i.type === 'asset' && i.attributes?.name === 'telemetry'
        );
        const telemetryUrl = telemetryAsset?.attributes?.URL || null;
        return {
          _matchData:  data,           // analyzeMatchData에 전달 (중복 fetch 방지)
          _accountId:  s.playerId || '', // 봇킬 rows에서 플레이어 lookup용
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
          telemetryUrl,
          teammatesDetail,
          botKills:        0,
          realKills:       s.kills || 0,
          isBotCorrected:  false,
          botDamage:       0,
          realDamage:      Math.round(s.damageDealt || 0),
          botAssist:       0,
          realAssist:      s.assists || 0,
        };
      })
      .filter((m) => m !== null);

    // ── 2-2. 봇킬 분석 — 텔레메트리 대용량(50MB)이라 순차 처리 ──────────────
    const botUpserts        = []  // DB upsert 대상 수집
    const teamDamageUpserts = []  // 팀 내 피해 upsert 대상 수집

    for (const m of rawMatches) {
      try {
        const result = await analyzeMatchData(m._matchData, m.matchId);
        const row    = result.rows.find((r) => r.accountId === m._accountId);
        m.botKills       = row?.bot         ?? 0;
        m.realKills      = row?.real        ?? m.kills;
        m.isBotCorrected = result.isBotCorrected;
        m.botDamage      = row?.botDamage   ?? 0;
        m.realDamage     = row?.realDamage  ?? m.damage;
        m.botAssist      = row?.botAssist   ?? 0;
        m.realAssist     = row?.realAssist  ?? m.assists;
        m.weaponStats    = row?.weaponStats ?? {};

        // 분석 성공한 경기만 upsert 대상에 추가
        if (result.isBotCorrected && m._accountId) {
          botUpserts.push({
            accountId:   m._accountId,
            matchId:     m.matchId,
            mode:        m.mode,
            mapName:     m.mapName || null,
            placement:   m.placement,
            kills:       m.kills,
            assists:     m.assists,
            damage:      m.damage,
            surviveTime: m.surviveTime || 0,
            createdAt:   new Date(m.matchTimestamp),
            botKills:    m.botKills,
            realKills:   m.realKills,
            botDamage:   m.botDamage,
            realDamage:  m.realDamage,
            botAssist:   m.botAssist,
            weaponStats: m.weaponStats,
          })

          // 팀 내 피해 rows 수집 (해당 경기에 관련된 rows만)
          if (result.teamDamageRows?.length > 0) {
            for (const td of result.teamDamageRows) {
              teamDamageUpserts.push({ matchId: m.matchId, ...td })
            }
          }
        }
      } catch (err) {
        console.warn('[load-more] 봇킬 분석 실패:', m.matchId, err?.message);
      }
    }

    // ── 2-3. 봇 분석 결과 DB upsert (병렬, 응답 전 완료) ─────────────────────
    if (botUpserts.length > 0) {
      const now = new Date()
      await Promise.allSettled(
        botUpserts.map(({ accountId, matchId, weaponStats: _ws, ...fields }) =>
          prisma.playerMatch.upsert({
            where: { pubgAccountId_matchId: { pubgAccountId: accountId, matchId } },
            create: {
              pubgAccountId: accountId,
              nickname,
              shard,
              matchId,
              ...fields,
              isBotCorrected: true,
              botAnalyzedAt:  now,
            },
            update: {
              botKills:       fields.botKills,
              realKills:      fields.realKills,
              botDamage:      fields.botDamage,
              realDamage:     fields.realDamage,
              botAssist:      fields.botAssist,
              isBotCorrected: true,
              botAnalyzedAt:  now,
            },
          })
        )
      ).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected').length
        if (failed > 0) console.warn(`[load-more] DB upsert 실패 ${failed}/${botUpserts.length}건`)
      })

      // ── 2-4. 무기별 통계 player_weapon_stats 저장 (skipDuplicates) ──────────
      const weaponRows = []
      for (const { accountId, matchId, weaponStats } of botUpserts) {
        if (!weaponStats || Object.keys(weaponStats).length === 0) continue
        for (const [weaponId, ws] of Object.entries(weaponStats)) {
          if (ws.kills === 0 && ws.damage === 0 && ws.pickups === 0) continue
          weaponRows.push({
            playerId:     accountId,
            shard,
            weaponId,
            weaponName:   weaponId,
            kills:        ws.kills,
            damage:       ws.damage,
            headshots:    0,
            bot_kills:    ws.botKills,
            real_kills:   ws.realKills,
            assists:      0,
            shots_fired:  0,
            shots_hit:    0,
            match_id:     matchId,
            pickup_count: ws.pickups,
          })
        }
      }
      if (weaponRows.length > 0) {
        await prisma.player_weapon_stats.createMany({
          data: weaponRows,
          skipDuplicates: true,
        }).catch(e => console.warn('[load-more] 무기 통계 저장 실패:', e.message))
      }

      // ── 2-5. 팀 내 피해 team_damage_stats 저장 ───────────────────────────
      if (teamDamageUpserts.length > 0) {
        const uniqueTeamDmg = []
        const seen = new Set()
        for (const td of teamDamageUpserts) {
          const key = `${td.matchId}|${td.attackerAccountId}|${td.victimAccountId}`
          if (!seen.has(key)) { seen.add(key); uniqueTeamDmg.push(td) }
        }
        await prisma.teamDamageStat.createMany({
          data: uniqueTeamDmg.map(td => ({
            matchId:           td.matchId,
            attackerAccountId: td.attackerAccountId,
            victimAccountId:   td.victimAccountId,
            attackerName:      td.attackerName,
            victimName:        td.victimName,
            totalDamage:       td.totalDamage,
            hitCount:          td.hitCount,
            groggyCount:       td.groggyCount ?? 0,
            killCount:         td.killCount   ?? 0,
            weapons:           td.weapons,
            firstHitAt:        td.firstHitAt ? new Date(td.firstHitAt) : null,
          })),
          skipDuplicates: true,
        }).catch(e => console.warn('[load-more] 팀 피해 통계 저장 실패:', e.message))
      }
    }

    // ── 2-3. 임시 필드 제거 ──────────────────────────────────────────────────
    const matches = rawMatches.map(({ _matchData, _accountId, ...rest }) => rest);

    // ── 3. teammate 클랜 정보 DB 조회 (추가 PUBG API 호출 없음) ──────────
    try {
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
