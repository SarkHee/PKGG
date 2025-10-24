// scripts/detailed-member-analysis.js
// 각 클랜의 멤버들을 상세 분석하여 지역 분류 정확도를 높이는 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function detailedMemberAnalysis() {
  console.log('🔍 멤버 닉네임 상세 분석 시작...\n');

  try {
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

    for (const clan of clans) {
      console.log(
        `🎯 ${clan.name} (${clan.pubgClanTag || 'N/A'}) - ${clan.members.length}명`
      );
      console.log(`   현재 분류: ${clan.region} (한국: ${clan.isKorean})`);

      // 멤버별 닉네임 패턴 분석
      const patterns = {
        korean: [],
        korean_style: [],
        english: [],
        mixed: [],
        numbers_heavy: [],
      };

      clan.members.forEach((member) => {
        const nick = member.nickname;

        // 한글 포함
        if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(nick)) {
          patterns.korean.push(nick);
        }
        // 한국 스타일 패턴
        else if (
          /_[0-9]+$/.test(nick) || // 언더스코어+숫자
          /^[A-Za-z]+_[A-Za-z0-9_-]+/.test(nick) || // 영어_조합
          /^[A-Z]{2,4}_/.test(nick) || // 대문자+언더스코어
          /[0-9]{2,}$/.test(nick) || // 숫자로 끝
          /-{1,2}/.test(nick) || // 하이픈 사용
          /^[a-z]+[0-9]{2,6}$/.test(nick) || // 소문자+숫자
          /[A-Z][a-z]+[A-Z]/.test(nick) // CamelCase
        ) {
          patterns.korean_style.push(nick);
        }
        // 숫자 비중이 높은 닉네임
        else if (/[0-9]{3,}/.test(nick)) {
          patterns.numbers_heavy.push(nick);
        }
        // 순수 영어 스타일
        else if (/^[A-Za-z]+$/.test(nick)) {
          patterns.english.push(nick);
        }
        // 혼합
        else {
          patterns.mixed.push(nick);
        }
      });

      console.log('   📊 닉네임 패턴 분석:');
      console.log(
        `      한글: ${patterns.korean.length}개 (${patterns.korean.slice(0, 3).join(', ')}${patterns.korean.length > 3 ? '...' : ''})`
      );
      console.log(
        `      한국스타일: ${patterns.korean_style.length}개 (${patterns.korean_style.slice(0, 3).join(', ')}${patterns.korean_style.length > 3 ? '...' : ''})`
      );
      console.log(
        `      영어: ${patterns.english.length}개 (${patterns.english.slice(0, 3).join(', ')}${patterns.english.length > 3 ? '...' : ''})`
      );
      console.log(
        `      숫자비중: ${patterns.numbers_heavy.length}개 (${patterns.numbers_heavy.slice(0, 3).join(', ')}${patterns.numbers_heavy.length > 3 ? '...' : ''})`
      );
      console.log(
        `      혼합: ${patterns.mixed.length}개 (${patterns.mixed.slice(0, 3).join(', ')}${patterns.mixed.length > 3 ? '...' : ''})`
      );

      const totalKoreanLike =
        patterns.korean.length + patterns.korean_style.length;
      const koreanRatio = totalKoreanLike / clan.members.length;

      console.log(
        `   🇰🇷 한국 관련 비율: ${Math.round(koreanRatio * 100)}% (${totalKoreanLike}/${clan.members.length})`
      );

      // 지역 추천
      let recommendedRegion = 'MIXED';
      let confidence = 0.3;

      if (koreanRatio >= 0.7) {
        recommendedRegion = 'KR';
        confidence = 0.9;
      } else if (koreanRatio >= 0.5) {
        recommendedRegion = 'KR';
        confidence = 0.7;
      } else if (koreanRatio >= 0.3) {
        recommendedRegion = 'KR';
        confidence = 0.5;
      } else if (patterns.english.length >= clan.members.length * 0.7) {
        recommendedRegion = 'NA';
        confidence = 0.6;
      }

      console.log(
        `   💡 추천 분류: ${recommendedRegion} (신뢰도: ${Math.round(confidence * 100)}%)`
      );

      if (recommendedRegion !== clan.region) {
        console.log(`   🔄 현재 분류(${clan.region})와 다름 - 업데이트 권장`);
      }

      console.log('');
    }

    console.log('🎉 상세 분석 완료!');
  } catch (error) {
    console.error('❌ 상세 분석 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
detailedMemberAnalysis();
