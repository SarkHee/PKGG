// PK.GG/pages/api/pubg/[nickname].js

import { promises as fs } from 'fs';
import path from 'path';

// PUBG API 설정
// 중요: .env.local 파일에 PUBG_API_KEY=YOUR_ACTUAL_API_KEY_HERE 형태로 저장해야 합니다.
const PUBG_API_KEY_RAW = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards';
const PUBG_SHARD = 'steam'; // 사용하는 PUBG 서버 샤드 (예: 'steam', 'kakao', 'pc-krjp', etc.)

/**
 * 플레이어의 최근 매치 데이터를 기반으로 플레이스타일을 분석합니다.
 * @param {Array<Object>} matches - 플레이어의 최근 매치 데이터 배열. 각 매치 객체는 damage, distance, survivalTime 등의 속성을 포함해야 함.
 * @returns {string} 분석된 플레이스타일
 */
function analyzePlayStyle(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return '분석 불가';

  const total = matches.length;
  let earlyEngage = 0;
  let longSurvivalLowDmg = 0;
  let longDistance = 0;
  let sniper = 0;
  let midBalance = 0;
  let sustainedCombat = 0;
  let ultraPassive = 0;
  let hyperAggressive = 0;

  matches.forEach(match => {
    const { damage = 0, distance = 0, survivalTime = 0, firstCombatTime = null } = match;

    if (firstCombatTime !== null && typeof firstCombatTime === 'number' && firstCombatTime < 120) earlyEngage++;
    if (survivalTime > 1200 && damage < 150) longSurvivalLowDmg++;
    if (distance > 4000) longDistance++;
    if (damage < 150 && survivalTime > 1000 && distance > 2500) sniper++;
    if (damage >= 150 && damage <= 200 && survivalTime >= 800 && survivalTime <= 1200) midBalance++;
    if (damage > 250 && survivalTime > 800) sustainedCombat++;
    if (damage < 100 && survivalTime > 1200 && distance < 1500) ultraPassive++;
    if (damage > 400 && survivalTime < 600) hyperAggressive++;
  });

  const rate = (value) => value / total;

  if (rate(hyperAggressive) >= 0.4) return '☠️ 극단적 공격형';
  if (rate(earlyEngage) >= 0.4) return '🚀 초반 돌격형';
  if (rate(ultraPassive) >= 0.4) return '🛡️ 극단적 수비형';
  if (rate(longSurvivalLowDmg) >= 0.4) return '🏕️ 후반 존버형';
  if (rate(longDistance) >= 0.4) return '🏃 장거리 정찰러';
  if (rate(sniper) >= 0.4) return '🎯 저격 위주';
  if (rate(midBalance) >= 0.4) return '⚖️ 중거리 안정형';
  if (rate(sustainedCombat) >= 0.4) return '🔥 지속 전투형';
  return '📦 일반 밸런스형';
}

/**
 * 팀 순위와 전체 스쿼드 수를 기반으로 OP 등급을 계산합니다.
 * @param {number} rank - 팀의 최종 순위 (1부터 시작)
 * @param {number} totalSquads - 총 참가 스쿼드 수
 * @returns {string} OP 등급 또는 'N/A'
 */
function gradeOP(rank, totalSquads) {
  if (typeof rank !== 'number' || typeof totalSquads !== 'number' || totalSquads <= 0 || rank <= 0) return 'N/A';
  const ratio = rank / totalSquads;
  if (ratio <= 1 / 16) return 'SSS+';
  if (ratio <= 2 / 16) return 'SS';
  if (ratio <= 3 / 16) return 'S';
  if (ratio <= 4 / 16) return 'A';
  if (ratio <= 6 / 16) return 'B';
  if (ratio <= 8 / 16) return 'C';
  return 'C-';
}

/**
 * 'data/clans.json' 파일에서 플레이어가 속한 클랜 정보를 찾습니다.
 * @param {string} nickname - 플레이어 닉네임 (대소문자 구분 없음)
 * @returns {Promise<{clanName: string, members: string[]}|null>} 클랜 정보 (members는 소문자로 변환됨) 또는 null
 */
