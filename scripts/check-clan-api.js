// scripts/check-clan-api.js
// 클랜 API 상태를 확인하는 스크립트

import axios from 'axios';

const API_KEY =
  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

async function checkClanApi() {
  console.log('🔍 PUBG 클랜 API 상태 확인...\n');

  const clanId = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  // 1. 클랜 정보 확인
  console.log('📋 클랜 정보 확인:');
  for (const shard of shards) {
    try {
      console.log(`   ${shard} 샤드 시도 중...`);
      const response = await axios.get(
        `https://api.pubg.com/shards/${shard}/clans/${clanId}`,
        {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
          timeout: 10000,
        }
      );

      console.log(`   ✅ ${shard}에서 클랜 발견!`);
      console.log(`      이름: ${response.data.data.attributes.clanName}`);
      console.log(`      태그: ${response.data.data.attributes.clanTag}`);
      console.log(`      레벨: ${response.data.data.attributes.clanLevel}`);
      console.log(
        `      멤버 수: ${response.data.data.attributes.clanMemberCount}명`
      );

      // 멤버 목록 API 테스트
      console.log(`\n👥 ${shard} 샤드에서 멤버 목록 확인:`);
      try {
        const membersResponse = await axios.get(
          `https://api.pubg.com/shards/${shard}/clans/${clanId}/members`,
          {
            headers: {
              Authorization: API_KEY,
              Accept: 'application/vnd.api+json',
            },
            timeout: 10000,
          }
        );

        console.log(
          `   ✅ 멤버 목록 API 성공: ${membersResponse.data.data.length}명`
        );

        // 첫 5명의 멤버 정보 출력
        console.log(`   🔍 첫 5명 멤버 샘플:`);
        for (
          let i = 0;
          i < Math.min(5, membersResponse.data.data.length);
          i++
        ) {
          const member = membersResponse.data.data[i];
          console.log(`      ${i + 1}. ID: ${member.id}`);

          // 플레이어 상세 정보도 확인
          try {
            const playerResponse = await axios.get(
              `https://api.pubg.com/shards/${shard}/players/${member.id}`,
              {
                headers: {
                  Authorization: API_KEY,
                  Accept: 'application/vnd.api+json',
                },
                timeout: 10000,
              }
            );
            console.log(
              `         닉네임: ${playerResponse.data.data.attributes.name}`
            );
          } catch (playerError) {
            console.log(
              `         닉네임 조회 실패: ${playerError.response?.status || playerError.message}`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        return {
          shard,
          membersCount: membersResponse.data.data.length,
          members: membersResponse.data.data,
        };
      } catch (membersError) {
        console.log(
          `   ❌ 멤버 목록 API 실패: ${membersError.response?.status || membersError.message}`
        );
      }
    } catch (clanError) {
      console.log(
        `   ❌ ${shard}: ${clanError.response?.status || clanError.message}`
      );
    }

    console.log('');
  }

  // 2. 대안: 알려진 UBD 멤버를 통해 클랜 확인
  console.log('\n🔍 대안: 알려진 멤버를 통한 클랜 확인');
  const knownMembers = ['parksrk', 'leeji0408', 'you_-me'];

  for (const nickname of knownMembers) {
    console.log(`\n👤 ${nickname} 확인:`);

    for (const shard of ['steam', 'kakao']) {
      try {
        const response = await axios.get(
          `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`,
          {
            headers: {
              Authorization: API_KEY,
              Accept: 'application/vnd.api+json',
            },
            timeout: 10000,
          }
        );

        if (response.data.data.length > 0) {
          const player = response.data.data[0];
          console.log(`   ✅ ${shard}에서 발견: ${player.attributes.name}`);
          console.log(`      클랜 ID: ${player.attributes.clanId || '없음'}`);

          if (player.relationships?.clan?.data?.id) {
            console.log(
              `      클랜 관계 ID: ${player.relationships.clan.data.id}`
            );
          }
        }
      } catch (error) {
        console.log(
          `   ❌ ${shard}: ${error.response?.status || error.message}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

checkClanApi();
