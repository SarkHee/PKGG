// scripts/add-sample-korean-clans.js
// 테스트용 한국 클랜 데이터를 추가하는 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleKoreanClans = [
  {
    name: '김치전사',
    leader: '김치마스터',
    description: '한국 최강 클랜',
    pubgClanTag: 'KIMCHI',
    pubgClanLevel: 5,
    pubgMemberCount: 25,
    region: 'KR',
    isKorean: true,
    members: [
      {
        nickname: '김치전사1',
        score: 2500,
        style: '공격형',
        avgDamage: 450.5,
        avgKills: 3.2,
      },
      {
        nickname: '김치전사2',
        score: 2300,
        style: '생존형',
        avgDamage: 380.2,
        avgKills: 2.8,
      },
      {
        nickname: '한국짱',
        score: 2700,
        style: '저격형',
        avgDamage: 520.0,
        avgKills: 3.8,
      },
      {
        nickname: '서울특별시',
        score: 2100,
        style: '지원형',
        avgDamage: 340.1,
        avgKills: 2.1,
      },
    ],
  },
  {
    name: 'Seoul Eagles',
    leader: '독수리왕',
    description: '서울 기반 프로 클랜',
    pubgClanTag: 'SEOUL',
    pubgClanLevel: 7,
    pubgMemberCount: 30,
    region: 'KR',
    isKorean: true,
    members: [
      {
        nickname: '서울독수리',
        score: 2800,
        style: '공격형',
        avgDamage: 480.3,
        avgKills: 3.5,
      },
      {
        nickname: '한강에서만났어',
        score: 2600,
        style: '생존형',
        avgDamage: 420.7,
        avgKills: 3.0,
      },
      {
        nickname: '경복궁가드',
        score: 2900,
        style: '저격형',
        avgDamage: 550.2,
        avgKills: 4.1,
      },
    ],
  },
  {
    name: 'Team Korea Pro',
    leader: '프로게이머',
    description: '한국 대표 e스포츠 팀',
    pubgClanTag: 'TKP',
    pubgClanLevel: 10,
    pubgMemberCount: 20,
    region: 'KR',
    isKorean: true,
    members: [
      {
        nickname: '프로게이머A',
        score: 3200,
        style: '극단적 공격형',
        avgDamage: 650.0,
        avgKills: 4.8,
      },
      {
        nickname: '프로게이머B',
        score: 3100,
        style: '지속 전투형',
        avgDamage: 620.5,
        avgKills: 4.5,
      },
      {
        nickname: '태극기전사',
        score: 3000,
        style: '치명적 저격수',
        avgDamage: 590.3,
        avgKills: 4.2,
      },
    ],
  },
  {
    name: 'Dragon Force',
    leader: '용의전사',
    description: '중국 최강 클랜',
    pubgClanTag: 'DRAGON',
    pubgClanLevel: 8,
    pubgMemberCount: 35,
    region: 'CN',
    isKorean: false,
    members: [
      {
        nickname: '龙战士',
        score: 2750,
        style: '공격형',
        avgDamage: 470.0,
        avgKills: 3.4,
      },
      {
        nickname: '北京狙击手',
        score: 2650,
        style: '저격형',
        avgDamage: 510.5,
        avgKills: 3.7,
      },
    ],
  },
];

async function addSampleClans() {
  console.log('🏗️  테스트용 클랜 데이터 추가 시작...\n');

  try {
    for (const [index, clanData] of sampleKoreanClans.entries()) {
      console.log(
        `🎯 [${index + 1}/${sampleKoreanClans.length}] ${clanData.name} 추가 중...`
      );

      // 클랜이 이미 존재하는지 확인
      const existingClan = await prisma.clan.findFirst({
        where: { name: clanData.name },
      });

      if (existingClan) {
        console.log(`    ⏭️  클랜이 이미 존재함, 스킵`);
        continue;
      }

      // 클랜 생성
      const clan = await prisma.clan.create({
        data: {
          name: clanData.name,
          leader: clanData.leader,
          description: clanData.description,
          announcement: null,
          memberCount: clanData.members.length,
          avgScore: Math.round(
            clanData.members.reduce((sum, m) => sum + m.score, 0) /
              clanData.members.length
          ),
          mainStyle: clanData.members[0].style,
          pubgClanTag: clanData.pubgClanTag,
          pubgClanLevel: clanData.pubgClanLevel,
          pubgMemberCount: clanData.pubgMemberCount,
          region: clanData.region,
          isKorean: clanData.isKorean,
          lastSynced: new Date(),
        },
      });

      console.log(`    ✅ 클랜 생성 완료 (ID: ${clan.id})`);

      // 멤버들 추가
      for (const memberData of clanData.members) {
        await prisma.clanMember.create({
          data: {
            nickname: memberData.nickname,
            score: memberData.score,
            style: memberData.style,
            avgDamage: memberData.avgDamage,
            avgKills: memberData.avgKills,
            avgAssists: Math.random() * 2, // 랜덤 어시스트
            avgSurviveTime: 800 + Math.random() * 400, // 랜덤 생존시간
            winRate: 15 + Math.random() * 25, // 랜덤 승률
            top10Rate: 30 + Math.random() * 40, // 랜덤 Top10 비율
            clanId: clan.id,
            pubgShardId: clanData.isKorean ? 'kakao' : 'steam', // 한국 클랜은 카카오
            lastUpdated: new Date(),
          },
        });
      }

      console.log(`    👥 멤버 ${clanData.members.length}명 추가 완료\n`);
    }

    console.log('🎉 테스트용 클랜 데이터 추가 완료!');

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
    console.error('❌ 클랜 데이터 추가 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
addSampleClans();
