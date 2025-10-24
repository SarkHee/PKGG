// scripts/analyze-clan-regions.js
// 기존 클랜들의 지역을 분석하고 업데이트하는 스크립트

import { PrismaClient } from '@prisma/client';
import { analyzeClanRegion } from '../utils/clanRegionAnalyzer.js';

const prisma = new PrismaClient();

async function analyzeClanRegions() {
  console.log('🌍 클랜 지역 분석 시작...\n');

  try {
    // 모든 클랜과 해당 멤버들을 가져오기
    const clans = await prisma.clan.findMany({
      include: {
        members: {
          select: {
            nickname: true,
            pubgShardId: true,
          },
        },
      },
    });

    console.log(`📋 분석할 클랜: ${clans.length}개\n`);

    let updatedCount = 0;

    for (const [index, clan] of clans.entries()) {
      console.log(
        `🎯 [${index + 1}/${clans.length}] ${clan.name} (${clan.pubgClanTag || 'N/A'}) 분석 중...`
      );

      // 지역 분석 수행
      const regionAnalysis = analyzeClanRegion(clan, clan.members);

      console.log(
        `    🌍 결과: ${regionAnalysis.region} (신뢰도: ${Math.round(regionAnalysis.confidence * 100)}%)`
      );

      if (regionAnalysis.reasons.length > 0) {
        console.log(`    📝 근거: ${regionAnalysis.reasons[0]}`);
      }

      // 세부 분석 정보 출력
      if (regionAnalysis.details) {
        const { textAnalysis, nicknameAnalysis, shardAnalysis } =
          regionAnalysis.details;

        if (textAnalysis.region !== 'UNKNOWN') {
          console.log(
            `       - 텍스트 분석: ${textAnalysis.region} (${textAnalysis.reason})`
          );
        }

        if (nicknameAnalysis.region !== 'UNKNOWN') {
          console.log(
            `       - 닉네임 분석: ${nicknameAnalysis.region} (${nicknameAnalysis.reason})`
          );
        }

        if (shardAnalysis.primaryShard) {
          console.log(
            `       - 주요 Shard: ${shardAnalysis.primaryShard} (${Math.round(shardAnalysis.confidence * 100)}%)`
          );
        }
      }

      // DB 업데이트
      await prisma.clan.update({
        where: { id: clan.id },
        data: {
          region: regionAnalysis.region,
          isKorean: regionAnalysis.isKorean,
          shardDistribution: JSON.stringify(regionAnalysis.shardDistribution),
          lastSynced: new Date(),
        },
      });

      updatedCount++;
      console.log(`    ✅ 업데이트 완료\n`);
    }

    console.log('🎉 지역 분석 완료!');
    console.log(`📊 총 업데이트된 클랜: ${updatedCount}개`);

    // 지역별 통계 출력
    const regionStats = await prisma.clan.groupBy({
      by: ['region'],
      _count: {
        region: true,
      },
    });

    console.log('\n📈 지역별 클랜 분포:');
    regionStats.forEach((stat) => {
      const regionName =
        {
          KR: '🇰🇷 한국',
          CN: '🇨🇳 중국',
          JP: '🇯🇵 일본',
          RU: '🇷🇺 러시아',
          EU: '🇪🇺 유럽',
          NA: '🇺🇸 북미',
          SEA: '🌏 동남아시아',
          BR: '🇧🇷 브라질',
          ME: '🌍 중동',
          MIXED: '🌐 혼합/국제',
          UNKNOWN: '❓ 미분류',
        }[stat.region] || stat.region;

      console.log(`   ${regionName}: ${stat._count.region}개`);
    });

    // 한국 클랜 통계
    const koreanClansCount = await prisma.clan.count({
      where: { isKorean: true },
    });

    console.log(`\n🇰🇷 한국 클랜 총 ${koreanClansCount}개`);
  } catch (error) {
    console.error('❌ 지역 분석 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
analyzeClanRegions();
