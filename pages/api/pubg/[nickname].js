// PKGG/pages/api/pubg/[nickname].js

import { promises as fs } from 'fs';
import path from 'path';
import { calculateMMR } from '../../../utils/mmrCalculator';
import prisma from '../../../utils/prisma.js';

// PUBG API 설정
// 중요: .env.local 파일에 PUBG_API_KEY=YOUR_ACTUAL_API_KEY_HERE 형태로 저장해야 합니다.
const PUBG_API_KEY_RAW = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards';
const PUBG_SHARD = 'steam'; // 사용하는 PUBG 서버 샤드 (예: 'steam', 'kakao', 'pc-krjp', etc.)

/**
 * 텔레메트리 데이터를 분석하여 상세 킬로그, 무기별 딜량, 이동경로를 추출합니다.
 * @param {Array}  telemetryData - PUBG 텔레메트리 데이터 배열
 * @param {string} playerName   - 분석할 플레이어 이름 (소문자)
 * @param {string} matchId      - 매치 ID (로깅용)
 * @param {string} mapName      - PUBG API 맵 코드 (예: Baltic_Main)
 * @returns {Object} { killLog, weaponStats, movePath, movePathCoords }
 */
function analyzeTelemetryData(telemetryData, playerName, matchId, mapName) {
  const killLog = [];
  const weaponStats = {};
  const positions = [];

  if (!Array.isArray(telemetryData)) {
    console.warn(`[TELEMETRY] 매치 ${matchId}: 잘못된 텔레메트리 데이터 형식`);
    return { killLog, weaponStats, movePath: '', movePathCoords: [] };
  }

  console.log(
    `[TELEMETRY] 매치 ${matchId}: 텔레메트리 이벤트 ${telemetryData.length}개 분석 시작`
  );

  telemetryData.forEach((event, index) => {
    try {
      // LogPlayerKill (구버전) + LogPlayerKillV2 (신버전) 모두 처리
      if (event._T === 'LogPlayerKill' || event._T === 'LogPlayerKillV2') {
        const killerName = (
          event.killer?.name ||       // LogPlayerKill
          event.finisher?.name ||     // LogPlayerKillV2
          ''
        ).toLowerCase();
        if (killerName === playerName) {
          // 무기명: 최상위 damageCauserName → finishDamageInfo → damageTypeCategory
          const weapon =
            event.damageCauserName ||
            event.finishDamageInfo?.damageCauserName ||
            event.damageTypeCategory ||
            '알 수 없음';
          const distance = event.distance ? Math.round(event.distance / 100) : 0; // cm → m
          const isHeadshot =
            event.damageReason === 'Head' ||
            event.finishDamageInfo?.damageReason === 'Head';
          const victimName = event.victim?.name || 'Unknown';
          killLog.push(
            `${victimName}을(를) ${weapon}${isHeadshot ? ' (헤드샷)' : ''}으로 ${distance}m에서 제거`
          );
        }
      } else if (event._T === 'LogPlayerTakeDamage') {
        const attacker = event.attacker?.name?.toLowerCase();
        if (attacker === playerName) {
          // 무기명: 최상위 damageCauserName 사용 (중첩 객체 아님)
          const weapon = event.damageCauserName || event.damageTypeCategory || '알 수 없음';
          const damage = event.damage || 0;
          if (damage > 0 && weapon !== '알 수 없음') {
            weaponStats[weapon] = (weaponStats[weapon] || 0) + damage;
          }
        }
      } else if (event._T === 'LogPlayerPosition') {
        const character = event.character;
        if (character?.name?.toLowerCase() === playerName) {
          const loc = character.location;
          if (loc && (loc.x !== undefined) && (loc.y !== undefined)) {
            positions.push({ x: loc.x, y: loc.y });
          }
        }
      }
    } catch (eventError) {
      console.warn(`[TELEMETRY] 매치 ${matchId}: 이벤트 ${index} 처리 실패 - ${eventError.message}`);
    }
  });

  // 맵별 최대 좌표 (PUBG 단위: cm, 100 = 1m)
  const MAP_MAX = {
    Baltic_Main: 820000, Desert_Main: 820000, Tiger_Main: 820000,
    Kiki_Main: 820000,   Neon_Main: 820000,
    Savage_Main: 408000,
    DihorOtok_Main: 612000,
  };
  const maxCoord = MAP_MAX[mapName] || 820000;

  let movePath = '';
  let movePathCoords = [];

  if (positions.length > 5) {
    // 5개 주요 지점 추출
    const keyIdxs = [0, 0.25, 0.5, 0.75, 1].map((r) =>
      Math.min(Math.floor(r * (positions.length - 1)), positions.length - 1)
    );
    const keyPositions = keyIdxs.map((i) => positions[i]);
    const zoneNames = keyPositions.map((p) => getLocationName(p.x, p.y, mapName));
    const uniqueZones = zoneNames.filter((n, i, arr) => n && arr.indexOf(n) === i);
    movePath = uniqueZones.join(' → ');

    // 시각화용 샘플 좌표 (최대 30개, 0~1 정규화)
    const step = Math.max(1, Math.floor(positions.length / 30));
    movePathCoords = positions
      .filter((_, i) => i % step === 0)
      .map((p) => ({
        x: Math.max(0, Math.min(1, p.x / maxCoord)),
        y: Math.max(0, Math.min(1, p.y / maxCoord)),
      }));
  }

  console.log(
    `[TELEMETRY] 매치 ${matchId}: 분석 완료 - 킬 ${killLog.length}개, 무기 ${Object.keys(weaponStats).length}개, 위치 ${positions.length}개`
  );

  return { killLog, weaponStats, movePath: movePath || '', movePathCoords };
}

// 맵별 한국어 지역명 (PUBG 좌표 기준)
const MAP_ZONES = {
  Baltic_Main: [ // 에란겔 8km
    { name: '포치킨키', x1: 370000, x2: 460000, y1: 370000, y2: 460000 },
    { name: '조르고폴',  x1: 90000,  x2: 200000, y1: 200000, y2: 300000 },
    { name: '학교',      x1: 420000, x2: 490000, y1: 200000, y2: 280000 },
    { name: '밀타',      x1: 560000, x2: 660000, y1: 360000, y2: 460000 },
    { name: '노보',      x1: 540000, x2: 660000, y1: 640000, y2: 760000 },
    { name: '군기지',    x1: 600000, x2: 710000, y1: 110000, y2: 230000 },
    { name: '가트카',    x1: 300000, x2: 390000, y1: 480000, y2: 570000 },
    { name: '야스나야',  x1: 560000, x2: 670000, y1: 230000, y2: 340000 },
    { name: '프리모르',  x1: 200000, x2: 310000, y1: 620000, y2: 730000 },
    { name: '로좌크',    x1: 430000, x2: 510000, y1: 460000, y2: 540000 },
  ],
  Savage_Main: [ // 사녹 4km
    { name: '부트캠프',       x1: 145000, x2: 225000, y1: 115000, y2: 195000 },
    { name: '루인스',         x1: 225000, x2: 295000, y1: 45000,  y2: 120000 },
    { name: '파라다이스',     x1: 50000,  x2: 120000, y1: 50000,  y2: 130000 },
    { name: '도크',           x1: 290000, x2: 370000, y1: 270000, y2: 350000 },
    { name: '케이브',         x1: 185000, x2: 255000, y1: 195000, y2: 275000 },
    { name: '하틴',           x1: 265000, x2: 345000, y1: 150000, y2: 220000 },
    { name: '팜 타운',        x1: 150000, x2: 225000, y1: 265000, y2: 340000 },
    { name: '페리야 비라',    x1: 60000,  x2: 145000, y1: 245000, y2: 330000 },
    { name: '캠프 알파',      x1: 90000,  x2: 160000, y1: 145000, y2: 215000 },
  ],
  Desert_Main: [ // 미라마 8km
    { name: '페카도',         x1: 340000, x2: 440000, y1: 340000, y2: 440000 },
    { name: '산 마르틴',      x1: 360000, x2: 450000, y1: 200000, y2: 290000 },
    { name: '로스 레오네스',  x1: 480000, x2: 620000, y1: 500000, y2: 650000 },
    { name: '엘 포조',        x1: 160000, x2: 260000, y1: 280000, y2: 380000 },
    { name: '아시엔다',       x1: 360000, x2: 440000, y1: 460000, y2: 540000 },
    { name: '라 코브레리아',  x1: 490000, x2: 580000, y1: 200000, y2: 290000 },
  ],
  Tiger_Main: [ // 태이고 8km
    { name: '태이고 시티',   x1: 340000, x2: 480000, y1: 280000, y2: 420000 },
    { name: '쌍용',          x1: 530000, x2: 630000, y1: 190000, y2: 290000 },
    { name: '북도 마을',     x1: 200000, x2: 310000, y1: 200000, y2: 310000 },
    { name: '도하 마을',     x1: 390000, x2: 490000, y1: 490000, y2: 590000 },
  ],
  DihorOtok_Main: [ // 비켄디 6km
    { name: '카슈미르',      x1: 270000, x2: 370000, y1: 200000, y2: 300000 },
    { name: '디노 파크',     x1: 370000, x2: 460000, y1: 90000,  y2: 180000 },
    { name: '발로로보',      x1: 100000, x2: 200000, y1: 200000, y2: 300000 },
  ],
}

function getLocationName(x, y, mapName) {
  const zones = MAP_ZONES[mapName]
  if (zones) {
    const found = zones.find((z) => x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2)
    if (found) return found.name
  }
  // fallback: 맵 크기별 사분면 (한국어)
  const half = mapName === 'Savage_Main' ? 204000 : 410000
  if (x > half && y < half) return '북동쪽'
  if (x > half && y > half) return '남동쪽'
  if (x < half && y < half) return '북서쪽'
  if (x < half && y > half) return '남서쪽'
  return '중앙'
}

/**
 * 플레이어의 최근 매치 데이터를 기반으로 플레이스타일을 분석합니다.
 * @param {Array<Object>} matches - 플레이어의 최근 매치 데이터 배열. 각 매치 객체는 damage, distance, survivalTime, kills, headshots, assists, rank 등의 속성을 포함해야 함.
 * @returns {string} 분석된 플레이스타일
 */