async function getClanInfo(nickname) {
  const clanPath = path.join(process.cwd(), 'data', 'clans.json');
  const lowerNickname = nickname.toLowerCase(); // 검색할 닉네임을 소문자로 변환

  console.log(`[CLAN INFO] 클랜 데이터 파일 경로: ${clanPath}`);
  console.log(`[CLAN INFO] 검색 대상 닉네임 (소문자): ${lowerNickname}`);

  try {
    // 파일이 존재하는지 먼저 확인.
    try {
      await fs.access(clanPath);
      console.log(`[CLAN INFO] ${clanPath} 파일 접근 가능.`);
    } catch (e) {
      console.warn(`[CLAN INFO WARN] data/clans.json 파일이 존재하지 않거나 접근할 수 없습니다. (${clanPath}) 클랜 기능이 비활성화됩니다.`, e.message);
      return null;
    }

    const clanRaw = await fs.readFile(clanPath, 'utf-8');
    console.log(`[CLAN INFO] ${clanPath} 파일 읽기 성공.`);
    const clanData = JSON.parse(clanRaw);
    console.log(`[CLAN INFO] 클랜 데이터 파싱 성공. 클랜 수: ${Object.keys(clanData).length}`);

    for (const [clanName, clan] of Object.entries(clanData)) {
      if (Array.isArray(clan.members)) {
        const lowerMembers = clan.members.map(m => typeof m === 'string' ? m.toLowerCase() : '');
        if (lowerMembers.includes(lowerNickname)) {
          console.log(`[CLAN INFO] 플레이어 '${nickname}'이(가) 클랜 '${clanName}'에서 발견되었습니다.`);
          return { clanName, members: lowerMembers }; // 멤버도 소문자로 반환
        }
      } else {
        console.warn(`[CLAN INFO WARN] 클랜 '${clanName}'의 members 속성이 유효한 배열이 아닙니다.`);
      }
    }
    console.log(`[CLAN INFO] 플레이어 '${nickname}'이(가) 어떤 클랜에서도 발견되지 않았습니다.`);
  } catch (e) {
    console.error('[CLAN INFO ERROR] 클랜 정보 불러오기 또는 파싱 실패:', e);
    console.error('[CLAN INFO ERROR] 클랜 정보 에러 상세:', e.message);
    return null;
  }
  return null;
}

/**
 * 클랜 멤버들의 평균 딜량을 기준으로 클랜 티어를 계산합니다.
 * 이 함수는 현재 요청 내에서 수집된 플레이어들의 시즌 평균 딜량을 사용하여 추정합니다.
 * 더 정확한 계산을 위해서는 모든 클랜 멤버의 시즌 통계를 별도로 조회해야 합니다.
 * @param {number} currentPlayerAvgDamage - 현재 플레이어의 시즌 평균 딜량
 * @param {Array<string>} clanMembersLower - 클랜 멤버의 소문자 닉네임 배열
 * @param {Map<string, number>} allPlayersSeasonAvgDamages - 이 API 요청 내에서 조회된 플레이어들의 닉네임(소문자)별 시즌 평균 딜량 맵
 * @param {string} lowerNickname - 현재 조회중인 플레이어의 소문자 닉네임
 * @returns {string|null} 클랜 티어 또는 null
 */
