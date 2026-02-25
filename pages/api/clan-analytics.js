// pages/api/clan-analytics.js
// 클랜 종합 통계 및 분석 API

import { PrismaClient } from '@prisma/client';
import { analyzeClanRegion } from '../../utils/clanRegionAnalyzer.js';
import { calculateMMR } from '../../utils/mmrCalculator.js';

const prisma = new PrismaClient();

// 개인 플레이어 분석 로직을 클랜에 적용한 향상된 플레이 스타일 분석 함수
function analyzeIndividualPlayStyle(memberStats) {
  if (!memberStats || Object.keys(memberStats).length === 0) return '분석 불가';

  const {
    avgDamage = 0,
    avgKills = 0,
    avgAssists = 0,
    avgSurviveTime = 0,
    winRate = 0,
    top10Rate = 0,
  } = memberStats;

  // 개인 플레이어와 동일한 14가지 유형 분석 (조건을 클랜 멤버 평균 스탯에 맞게 조정)

  // 극단적 공격형: 높은 딜량, 짧은 생존시간, 높은 킬
  if (avgDamage >= 400 && avgSurviveTime <= 600 && avgKills >= 3)
    return '☠️ 극단적 공격형';

  // 핫드롭 마스터: 극초반 높은 킬수와 딜량
  if (avgSurviveTime <= 90 && avgKills >= 2 && avgDamage >= 200)
    return '🌋 핫드롭 마스터';

  // 스피드 파이터: 짧은 시간 내 높은 킬수
  if (avgSurviveTime <= 120 && avgKills >= 2.5) return '⚡ 스피드 파이터';

  // 초반 어그로꾼: 매우 짧은 생존시간에도 높은 딜량
  if (avgSurviveTime <= 100 && avgDamage >= 180) return '🔥 초반 어그로꾼';

  // 빠른 청소부: 초반 낮은 킬이지만 적당한 딜량
  if (
    avgSurviveTime <= 120 &&
    avgKills >= 1 &&
    avgKills < 2 &&
    avgDamage >= 120
  )
    return '🧹 빠른 청소부';

  // 초반 돌격형: 매우 짧은 생존시간에도 킬/딜 확보 (기본형)
  if (avgSurviveTime <= 120 && (avgKills >= 1 || avgDamage >= 100))
    return '🚀 초반 돌격형';

  // 극단적 수비형: 낮은 딜량, 긴 생존시간
  if (avgDamage <= 100 && avgSurviveTime >= 1200) return '🛡️ 극단적 수비형';

  // 후반 존버형: 낮은 딜량과 킬, 긴 생존시간
  if (avgDamage <= 150 && avgSurviveTime >= 1200 && avgKills <= 1)
    return '🏕️ 후반 존버형';

  // 장거리 정찰러: 낮은 교전, 긴 생존
  if (avgKills <= 1 && avgDamage <= 150 && avgSurviveTime >= 800)
    return '🏃 장거리 정찰러';

  // 저격 위주: 낮은 딜량이지만 긴 생존과 킬 확보
  if (avgDamage <= 150 && avgSurviveTime >= 1000 && avgKills >= 1)
    return '🎯 저격 위주';

  // 중거리 안정형: 중간 딜량과 적당한 생존시간
  if (
    avgDamage > 150 &&
    avgDamage <= 250 &&
    avgSurviveTime > 800 &&
    avgSurviveTime <= 1200
  )
    return '⚖️ 중거리 안정형';

  // 지속 전투형: 높은 딜량, 긴 생존, 높은 킬
  if (avgDamage >= 250 && avgSurviveTime >= 800 && avgKills >= 2)
    return '🔥 지속 전투형';

  // 유령 생존자: 킬/어시스트 없이 높은 순위 달성
  if (
    avgKills === 0 &&
    avgAssists === 0 &&
    avgSurviveTime >= 1000 &&
    top10Rate >= 40
  )
    return '👻 유령 생존자';

  // 도박형 파밍러: 매우 짧은 생존시간, 최소 활동
  if (avgSurviveTime <= 120 && avgDamage <= 50 && avgKills === 0)
    return '🪂 도박형 파밍러';

  // 순간광폭형: 높은 딜량, 짧은 생존, 높은 킬
  if (avgDamage >= 300 && avgSurviveTime <= 400 && avgKills >= 2)
    return '📸 순간광폭형';

  // 치명적 저격수: 높은 딜량과 킬
  if (avgDamage >= 200 && avgKills >= 2) return '🦉 치명적 저격수';

  // 전략적 어시스트러: 높은 어시스트, 낮은 킬, 높은 딜량, 긴 생존
  if (
    avgAssists >= 3 &&
    avgKills <= 1 &&
    avgDamage >= 200 &&
    avgSurviveTime >= 800
  )
    return '🧠 전략적 어시스트러';

  // 고효율 승부사: 높은 킬, 상대적으로 낮은 딜량
  if (avgKills >= 3 && avgDamage <= 200) return '📊 고효율 승부사';

  // 최종 안전망 - 딜량 기준으로 분류
  if (avgDamage >= 200) return '🔥 공격형';
  if (avgSurviveTime >= 600) return '🛡️ 생존형';
  return '🏃 이동형';
}