function analyzePlayStyle(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return '분석 불가';

  const total = matches.length;

  // 기존 8개 유형 (조건 정교화)
  let hyperAggressive = 0; // ☠️ 극단적 공격형
  let earlyRusher = 0; // 🚀 초반 돌격형
  let ultraPassive = 0; // 🛡️ 극단적 수비형
  let lateSurvivor = 0; // 🏕️ 후반 존버형
  let longDistanceScout = 0; // 🏃 장거리 정찰러
  let sniper = 0; // 🎯 저격 위주
  let midRangeBalanced = 0; // ⚖️ 중거리 안정형
  let sustainedCombat = 0; // 🔥 지속 전투형

  // 신규 6개 유형
  let stealthSurvivor = 0; // 👻 유령 생존자
  let highRiskParachuter = 0; // 🪂 도박형 파밍러
  let burstRusher = 0; // 📸 순간광폭형
  let deadlySniper = 0; // 🦉 치명적 저격수
  let tacticalAssist = 0; // 🧠 전략적 어시스트러
  let efficientFinisher = 0; // 📊 고효율 승부사

  matches.forEach((match) => {
    const {
      damage = 0,
      distance = 0,
      survivalTime = 0,
      kills = 0,
      headshots = 0,
      assists = 0,
      rank = 100,
    } = match;

    // 기존 8개 유형 (조건 정교화)
    if (damage >= 400 && survivalTime <= 600 && kills >= 3) hyperAggressive++;
    if (survivalTime <= 120 && (kills >= 1 || damage >= 150)) earlyRusher++;
    if (damage <= 100 && survivalTime >= 1200 && distance <= 1500)
      ultraPassive++;
    if (damage <= 150 && survivalTime >= 1200 && kills <= 1) lateSurvivor++;
    if (distance >= 4000 && kills <= 1 && damage <= 150) longDistanceScout++;
    if (
      damage <= 150 &&
      survivalTime >= 1000 &&
      distance >= 2500 &&
      headshots >= 1
    )
      sniper++;
    if (
      damage > 150 &&
      damage <= 250 &&
      survivalTime > 800 &&
      survivalTime <= 1200 &&
      distance > 2000 &&
      distance <= 3500
    )
      midRangeBalanced++;
    if (damage >= 250 && survivalTime >= 800 && kills >= 2) sustainedCombat++;

    // 신규 6개 유형
    if (kills === 0 && assists === 0 && survivalTime >= 1000 && rank <= 10)
      stealthSurvivor++;
    if (survivalTime <= 120 && damage === 0 && kills === 0)
      highRiskParachuter++;
    if (damage >= 300 && survivalTime <= 400 && kills >= 2) burstRusher++;
    if (damage >= 200 && headshots >= 2 && kills >= 2 && distance >= 2000)
      deadlySniper++;
    if (assists >= 3 && kills <= 1 && damage >= 200 && survivalTime >= 800)
      tacticalAssist++;
    if (kills >= 3 && damage <= 200) efficientFinisher++;
  });

  const rate = (value) => value / total;

  // 우선순위별 판정 (더 특수한 스타일부터)
  if (rate(deadlySniper) >= 0.3) return '🦉 치명적 저격수';
  if (rate(efficientFinisher) >= 0.3) return '📊 고효율 승부사';
  if (rate(tacticalAssist) >= 0.3) return '🧠 전략적 어시스트러';
  if (rate(burstRusher) >= 0.3) return '� 순간광폭형';
  if (rate(hyperAggressive) >= 0.3) return '☠️ 극단적 공격형';
  if (rate(stealthSurvivor) >= 0.3) return '👻 유령 생존자';
  if (rate(highRiskParachuter) >= 0.4) return '🪂 도박형 파밍러';
  if (rate(earlyRusher) >= 0.4) return '🚀 초반 돌격형';
  if (rate(sustainedCombat) >= 0.3) return '🔥 지속 전투형';
  if (rate(sniper) >= 0.3) return '🎯 저격 위주';
  if (rate(ultraPassive) >= 0.4) return '🛡️ 극단적 수비형';
  if (rate(lateSurvivor) >= 0.4) return '🏕️ 후반 존버형';
  if (rate(longDistanceScout) >= 0.4) return '🏃 장거리 정찰러';
  if (rate(midRangeBalanced) >= 0.4) return '⚖️ 중거리 안정형';

  // 최종 안전망 - 딜량 기준으로 분류 (모든 경우 커버)
  const avgDamage =
    matches.reduce((sum, m) => sum + (m.damage || 0), 0) / total;
  const avgSurvivalTime =
    matches.reduce((sum, m) => sum + (m.survivalTime || 0), 0) / total;

  if (avgDamage >= 200) return '🔥 공격형';
  if (avgSurvivalTime >= 600) return '🛡️ 생존형';
  return '🏃 이동형';
}

/**
 * 팀 순위와 전체 스쿼드 수를 기반으로 OP 등급을 계산합니다.
 * @param {number} rank - 팀의 최종 순위 (1부터 시작)
 * @param {number} totalSquads - 총 참가 스쿼드 수
 * @returns {string} OP 등급 또는 'N/A'
 */
