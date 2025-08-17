// 포럼 기본 카테고리 초기화 스크립트
// scripts/init-forum-categories.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INITIAL_CATEGORIES = [
  {
    id: 'strategy',
    name: '전략 & 팁',
    description: '게임 전략, 팁, 가이드를 공유하세요',
    icon: '🧠',
    color: 'blue',
    order: 1
  },
  {
    id: 'general',
    name: '자유 게시판',
    description: '자유롭게 이야기를 나누세요',
    icon: '💬',
    color: 'green',
    order: 2
  },
  {
    id: 'questions',
    name: '질문 & 답변',
    description: '궁금한 점을 물어보고 답변해주세요',
    icon: '❓',
    color: 'orange',
    order: 3
  },
  {
    id: 'clan',
    name: '클랜 모집',
    description: '클랜원을 모집하거나 클랜을 찾아보세요',
    icon: '👥',
    color: 'purple',
    order: 4
  },
  {
    id: 'showcase',
    name: '플레이 영상',
    description: '멋진 플레이 영상을 공유하세요',
    icon: '🎬',
    color: 'red',
    order: 5
  }
];

async function initForumCategories() {
  try {
    console.log('포럼 카테고리 초기화 시작...');
    
    for (const category of INITIAL_CATEGORIES) {
      const existing = await prisma.forumCategory.findUnique({
        where: { id: category.id }
      });
      
      if (!existing) {
        await prisma.forumCategory.create({
          data: category
        });
        console.log(`✅ 카테고리 생성: ${category.name}`);
      } else {
        console.log(`⚠️ 카테고리 이미 존재: ${category.name}`);
      }
    }
    
    // 샘플 게시글 생성
    const samplePosts = [
      {
        title: "초보자를 위한 PUBG 생존 가이드",
        content: `# PUBG 초보자 가이드

안녕하세요! PUBG를 처음 시작하시는 분들을 위한 기본적인 생존 팁들을 정리해봤습니다.

## 1. 낙하산 착륙 전략
- 인구밀도가 낮은 지역을 선택하세요
- 건물이 많은 곳이 좋습니다
- 차량 스폰 지점을 확인하세요

## 2. 초반 아이템 수집
- 방어구와 헬멧을 우선적으로 착용하세요
- 의료용품을 충분히 확보하세요
- 다양한 거리의 무기를 준비하세요

## 3. 포지션 선택
- 안전지대 중앙보다는 가장자리에 위치하세요
- 엄폐물이 많은 곳을 선택하세요
- 적의 동선을 예측해보세요

행운을 빕니다! 🎯`,
        preview: "PUBG를 처음 시작하시는 분들을 위한 기본적인 생존 팁들을 정리해봤습니다.",
        author: "PUBG마스터",
        categoryId: "strategy",
        isPinned: true,
        views: 1234
      },
      {
        title: "솔로 랭크 올리는 효과적인 전략",
        content: `솔로 플레이어들을 위한 효과적인 랭크 상승 전략을 공유합니다.

## 핵심 포인트
1. 초반 킬보다는 생존에 집중
2. 포지션 싸움에서 우위 점하기
3. 상황판단력 기르기

자세한 내용은 게임 내에서 실전 경험을 통해 익혀보세요!`,
        preview: "솔로 플레이어들을 위한 효과적인 랭크 상승 전략을 공유합니다.",
        author: "솔로킹",
        categoryId: "strategy",
        views: 856
      },
      {
        title: "UBD 클랜에서 함께할 멤버를 모집합니다!",
        content: `안녕하세요! UBD 클랜에서 새로운 멤버를 모집합니다.

## 모집 조건
- 레벨 10 이상
- 활발한 플레이 (주 3회 이상)
- 팀워크 중시
- 디스코드 사용 가능

관심 있으신 분은 댓글로 연락 부탁드립니다!`,
        preview: "UBD 클랜에서 새로운 멤버를 모집합니다.",
        author: "클랜리더123",
        categoryId: "clan",
        views: 543
      }
    ];
    
    for (const post of samplePosts) {
      const existing = await prisma.forumPost.findFirst({
        where: { title: post.title }
      });
      
      if (!existing) {
        await prisma.forumPost.create({
          data: post
        });
        console.log(`✅ 샘플 게시글 생성: ${post.title}`);
      }
    }
    
    console.log('🎉 포럼 카테고리 초기화 완료!');
    
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initForumCategories();