// 향상된 클랜 플레이 스타일 분석 함수
function analyzePlayStyle(members, avgStats) {
  if (!members || members.length === 0) return null;

  // 각 멤버의 개별 플레이스타일 분석
  const memberPlayStyles = members.map((member) => {
    return analyzeIndividualPlayStyle({
      avgDamage: member.avgDamage || 0,
      avgKills: member.avgKills || 0,
      avgAssists: member.avgAssists || 0,
      avgSurviveTime: member.avgSurviveTime || 0,
      winRate: member.winRate || 0,
      top10Rate: member.top10Rate || 0,
    });
  });

  // 스타일 분포 계산
  const styleCount = {};
  memberPlayStyles.forEach((style) => {
    styleCount[style] = (styleCount[style] || 0) + 1;
  });

  // 가장 많은 스타일을 주 스타일로 결정
  const sortedStyles = Object.entries(styleCount).sort(([, a], [, b]) => b - a);

  const primaryStyle = sortedStyles[0] ? sortedStyles[0][0] : '분석 불가';
  const primaryCount = sortedStyles[0] ? sortedStyles[0][1] : 0;
  const totalMembers = memberPlayStyles.length;

  // 다양성 계산 - 스타일 분포 기반 (더 정교하게)
  const uniqueStyles = Object.keys(styleCount).length;
  let variety = '';
  if (uniqueStyles >= totalMembers * 0.8) {
    variety = '매우 높음';
  } else if (uniqueStyles >= totalMembers * 0.6) {
    variety = '높음';
  } else if (uniqueStyles >= totalMembers * 0.4) {
    variety = '보통';
  } else {
    variety = '낮음';
  }

  // 클랜 전체 통계 기반 2차 분류
  const avgDamage = parseFloat(avgStats.damage);
  const avgKills = parseFloat(avgStats.kills);
  const winRate = parseFloat(avgStats.winRate);
  const top10Rate = parseFloat(avgStats.top10Rate);

  let secondary = '';
  if (avgDamage >= 300) {
    secondary = '고딜량';
  } else if (avgDamage >= 200) {
    secondary = '중딜량';
  } else if (avgDamage >= 120) {
    secondary = '저딜량';
  } else {
    secondary = '최소딜량';
  }

  // 특수 특성 판별 (기존 로직 유지하되 향상)
  let special = null;
  if (winRate >= 15 && avgKills >= 2.5) {
    special = '승부사';
  } else if (top10Rate >= 40 && avgStats.avgSurviveTime >= 1000) {
    special = '생존왕';
  } else if (avgKills >= 3.0 && avgDamage >= 350) {
    special = '핫드롭';
  }

  // 주요 스타일에서 이모지 제거하여 텍스트만 추출
  const primaryText = primaryStyle.replace(/[^\w\s가-힣]/g, '').trim();

  return {
    primary: primaryText || '혼합',
    secondary,
    special,
    variety,
    memberStyles: memberPlayStyles, // 개별 멤버 스타일 추가
    styleDistribution: styleCount, // 스타일 분포 추가
    dominance: Math.round((primaryCount / totalMembers) * 100), // 주요 스타일 비중 (%)
    description: generateStyleDescription(
      primaryText,
      secondary,
      special,
      avgStats
    ),
  };
}

