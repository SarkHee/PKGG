// 포럼 샘플 데이터 추가 스크립트
// scripts/add-forum-sample-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addForumSampleData() {
  try {
    console.log('포럼 샘플 데이터 추가 중...');

    // 1. 포럼 카테고리 추가
    const categories = [
      {
        id: 'strategy',
        name: '전략 & 팁',
        description: 'PUBG 전략과 게임 팁을 공유하세요',
        icon: '🧠',
        color: '#3B82F6',
        order: 1
      },
      {
        id: 'recruitment',
        name: '클랜 모집',
        description: '클랜 멤버 모집 및 지원',
        icon: '👥',
        color: '#10B981',
        order: 2
      },
      {
        id: 'general',
        name: '자유 게시판',
        description: '자유로운 이야기를 나누세요',
        icon: '💬',
        color: '#8B5CF6',
        order: 3
      },
      {
        id: 'updates',
        name: '업데이트 & 뉴스',
        description: 'PUBG 업데이트 및 뉴스',
        icon: '📢',
        color: '#F59E0B',
        order: 4
      }
    ];

    for (const category of categories) {
      await prisma.forumCategory.upsert({
        where: { id: category.id },
        update: category,
        create: category
      });
    }

    console.log('✅ 포럼 카테고리 추가 완료');

    // 2. 샘플 게시글 추가
    const samplePosts = [
      {
        title: "초보자를 위한 PUBG 생존 가이드",
        content: `PUBG를 처음 시작하는 분들을 위한 생존 가이드를 작성했습니다.

## 1. 착지 지역 선택
- **인기 지역을 피하고 주변부에 착지**하세요
- 건물이 있는 곳을 목표로 하세요
- 차량이 있는 지역을 기억해두세요

## 2. 초반 아이템 파밍
- 무기와 방어구를 우선적으로 챙기세요
- 치료 아이템과 에너지 드링크를 확보하세요
- 가방을 빠르게 업그레이드하세요

## 3. 이동과 포지셔닝
- 자기장을 항상 체크하세요
- 높은 곳에서 주변을 관찰하세요
- 열린 공간에서의 이동을 최소화하세요

## 4. 교전 팁
- 확실하지 않으면 먼저 쏘지 마세요
- 엄폐물을 최대한 활용하세요
- 상황이 불리하면 도망치는 것도 전략입니다

이런 기본기를 익히시면 생존률이 크게 향상될 것입니다!`,
        author: "PUBG마스터",
        categoryId: "strategy",
        views: 1250,
        isPinned: true
      },
      {
        title: "랭크 시스템 분석 및 티어 올리는 법",
        content: `PUBG 랭크 시스템에 대해 자세히 분석해보겠습니다.

## 티어 시스템
Bronze → Silver → Gold → Platinum → Diamond → Master

## 랭크 포인트 획득 방식
- **킬 점수**: 킬 당 20-30 RP
- **순위 보너스**: TOP 10 진입 시 추가 RP
- **생존 시간 보너스**: 오래 생존할수록 더 많은 RP

## 티어 올리기 팁
1. 무작정 킬을 노리지 말고 안정적인 플레이
2. 팀플레이 중요 (듀오/스쿼드)
3. 핫드랍보다는 안정적인 착지
4. 자기장 타이밍 잘 맞추기

랭크업 화이팅! 💪`,
        author: "랭크킹",
        categoryId: "strategy",
        views: 890
      },
      {
        title: "UBD 클랜 모집합니다! 🔥",
        content: `안녕하세요! **UBD 클랜**에서 새로운 멤버를 모집합니다.

## 클랜 소개
- **클랜명**: UBD (Ultimate Battle Division)
- **현재 인원**: 45명
- **주요 활동**: 경쟁전, 클랜전, 스크림

## 모집 조건
- **티어**: 골드 이상
- **평균 딜량**: 150+ 
- **적극적인 참여 의지**
- **디스코드 사용 가능**

## 지원 방법
- 게임 내 클랜 검색: \`UBD\`
- 디스코드: UBD#1234
- 클랜장: parksrk

많은 지원 부탁드립니다! 함께 성장해요! 🎮`,
        author: "parksrk",
        categoryId: "recruitment",
        views: 456
      },
      {
        title: "오늘 치킨 3개 먹었어요! 🐔",
        content: `오늘 정말 운이 좋았나봅니다 ㅋㅋ

솔로 랭크에서 치킨 3개를 연속으로 먹었어요!

## 오늘의 하이라이트
1. **첫 번째 치킨**: 사녹에서 8킬 치킨
2. **두 번째 치킨**: 에란겐에서 6킬 치킨  
3. **세 번째 치킨**: 미라마에서 무려 12킬! 🔥

특히 마지막 게임은 정말 잘 풀렸어요. 
초반에 M416 + 8배경 조합을 얻고 시작했는데, 
중반부터 킬을 계속 쌓아서 12킬까지!

여러분도 오늘 좋은 게임 되세요! ✨`,
        author: "치킨헌터",
        categoryId: "general",
        views: 234
      },
      {
        title: "시즌 25 업데이트 정보 정리",
        content: `시즌 25 주요 업데이트 내용을 정리해드립니다.

## 주요 변경사항

### 🗺️ 새로운 맵
- **Rondo**: 소규모 맵으로 빠른 게임 진행
- 독특한 원형 구조로 새로운 전략 필요

### 🔫 무기 밸런스
- **AKM**: 데미지 증가 (49 → 52)
- **M416**: 반동 패턴 조정
- **새로운 무기**: P90 SMG 추가

### 🎯 게임플레이
- 낙하산 속도 향상
- 차량 물리 엔진 개선
- 새로운 서바이벌 아이템 추가

### 🎨 기타
- UI 개선
- 새로운 스킨 추가
- 성능 최적화

기대되는 시즌이네요! 모두 열심히 플레이해봅시다! 🎮`,
        author: "업데이트봇",
        categoryId: "updates",
        views: 1580,
        isPinned: true
      }
    ];

    for (let i = 0; i < samplePosts.length; i++) {
      const post = samplePosts[i];
      const createdPost = await prisma.forumPost.create({
        data: {
          ...post,
          createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // 각각 하루씩 차이
        }
      });

      // 각 게시글에 샘플 댓글 추가
      const replies = [
        {
          content: "정말 유용한 정보네요! 감사합니다 👍",
          author: "독자" + (Math.floor(Math.random() * 100) + 1),
          postId: createdPost.id
        },
        {
          content: "이런 글 더 많이 올려주세요!",
          author: "팬" + (Math.floor(Math.random() * 100) + 1),
          postId: createdPost.id
        }
      ];

      for (const reply of replies) {
        await prisma.forumReply.create({
          data: {
            ...reply,
            createdAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)
          }
        });
      }
    }

    console.log('✅ 포럼 게시글 및 댓글 추가 완료');

    // 3. 좋아요 데이터 추가
    const posts = await prisma.forumPost.findMany();
    for (const post of posts) {
      const likeCount = Math.floor(Math.random() * 50) + 5;
      for (let i = 0; i < likeCount; i++) {
        try {
          await prisma.forumLike.create({
            data: {
              postId: post.id,
              author: `유저${Math.floor(Math.random() * 1000) + 1}`
            }
          });
        } catch (error) {
          // 중복 좋아요는 무시
        }
      }
    }

    console.log('✅ 좋아요 데이터 추가 완료');
    console.log('🎉 포럼 샘플 데이터 추가가 모두 완료되었습니다!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addForumSampleData();