function getClanTier(currentPlayerAvgDamage, clanMembersLower, allPlayersSeasonAvgDamages, lowerNickname) {
  if (!Array.isArray(clanMembersLower) || clanMembersLower.length === 0) {
    console.log("[getClanTier] 클랜 멤버가 없거나 배열이 아님.");
    return null;
  }
  if (typeof currentPlayerAvgDamage !== 'number' || isNaN(currentPlayerAvgDamage)) {
    console.log("[getClanTier] 현재 플레이어의 시즌 평균 딜량이 유효하지 않음.");
    return null;
  }

  const finalRelevantMembers = [];
  clanMembersLower.forEach(memberNicknameLower => {
      const avgDmg = allPlayersSeasonAvgDamages.get(memberNicknameLower);
      if (typeof avgDmg === 'number' && !isNaN(avgDmg)) {
          finalRelevantMembers.push({ name: memberNicknameLower, avgDamage: avgDmg });
      } else {
          console.warn(`[getClanTier] 클랜 멤버 '${memberNicknameLower}'의 시즌 평균 딜량을 AllPlayersSeasonAvgDamages에서 찾을 수 없거나 유효하지 않습니다.`);
      }
  });

  if (finalRelevantMembers.length === 0) {
      console.log("[getClanTier] 클랜 티어 계산을 위한 유효한 멤버 딜량 데이터가 부족합니다.");
      return null;
  }

  const sortedDamages = finalRelevantMembers.sort((a, b) => b.avgDamage - a.avgDamage);
  console.log("[getClanTier] 정렬된 클랜 멤버 딜량:", sortedDamages.map(m => `${m.name}: ${m.avgDamage}`));

  const index = sortedDamages.findIndex(m => m.name === lowerNickname);

  if (index === -1) {
    console.log(`[getClanTier] 현재 플레이어(${lowerNickname})가 정렬된 클랜 멤버 목록에서 발견되지 않음. (이는 데이터 누락을 의미할 수 있습니다)`);
    return null;
  }

  const percentile = (index + 1) / sortedDamages.length;
  console.log(`[getClanTier] 현재 플레이어 순위: ${index + 1}/${sortedDamages.length}, 백분위: ${percentile.toFixed(2)}`);

  if (percentile <= 0.05) return '챌린저';
  if (percentile <= 0.20) return '다이아';
  if (percentile <= 0.50) return '플래티넘';
  if (percentile <= 0.80) return '실버';
  return '브론즈';
}


/**
 * Next.js API 라우트 핸들러입니다.
 * @param {import('next').NextApiRequest} req - API 요청 객체
 * @param {import('next').NextApiResponse} res - API 응답 객체
 */
