// GET /api/clan-battle/[battleId]/recent-matches — 최근 게임 목록 조회 (생성자만)
// type==='battle'    → 참가자 중 1명의 최근 "사용자 지정 게임(matchType==='custom')"만 조회 (기존 로직)
// type==='killmatch' → 전체 참가자의 최근 일반 게임을 병렬 조회해 startTime~endTime 범위 내에서
//                       가장 많은 참가자가 겹치는 경기를 우선 추천. custom/event/연습장은 제외.
// ?representative=1 → (킬내기 자동 폴링 전용) 전체 참가자 대신 스쿼드별 대표 1명씩(+미배정 그룹 대표 1명)으로
//                      가볍게 조회해 API 호출을 스쿼드 수 안팎으로 최소화. 응답 구조는 동일.
//                      스쿼드마다 실제로 다른 경기를 뛸 수 있으므로, 대표 1명만으로는 다른 스쿼드의 경기를 놓칠 수 있어
//                      스쿼드별 대표를 각각 둔다 (같은 경기가 겹치면 pubgMatchId 기준으로 중복 제거).
import prisma from '../../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../../utils/clanBattleAuth.js';
import { cachedPubgFetch, TTL } from '../../../../utils/pubgApiCache.js';

const PUBG_BASE = 'https://api.pubg.com/shards';
const MAX_RESULTS = 10; // 'battle' 타입(사용자 지정 게임 드롭다운)은 목록 UX상 적당히 작게 유지
const MAX_RESULTS_KILLMATCH = 100; // 킬내기는 스쿼드 수만큼 매치가 늘어날 수 있어 사실상 startTime~endTime 범위로만 제한
const REP_SCAN_LIMIT = 20; // 대표 1명당 스캔할 최근 매치 수 (8 → 20으로 확대, 범위 내 경기를 더 많이 찾기 위함)
const MAX_SCAN = 30; // 최근 매치 중 최대 이만큼만 훑는다 (API 호출량 제한)
const CHUNK_SIZE = 10; // 참가자 병렬 조회 배치 크기
const CHUNK_DELAY_MS = 300; // 배치 간 딜레이 (레이트리밋 방지)