function gradeOP(rank, totalSquads) {
  if (
    typeof rank !== 'number' ||
    typeof totalSquads !== 'number' ||
    totalSquads <= 0 ||
    rank <= 0
  )
    return 'N/A';
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
 * 데이터베이스에서 클랜 정보를 가져옵니다.
 * @param {string} nickname - 플레이어 닉네임
 * @returns {Promise<{clanName: string, members: string[]}|null>} 클랜 정보 또는 null
 */
async function getClanInfoFromDB(nickname) {
  try {
    const clanMember = await prisma.clanMember.findFirst({
      where: {
        nickname: {
          equals: nickname,
          mode: 'insensitive',
        },
      },
      include: {
        clan: {
          include: {
            members: true,
          },
        },
      },
    });

    if (clanMember && clanMember.clan) {
      const members = clanMember.clan.members.map((m) =>
        m.nickname.toLowerCase()
      );
      console.log(
        `[DB CLAN INFO] 플레이어 '${nickname}'이(가) 클랜 '${clanMember.clan.name}'에서 발견되었습니다.`
      );
      return {
        clanName: clanMember.clan.name,
        members: members,
      };
    }

    console.log(
      `[DB CLAN INFO] 플레이어 '${nickname}'이(가) 데이터베이스에서 클랜을 찾을 수 없습니다.`
    );
    return null;
  } catch (error) {
    console.error(
      '[DB CLAN INFO ERROR] 데이터베이스에서 클랜 정보 조회 실패:',
      error
    );
    return null;
  }
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
      console.warn(
        `[CLAN INFO WARN] data/clans.json 파일이 존재하지 않거나 접근할 수 없습니다. (${clanPath}) 클랜 기능이 비활성화됩니다.`,
        e.message
      );
      return null;
    }

    const clanRaw = await fs.readFile(clanPath, 'utf-8');
    console.log(`[CLAN INFO] ${clanPath} 파일 읽기 성공.`);
    const clanData = JSON.parse(clanRaw);
    console.log(
      `[CLAN INFO] 클랜 데이터 파싱 성공. 클랜 수: ${
        Object.keys(clanData).length
      }`
    );

    for (const [clanName, clan] of Object.entries(clanData)) {
      if (Array.isArray(clan.members)) {
        const lowerMembers = clan.members.map((m) =>
          typeof m === 'string' ? m.toLowerCase() : ''
        );
        if (lowerMembers.includes(lowerNickname)) {
          console.log(
            `[CLAN INFO] 플레이어 '${nickname}'이(가) 클랜 '${clanName}'에서 발견되었습니다.`
          );
          return { clanName, members: lowerMembers }; // 멤버도 소문자로 반환
        }
      } else {
        console.warn(
          `[CLAN INFO WARN] 클랜 '${clanName}'의 members 속성이 유효한 배열이 아닙니다.`
        );
      }
    }
    console.log(
      `[CLAN INFO] 플레이어 '${nickname}'이(가) 어떤 클랜에서도 발견되지 않았습니다.`
    );

    // JSON 파일에서 찾지 못했을 때 데이터베이스에서 시도
    console.log(
      `[CLAN INFO] clans.json에서 찾지 못해 데이터베이스에서 검색 시도...`
    );
    return await getClanInfoFromDB(nickname);
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
function getClanTier(
  currentPlayerAvgDamage,
  clanMembersLower,
  allPlayersSeasonAvgDamages,
  lowerNickname
) {
  if (!Array.isArray(clanMembersLower) || clanMembersLower.length === 0) {
    console.log('[getClanTier] 클랜 멤버가 없거나 배열이 아님.');
    return null;
  }
  if (
    typeof currentPlayerAvgDamage !== 'number' ||
    isNaN(currentPlayerAvgDamage)
  ) {
    console.log(
      '[getClanTier] 현재 플레이어의 시즌 평균 딜량이 유효하지 않음.'
    );
    return null;
  }

  const finalRelevantMembers = [];
  clanMembersLower.forEach((memberNicknameLower) => {
    const avgDmg = allPlayersSeasonAvgDamages.get(memberNicknameLower);
    if (typeof avgDmg === 'number' && !isNaN(avgDmg)) {
      finalRelevantMembers.push({
        name: memberNicknameLower,
        avgDamage: avgDmg,
      });
    } else {
      console.warn(
        `[getClanTier] 클랜 멤버 '${memberNicknameLower}'의 시즌 평균 딜량을 AllPlayersSeasonAvgDamages에서 찾을 수 없거나 유효하지 않습니다.`
      );
    }
  });

  if (finalRelevantMembers.length === 0) {
    console.log(
      '[getClanTier] 클랜 티어 계산을 위한 유효한 멤버 딜량 데이터가 부족합니다.'
    );
    return null;
  }

  const sortedDamages = finalRelevantMembers.sort(
    (a, b) => b.avgDamage - a.avgDamage
  );
  console.log(
    '[getClanTier] 정렬된 클랜 멤버 딜량:',
    sortedDamages.map((m) => `${m.name}: ${m.avgDamage}`)
  );

  const index = sortedDamages.findIndex((m) => m.name === lowerNickname);

  if (index === -1) {
    console.log(
      `[getClanTier] 현재 플레이어(${lowerNickname})가 정렬된 클랜 멤버 목록에서 발견되지 않음. (이는 데이터 누락을 의미할 수 있습니다)`
    );
    return null;
  }

  const percentile = (index + 1) / sortedDamages.length;
  console.log(
    `[getClanTier] 현재 플레이어 순위: ${index + 1}/${
      sortedDamages.length
    }, 백분위: ${percentile.toFixed(1)}`
  );

  if (percentile <= 0.05) return '챌린저';
  if (percentile <= 0.2) return '다이아';
  if (percentile <= 0.5) return '플래티넘';
  if (percentile <= 0.8) return '실버';
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
  console.log(
    `환경 변수 PUBG_API_KEY_RAW 존재 여부: ${
      !!PUBG_API_KEY_RAW ? 'true' : 'false'
    }`
  );

  if (!PUBG_API_KEY_RAW) {
    console.error(
      '[API ERROR] PUBG_API_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.'
    );
    return res
      .status(500)
      .json({ error: '서버 설정 오류: PUBG API 키가 없습니다.' });
  }
  if (!nickname) {
    console.error('[API ERROR] 닉네임이 제공되지 않았습니다.');
    return res.status(400).json({ error: '닉네임이 필요합니다.' });
  }

  try {
    // 1. 클랜 정보 조회 (일단 JSON 파일 기반)
    let clanInfo = await getClanInfo(nickname);
    let clanMembersLower = clanInfo?.members || [];
    console.log(
      `[API INFO] getClanInfo 결과: 클랜이름='${
        clanInfo?.clanName || '없음'
      }', 멤버 수=${clanMembersLower.length}`
    );

    // 2. 플레이어 닉네임으로 PUBG ID 조회
    const playerLookupUrl = `${PUBG_BASE_URL}/${shard}/players?filter[playerNames]=${encodeURIComponent(
      nickname
    )}`;
    console.log(`[API FETCH] 플레이어 조회 URL: ${playerLookupUrl}`);

    const playerRes = await fetch(playerLookupUrl, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!playerRes.ok) {
      const errorText = await playerRes.text();
      console.error(
        `[API ERROR] PUBG API 플레이어 조회 실패 (${playerRes.status}): ${errorText}`
      );
      if (playerRes.status === 404) {
        return res.status(404).json({
          error: `플레이어 '${nickname}'을(를) 찾을 수 없습니다. 닉네임을 다시 확인해주세요.`,
        });
      }
      return res.status(playerRes.status).json({
        error: `PUBG API 조회 실패: ${playerRes.statusText}`,
        details: errorText,
      });
    }

    const playerData = await playerRes.json();
    const player = playerData.data?.[0];

    if (!player) {
      console.warn(
        `[API WARN] 플레이어 '${nickname}'에 대한 데이터가 PUBG API에서 반환되지 않았습니다.`
      );
      return res.status(404).json({ error: '플레이어 데이터 없음' });
    }

    const accountId = player.id;
    const clanId = player.attributes?.clanId; // PUBG API에서 클랜 ID 추출
    console.log(`[API INFO] 플레이어 ID 조회 완료: ${accountId}`);
    console.log(`[API INFO] 클랜 ID: ${clanId || '없음'}`);

    // PUBG API에서 클랜 정보 조회
    let pubgClanInfo = null;
    let dbClan = null;
    
    try {

      // 기존 플레이어의 DB 멤버 정보 조회
      const existingMember = await prisma.clanMember.findFirst({
        where: {
          nickname: {
            equals: nickname,
            mode: 'insensitive',
          },
        },
        include: { clan: true },
      });

      if (clanId) {
        // ✅ PUBG API에서 클랜이 있음 → 클랜 정보 조회 및 DB 동기화
        try {
          const clanLookupUrl = `${PUBG_BASE_URL}/${shard}/clans/${clanId}`;
          console.log(`[CLAN API] 클랜 정보 조회 URL: ${clanLookupUrl}`);

          const clanRes = await fetch(clanLookupUrl, {
            headers: {
              Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
              Accept: 'application/vnd.api+json',
            },
          });

          if (clanRes.ok) {
            const clanData = await clanRes.json();
            pubgClanInfo = clanData.data;
            console.log(
              `[CLAN API] 클랜 정보 조회 성공: ${pubgClanInfo.attributes.clanName} (레벨 ${pubgClanInfo.attributes.clanLevel})`
            );

            // DB에서 클랜 검색 또는 생성
            dbClan = await prisma.clan.findUnique({
              where: { pubgClanId: clanId },
              include: { members: true },
            });

            if (dbClan) {
              // 클랜 정보 업데이트
              await prisma.clan.update({
                where: { id: dbClan.id },
                data: {
                  name: pubgClanInfo.attributes.clanName,
                  pubgClanTag: pubgClanInfo.attributes.clanTag,
                  pubgClanLevel: pubgClanInfo.attributes.clanLevel,
                  pubgMemberCount: pubgClanInfo.attributes.clanMemberCount,
                  lastSynced: new Date(),
                },
              });
              console.log(
                `[DB CLAN] 클랜 정보 업데이트 완료: ${pubgClanInfo.attributes.clanName}`
              );
            } else {
              // 새로운 클랜 생성
              dbClan = await prisma.clan.create({
                data: {
                  name: pubgClanInfo.attributes.clanName,
                  leader: 'Unknown',
                  pubgClanId: clanId,
                  pubgClanTag: pubgClanInfo.attributes.clanTag,
                  pubgClanLevel: pubgClanInfo.attributes.clanLevel,
                  pubgMemberCount: pubgClanInfo.attributes.clanMemberCount,
                  memberCount: pubgClanInfo.attributes.clanMemberCount || 0,
                  lastSynced: new Date(),
                },
              });
              console.log(
                `[DB CLAN] 새로운 클랜 생성: ${pubgClanInfo.attributes.clanName}`
              );
            }

            // 플레이어를 해당 클랜에 할당
            if (existingMember) {
              if (existingMember.clanId !== dbClan.id) {
                // 클랜이 변경됨
                await prisma.clanMember.update({
                  where: { id: existingMember.id },
                  data: {
                    clanId: dbClan.id,
                    lastUpdated: new Date(),
                  },
                });
                console.log(
                  `[DB CLAN] 플레이어 '${nickname}'의 클랜 업데이트: ${pubgClanInfo.attributes.clanName}`
                );
              }
            } else {
              // 신규 플레이어 생성 및 클랜 할당
              await prisma.clanMember.create({
                data: {
                  nickname,
                  clanId: dbClan.id,
                  score: 0,
                  style: '미분석',
                  avgDamage: 0,
                },
              });
              console.log(
                `[DB CLAN] 새로운 플레이어 '${nickname}' 생성 및 클랜 할당`
              );
            }

            // 최신 멤버 정보 조회
            dbClan = await prisma.clan.findUnique({
              where: { id: dbClan.id },
              include: { members: true },
            });

            if (dbClan && dbClan.members && dbClan.members.length > 0) {
              clanMembersLower = dbClan.members.map((m) =>
                m.nickname.toLowerCase()
              );
              clanInfo = {
                clanName: dbClan.name,
                members: clanMembersLower,
              };
              console.log(
                `[DB CLAN] 팀플레이 분석용 클랜 멤버 업데이트: ${clanMembersLower.length}명 (DB 기반)`
              );
            }
          } else {
            console.warn(`[CLAN API] 클랜 정보 조회 실패: ${clanRes.status}`);
            // 클랜 조회 실패 시 DB 클랜 정보는 유지 (optional)
            if (existingMember?.clan) {
              dbClan = existingMember.clan;
              clanInfo = {
                clanName: dbClan.name,
                members: existingMember.clan.members.map((m) =>
                  m.nickname.toLowerCase()
                ),
              };
            }
          }
        } catch (clanApiError) {
          console.error(`[CLAN API] 클랜 정보 조회 중 오류:`, clanApiError);
          if (existingMember?.clan) {
            dbClan = existingMember.clan;
          }
        }
      } else {
        // ❌ PUBG API에서 클랜이 없음 → DB에서도 클랜 제거 (중요!)
        console.log(
          `[CLAN API] PUBG API에서 클랜 정보 없음. 플레이어 '${nickname}'은 클랜에 가입되지 않음.`
        );

        if (existingMember && existingMember.clanId) {
          // 기존에 DB에 클랜이 있었다면 제거 (PUBG API가 진실의 원천)
          console.log(
            `[DB CLAN] 플레이어 '${nickname}'이 클랜에서 나감. DB에서 클랜 정보 제거 중...`
          );

          // clanId를 NULL로 설정하여 클랜 제거
          await prisma.clanMember.update({
            where: { id: existingMember.id },
            data: {
              clanId: null, // 클랜 제거 (PUBG API가 진실의 원천)
              lastUpdated: new Date(),
            },
          });

          console.log(
            `[DB CLAN] 플레이어 '${nickname}'의 클랜 정보 DB에서 제거 완료`
          );
          clanMembersLower = [];
          clanInfo = null;
        }
      }
    } catch (dbError) {
      console.warn(
        `[DB CLAN ERROR] DB 동기화 실패:`,
        dbError.message
      );
      // DB 동기화 실패 시 기본 동작 (JSON 파일 또는 기존 정보 사용)
    }

    let seasonAvgDamage = 0;
    let averageScore = 0;
    let modeStats = {};
    const allPlayersSeasonAvgDamages = new Map();

    // 3. 현재 시즌 정보 조회 및 플레이어 시즌 통계 조회
    let currentSeason = null; // currentSeason을 상위 스코프에서 선언
    const seasonLookupUrl = `${PUBG_BASE_URL}/${shard}/seasons`;
    const seasonRes = await fetch(seasonLookupUrl, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (seasonRes.ok) {
      const seasonData = await seasonRes.json();
      currentSeason = seasonData.data.find((s) => s.attributes.isCurrentSeason);
      console.log(
        `[SEASON INFO] 현재 시즌 조회 결과:`,
        currentSeason
          ? `ID: ${currentSeason.id}, 활성: ${currentSeason.attributes.isCurrentSeason}`
          : '현재 시즌 없음'
      );

      if (currentSeason) {
        const playerSeasonStatsUrl = `${PUBG_BASE_URL}/${shard}/players/${accountId}/seasons/${currentSeason.id}`;
        const statsRes = await fetch(playerSeasonStatsUrl, {
          headers: {
            Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
            Accept: 'application/vnd.api+json',
          },
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const allStats = statsData.data.attributes.gameModeStats;

          ['solo', 'duo', 'squad', 'solo-fpp', 'duo-fpp', 'squad-fpp'].forEach(
            (mode) => {
              const s = allStats[mode];
              if (s && s.roundsPlayed > 0) {
                // K/D 계산 수정: deaths = rounds - wins (PUBG에서는 죽지 않고 우승하면 death가 없음)
                const deaths = s.roundsPlayed - s.wins;
                const kd =
                  deaths > 0
                    ? parseFloat((s.kills / deaths).toFixed(1))
                    : s.kills;

                // 기존 PKGG 계산식 유지, 누락 항목 추가
                modeStats[mode] = {
                  rounds: s.roundsPlayed,
                  wins: s.wins,
                  top10s: s.top10s,
                  kd: kd,
                  avgDamage: parseFloat(
                    (s.damageDealt / s.roundsPlayed).toFixed(1)
                  ),
                  winRate: parseFloat(
                    ((s.wins / s.roundsPlayed) * 100).toFixed(1)
                  ),
                  top10Rate: parseFloat(
                    ((s.top10s / s.roundsPlayed) * 100).toFixed(1)
                  ),
                  longestKill: parseFloat(s.longestKill.toFixed(1)),
                  headshots: s.headshotKills,
                  // 추가 항목
                  maxKills: s.mostKills ?? 0,
                  maxDistanceKill: s.longestKill ?? 0,
                  headshotRate:
                    s.kills > 0
                      ? parseFloat(
                          ((s.headshotKills / s.kills) * 100).toFixed(1)
                        )
                      : 0,
                  avgRank:
                    s.roundsPlayed > 0 && s.winPlace
                      ? parseFloat((s.winPlace / s.roundsPlayed).toFixed(1))
                      : 0,
                  avgSurvivalTime:
                    s.roundsPlayed > 0 && s.timeSurvived
                      ? parseFloat((s.timeSurvived / s.roundsPlayed).toFixed(1))
                      : 0,
                  avgAssists:
                    s.roundsPlayed > 0 && s.assists !== undefined
                      ? parseFloat((s.assists / s.roundsPlayed).toFixed(1))
                      : 0,
                  assists: s.assists ?? 0,
                  mostAssists: s.mostAssists ?? 0,
                };
              }
            }
          );

          const relevantSquadStats = allStats.squad || allStats['squad-fpp'];
          if (relevantSquadStats && relevantSquadStats.roundsPlayed > 0) {
            const totalDamageDealt = relevantSquadStats.damageDealt || 0;
            const totalRoundsPlayed = relevantSquadStats.roundsPlayed || 1;
            seasonAvgDamage = parseFloat(
              (totalDamageDealt / totalRoundsPlayed).toFixed(1)
            );

            // PKGG 점수 계산 수정: 경기당 평균 성과 기반 점수
            const kills = relevantSquadStats.kills || 0;
            const damage = relevantSquadStats.damageDealt || 0;
            const survival = relevantSquadStats.timeSurvived || 0;
            const wins = relevantSquadStats.wins || 0;
            const top10s = relevantSquadStats.top10s || 0;

            // 경기당 평균값 계산
            const avgKills = kills / totalRoundsPlayed;
            const avgDamage = damage / totalRoundsPlayed;
            const avgSurvival = survival / totalRoundsPlayed;
            const winRate = (wins / totalRoundsPlayed) * 100;
            const top10Rate = (top10s / totalRoundsPlayed) * 100;

            // PKGG 점수 — calculateMMR 통일 공식 사용
            averageScore = calculateMMR({
              avgDamage,
              avgKills,
              avgSurviveTime: avgSurvival,
              winRate,
              top10Rate,
            });
          } else {
            seasonAvgDamage = 0;
            averageScore = 1000; // 기본 점수
          }
          console.log(
            `[API INFO] 시즌 평균 딜량 (스쿼드): ${seasonAvgDamage}, PKGG 점수: ${averageScore}`
          );
          console.log(
            `[PKGG SCORE] 점수 계산 상세:`,
            `킬: ${relevantSquadStats?.kills || 0}/${relevantSquadStats?.roundsPlayed || 1} = ${((relevantSquadStats?.kills || 0) / (relevantSquadStats?.roundsPlayed || 1)).toFixed(1)}`,
            `딜량: ${((relevantSquadStats?.damageDealt || 0) / (relevantSquadStats?.roundsPlayed || 1)).toFixed(0)}`,
            `승률: ${(((relevantSquadStats?.wins || 0) / (relevantSquadStats?.roundsPlayed || 1)) * 100).toFixed(1)}%`
          );

          // 현재 플레이어의 시즌 평균 딜량 기록 (소문자 닉네임으로)
          allPlayersSeasonAvgDamages.set(lowerNickname, seasonAvgDamage);
        } else {
          console.warn(
            `[API WARN] 시즌 통계 조회 실패 (${
              statsRes.status
            }): ${await statsRes.text()}`
          );
          seasonAvgDamage = 0;
        }
      } else {
        console.warn(`[API WARN] 현재 시즌 정보를 찾을 수 없습니다.`);
        seasonAvgDamage = 0;
      }
    } else {
      console.warn(
        `[API WARN] 시즌 정보 조회 실패 (${
          seasonRes.status
        }): ${await seasonRes.text()}`
      );
      seasonAvgDamage = 0;
    }

    // [경쟁전 정보 수집 시작]
    let rankedStats = [];
    try {
      if (currentSeason && currentSeason.id) {
        console.log(
          `[RANKED INFO] 경쟁전 데이터 조회 시작 - 플레이어: ${nickname}, 시즌: ${currentSeason.id}`
        );
        // 공식 PUBG API 문서에 따른 올바른 엔드포인트 사용
        const rankedStatsUrl = `${PUBG_BASE_URL}/${shard}/players/${accountId}/seasons/${currentSeason.id}/ranked`;
        console.log(`[RANKED DEBUG] 올바른 API URL: ${rankedStatsUrl}`);
        const rankedRes = await fetch(rankedStatsUrl, {
          headers: {
            Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
            Accept: 'application/vnd.api+json',
          },
        });
        if (rankedRes.ok) {
          const rankedData = await rankedRes.json();
          console.log(
            `[RANKED INFO] 경쟁전 API 응답 성공, 전체 구조:`,
            JSON.stringify(rankedData, null, 2)
          );
          // 응답 구조 확인 후 적절한 경로로 데이터 추출
          const rankedGameModes =
            rankedData.data?.attributes?.rankedGameModeStats ||
            rankedData.data?.attributes ||
            rankedData.attributes ||
            {};

          console.log(
            `[RANKED DEBUG] rankedGameModes 구조:`,
            JSON.stringify(rankedGameModes, null, 2)
          );
          rankedData.attributes || {};
          const modePriority = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
          for (const mode of modePriority) {
            if (rankedGameModes[mode]) {
              const r = rankedGameModes[mode];

              // 헤드샷 관련 디버깅 로그 추가
              console.log(`[HEADSHOT DEBUG] Mode: ${mode}`);
              console.log(`[HEADSHOT DEBUG] Available fields:`, Object.keys(r));
              console.log(`[HEADSHOT DEBUG] headshotKills:`, r.headshotKills);
              console.log(`[HEADSHOT DEBUG] headshots:`, r.headshots);
              console.log(
                `[HEADSHOT DEBUG] headshotKillRatio:`,
                r.headshotKillRatio
              );
              console.log(`[HEADSHOT DEBUG] headshotRate:`, r.headshotRate);
              console.log(`[HEADSHOT DEBUG] kills:`, r.kills);
              console.log(
                `[HEADSHOT DEBUG] 계산된 비율:`,
                r.headshotKillRatio
                  ? parseFloat(r.headshotKillRatio) > 1
                    ? parseFloat(r.headshotKillRatio)
                    : parseFloat(r.headshotKillRatio) * 100
                  : 'N/A'
              );

              // K/D 계산 수정: deaths = rounds - wins (PUBG에서는 죽지 않고 우승하면 death가 없음)
              const deaths = r.roundsPlayed - r.wins;
              const kd =
                deaths > 0
                  ? parseFloat((r.kills / deaths).toFixed(1))
                  : r.kills;

              rankedStats.push({
                mode,
                tier: r.tier || 'Unranked',
                rp: r.currentRankPoint || 0,
                kd: kd,
                avgDamage:
                  r.roundsPlayed > 0
                    ? parseFloat((r.damageDealt / r.roundsPlayed).toFixed(1))
                    : 0,
                winRate:
                  r.roundsPlayed > 0
                    ? parseFloat(((r.wins / r.roundsPlayed) * 100).toFixed(1))
                    : 0,
                survivalTime:
                  r.roundsPlayed > 0
                    ? parseFloat((r.timeSurvived / r.roundsPlayed).toFixed(1))
                    : 0,
                rounds: r.roundsPlayed,
                // 헤드샷 관련 필드들 추가
                kills: r.kills || 0,
                headshots: r.headshotKills || r.headshots || 0,
                headshotKillRatio: r.headshotKillRatio || 0,
                // 기본 필드들
                currentTier: r.currentTier?.tier || 'Unranked', // 현재 티어
                subTier: r.currentTier?.subTier || 0, // 세부 티어 (1, 2, 3, 4)
                currentRankPoint: r.currentRankPoint || 0, // 현재 랭크 포인트
                roundsPlayed: r.roundsPlayed || 0, // 플레이한 라운드 수
                avgRank: r.avgRank || 0, // 평균 등수
                top10Ratio: r.top10Ratio || 0, // TOP10 비율
                winRatio: r.winRatio || 0, // 승률 (API에서 직접)
                assists: r.assists || 0, // 어시스트 수
                wins: r.wins || 0, // 승리 수
                kda: r.kda || 0, // KDA 비율
                kills: r.kills || 0, // 킬 수
                deaths: r.deaths || 0, // 데스 수
                damageDealt: r.damageDealt || 0, // 총 딜량
                headshotKills: r.headshotKills || r.headshots || 0, // 헤드샷 킬 수 (여러 필드명 시도)
                headshotKillRatio: r.headshotKillRatio || r.headshotRate || 0, // 헤드샷 비율 (API에서 직접)
                // 추가 통계들
                headshots: r.headshotKills || r.headshots || 0, // 헤드샷 킬 수 (중복이지만 호환성)
                headshotRate: (() => {
                  // headshotKillRatio가 있으면 사용 (이미 0-1 비율이므로 100곱함)
                  if (
                    r.headshotKillRatio !== undefined &&
                    r.headshotKillRatio !== null
                  ) {
                    const ratio = parseFloat(r.headshotKillRatio);
                    // 만약 이미 백분율(>1)이면 그대로 사용, 아니면 100을 곱함
                    return parseFloat(
                      (ratio > 1 ? ratio : ratio * 100).toFixed(1)
                    );
                  }
                  // headshotRate가 있으면 사용
                  if (r.headshotRate !== undefined && r.headshotRate !== null) {
                    const rate = parseFloat(r.headshotRate);
                    return parseFloat(
                      (rate > 1 ? rate : rate * 100).toFixed(1)
                    );
                  }
                  // 직접 계산: 헤드샷킬수 / 총킬수 * 100
                  if (r.kills > 0) {
                    const headshots = r.headshotKills || r.headshots || 0;
                    return parseFloat(((headshots / r.kills) * 100).toFixed(1));
                  }
                  return 0;
                })(), // 헤드샷 비율 계산 개선
                // 성취 관련
                bestTier: r.bestTier
                  ? r.bestTier.tier +
                    (r.bestTier.subTier ? ` ${r.bestTier.subTier}` : '')
                  : 'Unranked', // 최고 달성 티어
                bestRankPoint: r.bestRankPoint || 0, // 최고 랭크 포인트
                roundMostKills: r.roundMostKills || 0, // 한 라운드 최다 킬
                killStreak: r.killStreak || 0, // 킬 스트릭
                // 전투 관련
                dBNOs: r.dBNOs || 0, // 기절시킨 수
                longestKill: r.longestKill || 0, // 최장 킬 거리
                teamKills: r.teamKills || 0, // 팀킬 수
                // 서포트/생존 관련
                reviveRatio: r.reviveRatio || 0, // 부활 비율
                revives: r.revives || 0, // 부활시킨 수
                heals: r.heals || 0, // 힐 사용 횟수
                boosts: r.boosts || 0, // 부스터 사용 횟수
                // 기타
                avgSurvivalTime: r.avgSurvivalTime || 0, // 평균 생존 시간
                weaponsAcquired: r.weaponsAcquired || 0, // 획득한 무기 수
                playTime: r.playTime || 0, // 총 플레이 시간
                kdr: r.kdr || 0, // Kill/Death Ratio
              });
            } else {
              rankedStats.push({
                mode,
                tier: 'Unranked',
                rp: 0,
                kd: 0,
                avgDamage: 0,
                winRate: 0,
                survivalTime: 0,
                rounds: 0,
                // 기본 필드들
                currentTier: 'Unranked',
                subTier: 0,
                currentRankPoint: 0,
                roundsPlayed: 0,
                avgRank: 0,
                top10Ratio: 0,
                winRatio: 0,
                assists: 0,
                wins: 0,
                kda: 0,
                kills: 0,
                deaths: 0,
                damageDealt: 0,
                headshotKills: 0,
                headshotKillRatio: 0,
                // 추가 통계들
                headshots: 0, // 헤드샷 킬 수 기본값
                headshotRate: 0, // 헤드샷 비율 기본값
                // 성취 관련
                bestTier: 'Unranked',
                bestRankPoint: 0,
                roundMostKills: 0,
                killStreak: 0,
                // 전투 관련
                dBNOs: 0,
                longestKill: 0,
                teamKills: 0,
                // 서포트/생존 관련
                reviveRatio: 0,
                revives: 0,
                heals: 0,
                boosts: 0,
                // 기타
                avgSurvivalTime: 0,
                weaponsAcquired: 0,
                playTime: 0,
                kdr: 0,
              });
            }
          }
        } else {
          const responseText = await rankedRes.text();
          console.warn(
            `[RANKED WARN] 경쟁전 데이터 조회 실패 (${rankedRes.status}): ${responseText}`
          );
          console.log(`[RANKED DEBUG] 요청 URL: ${rankedStatsUrl}`);
          console.log(`[RANKED DEBUG] 현재 시즌 ID: ${currentSeason.id}`);
          console.log(`[RANKED DEBUG] 플레이어 ID: ${accountId}`);

          // 404 에러인 경우 (플레이어가 경쟁전을 플레이하지 않음)
          if (rankedRes.status === 404) {
            console.log(
              `[RANKED INFO] 플레이어 '${nickname}'는 현재 시즌에 경쟁전 게임을 플레이하지 않았습니다.`
            );
          }

          const modePriority = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
          rankedStats = modePriority.map((mode) => ({
            mode,
            tier: 'Unranked',
            rp: 0,
            kd: 0,
            avgDamage: 0,
            winRate: 0,
            survivalTime: 0,
            rounds: 0,
            headshots: 0,
            headshotRate: 0,
            bestTier: 'Unranked',
            bestRankPoint: 0,
            roundMostKills: 0,
            killStreak: 0,
            dBNOs: 0,
            longestKill: 0,
            teamKills: 0,
            reviveRatio: 0,
            revives: 0,
            heals: 0,
            boosts: 0,
            avgSurvivalTime: 0,
            weaponsAcquired: 0,
            playTime: 0,
            kdr: 0,
          }));
        }
      } else {
        console.warn(
          '[RANKED WARN] currentSeason 정보가 없어 경쟁전 데이터 조회를 건너뜀'
        );
        const modePriority = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
        rankedStats = modePriority.map((mode) => ({
          mode,
          tier: 'Unranked',
          rp: 0,
          kd: 0,
          avgDamage: 0,
          winRate: 0,
          survivalTime: 0,
          rounds: 0,
          headshots: 0,
          headshotRate: 0,
          bestTier: 'Unranked',
          bestRankPoint: 0,
          roundMostKills: 0,
          killStreak: 0,
          dBNOs: 0,
          longestKill: 0,
          teamKills: 0,
          reviveRatio: 0,
          revives: 0,
          heals: 0,
          boosts: 0,
          avgSurvivalTime: 0,
          weaponsAcquired: 0,
          playTime: 0,
          kdr: 0,
        }));
      }
    } catch (e) {
      console.error('[RANKED ERROR] 경쟁전 정보 수집 중 오류 발생:', e);
      const modePriority = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
      rankedStats = modePriority.map((mode) => ({
        mode,
        tier: 'Unranked',
        rp: 0,
        kd: 0,
        avgDamage: 0,
        winRate: 0,
        survivalTime: 0,
        rounds: 0,
        headshots: 0,
        headshotRate: 0,
        bestTier: 'Unranked',
        bestRankPoint: 0,
        roundMostKills: 0,
        killStreak: 0,
        dBNOs: 0,
        longestKill: 0,
        teamKills: 0,
        reviveRatio: 0,
        revives: 0,
        heals: 0,
        boosts: 0,
        avgSurvivalTime: 0,
        weaponsAcquired: 0,
        playTime: 0,
        kdr: 0,
      }));
    }
    // [경쟁전 정보 수집 끝]

    // [경쟁전 요약 카드용 데이터 가공]
    // 가장 높은 RP(혹은 티어) 모드 기준으로 summaryCard용 데이터 생성
    let rankedSummary = null;
    if (Array.isArray(rankedStats) && rankedStats.length > 0) {
      // RP 우선, RP 같으면 티어 우선
      const tierOrder = [
        'Conqueror',
        'Master',
        'Diamond',
        'Platinum',
        'Gold',
        'Silver',
        'Bronze',
        'Unranked',
      ];
      const sorted = rankedStats.slice().sort((a, b) => {
        if (b.rp !== a.rp) return b.rp - a.rp;
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      });
      const top = sorted[0];
      // wins, top10Rate, kda, avgAssist, avgKill, avgRank 계산 보완
      const wins =
        typeof top.wins === 'number'
          ? top.wins
          : typeof top.win === 'number'
            ? top.win
            : 0;
      const top10Rate =
        typeof top.top10Ratio === 'number'
          ? parseFloat((top.top10Ratio * 100).toFixed(1))
          : null;
      const assists = typeof top.assists === 'number' ? top.assists : null;
      const kills = typeof top.kills === 'number' ? top.kills : null;
      const rounds =
        typeof top.rounds === 'number' && top.rounds > 0 ? top.rounds : 0;
      const deaths = rounds > 0 ? rounds - wins : 0;
      const kda =
        deaths > 0
          ? parseFloat(((kills + (assists || 0)) / deaths).toFixed(1))
          : null;
      const avgAssist =
        assists !== null && rounds > 0
          ? parseFloat((assists / rounds).toFixed(1))
          : null;
      const avgKill =
        kills !== null && rounds > 0
          ? parseFloat((kills / rounds).toFixed(1))
          : null;
      const avgRank = typeof top.avgRank === 'number' ? top.avgRank : null;
      rankedSummary = {
        mode: top.mode,
        tier: top.currentTier || top.tier, // currentTier 우선, fallback으로 tier 사용
        rp: top.rp,
        games: rounds,
        wins: wins,
        kd: top.kd,
        avgDamage: top.avgDamage,
        winRate: top.winRate,
        top10Rate: top10Rate,
        headshotRate: (() => {
          // 직접 계산: 헤드샷킬수 / 총킬수 * 100 (정확한 공식 사용)
          if (top.kills > 0) {
            const headshots = top.headshotKills || top.headshots || 0;
            const calculatedRate = parseFloat(
              ((headshots / top.kills) * 100).toFixed(1)
            );
            console.log(
              `[HEADSHOT CALC] ${nickname} - 헤드샷킬: ${headshots}, 총킬: ${top.kills}, 계산된 비율: ${calculatedRate}%`
            );
            return calculatedRate;
          }
          return 0;
        })(), // 헤드샷 비율 계산: (헤드샷 킬 ÷ 전체 킬) × 100
        kda: kda,
        avgAssist: avgAssist,
        avgKill: avgKill,
        avgRank: avgRank,
        // 기본 통계 필드들
        currentTier: top.currentTier || top.tier,
        subTier: top.subTier || 0,
        currentRankPoint: top.currentRankPoint || top.rp,
        roundsPlayed: top.roundsPlayed || rounds,
        top10Ratio: top.top10Ratio || 0, // top10Ratio 추가
        assists: top.assists || 0,
        kills: top.kills || 0,
        deaths: top.deaths || 0,
        headshots: top.headshots || 0, // 헤드샷 킬 수 추가
        headshotKillRatio: top.headshotKillRatio || 0, // 원본 헤드샷 비율 추가
        damageDealt: top.damageDealt || 0,
        headshotKills: top.headshotKills || top.headshots || 0, // 일단 기본값 사용
        // 추가 데이터들
        bestTier: top.bestTier || 'Unranked',
        bestRankPoint: top.bestRankPoint || 0,
        roundMostKills: top.roundMostKills || 0,
        dBNOs: top.dBNOs || 0,
        longestKill: top.longestKill || 0,
        revives: top.revives || 0,
        heals: top.heals || 0,
        boosts: top.boosts || 0,
      };
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
    const synergyDetailMap = {}; // 닉네임(원본) -> { count, win, rankSum, damageSum }
    const clanSynergyStatusList = []; // 각 클랜전의 시너지 상태 (좋음/나쁨)

    const squadCombos = {}; // 추천 스쿼드 조합
    const squadComboHistory = {}; // 조합별 최근 경기 id

    // 모드별 통계 수집용 변수들
    const modeStatsMap = {};

    console.log(`[API INFO] 최근 매치 ${matchRefs.length}개 조회 시작.`);

    for (const matchRef of matchRefs) {
      const matchId = matchRef.id;
      const matchUrl = `${PUBG_BASE_URL}/${shard}/matches/${matchId}`;
      console.log(`[API FETCH] 매치 ${matchId} 데이터 불러오기: ${matchUrl}`);

      const matchRes = await fetch(matchUrl, {
        headers: {
          Authorization: `Bearer ${PUBG_API_KEY_RAW}`,
          Accept: 'application/vnd.api+json',
        },
      });

      if (!matchRes.ok) {
        console.warn(
          `[API WARN] 매치 ${matchId} 데이터 불러오기 실패 (${
            matchRes.status
          }): ${await matchRes.text()}`
        );
        continue;
      }

      const matchData = await matchRes.json();
      const included = matchData.included;

      const rostersMap = new Map();
      const participantsMap = new Map();

      included.forEach((item) => {
        if (item.type === 'roster') {
          rostersMap.set(item.id, item);
        } else if (item.type === 'participant') {
          participantsMap.set(item.id, item);
          // 매치 내 모든 플레이어의 닉네임과 (임시)매치 딜량을 기록
          const participantName = item.attributes.stats.name;
          const participantNameLower = participantName.toLowerCase();
          const participantDamage = item.attributes.stats.damageDealt || 0;
          if (!allPlayersSeasonAvgDamages.has(participantNameLower)) {
            allPlayersSeasonAvgDamages.set(
              participantNameLower,
              parseFloat(participantDamage.toFixed(1))
            );
          }
        }
      });

      const myParticipant = Array.from(participantsMap.values()).find(
        (p) => p.attributes.stats.name.toLowerCase() === lowerNickname
      );

      if (!myParticipant) {
        console.warn(
          `[API WARN] 매치 ${matchId}에서 플레이어 '${nickname}'의 participant 데이터 찾을 수 없음. 해당 매치 스킵.`
        );
        continue;
      }

      const myStats = myParticipant.attributes.stats;
      let myRosterId = myParticipant.relationships?.roster?.data?.id;

      // relationships가 없는 경우 로스터 맵에서 직접 찾기
      if (!myRosterId) {
        for (const [rosterId, roster] of rostersMap.entries()) {
          if (
            roster.relationships?.participants?.data?.some(
              (p) => p.id === myParticipant.id
            )
          ) {
            myRosterId = rosterId;
            break;
          }
        }
      }

      let myRank = 'N/A';
      let myTeamId = null;

      const teammatesDetail = [];
      if (myRosterId && rostersMap.has(myRosterId)) {
        const myRoster = rostersMap.get(myRosterId);
        myRank =
          myRoster.attributes.stats.rank || myRoster.attributes.rank || 'N/A';
        myTeamId = myRoster.attributes.stats.teamId || myRoster.id;

        myRoster.relationships.participants.data.forEach((participantRef) => {
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
              opGrade: gradeOP(myRank, rostersMap.size),
            });
          }
        });
        // --- 시너지 상세 통계 계산 ---
        teammatesDetail.forEach((t) => {
          if (t.name.toLowerCase() !== lowerNickname) {
            if (!synergyDetailMap[t.name]) {
              synergyDetailMap[t.name] = {
                count: 0,
                win: 0,
                rankSum: 0,
                damageSum: 0,
              };
            }
            synergyDetailMap[t.name].count++;
            synergyDetailMap[t.name].rankSum += myRank;
            synergyDetailMap[t.name].damageSum += t.damage;
            if (myRank === 1) synergyDetailMap[t.name].win++;
          }
        });
      } else {
        console.warn(
          `[API WARN] 매치 ${matchId}: 내 로스터 정보 (${myRosterId})를 찾을 수 없거나 유효하지 않아 팀원 정보 제한.`
        );
      }

      const { damageDealt, walkDistance, rideDistance } = myStats;
      const distance = (walkDistance || 0) + (rideDistance || 0);

      const totalSquads = rostersMap.size;

      // 팀 전체 MMR 계산 (개선된 PKGG 점수 기반)
      const teamTotalScore = teammatesDetail.reduce((sum, p) => {
        // 개선된 PKGG 점수 공식 적용
        const isTeamWin = myRank === 1;
        const isTeamTop10 = myRank > 0 && myRank <= 10;
        const score =
          1000 +
          p.kills * 50 +
          p.damage * 0.5 +
          p.survivalTime * 0.05 +
          (isTeamWin ? 500 : 0) +
          (isTeamTop10 ? 200 : 0);
        return sum + score;
      }, 0);
      const avgMmr = Math.round(teamTotalScore / (teammatesDetail.length || 1));

      const isWin = myRank === 1;
      const isTop10 = myRank > 0 && myRank <= 10;

      // 추천 스쿼드 조합을 위한 데이터 수집
      const teamNames = teammatesDetail.map((t) => t.name).sort();
      const teamKey = teamNames.join(',');
      if (teamNames.length > 1) {
        if (!squadCombos[teamKey]) {
          squadCombos[teamKey] = { totalAvgMmr: 0, count: 0, lastPlayed: 0 };
        }
        squadCombos[teamKey].totalAvgMmr += avgMmr;
        squadCombos[teamKey].count++;
        squadCombos[teamKey].lastPlayed = Math.max(
          squadCombos[teamKey].lastPlayed,
          new Date(matchData.data.attributes.createdAt).getTime()
        );
        squadComboHistory[teamKey] = matchId;
      }

      // 팀 전체 딜량 계산
      const totalTeamDamage = teammatesDetail.reduce((sum, teammate) => {
        return sum + (teammate.damage || 0);
      }, 0);

      // 게임 모드 타입 구분 (스마트한 랭크드 모드 감지)
      const gameMode = matchData.data.attributes.gameMode;
      console.log(
        `[GAMEMODE RAW] 경기 ${matchId}: 원본 gameMode="${gameMode}"`
      );
      console.log(
        `🔍 게임 모드 분석 중...`,
        {
          matchId,
          gameMode,
          matchType: matchData.data.attributes.matchType,
          mapName: matchData.data.attributes.mapName,
          modeType: '일반', // 임시
        }
      );
      console.log(`📊 rankedStats 확인: ${rankedStats ? rankedStats.length + '개 모드' : 'undefined/null'}`);
      if (rankedStats && rankedStats.length > 0) {
        console.log(`📊 rankedStats 내용:`, rankedStats.map(r => ({ mode: r.mode, rounds: r.rounds || r.roundsPlayed })));
      }

      // 1차: 직접적인 ranked 키워드 검사
      let isRanked =
        gameMode &&
        (gameMode.includes('ranked') ||
          gameMode.includes('competitive') ||
          gameMode.startsWith('ranked-') ||
          gameMode === 'ranked-squad-fpp' ||
          gameMode === 'ranked-squad' ||
          gameMode === 'ranked-duo-fpp' ||
          gameMode === 'ranked-duo' ||
          gameMode === 'ranked-solo-fpp' ||
          gameMode === 'ranked-solo');

      // 2차: 랭킹 통계가 있는 플레이어의 경우 추가 로직 적용
      if (!isRanked && rankedStats && rankedStats.length > 0) {
        // 활성 랭킹 모드가 있는지 확인
        const activeRankedMode = rankedStats.find(
          (r) => (r.rounds || r.roundsPlayed || 0) >= 10
        );

        if (activeRankedMode) {
          console.log(
            `[SMART MODE] 활성 랭킹 모드 발견: ${activeRankedMode.mode}, 경기수: ${activeRankedMode.rounds || activeRankedMode.roundsPlayed}`
          );

          // 매치 시간이 시즌 중이고, 게임모드가 해당 랭킹 모드와 일치하면 경쟁전으로 판단
          const matchMode = gameMode?.toLowerCase() || '';
          const rankedMode = activeRankedMode.mode?.toLowerCase() || '';

          // squad, duo, solo 매칭 확인
          if (
            (matchMode.includes('squad') && rankedMode.includes('squad')) ||
            (matchMode.includes('duo') && rankedMode.includes('duo')) ||
            (matchMode.includes('solo') && rankedMode.includes('solo'))
          ) {
            console.log(
              `[SMART MODE] 모드 매칭 성공: 매치="${matchMode}" vs 랭킹="${rankedMode}" → 경쟁전으로 판단`
            );
            isRanked = true;
          }
        }
      }

      const modeType = isRanked ? '경쟁전' : '일반';

      console.log(
        `[MODE DEBUG] 경기 ${matchId}: gameMode="${gameMode}", isRanked=${isRanked}, modeType="${modeType}"`
      );
      console.log(
        `[MODE DETAIL] 경기 ${matchId}: gameMode.includes('ranked')=${gameMode?.includes('ranked')}, gameMode.includes('competitive')=${gameMode?.includes('competitive')}`
      );

      // 최근 20경기 요약 리스트에 추가 (op.gg 스타일로 필요한 필드만 정제)
      // op.gg 스타일에 맞는 데이터 가공
      // 1. 모드명 변환 (한글)
      const modeKor = (() => {
        const m = gameMode;
        if (m === 'squad-fpp' || m === 'squad') return '스쿼드';
        if (m === 'duo-fpp' || m === 'duo') return '듀오';
        if (m === 'solo-fpp' || m === 'solo') return '솔로';
        return m.toUpperCase();
      })();

      // 모드별 통계 수집
      if (!modeStatsMap[gameMode]) {
        modeStatsMap[gameMode] = {
          rounds: 0,
          wins: 0,
          top10s: 0,
          kills: 0,
          assists: 0,
          damage: 0,
          survivalTime: 0,
          rankSum: 0,
          validRanks: 0,
          headshots: 0, // 헤드샷 통계 추가
          longestKills: [], // 최장 킬 거리 리스트 추가
        };
      }

      const modeData = modeStatsMap[gameMode];
      modeData.rounds++;
      modeData.kills += myStats.kills || 0;
      modeData.assists += myStats.assists || 0;
      modeData.damage += myStats.damageDealt || 0;
      modeData.survivalTime += myStats.timeSurvived || 0;
      modeData.headshots += myStats.headshotKills || 0; // 헤드샷 킬 누적 (개별 매치에서 정확한 데이터)

      // 최장 킬 거리 수집
      if (myStats.longestKill && myStats.longestKill > 0) {
        modeData.longestKills.push(myStats.longestKill);
      }

      if (isWin) modeData.wins++;
      if (isTop10) modeData.top10s++;

      // 순위가 숫자인 경우에만 평균 등수 계산에 포함
      if (
        (typeof myRank === 'number' && myRank > 0) ||
        (typeof myRank === 'string' &&
          !isNaN(Number(myRank)) &&
          Number(myRank) > 0)
      ) {
        const rankNumber = typeof myRank === 'number' ? myRank : Number(myRank);
        modeData.rankSum += rankNumber;
        modeData.validRanks++;
      }

      // 2. 시간 포맷 (몇시간전/몇분전)
      const playedDate = new Date(matchData.data.attributes.createdAt);
      const now = new Date();
      const diffMs = now - playedDate;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      let playedAgo = '';
      if (diffHour > 0) playedAgo = `${diffHour}시간전`;
      else if (diffMin > 0) playedAgo = `${diffMin}분전`;
      else playedAgo = '방금전';
      // 3. 생존시간 mm:ss
      const timeSurvivedSec = myStats.timeSurvived || 0;
      const mm = String(Math.floor(timeSurvivedSec / 60)).padStart(2, '0');
      const ss = String(Math.floor(timeSurvivedSec % 60)).padStart(2, '0');
      const survivedStr = `${mm}:${ss}`;
      // 4. 이동거리 km
      const distanceKm = (distance / 1000).toFixed(1);
      // 5. 순위/전체
      const rankStr =
        typeof myRank === 'number' ||
        (typeof myRank === 'string' && !isNaN(Number(myRank)))
          ? `#${myRank}/${totalSquads}`
          : myRank;

      // 텔레메트리 URL 수집
      let telemetryUrl = null;
      const telemetryAsset = matchData.included?.find(
        (item) => item.type === 'asset' && item.attributes?.name === 'telemetry'
      );
      if (telemetryAsset) {
        telemetryUrl = telemetryAsset.attributes.URL;
        console.log(
          `[TELEMETRY] 매치 ${matchId}: 텔레메트리 URL 발견 - ${telemetryUrl}`
        );
      }

      // 텔레메트리는 경기 확장 시 /api/pubg/match-telemetry 에서 지연 로드
      // (메인 API에서 20개 동시 fetch 시 타임아웃 발생)

      matches.push({
        matchId,
        mode: modeKor,
        gameMode: matchData.data.attributes.gameMode,
        matchType: matchData.data.attributes.matchType,
        modeType: modeType,
        playedAt: matchData.data.attributes.createdAt,
        matchTimestamp: new Date(matchData.data.attributes.createdAt).getTime(), // 타임스탬프로 변환
        playedAgo,
        survivedStr,
        survivalTime: myStats.timeSurvived || 0, // 생존시간 초 단위 추가
        rank: myRank,
        rankStr,
        totalSquads,
        avgScore: avgMmr,
        kills: myStats.kills || 0,
        damage: myStats.damageDealt || 0,
        distance: distance,
        distanceKm,
        headshots: myStats.headshotKills || 0, // 헤드샷 킬 수 추가
        longestKill: myStats.longestKill || 0, // 최장 킬 거리 추가
        opGrade: gradeOP(myRank, totalSquads),
        mapName: matchData.data.attributes.mapName,
        win: isWin, // 승리 여부 추가
        top10: isTop10, // Top10 여부 추가
        totalTeamDamage: totalTeamDamage, // 팀 전체 딜량 추가
        teammatesDetail: teammatesDetail, // 팀원 상세 정보 추가 (시너지 히트맵용)
        // 텔레메트리는 지연 로드 — URL과 맵명만 전달
        telemetryUrl: telemetryUrl,
      });

      totalRecentDamageSum += myStats.damageDealt || 0;
      totalDistance += distance;
      processedMatchCount++;

      // 클랜원과의 시너지 분석
      const teammatesInMatchLower = teammatesDetail
        .filter((t) => t.name.toLowerCase() !== lowerNickname)
        .map((t) => t.name.toLowerCase());

      const teammatesWhoAreClanMembers = teammatesInMatchLower.filter(
        (tLowerName) => clanMembersLower.includes(tLowerName)
      );

      console.log(
        `[API INFO] 매치 ${matchId}: 현재 플레이어와 함께 플레이한 클랜원:`,
        teammatesWhoAreClanMembers.length > 0
          ? teammatesWhoAreClanMembers.join(', ')
          : '없음'
      );

      if (teammatesWhoAreClanMembers.length > 0) {
        totalClanDamage += myStats.damageDealt || 0;
        clanMatchCount++;
        if (avgMmr > 1400) aboveAvgWithClan++; // 개선된 점수 기준
        // 시너지 판정: 현재 경기 딜량이 시즌 평균 딜량보다 높거나 같으면 "좋음", 낮으면 "나쁨"
        const currentMatchDamage = myStats.damageDealt || 0;
        clanSynergyStatusList.push(
          currentMatchDamage >= seasonAvgDamage ? '좋음' : '나쁨'
        );
        teammatesWhoAreClanMembers.forEach((tLowerName) => {
          const originalName =
            teammatesDetail.find((t) => t.name.toLowerCase() === tLowerName)
              ?.name || tLowerName;
          clanSynergyMap[originalName] =
            (clanSynergyMap[originalName] || 0) + 1;
        });
      }
    }

    // 최근 경기 평균 값 계산
    const avgRecentDamage =
      processedMatchCount > 0
        ? parseFloat((totalRecentDamageSum / processedMatchCount).toFixed(1))
        : 0;
    const averageDistance =
      processedMatchCount > 0
        ? Math.round(totalDistance / processedMatchCount)
        : 0;
    // 평균 생존 시간(초)
    const averageSurvivalTime =
      processedMatchCount > 0
        ? Math.round(
            matches.reduce((sum, m) => sum + (m.survivalTime || 0), 0) /
              processedMatchCount
          )
        : 0;

    // 평균 점수 계산 - 기존 averageScore 변수를 업데이트
    averageScore =
      processedMatchCount > 0
        ? Math.round(
            matches.reduce((sum, m) => sum + (m.avgScore || 0), 0) /
              processedMatchCount
          )
        : 1000;

    // 모드별 시즌 통계 계산
    const seasonModeStats = {};
    Object.entries(modeStatsMap).forEach(([mode, data]) => {
      if (data.rounds > 0) {
        const avgDamage = parseFloat((data.damage / data.rounds).toFixed(1));
        const avgKills = parseFloat((data.kills / data.rounds).toFixed(1));
        const avgAssists = parseFloat((data.assists / data.rounds).toFixed(1));
        const avgSurvivalTime = Math.round(data.survivalTime / data.rounds);
        const winRate = parseFloat(
          ((data.wins / data.rounds) * 100).toFixed(1)
        );
        const top10Rate = parseFloat(
          ((data.top10s / data.rounds) * 100).toFixed(1)
        );
        const kd =
          data.rounds > data.wins
            ? parseFloat((data.kills / (data.rounds - data.wins)).toFixed(1))
            : data.kills;
        const avgRank =
          data.validRanks > 0
            ? parseFloat((data.rankSum / data.validRanks).toFixed(1))
            : null;

        // 매치에서 헤드샷 데이터 수집
        const headshotRate =
          data.kills > 0
            ? parseFloat(((data.headshots / data.kills) * 100).toFixed(1))
            : 0;
        const longestKill =
          data.longestKills.length > 0 ? Math.max(...data.longestKills) : 0;

        seasonModeStats[mode] = {
          rounds: data.rounds,
          wins: data.wins,
          top10s: data.top10s,
          kills: data.kills,
          assists: data.assists,
          avgDamage,
          avgKills,
          avgAssists,
          avgSurvivalTime,
          winRate,
          top10Rate,
          kd,
          avgRank,
          // 헤드샷 관련 필드
          headshots: data.headshots,
          headshotRate: headshotRate,
          // 추가 필드들 (기존 호환성 유지)
          longestKill: longestKill,
          maxKills: Math.max(
            ...matches
              .filter((m) => m.gameMode === mode)
              .map((m) => m.kills || 0),
            0
          ),
          maxDistanceKill: longestKill,
          mostAssists: Math.max(
            ...matches
              .filter((m) => m.gameMode === mode)
              .map((m) => m.assists || 0),
            0
          ),
        };
      }
    });

    // 모드별 통계 디버깅 로그
    console.log(
      `[API DEBUG] ${nickname} - 생성된 모드별 통계:`,
      Object.keys(modeStats)
    );
    Object.entries(modeStats).forEach(([mode, stats]) => {
      console.log(
        `[API DEBUG] ${mode}: ${stats.rounds}게임, 평균 딜량 ${stats.avgDamage}, K/D ${stats.kd}`
      );
    });

    // rankedSummary의 헤드샷 데이터를 경쟁전 API 우선으로 처리
    if (rankedSummary && Object.keys(seasonModeStats).length > 0) {
      const primaryMode =
        seasonModeStats['squad-fpp'] ||
        seasonModeStats['squad'] ||
        Object.values(seasonModeStats)[0] ||
        {};

      console.log(
        `[HEADSHOT DEBUG] ${nickname} - API 누적 headshotKills: ${rankedSummary.headshotKills}, 누적 총킬: ${rankedSummary.kills}, 매치 headshots: ${primaryMode.headshots}`
      );

      // 누적 헤드샷 데이터 우선 사용: API의 전체 시즌 누적 데이터를 기준으로 함
      let finalHeadshotKills = 0;
      let finalHeadshotRate = 0;

      // PUBG API 현황: 대부분의 계정에서 headshotKills가 0으로 반환됨 (API 이슈)
      // 따라서 매치 기반 데이터로 정확한 누적 헤드샷 계산

      // 1순위: API 헤드샷 데이터가 실제로 있으면 사용 (매우 드묾)
      if (
        rankedSummary.headshotKills &&
        rankedSummary.headshotKills > 0 &&
        rankedSummary.kills > 0
      ) {
        finalHeadshotKills = rankedSummary.headshotKills;
        finalHeadshotRate = parseFloat(
          ((finalHeadshotKills / rankedSummary.kills) * 100).toFixed(1)
        );
        console.log(
          `[HEADSHOT API] ${nickname} - 공식 누적 데이터 사용 - ${finalHeadshotKills}킬, ${finalHeadshotRate}% (${finalHeadshotKills}÷${rankedSummary.kills}×100)`
        );
      }
      // 2순위: API 헤드샷 데이터가 없으면 매치 기반으로 정확히 계산 (일반적인 경우)
      else if (primaryMode.headshots > 0 && rankedSummary.kills > 0) {
        // 최근 20경기 기반 헤드샷을 전체 비율로 추정 (임시 대안)
        const matchBasedHeadshotKills = primaryMode.headshots;
        const recentMatchesKills = primaryMode.kills || 1;
        const estimatedHeadshotRate =
          matchBasedHeadshotKills / recentMatchesKills;

        // 전체 킬수에 추정 비율 적용
        finalHeadshotKills = Math.round(
          rankedSummary.kills * estimatedHeadshotRate
        );
        finalHeadshotRate = parseFloat(
          ((finalHeadshotKills / rankedSummary.kills) * 100).toFixed(1)
        );

        console.log(
          `[HEADSHOT ESTIMATE] ${nickname} - 매치 기반 추정 - 최근 ${matchBasedHeadshotKills}/${recentMatchesKills} 비율로 전체 추정: ${finalHeadshotKills}킬, ${finalHeadshotRate}%`
        );
      }
      // 3순위: 데이터가 없으면 0
      else {
        finalHeadshotKills = 0;
        finalHeadshotRate = 0;
        console.log(`[HEADSHOT NONE] ${nickname} - 헤드샷 데이터 없음`);
      }

      // 최종 값 적용
      rankedSummary.headshotKills = finalHeadshotKills;
      rankedSummary.headshotRate = finalHeadshotRate;

      // longestKill은 API 데이터가 없으면 매치 데이터 사용
      if (!rankedSummary.longestKill || rankedSummary.longestKill === 0) {
        rankedSummary.longestKill = primaryMode.longestKill || 0;
        console.log(
          `[LONGEST KILL] parksrk - API에서 최장 킬 거리가 0이므로 매치 데이터로 보완: ${primaryMode.longestKill || 0}m`
        );
      }
    }

    // 게임 모드별 분포 계산 (시즌 통계 기반)
    const modeDistribution = {
      normal: 0, // 일반게임
      ranked: 0, // 경쟁전 (랭크)
      event: 0, // 이벤트게임 (아케이드/이벤트 모드)
    };

    // 시즌 통계 기반으로 모드 분포 계산
    if (
      rankedStats &&
      rankedStats.length > 0 &&
      modeStats &&
      Object.keys(modeStats).length > 0
    ) {
      // rankedStats에서 총 랭크 게임 수 계산
      const totalRankedGames = rankedStats.reduce(
        (sum, stat) => sum + (stat.rounds || 0),
        0
      );

      // 시즌 통계에서 총 일반 게임 수 계산 (주요 모드들만)
      const normalModes = [
        'squad',
        'duo',
        'solo',
        'squad-fpp',
        'duo-fpp',
        'solo-fpp',
      ];
      const totalNormalGames = normalModes.reduce((sum, mode) => {
        return sum + (modeStats[mode]?.rounds || 0);
      }, 0);

      // 이벤트/아케이드 게임 수는 0으로 설정 (시즌 통계에 포함되지 않음)
      const totalEventGames = 0;

      modeDistribution.normal = totalNormalGames;
      modeDistribution.ranked = totalRankedGames;
      modeDistribution.event = totalEventGames;

      console.log(
        `[MODE DISTRIBUTION] ${nickname}: Normal=${totalNormalGames}, Ranked=${totalRankedGames}, Event=${totalEventGames} (시즌 통계 기반)`
      );
    } else {
      // 시즌 통계가 없으면 기본값 설정
      modeDistribution.normal = 1;
      modeDistribution.ranked = 0;
      modeDistribution.event = 0;

      console.log(
        `[MODE DISTRIBUTION] ${nickname}: 시즌 통계가 없어서 기본값 사용`
      );
    }

    // 백분율로 변환 (시즌 전체 게임 수 기준)
    const totalSeasonGames =
      modeDistribution.normal +
      modeDistribution.ranked +
      modeDistribution.event;
    const modeDistributionPercent =
      totalSeasonGames > 0
        ? {
            normal: Math.round(
              (modeDistribution.normal / totalSeasonGames) * 100
            ),
            ranked: Math.round(
              (modeDistribution.ranked / totalSeasonGames) * 100
            ),
            event: Math.round(
              (modeDistribution.event / totalSeasonGames) * 100
            ),
          }
        : {
            normal: 100,
            ranked: 0,
            event: 0,
          };

    // 플레이스타일 및 이동 성향 힌트 (개선된 점수 기반)
    const playstyle =
      averageScore >= 1800
        ? '🔥 캐리형'
        : averageScore >= 1400
          ? '⚖️ 안정형'
          : '🛡️ 수비형';
    const realPlayStyle = analyzePlayStyle(matches);
    const distanceStyleHint =
      averageDistance > 3000
        ? '🏃‍♂️ 적극 정찰형'
        : averageDistance < 1500
          ? '📍 진입형/수비형'
          : '평균 이동형';

    // 클랜 관련 통계
    const clanAverage =
      clanMatchCount > 0 ? Math.round(totalClanDamage / clanMatchCount) : 0;
    const synergyTop = Object.entries(clanSynergyMap)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([name]) => ({ name }));

    // 최근 20경기 내역 중 함께 플레이한 클랜원 TOP3 닉네임만 추출
    // 이미 수집된 matches 데이터와 synergyDetailMap을 활용
    let clanTop3WithMe = [];
    if (Array.isArray(clanMembersLower) && clanMembersLower.length > 0) {
      const togetherClanCount = {};

      // synergyDetailMap에서 클랜원만 추출하여 카운트
      Object.entries(synergyDetailMap).forEach(([playerName, stats]) => {
        const playerNameLower = playerName.toLowerCase();
        if (clanMembersLower.includes(playerNameLower)) {
          togetherClanCount[playerName] = stats.count;
        }
      });

      // TOP 3 추출
      clanTop3WithMe = Object.entries(togetherClanCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name]) => name);

      console.log(`[CLAN TOP3] 함께 플레이한 클랜원 TOP3:`, clanTop3WithMe);
      console.log(`[CLAN TOP3] 상세 카운트:`, togetherClanCount);
    }

    // 클랜원 리스트 및 각 멤버별 시즌 평균 딜량 (clanStats.json 활용)
    let clanMembersStats = [];
    if (clanInfo && Array.isArray(clanInfo.members)) {
      try {
        const clanStatsPath = path.join(
          process.cwd(),
          'data',
          'clanStats.json'
        );
        const clanStatsRaw = await fs.readFile(clanStatsPath, 'utf-8');
        const clanStats = JSON.parse(clanStatsRaw);
        clanMembersStats = clanInfo.members.map((nick) => {
          const lower = nick.toLowerCase();
          const stat = clanStats[lower] || {};
          return {
            nickname: nick,
            avgDamage: stat.avgDamage ?? null,
            avgKills: stat.avgKills ?? null,
            rounds: stat.rounds ?? null,
            wins: stat.wins ?? null,
            kd: stat.kd ?? null,
          };
        });
      } catch (e) {
        // fallback: 기존 방식
        clanMembersStats = clanInfo.members.map((nick) => ({
          nickname: nick,
          seasonAvgDamage: allPlayersSeasonAvgDamages.get(nick) ?? null,
        }));
      }
    }

    // 추천 스쿼드 조합
    // 클랜 멤버 중 최근 함께하지 않은 조합 우선 추천 (새로운 조합)
    let recommendedSquad = null;
    let recommendedScore = 0;
    let recommendedCombo = null;
    if (clanInfo && clanMembersLower.length > 1) {
      // 본인 제외
      const otherClanMembers = clanMembersLower.filter(
        (n) => n !== lowerNickname
      );
      // 3명씩 조합 (본인 포함 4인 스쿼드)
      const combos = [];
      for (let i = 0; i < otherClanMembers.length; i++) {
        for (let j = i + 1; j < otherClanMembers.length; j++) {
          for (let k = j + 1; k < otherClanMembers.length; k++) {
            combos.push([
              nickname,
              otherClanMembers[i],
              otherClanMembers[j],
              otherClanMembers[k],
            ]);
          }
        }
      }
      // 최근 같이 한 적 없는 조합 우선
      let foundNewCombo = false;
      for (const combo of combos) {
        const key = combo.slice().sort().join(',');
        if (!squadCombos[key]) {
          // 새로운 조합
          recommendedCombo = combo;
          recommendedScore = 0;
          foundNewCombo = true;
          break;
        }
      }
      if (!foundNewCombo && combos.length > 0) {
        // 이미 다 해봤으면 최근 MMR 높은 조합 추천
        combos.sort((a, b) => {
          const keyA = a.slice().sort().join(',');
          const keyB = b.slice().sort().join(',');
          const mmrA =
            squadCombos[keyA]?.totalAvgMmr / (squadCombos[keyA]?.count || 1) ||
            0;
          const mmrB =
            squadCombos[keyB]?.totalAvgMmr / (squadCombos[keyB]?.count || 1) ||
            0;
          return mmrB - mmrA;
        });
        recommendedCombo = combos[0];
        const key = recommendedCombo.slice().sort().join(',');
        recommendedScore =
          squadCombos[key]?.totalAvgMmr / (squadCombos[key]?.count || 1) || 0;
      }
      if (recommendedCombo) {
        recommendedSquad = {
          members: recommendedCombo,
          score: Math.round(recommendedScore),
          isNew: !squadCombos[recommendedCombo.slice().sort().join(',')],
        };
      }
    }

    // 클랜원만 포함된 Best Squad 계산
    const clanBestSquadArray = Object.entries(squadCombos)
      .map(([key, value]) => ({
        names: key.split(','),
        avgMmr: Math.round(value.totalAvgMmr / value.count),
        count: value.count,
        lastPlayed: value.lastPlayed,
      }))
      .filter((squad) => {
        // 스쿼드의 모든 멤버가 클랜원인지 확인
        return squad.names.every(
          (name) =>
            clanMembersLower.includes(name.toLowerCase()) ||
            name.toLowerCase() === lowerNickname
        );
      })
      .sort((a, b) => {
        if (b.avgMmr !== a.avgMmr) return b.avgMmr - a.avgMmr;
        return b.lastPlayed - a.lastPlayed;
      });
    const bestSquad =
      clanBestSquadArray.length > 0 ? clanBestSquadArray[0] : null;

    // 클랜 티어 계산
    let clanTier = null;
    if (clanInfo && clanMembersLower.length > 0) {
      console.log(
        `[API INFO] 클랜 티어 계산 시작. 클랜 멤버 수: ${clanMembersLower.length}, allPlayersSeasonAvgDamages 맵 크기: ${allPlayersSeasonAvgDamages.size}`
      );
      clanTier = getClanTier(
        seasonAvgDamage,
        clanMembersLower,
        allPlayersSeasonAvgDamages,
        lowerNickname
      ); // lowerNickname 인자 추가
      console.log(`[API INFO] 계산된 클랜 티어: ${clanTier}`);
    } else {
      console.log(
        `[API INFO] 클랜 정보가 없거나 클랜 멤버가 없어서 클랜 티어를 계산하지 않습니다.`
      );
    }

    // --- 시너지 분석(같이 자주한 팀원) 상세 ---
    const synergyAnalysis = Object.entries(synergyDetailMap)
      .map(([name, stat]) => ({
        name,
        togetherCount: stat.count,
        togetherWinRate:
          stat.count > 0
            ? parseFloat(((stat.win / stat.count) * 100).toFixed(1))
            : 0,
        togetherAvgRank:
          stat.count > 0
            ? parseFloat((stat.rankSum / stat.count).toFixed(1))
            : 0,
        togetherAvgDamage:
          stat.count > 0
            ? parseFloat((stat.damageSum / stat.count).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.togetherCount - a.togetherCount);

    // --- 선택적 확장: 킬맵/이동맵(telemetry), 시간대별 활동 그래프, 최근 폼 분석 ---
    // 킬맵/이동맵: 최근 매치 중 telemetryId가 있으면 URL 제공 (최대 1개)
    let killMapTelemetryUrl = null;
    for (const m of matches) {
      if (m.matchId) {
        // 실제 telemetryId는 matchData에서 추출해야 하나, 예시로 matchId로 대체
        killMapTelemetryUrl = `https://pubg-replay.kakao.com/telemetry/${m.matchId}`;
        break;
      }
    }
    // 시간대별 활동 그래프: 오전(6~12), 오후(12~18), 야간(18~6)
    let morning = 0,
      afternoon = 0,
      night = 0;
    matches.forEach((m) => {
      const hour = m.matchTimestamp
        ? new Date(m.matchTimestamp).getHours()
        : null;
      if (hour !== null) {
        if (hour >= 6 && hour < 12) morning++;
        else if (hour >= 12 && hour < 18) afternoon++;
        else night++;
      }
    });
    const totalTime = morning + afternoon + night;
    const timeActivityGraph =
      totalTime > 0
        ? {
            morning: Math.round((morning / totalTime) * 100),
            afternoon: Math.round((afternoon / totalTime) * 100),
            night: Math.round((night / totalTime) * 100),
          }
        : { morning: 0, afternoon: 0, night: 0 };

    // 최근 폼 분석: 시즌 대비 딜량 변화(상승/하락/유지)
    let recentForm = '유지';
    const diff = avgRecentDamage - seasonAvgDamage;
    if (avgRecentDamage === 0 && seasonAvgDamage === 0)
      recentForm = '데이터 없음';
    else if (diff >= 50) recentForm = '상승';
    else if (diff >= 20) recentForm = '약간 상승';
    else if (diff <= -50) recentForm = '급감';
    else if (diff <= -20) recentForm = '약간 하락';

    res.status(200).json({
      // 1. 기본 프로필 정보
      profile: {
        nickname,
        server: shard,
        clan: pubgClanInfo
          ? {
              name: pubgClanInfo.attributes.clanName,
              tag: pubgClanInfo.attributes.clanTag,
              level: pubgClanInfo.attributes.clanLevel,
              memberCount: pubgClanInfo.attributes.clanMemberCount,
              id: clanId,
            }
          : clanInfo?.clanName
            ? { 
                name: clanInfo.clanName,
                id: clanId,
              }
            : null,
        clanTier: clanTier,
        lastUpdated: new Date().toISOString(),
        lastCachedAt: await (async () => {
          try {
            const cache = await prisma.playerCache.findUnique({
              where: { nickname_pubgShardId: { nickname, pubgShardId: shard } },
              select: { lastUpdated: true },
            });
            return cache?.lastUpdated?.toISOString() || null;
          } catch { return null; }
        })(),
      },

      // 2. 개인 요약 통계
      summary: {
        avgDamage: avgRecentDamage,
        seasonAvgDamage: seasonAvgDamage, // 시즌 전체 평균 딜량 추가
        averageDistance,
        averageSurvivalTime,
        averageScore,
        playstyle,
        realPlayStyle,
        distanceStyleHint,
        formComment: (() => {
          if (avgRecentDamage === 0 && seasonAvgDamage === 0)
            return '딜량 폼 분석 정보를 찾을 수 없습니다.';
          const diff = avgRecentDamage - seasonAvgDamage;
          if (diff >= 50) return '📈 최근 폼이 크게 상승했습니다!';
          else if (diff >= 20) return '🔼 최근 경기력이 좋아지고 있어요.';
          else if (diff <= -50)
            return '📉 최근 폼이 급감했습니다. 컨디션을 점검해보세요!';
          else if (diff <= -20) return '🔽 최근 경기력이 다소 저하됐습니다.';
          return '⚖️ 시즌 평균과 비슷한 경기력을 유지 중입니다.';
        })(),
        recentForm, // 상승/하락/유지
      },

      // 3. 경쟁전 요약 (Ranked Stats)
      rankedSummary, // op.gg 스타일 상단 요약 카드용
      rankedStats, // [{mode, tier, rp, kd, avgDamage, winRate, survivalTime, rounds}]

      // 4. 모드별 시즌 통계 (SeasonStatsTabs 컴포넌트 호환 형태로 변경)
      seasonStats: {
        'division.bro.official.pc-2024-01': modeStats, // 현재 시즌으로 감싸기 (전체 시즌 통계 사용)
      },

      // 5. 최근 20경기 요약 리스트 (op.gg 스타일 필드만 포함)
      recentMatches: matches,

      // 6. 모드별 분포 (원형 그래프용)
      modeDistribution: modeDistributionPercent,

      // 7. 클랜원 분석
      clanMembers: clanMembersStats, // [{nickname, seasonAvgDamage}]
      clanAverage,
      clanMatchPercentage:
        processedMatchCount > 0
          ? parseFloat(
              ((clanMatchCount / processedMatchCount) * 100).toFixed(0)
            )
          : 0,
      aboveAvgWithClan,
      clanTop3WithMe, // 최근 20경기 내역 중 함께 플레이한 클랜원 TOP3 닉네임

      // 8. 시너지 분석 (같이 자주한 팀원)
      synergyAnalysis: synergyAnalysis, // [{name, togetherCount, togetherWinRate, togetherAvgRank, togetherAvgDamage}]
      synergyTop:
        clanTop3WithMe.length > 0
          ? clanTop3WithMe.slice(0, 3).map((member) => ({ name: member }))
          : clanInfo && clanInfo.members.length > 1
            ? clanInfo.members
                .filter((m) => m !== lowerNickname)
                .slice(0, 3)
                .map((member) => ({ name: member, togetherCount: 0 }))
            : [],
      clanSynergyStatusList:
        clanTop3WithMe.length > 0
          ? []
          : clanInfo && clanInfo.members.length > 1
            ? ['분석 필요']
            : ['혼자'],

      // 9. 추천 스쿼드
      recommendedSquad, // {members, score, isNew}
      bestSquad,

      // 10. 선택적 확장 요소
      killMapTelemetryUrl, // 킬맵/이동맵 URL (예시)
      timeActivityGraph, // {morning, afternoon, night}
    });
  } catch (err) {
    console.error('[API FATAL ERROR] API 처리 중 치명적인 오류 발생:', err);
    console.error(
      '[API FATAL ERROR] 오류 객체 상세:',
      JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
    );
    res.status(500).json({
      error: '서버 내부 오류가 발생했습니다.',
      details: err.message || '알 수 없는 오류',
    });
  }
}