export default async function handler(req, res) {
  const { nickname: rawNickname } = req.query;
  const nickname = rawNickname ? rawNickname.trim() : '';
  const lowerNickname = nickname.toLowerCase();
  const shard = PUBG_SHARD;

  console.log(`\n--- API Request for ${nickname} ---`);
  console.log(`[API START] 요청 수신: 닉네임='${nickname}', 샤드='${shard}'`);
  console.log(`환경 변수 PUBG_API_KEY_RAW 존재 여부: ${!!PUBG_API_KEY_RAW ? 'true' : 'false'}`);

  if (!PUBG_API_KEY_RAW) {
    console.error('[API ERROR] PUBG_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
    return res.status(500).json({ error: '서버 설정 오류: PUBG API 키가 없습니다.' });
  }
  if (!nickname) {
    console.error('[API ERROR] 닉네임이 제공되지 않았습니다.');
    return res.status(400).json({ error: '닉네임이 필요합니다.' });
  }

  try {
    // 1. 클랜 정보 조회
    const clanInfo = await getClanInfo(nickname);
    const clanMembersLower = clanInfo?.members || [];
    console.log(`[API INFO] getClanInfo 결과: 클랜이름='${clanInfo?.clanName || '없음'}', 멤버 수=${clanMembersLower.length}`);

    // 2. 플레이어 닉네임으로 PUBG ID 조회
    const playerLookupUrl = `${PUBG_BASE_URL}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`;
    console.log(`[API FETCH] 플레이어 조회 URL: ${playerLookupUrl}`);

    const playerRes = await fetch(playerLookupUrl, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
        Accept: 'application/vnd.api+json'
      }
    });

    if (!playerRes.ok) {
      const errorText = await playerRes.text();
      console.error(`[API ERROR] PUBG API 플레이어 조회 실패 (${playerRes.status}): ${errorText}`);
      if (playerRes.status === 404) {
        return res.status(404).json({ error: `플레이어 '${nickname}'을(를) 찾을 수 없습니다. 닉네임을 다시 확인해주세요.` });
      }
      return res.status(playerRes.status).json({ error: `PUBG API 조회 실패: ${playerRes.statusText}`, details: errorText });
    }

    const playerData = await playerRes.json();
    const player = playerData.data?.[0];

    if (!player) {
      console.warn(`[API WARN] 플레이어 '${nickname}'에 대한 데이터가 PUBG API에서 반환되지 않았습니다.`);
      return res.status(404).json({ error: '플레이어 데이터 없음' });
    }

    const accountId = player.id;
    console.log(`[API INFO] 플레이어 ID 조회 완료: ${accountId}`);

    let seasonAvgDamage = 0;
    let averageScore = 0;
    let modeStats = {};
    const allPlayersSeasonAvgDamages = new Map();

    // 3. 현재 시즌 정보 조회 및 플레이어 시즌 통계 조회
    const seasonLookupUrl = `${PUBG_BASE_URL}/${shard}/seasons`;
    const seasonRes = await fetch(seasonLookupUrl, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
        Accept: 'application/vnd.api+json'
      }
    });

    if (seasonRes.ok) {
      const seasonData = await seasonRes.json();
      const currentSeason = seasonData.data.find(s => s.attributes.isCurrentSeason);

      if (currentSeason) {
        const playerSeasonStatsUrl = `${PUBG_BASE_URL}/${shard}/players/${accountId}/seasons/${currentSeason.id}`;
        const statsRes = await fetch(playerSeasonStatsUrl, {
          headers: {
            Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
            Accept: 'application/vnd.api+json'
          }
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const allStats = statsData.data.attributes.gameModeStats;

          ['solo', 'duo', 'squad', 'solo-fpp', 'duo-fpp', 'squad-fpp'].forEach(mode => {
            const s = allStats[mode];
            if (s && s.roundsPlayed > 0) {
              modeStats[mode] = {
                rounds: s.roundsPlayed,
                wins: s.wins,
                top10s: s.top10s,
                kd: parseFloat((s.kills / (s.losses > 0 ? s.losses : 1)).toFixed(2)),
                avgDamage: parseFloat((s.damageDealt / s.roundsPlayed).toFixed(2)),
                winRate: parseFloat(((s.wins / s.roundsPlayed) * 100).toFixed(2)),
                top10Rate: parseFloat(((s.top10s / s.roundsPlayed) * 100).toFixed(2)),
                longestKill: parseFloat(s.longestKill.toFixed(2)),
                headshots: s.headshotKills
              };
            }
          });

          const relevantSquadStats = allStats.squad || allStats['squad-fpp'];
          if (relevantSquadStats && relevantSquadStats.roundsPlayed > 0) {
            const totalDamageDealt = relevantSquadStats.damageDealt || 0;
            const totalRoundsPlayed = relevantSquadStats.roundsPlayed || 1;
            seasonAvgDamage = parseFloat((totalDamageDealt / totalRoundsPlayed).toFixed(1));
            
            const kills = relevantSquadStats.kills || 0;
            const damage = relevantSquadStats.damageDealt || 0;
            const survival = relevantSquadStats.timeSurvived || 0;
            averageScore = Math.round(((kills * 30) + (damage * 0.7) + (survival * 0.1)) / totalRoundsPlayed);
          } else {
            seasonAvgDamage = 0;
            averageScore = 0;
          }
          console.log(`[API INFO] 시즌 평균 딜량 (스쿼드): ${seasonAvgDamage}, 평균 점수: ${averageScore}`);

          // 현재 플레이어의 시즌 평균 딜량 기록 (소문자 닉네임으로)
          allPlayersSeasonAvgDamages.set(lowerNickname, seasonAvgDamage);

        } else {
            console.warn(`[API WARN] 시즌 통계 조회 실패 (${statsRes.status}): ${await statsRes.text()}`);
            seasonAvgDamage = 0;
        }
      } else {
        console.warn(`[API WARN] 현재 시즌 정보를 찾을 수 없습니다.`);
        seasonAvgDamage = 0;
      }
    } else {
        console.warn(`[API WARN] 시즌 정보 조회 실패 (${seasonRes.status}): ${await seasonRes.text()}`);
        seasonAvgDamage = 0;
    }

    // 4. 최근 매치 정보 조회 (최대 20경기)
    const matchRefs = player.relationships?.matches?.data?.slice(0, 20) || [];
    const matches = [];
    let totalRecentDamageSum = 0;
    let totalDistance = 0;
    let processedMatchCount = 0;

    let totalClanDamage = 0;
    let clanMatchCount = 0;
    let aboveAvgWithClan = 0;

    const clanSynergyMap = {}; // 닉네임(원본) -> 함께 플레이한 횟수
    const clanSynergyStatusList = []; // 각 클랜전의 시너지 상태 (좋음/나쁨)

    const squadCombos = {}; // 추천 스쿼드 조합

    console.log(`[API INFO] 최근 매치 ${matchRefs.length}개 조회 시작.`);

    for (const matchRef of matchRefs) {
      const matchId = matchRef.id;
      const matchUrl = `${PUBG_BASE_URL}/${shard}/matches/${matchId}`;
      console.log(`[API FETCH] 매치 ${matchId} 데이터 불러오기: ${matchUrl}`);

      const matchRes = await fetch(matchUrl, {
        headers: {
          Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
          Accept: 'application/vnd.api+json'
        }
      });

      if (!matchRes.ok) {
        console.warn(`[API WARN] 매치 ${matchId} 데이터 불러오기 실패 (${matchRes.status}): ${await matchRes.text()}`);
        continue;
      }

      const matchData = await matchRes.json();
      const included = matchData.included;

      const rostersMap = new Map();
      const participantsMap = new Map();

      included.forEach(item => {
        if (item.type === 'roster') {
          rostersMap.set(item.id, item);
        } else if (item.type === 'participant') {
          participantsMap.set(item.id, item);
          // 매치 내 모든 플레이어의 닉네임과 (임시)매치 딜량을 기록
          const participantName = item.attributes.stats.name;
          const participantNameLower = participantName.toLowerCase();
          const participantDamage = item.attributes.stats.damageDealt || 0;
          if (!allPlayersSeasonAvgDamages.has(participantNameLower)) {
              allPlayersSeasonAvgDamages.set(participantNameLower, parseFloat(participantDamage.toFixed(1)));
          }
        }
      });

      const myParticipant = Array.from(participantsMap.values()).find(
        p => p.attributes.stats.name.toLowerCase() === lowerNickname
      );

      if (!myParticipant) {
        console.warn(`[API WARN] 매치 ${matchId}에서 플레이어 '${nickname}'의 participant 데이터 찾을 수 없음. 해당 매치 스킵.`);
        continue;
      }

      const myStats = myParticipant.attributes.stats;
      const myRosterId = myParticipant.relationships?.roster?.data?.id;
      
      let myRank = 'N/A';
      let myTeamId = null;

      const teammatesDetail = [];
      if (myRosterId && rostersMap.has(myRosterId)) {
        const myRoster = rostersMap.get(myRosterId);
        myRank = myRoster.attributes.stats.rank;
        myTeamId = myRoster.attributes.stats.teamId || myRoster.id;

        myRoster.relationships.participants.data.forEach(participantRef => {
          const p = participantsMap.get(participantRef.id);
          if (p) {
            const pStats = p.attributes.stats;
            teammatesDetail.push({
              name: pStats.name,
              damage: pStats.damageDealt || 0,
              kills: pStats.kills || 0,
              assists: pStats.assists || 0,
              dbnos: pStats.DBNOs || 0,
              survivalTime: pStats.timeSurvived || 0,
              rank: myRank,
              teamId: myTeamId,
              opGrade: gradeOP(myRank, rostersMap.size)
            });
          }
        });
      } else {
        console.warn(`[API WARN] 매치 ${matchId}: 내 로스터 정보 (${myRosterId})를 찾을 수 없거나 유효하지 않아 팀원 정보 제한.`);
      }
      
      const { damageDealt, walkDistance, rideDistance } = myStats;
      const distance = (walkDistance || 0) + (rideDistance || 0);

      const totalSquads = rostersMap.size;

      // 팀 전체 MMR 계산 (임시 스코어 기반)
      const teamTotalScore = teammatesDetail.reduce((sum, p) => {
        const score = (p.kills * 30) + (p.damage * 0.7) + (p.survivalTime * 0.1);
        return sum + score;
      }, 0);
      const avgMmr = Math.round(teamTotalScore / (teammatesDetail.length || 1));

      const isWin = myRank === 1; 
      const isTop10 = myRank > 0 && myRank <= 10;

      // 추천 스쿼드 조합을 위한 데이터 수집
      const teamNames = teammatesDetail.map(t => t.name).sort();
      const teamKey = teamNames.join(',');
      if (teamNames.length > 1) {
          if (!squadCombos[teamKey]) {
            squadCombos[teamKey] = { totalAvgMmr: 0, count: 0, lastPlayed: 0 };
          }
          squadCombos[teamKey].totalAvgMmr += avgMmr;
          squadCombos[teamKey].count++;
          squadCombos[teamKey].lastPlayed = Math.max(squadCombos[teamKey].lastPlayed, new Date(matchData.data.attributes.createdAt).getTime());
      }

      // 최근 20경기 요약 리스트에 추가
      matches.push({
        matchId,
        matchTimestamp: matchData.data.attributes.createdAt, // API 응답에 있는 정확한 시간
        mapName: matchData.data.attributes.mapName, // API 응답에 있는 맵 이름
        gameMode: matchData.data.attributes.gameMode, // API 응답에 있는 게임 모드
        totalSquads,
        rank: myRank,
        kills: myStats.kills || 0,
        damage: myStats.damageDealt || 0,
        distance,
        survivalTime: myStats.timeSurvived || 0,
        avgMmr,
        opGrade: gradeOP(myRank, totalSquads),
        win: isWin,
        top10: isTop10,
        teammates: teammatesDetail.filter(t => t.name.toLowerCase() !== lowerNickname).map(t => t.name),
        teammatesDetail,
        totalTeamDamage: teammatesDetail.reduce((sum, t) => sum + t.damage, 0)
      });

      totalRecentDamageSum += (myStats.damageDealt || 0);
      totalDistance += distance;
      processedMatchCount++;

      // 클랜원과의 시너지 분석
      const teammatesInMatchLower = teammatesDetail
        .filter(t => t.name.toLowerCase() !== lowerNickname)
        .map(t => t.name.toLowerCase());
      
      const teammatesWhoAreClanMembers = teammatesInMatchLower.filter(tLowerName => 
        clanMembersLower.includes(tLowerName)
      );
      
      console.log(`[API INFO] 매치 ${matchId}: 현재 플레이어와 함께 플레이한 클랜원:`, teammatesWhoAreClanMembers.length > 0 ? teammatesWhoAreClanMembers.join(', ') : '없음');
      
      if (teammatesWhoAreClanMembers.length > 0) {
        totalClanDamage += (myStats.damageDealt || 0);
        clanMatchCount++;
        if (avgMmr > 1600) aboveAvgWithClan++;
        clanSynergyStatusList.push(avgMmr >= 1600 ? '좋음' : '나쁨');
        teammatesWhoAreClanMembers.forEach(tLowerName => {
          const originalName = teammatesDetail.find(t => t.name.toLowerCase() === tLowerName)?.name || tLowerName; 
          clanSynergyMap[originalName] = (clanSynergyMap[originalName] || 0) + 1;
        });
      }
    }

    // 최근 경기 평균 값 계산
    const avgRecentDamage = processedMatchCount > 0 ? parseFloat((totalRecentDamageSum / processedMatchCount).toFixed(1)) : 0;
    const averageDistance = processedMatchCount > 0 ? Math.round(totalDistance / processedMatchCount) : 0;

    // 플레이스타일 및 이동 성향 힌트
    const playstyle = averageScore >= 200 ? '🔥 캐리형' : averageScore >= 130 ? '👀 안정형' : '⚡ 교전 기피형';
    const realPlayStyle = analyzePlayStyle(matches);
    const distanceStyleHint = averageDistance > 3000 ? '🏃‍♂️ 적극 정찰형' : averageDistance < 1500 ? '📍 진입형/수비형' : '평균 이동형';

    // 클랜 관련 통계
    const clanAverage = clanMatchCount > 0 ? Math.round(totalClanDamage / clanMatchCount) : 0;
    const synergyTop = Object.entries(clanSynergyMap)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([name]) => ({ name }));

    // 추천 스쿼드 조합
    const bestSquadArray = Object.entries(squadCombos).map(([key, value]) => ({
      names: key.split(','),
      avgMmr: Math.round(value.totalAvgMmr / value.count),
      count: value.count,
      lastPlayed: value.lastPlayed
    })).sort((a, b) => {
      if (b.avgMmr !== a.avgMmr) return b.avgMmr - a.avgMmr;
      return b.lastPlayed - a.lastPlayed;
    });
    const bestSquad = bestSquadArray.length > 0 ? bestSquadArray[0] : null;

    // 클랜 티어 계산
    let clanTier = null;
    if (clanInfo && clanMembersLower.length > 0) {
      console.log(`[API INFO] 클랜 티어 계산 시작. 클랜 멤버 수: ${clanMembersLower.length}, allPlayersSeasonAvgDamages 맵 크기: ${allPlayersSeasonAvgDamages.size}`);
      clanTier = getClanTier(seasonAvgDamage, clanMembersLower, allPlayersSeasonAvgDamages, lowerNickname); // lowerNickname 인자 추가
      console.log(`[API INFO] 계산된 클랜 티어: ${clanTier}`);
    } else {
        console.log(`[API INFO] 클랜 정보가 없거나 클랜 멤버가 없어서 클랜 티어를 계산하지 않습니다.`);
    }

    res.status(200).json({
      nickname,
      server: shard,
      averageScore,
      avgDamage: avgRecentDamage,
      averageDistance,
      playstyle,
      realPlayStyle,
      distanceStyleHint,
      clan: clanInfo?.clanName || null,
      clanAverage,
      aboveAvgWithClan,
      synergyTop,
      synergyStatusList,
      bestSquad,
      seasonAvgDamage,
      modeStats,
      matches,
      clanTier,
      formComment: (() => { // 즉시 실행 함수로 formComment 계산
        if (avgRecentDamage === 0 && seasonAvgDamage === 0) return '딜량 폼 분석 정보를 찾을 수 없습니다.';
        const diff = avgRecentDamage - seasonAvgDamage;
        if (diff >= 50) return '📈 최근 폼이 크게 상승했습니다!';
        else if (diff >= 20) return '🔼 최근 경기력이 좋아지고 있어요.';
        else if (diff <= -50) return '📉 최근 폼이 급감했습니다. 컨디션을 점검해보세요!';
        else if (diff <= -20) return '🔽 최근 경기력이 다소 저하됐습니다.';
        return '⚖️ 시즌 평균과 비슷한 경기력을 유지 중입니다.';
      })(),
      clanMatchPercentage: processedMatchCount > 0 ? parseFloat((clanMatchCount / processedMatchCount * 100).toFixed(0)) : 0,
      lastUpdated: new Date().toISOString()
    });

  } catch (err) {
    console.error('[API FATAL ERROR] API 처리 중 치명적인 오류 발생:', err);
    console.error('[API FATAL ERROR] 오류 객체 상세:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: err.message || '알 수 없는 오류' });
  }
}