// 스타일 다양성 계산
function calculateStyleVariety(members) {
  const styles = members.map((m) => {
    if (m.avgKills >= 2.0) return 'aggressive';
    if (m.avgKills >= 1.0) return 'balanced';
    return 'survival';
  });

  const uniqueStyles = [...new Set(styles)];
  if (uniqueStyles.length === 1) return '통일';
  if (uniqueStyles.length === 2) return '혼합';
  return '다양';
}

// 향상된 스타일 설명 생성
function generateStyleDescription(primary, secondary, special, stats) {
  let desc = `${primary} ${secondary}형`;
  if (special) desc += ` (${special})`;

  // 주요 스타일별 상세 설명
  let detail = '';

  // 확장된 플레이 스타일 설명
  switch (primary) {
    case '극단적 공격형':
      detail = ' - 최고 딜량과 킬을 추구하는 초공격적 클랜';
      break;
    case '핫드롭 마스터':
      detail = ' - 극초반 핫드롭 지역을 제압하는 전문 클랜';
      break;
    case '스피드 파이터':
      detail = ' - 짧은 시간 내 높은 킬수를 달성하는 빠른 전투 클랜';
      break;
    case '초반 어그로꾼':
      detail = ' - 매우 짧은 시간에 높은 딜량을 뽑아내는 어그로 클랜';
      break;
    case '빠른 청소부':
      detail = ' - 초반 효율적인 교전으로 빠르게 정리하는 클랜';
      break;
    case '초반 돌격형':
      detail = ' - 게임 시작부터 적극적인 교전을 벌이는 클랜';
      break;
    case '극단적 수비형':
      detail = ' - 교전을 최대한 피하고 안전한 플레이를 선호';
      break;
    case '후반 존버형':
      detail = ' - 초반 교전을 피하고 후반 랭킹에 집중';
      break;
    case '장거리 정찰러':
      detail = ' - 넓은 맵 이동과 정찰을 중시하는 클랜';
      break;
    case '저격 위주':
      detail = ' - 원거리 저격과 정밀한 교전을 선호';
      break;
    case '중거리 안정형':
      detail = ' - 중거리 교전에서 안정적인 성과를 내는 클랜';
      break;
    case '지속 전투형':
      detail = ' - 긴 교전을 통해 높은 딜량과 킬을 확보';
      break;
    case '유령 생존자':
      detail = ' - 교전 없이도 높은 순위를 달성하는 신비로운 클랜';
      break;
    case '도박형 파밍러':
      detail = ' - 위험한 지역에서 빠른 파밍을 시도하는 클랜';
      break;
    case '순간광폭형':
      detail = ' - 짧은 시간에 폭발적인 화력을 집중하는 클랜';
      break;
    case '치명적 저격수':
      detail = ' - 높은 킬과 딜량으로 적을 제압하는 정밀 클랜';
      break;
    case '전략적 어시스트러':
      detail = ' - 팀워크와 어시스트를 중시하는 협력형 클랜';
      break;
    case '고효율 승부사':
      detail = ' - 적은 딜량으로도 많은 킬을 달성하는 효율형 클랜';
      break;
    case '공격형':
      detail = ' - 전반적으로 공격적인 성향을 보이는 클랜';
      break;
    case '생존형':
      detail = ' - 생존과 안정성을 중시하는 클랜';
      break;
    case '이동형':
      detail = ' - 이동과 포지셔닝을 중시하는 클랜';
      break;
    default:
      detail = ' - 다양한 스타일이 혼재하는 클랜';
  }

  return desc + detail;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { region, isKorean, search } = req.query;

    console.log('🔍 Query parameters:', { region, isKorean, search });

    // 기본 조건
    let whereCondition = {};

    // 지역 필터링
    if (region && region !== 'ALL') {
      whereCondition.region = region;
    }

    // 한국 클랜 필터링
    if (isKorean !== undefined) {
      whereCondition.isKorean = isKorean === 'true';
    }

    // 검색 조건
    if (search && search.trim()) {
      whereCondition.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { pubgClanTag: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    console.log('📋 Where condition:', JSON.stringify(whereCondition, null, 2));

    // 1. 전체 클랜 개요 (필터 적용)
    // totalClans는 validClans.length로 대체 사용 (중복 제거 후 정확한 수치)
    await prisma.clan.count({ where: whereCondition }); // DB 카운트 (참고용)
    const totalMembers = await prisma.clanMember.count({
      where: {
        clan: whereCondition,
      },
    });

    // 2. 클랜별 통계 (필터 적용)
    const clanStats = await prisma.clan.findMany({
      where: whereCondition,
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          select: {
            score: true,
            avgDamage: true,
            avgKills: true,
            avgAssists: true,
            avgSurviveTime: true,
            winRate: true,
            top10Rate: true,
            pubgPlayerId: true,
            nickname: true,
            pubgClanId: true,
            lastUpdated: true,
          },
        },
      },
    });

    // 3. 클랜별 지역 정보 업데이트 (자동 분류)
    // map 대신 for...of 루프 사용하여 비동기 작업 처리
    for (const clan of clanStats) {
      const members = clan.members;

      // 지역이 없거나 'UNKNOWN'인 경우 지역 자동 분류 실행
      if ((!clan.region || clan.region === 'UNKNOWN') && members.length > 0) {
        try {
          // 멤버 정보를 기반으로 지역 분석
          const regionAnalysis = analyzeClanRegion(
            {
              name: clan.name,
              pubgClanTag: clan.pubgClanTag,
            },
            members
          );

          if (
            regionAnalysis &&
            regionAnalysis.region &&
            regionAnalysis.region !== 'UNKNOWN'
          ) {
            // 데이터베이스에 지역 정보 업데이트
            await prisma.clan.update({
              where: { id: clan.id },
              data: {
                region: regionAnalysis.region,
                isKorean: regionAnalysis.region === 'KR',
              },
            });

            // 현재 메모리 내 객체도 업데이트
            clan.region = regionAnalysis.region;
            clan.isKorean = regionAnalysis.region === 'KR';

            console.log(
              `클랜 '${clan.name}' 지역 자동 분류: ${regionAnalysis.region}`
            );
          }
        } catch (error) {
          console.error(`클랜 '${clan.name}' 지역 분류 중 오류 발생:`, error);
        }
      }
    }

    // 3-0. pubgClanId 기준 중복 클랜 제거 (동일 PUBG 클랜이 DB에 중복 저장된 경우)
    const seenPubgIds = new Map();
    const dedupedClanStats = [];
    for (const clan of clanStats) {
      const key = clan.pubgClanId || `__name__${clan.name}`;
      if (!seenPubgIds.has(key)) {
        seenPubgIds.set(key, clan);
        dedupedClanStats.push(clan);
      } else {
        // 더 많은 멤버를 가진 쪽 유지
        const prev = seenPubgIds.get(key);
        if (clan.members.length > prev.members.length) {
          seenPubgIds.set(key, clan);
          const idx = dedupedClanStats.indexOf(prev);
          if (idx !== -1) dedupedClanStats[idx] = clan;
        }
      }
    }

    // 스테일 기준: 90일 이상 미업데이트 멤버는 "만료 후보"로 분류
    const STALE_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 3-1. 클랜별 평균 및 플레이 스타일 계산
    const clanAnalytics = dedupedClanStats.map((clan) => {
      // 1차: pubgClanId 교차 검증 (최신화된 탈퇴자 자동 제외)
      // - 최신화 시 savePlayerToDatabase가 clanId + pubgClanId를 모두 갱신
      // - 새 클랜/무소속으로 업데이트된 유저는 pubgClanId가 달라져 여기서 자동 제외
      const pubgConfirmed = clan.pubgClanId
        ? clan.members.filter((m) => m.pubgClanId === clan.pubgClanId)
        : clan.members;

      // 2차: 90일 이상 미업데이트 멤버 분리 (최신화 안 된 탈퇴자 후보)
      const activeMembers = pubgConfirmed.filter(
        (m) => !m.lastUpdated || now - new Date(m.lastUpdated).getTime() <= STALE_THRESHOLD_MS
      );
      const staleMembers = pubgConfirmed.filter(
        (m) => m.lastUpdated && now - new Date(m.lastUpdated).getTime() > STALE_THRESHOLD_MS
      );

      // 활성 멤버가 1명 이상이면 활성 우선, 없으면 스테일 포함 (클랜 자체가 오래됐을 수 있음)
      const confirmedMembers = activeMembers.length > 0 ? activeMembers : pubgConfirmed;

      // 동일 pubgPlayerId(없으면 nickname)를 가진 중복 멤버 제거 — 점수가 높은 쪽 유지
      const seenKeys = new Map();
      for (const m of confirmedMembers) {
        const key = m.pubgPlayerId || `nick_${m.nickname}`;
        if (!seenKeys.has(key)) {
          seenKeys.set(key, m);
        } else {
          if ((m.score || 0) > (seenKeys.get(key).score || 0)) {
            seenKeys.set(key, m);
          }
        }
      }
      const members = Array.from(seenKeys.values());
      const memberCount = members.length;

      if (memberCount === 0) {
        return {
          id: clan.id,
          name: clan.name,
          tag: clan.pubgClanTag,
          region: clan.region,
          isKorean: clan.isKorean,
          level: clan.pubgClanLevel,
          apiMemberCount: clan.pubgMemberCount,
          dbMemberCount: memberCount,
          staleMemberCount: staleMembers.length,
          avgStats: null,
          playStyle: null,
        };
      }

      const avgDamage  = members.reduce((sum, m) => sum + m.avgDamage, 0) / memberCount;
      const avgKills   = members.reduce((sum, m) => sum + m.avgKills, 0) / memberCount;
      const avgWinRate = members.reduce((sum, m) => sum + m.winRate, 0) / memberCount;
      const avgTop10   = members.reduce((sum, m) => sum + m.top10Rate, 0) / memberCount;

      const avgStats = {
        score: Math.round(
          members.reduce((sum, m) => sum + m.score, 0) / memberCount
        ),
        damage: Math.round(avgDamage),
        kills: avgKills.toFixed(1),
        winRate: avgWinRate.toFixed(1),
        top10Rate: avgTop10.toFixed(1),
        avgMMR: calculateMMR({
          avgDamage:  avgDamage,
          avgKills:   avgKills,
          winRate:    avgWinRate,
          top10Rate:  avgTop10,
        }),
      };

      // 플레이 스타일 분석
      const playStyle = analyzePlayStyle(members, avgStats);

      return {
        id: clan.id,
        name: clan.name,
        tag: clan.pubgClanTag,
        region: clan.region,
        isKorean: clan.isKorean,
        level: clan.pubgClanLevel,
        apiMemberCount: clan.pubgMemberCount,
        dbMemberCount: memberCount,
        staleMemberCount: staleMembers.length,
        avgStats,
        playStyle,
      };
    });

    // DB 멤버가 1명 이상인 클랜만 유효 클랜으로 취급
    const validClans = clanAnalytics.filter(
      (clan) => clan.dbMemberCount > 0 && clan.name !== '무소속'
    );

    // MMR 기준 내림차순 정렬 헬퍼
    const byMMR = (a, b) => (b.avgStats?.avgMMR || 0) - (a.avgStats?.avgMMR || 0);

    // 4. 상위 클랜 랭킹 — 클랜 MMR 기준
    const topClans = validClans
      .filter((clan) => clan.avgStats?.avgMMR)
      .sort(byMMR)
      .slice(0, 10);

    // 4-1. 전체 클랜 랭킹 (검색용) — MMR 기준
    const allRankedClans = validClans
      .filter((clan) => clan.avgStats?.avgMMR)
      .sort(byMMR)
      .map((clan, index) => ({
        ...clan,
        rank: index + 1,
      }));

    // 5. 클랜 레벨별 분포 (유효 클랜 기준)
    const levelDistribution = {};
    validClans.forEach((clan) => {
      const level = clan.level || 0;
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });

    // 6. 멤버 수별 분포 (유효 클랜 기준)
    const memberDistribution = {
      small: validClans.filter((c) => c.apiMemberCount <= 10).length,
      medium: validClans.filter(
        (c) => c.apiMemberCount > 10 && c.apiMemberCount <= 30
      ).length,
      large: validClans.filter((c) => c.apiMemberCount > 30).length,
    };

    return res.status(200).json({
      overview: {
        totalClans: validClans.length,
        totalMembers,
        avgMembersPerClan: validClans.length > 0 ? Math.round(totalMembers / validClans.length) : 0,
      },
      rankings: {
        topClansByScore: topClans,
        allRankedClans: allRankedClans,
      },
      distributions: {
        byLevel: levelDistribution,
        byMemberCount: memberDistribution,
      },
      // 전체 클랜 목록도 MMR 기준 (MMR 없는 클랜은 맨 뒤)
      allClans: [...validClans].sort(byMMR),
    });
  } catch (error) {
    console.error('클랜 분석 오류:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}
