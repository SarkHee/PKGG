// scripts/test-clan-endpoints.js
// 클랜 관련 API 엔드포인트 테스트

import axios from 'axios';

const API_KEY =
  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const UBD_CLAN_ID = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
const SHARD = 'steam';

async function testApiEndpoint(url, description) {
  console.log(`\n🔍 ${description}`);
  console.log(`📡 URL: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
      timeout: 15000,
    });

    console.log(`✅ 성공 (${response.status})`);
    console.log(`📊 데이터 구조:`);

    if (response.data.data) {
      if (Array.isArray(response.data.data)) {
        console.log(`   - data: 배열 (${response.data.data.length}개 항목)`);
        if (response.data.data.length > 0) {
          console.log(
            `   - 첫 번째 항목 keys: ${Object.keys(response.data.data[0]).join(', ')}`
          );
          if (response.data.data[0].attributes) {
            console.log(
              `   - 첫 번째 항목 attributes: ${Object.keys(response.data.data[0].attributes).join(', ')}`
            );
          }
        }
      } else {
        console.log(`   - data: 객체`);
        console.log(
          `   - data keys: ${Object.keys(response.data.data).join(', ')}`
        );
        if (response.data.data.attributes) {
          console.log(
            `   - attributes: ${Object.keys(response.data.data.attributes).join(', ')}`
          );
        }
        if (response.data.data.relationships) {
          console.log(
            `   - relationships: ${Object.keys(response.data.data.relationships).join(', ')}`
          );
        }
      }
    }

    if (response.data.included) {
      console.log(
        `   - included: 배열 (${response.data.included.length}개 항목)`
      );
      if (response.data.included.length > 0) {
        const types = [
          ...new Set(response.data.included.map((item) => item.type)),
        ];
        console.log(`   - included types: ${types.join(', ')}`);
      }
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ 실패 (${error.response?.status || 'NETWORK_ERROR'})`);
    if (error.response?.status === 404) {
      console.log(
        `   - 404: 엔드포인트가 존재하지 않거나 리소스를 찾을 수 없음`
      );
    } else if (error.response?.status === 429) {
      console.log(`   - 429: API 요청 한도 초과`);
    } else {
      console.log(`   - 오류: ${error.message}`);
    }
    return { success: false, error: error.response?.status || 'UNKNOWN' };
  }
}

async function testClanEndpoints() {
  console.log('🧪 PUBG 클랜 API 엔드포인트 테스트\n');
  console.log(`🎯 타겟 클랜: ${UBD_CLAN_ID}`);
  console.log(`🌍 샤드: ${SHARD}`);

  // 테스트할 엔드포인트들
  const endpoints = [
    {
      url: `https://api.pubg.com/shards/${SHARD}/clans/${UBD_CLAN_ID}`,
      description: '1. 클랜 기본 정보',
    },
    {
      url: `https://api.pubg.com/shards/${SHARD}/clans/${UBD_CLAN_ID}/members`,
      description: '2. 클랜 멤버 목록',
    },
    {
      url: `https://api.pubg.com/shards/${SHARD}/clans/${UBD_CLAN_ID}?include=members`,
      description: '3. 클랜 정보 + 멤버 포함 (include)',
    },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // API 요청 간격
    const result = await testApiEndpoint(endpoint.url, endpoint.description);
    results.push({ ...endpoint, result });
  }

  // 결과 요약
  console.log('\n\n📋 테스트 결과 요약:');
  results.forEach((test, index) => {
    const status = test.result.success ? '✅ 성공' : '❌ 실패';
    console.log(`${index + 1}. ${test.description}: ${status}`);
  });

  // 성공한 엔드포인트에서 멤버 정보 찾기
  console.log('\n🔍 멤버 정보 분석:');
  for (const test of results) {
    if (test.result.success) {
      const data = test.result.data;

      // 멤버 정보가 포함되어 있는지 확인
      if (data.included) {
        const members = data.included.filter(
          (item) => item.type === 'member' || item.type === 'player'
        );
        if (members.length > 0) {
          console.log(`\n📍 ${test.description}에서 멤버 정보 발견:`);
          console.log(`   - 멤버 수: ${members.length}명`);
          console.log(`   - 타입: ${members[0].type}`);
          if (members[0].attributes) {
            console.log(
              `   - 멤버 속성: ${Object.keys(members[0].attributes).join(', ')}`
            );
          }

          // 처음 3명의 멤버 정보 표시
          console.log(`\n   처음 3명의 멤버:`);
          members.slice(0, 3).forEach((member, index) => {
            const name =
              member.attributes?.name ||
              member.attributes?.nickname ||
              member.id;
            console.log(`   ${index + 1}. ${name} (ID: ${member.id})`);
          });
        }
      }

      // relationships에서 멤버 정보 확인
      if (data.data?.relationships?.members) {
        const memberRefs = data.data.relationships.members.data;
        if (memberRefs && memberRefs.length > 0) {
          console.log(`\n📍 ${test.description}에서 멤버 참조 발견:`);
          console.log(`   - 멤버 참조 수: ${memberRefs.length}개`);
          console.log(`   - 참조 타입: ${memberRefs[0].type}`);

          // 처음 3개의 참조 표시
          console.log(`\n   처음 3개의 멤버 참조:`);
          memberRefs.slice(0, 3).forEach((ref, index) => {
            console.log(`   ${index + 1}. ID: ${ref.id}, Type: ${ref.type}`);
          });
        }
      }
    }
  }
}

// 실행
testClanEndpoints();