// load-more.js의 isEventOrPractice()와 동일한 이벤트/연습장 판별 (killmatch는 일반 게임만 원하므로 그대로 제외 대상으로 사용)
const EVENT_MATCH_TYPES = new Set(['event', 'casual', 'airoyale', 'arcade', 'custom', 'training', 'trainingroom']);
const EVENT_MODE_KEYWORDS = ['tdm', 'ibr', 'arcade', 'training', 'clansolo', 'clansquad', 'heistroyale'];
const EVENT_MAP_KEYWORDS = ['range_main', '_tdm_', '_training_', 'pillarcompound', 'boardwalk', 'safehouse'];
const isEventOrPractice = (matchType, mode, mapName) => {
  const mt = (matchType || '').toLowerCase();
  const gm = (mode || '').toLowerCase();
  const mn = (mapName || '').toLowerCase();
  return EVENT_MATCH_TYPES.has(mt) || EVENT_MODE_KEYWORDS.some((k) => gm.includes(k)) || EVENT_MAP_KEYWORDS.some((k) => mn.includes(k));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findPlayer(nickname) {
  for (const shard of ['steam', 'kakao']) {
    try {
      const json = await cachedPubgFetch(
        `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
        { ttl: TTL.PLAYER }
      );
      if (json.data?.length) return { player: json.data[0], shard };
    } catch { /* 다음 shard 시도 */ }
  }
  return null;
}

async function handleBattleType(battleId) {
  const firstPlayer = await prisma.clanBattlePlayer.findFirst({ where: { battleId }, orderBy: { id: 'asc' } });
  if (!firstPlayer) return { error: '참가자가 없습니다. 참가자를 먼저 추가해주세요.', status: 400 };

  const found = await findPlayer(firstPlayer.nickname);
  if (!found) return { error: `PUBG에서 ${firstPlayer.nickname}님을 찾을 수 없습니다.`, status: 404 };

  const { player, shard } = found;
  const matchIds = (player.relationships?.matches?.data || []).slice(0, MAX_SCAN).map((m) => m.id);

  const results = [];
  for (const matchId of matchIds) {
    if (results.length >= MAX_RESULTS) break;
    try {
      const matchJson = await cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, { ttl: TTL.MATCH });
      const attrs = matchJson.data.attributes;
      if (attrs.matchType !== 'custom') continue;

      const included = matchJson.included || [];
      const rosterCount = included.filter((i) => i.type === 'roster').length;

      results.push({ matchId, playedAt: attrs.createdAt, mapName: attrs.mapName, participantCount: rosterCount });
    } catch { /* 조회 실패한 매치는 건너뜀 */ }
  }

  return { matches: results };
}

// 자동 폴링 전용 경량 조회: 스쿼드별 대표 1명씩(+미배정 그룹 대표 1명)의 최근 매치만 훑는다.
// PUBG 매치 목록은 최신순이므로, 대표별로 startTime보다 오래된 매치를 만나면 그 대표는 더 볼 필요 없이 중단 —
// 보통 신규 매치가 없으면 대표 수만큼의 캐시된 player 조회(+캐시된 match 조회 소수)로 끝난다.
async function handleRepresentativeMode(battle) {
  if (!battle.startTime) return { error: '킬내기는 시작 시간이 설정되어 있어야 합니다.', status: 400 };

  const players = await prisma.clanBattlePlayer.findMany({ where: { battleId: battle.id }, orderBy: { id: 'asc' } });
  if (players.length === 0) return { error: '참가자가 없습니다. 참가자를 먼저 추가해주세요.', status: 400 };

  // 스쿼드별(+미배정) 그룹에서 가장 먼저 추가된 참가자 1명씩을 대표로 선정
  const representativeByGroup = new Map(); // groupKey(squadId 또는 'unassigned') -> player
  for (const p of players) {
    const key = p.squadId ?? 'unassigned';
    if (!representativeByGroup.has(key)) representativeByGroup.set(key, p);
  }
  const representatives = Array.from(representativeByGroup.values());

  const startTime = new Date(battle.startTime).getTime();
  const endTime = battle.endTime ? new Date(battle.endTime).getTime() : Date.now();

  console.log(
    `[recent-matches:representative] battleId=${battle.id} startTime=${new Date(startTime).toISOString()} endTime=${new Date(endTime).toISOString()} representatives=${representatives.length}`
  );

  const seenMatchIds = new Set(); // 같은 경기가 여러 대표의 목록에 겹칠 때 중복 제거
  const results = [];

  for (const rep of representatives) {
    if (results.length >= MAX_RESULTS_KILLMATCH) break;

    const found = await findPlayer(rep.nickname);
    if (!found) continue; // 이 대표를 못 찾아도 다른 대표는 계속 조회

    const { player, shard } = found;
    const matchIds = (player.relationships?.matches?.data || []).slice(0, REP_SCAN_LIMIT).map((m) => m.id);

    for (const matchId of matchIds) {
      if (results.length >= MAX_RESULTS_KILLMATCH) break;
      if (seenMatchIds.has(matchId)) continue; // 다른 대표가 이미 처리한 경기는 재조회하지 않음
      seenMatchIds.add(matchId);

      try {
        const matchJson = await cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, { ttl: TTL.MATCH });
        const attrs = matchJson.data.attributes;
        const createdAtMs = new Date(attrs.createdAt).getTime();
        const willBreak = createdAtMs < startTime;
        console.log(
          `[recent-matches:representative]   rep=${rep.nickname} matchId=${matchId} playedAt=${attrs.createdAt} (${createdAtMs}) `
          + `vs startTime=${new Date(startTime).toISOString()} (${startTime}) → `
          + `${willBreak ? 'BREAK(이 매치와 그 이전은 startTime보다 오래됨)' : createdAtMs > endTime ? 'SKIP(endTime 이후)' : 'IN RANGE'}`
        );
        if (willBreak) break; // 이 대표 기준 최신순 목록이므로, 여기부터는 더 오래된 매치만 남음
        if (createdAtMs > endTime) continue;
        if (isEventOrPractice(attrs.matchType, attrs.gameMode, attrs.mapName)) continue;

        const included = matchJson.included || [];
        const rosterCount = included.filter((i) => i.type === 'roster').length;

        const existing = await prisma.playerMatch.findFirst({
          where: { matchId, pubgAccountId: player.id, isBotCorrected: true },
          select: { realKills: true },
        });

        results.push({
          matchId,
          playedAt: attrs.createdAt,
          mapName: attrs.mapName,
          participantCount: rosterCount,
          botAnalysisStatus: existing ? 'completed' : 'pending',
        });
      } catch { /* 조회 실패한 매치는 건너뜀 */ }
    }
  }

  results.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
  return { matches: results };
}

async function handleKillmatchType(battle) {
  if (!battle.startTime) return { error: '킬내기는 시작 시간이 설정되어 있어야 합니다.', status: 400 };

  const players = await prisma.clanBattlePlayer.findMany({ where: { battleId: battle.id } });
  if (players.length === 0) return { error: '참가자가 없습니다. 참가자를 먼저 추가해주세요.', status: 400 };

  // 참가자 PUBG 계정 정보를 10명씩 배치로 병렬 조회 (배치 간 300ms 딜레이)
  const resolved = [];
  for (let i = 0; i < players.length; i += CHUNK_SIZE) {
    const chunk = players.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map((p) => findPlayer(p.nickname)));
    chunk.forEach((p, idx) => {
      if (chunkResults[idx]) resolved.push({ player: p, ...chunkResults[idx] });
    });
    if (i + CHUNK_SIZE < players.length) await sleep(CHUNK_DELAY_MS);
  }
  if (resolved.length === 0) return { error: '참가자의 PUBG 계정을 찾을 수 없습니다.', status: 404 };

  // matchId -> 겹치는 참가자 수 계산
  const overlapMap = new Map(); // matchId -> { count, shard }
  resolved.forEach(({ player, shard }) => {
    const matchIds = (player.relationships?.matches?.data || []).slice(0, MAX_SCAN).map((m) => m.id);
    matchIds.forEach((matchId) => {
      if (!overlapMap.has(matchId)) overlapMap.set(matchId, { count: 0, shard });
      overlapMap.get(matchId).count += 1;
    });
  });

  const candidateIds = Array.from(overlapMap.entries())
    .filter(([, v]) => v.count >= 2) // 최소 2명 이상 겹치는 경기만 후보로
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_RESULTS_KILLMATCH) // 이전엔 20으로 고정돼 있어 MAX_RESULTS를 늘려도 실제로는 소용없었음
    .map(([matchId, v]) => ({ matchId, shard: v.shard, overlapCount: v.count }));

  const startTime = new Date(battle.startTime).getTime();
  const endTime = battle.endTime ? new Date(battle.endTime).getTime() : Date.now();

  const resolvedAccountIds = resolved.map((r) => r.player.id);

  const results = [];
  for (const { matchId, shard, overlapCount } of candidateIds) {
    if (results.length >= MAX_RESULTS_KILLMATCH) break;
    try {
      const matchJson = await cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, { ttl: TTL.MATCH });
      const attrs = matchJson.data.attributes;
      if (isEventOrPractice(attrs.matchType, attrs.gameMode, attrs.mapName)) continue;

      const createdAtMs = new Date(attrs.createdAt).getTime();
      if (createdAtMs < startTime || createdAtMs > endTime) continue;

      const included = matchJson.included || [];
      const rosterCount = included.filter((i) => i.type === 'roster').length;

      // 이 경기에 대해 이미 분석 완료된 PlayerMatch 기록이 있는지 확인
      const existing = await prisma.playerMatch.findFirst({
        where: { matchId, pubgAccountId: { in: resolvedAccountIds }, isBotCorrected: true },
        select: { realKills: true },
      });

      results.push({
        matchId,
        playedAt: attrs.createdAt,
        mapName: attrs.mapName,
        participantCount: rosterCount,
        overlapCount,
        botAnalysisStatus: existing ? 'completed' : 'pending',
      });
    } catch { /* 조회 실패한 매치는 건너뜀 */ }
  }

  results.sort((a, b) => b.overlapCount - a.overlapCount);
  return { matches: results };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

  try {
    const battle = await prisma.clanBattle.findUnique({ where: { id } });
    if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
    if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 불러올 수 있습니다.' });

    const result = req.query.representative === '1'
      ? await handleRepresentativeMode(battle)
      : battle.type === 'killmatch' ? await handleKillmatchType(battle) : await handleBattleType(id);
    if (result.error) return res.status(result.status || 500).json({ error: result.error });

    return res.status(200).json({ matches: result.matches });
  } catch (e) {
    console.error('[clan-battle/recent-matches] GET 오류:', e.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
