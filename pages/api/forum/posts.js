// API 엔드포인트: 포럼 게시글 목록 조회 (비속어 필터링 및 자동 밴 시스템 포함)
// pages/api/forum/posts.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 비속어 필터 리스트 (한국어 및 영어)
const PROFANITY_WORDS = [
  // 한국어 비속어
  '시발',
  '씨발',
  '개새끼',
  '병신',
  '바보',
  '멍청이',
  '죽어',
  '꺼져',
  '미친',
  '또라이',
  '정신병',
  '장애',
  '씨팔',
  '시팔',
  '개놈',
  '년',
  '창녀',
  '걸레',
  '쓰레기',
  '한심',
  '등신',
  '멍텅구리',
  '개지랄',
  '지랄',
  '좆',
  '망할',
  '엿먹어',
  '닥쳐',
  '개빡',
  '빙신',

  // 영어 비속어
  'fuck',
  'shit',
  'damn',
  'bitch',
  'asshole',
  'bastard',
  'idiot',
  'stupid',
  'moron',
  'retard',
  'gay',
  'fag',
  'nigger',
  'whore',
  'slut',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'motherfucker',
];

// 텍스트에서 비속어 검사
function checkProfanity(text) {
  const lowerText = text.toLowerCase();
  const foundWords = [];

  PROFANITY_WORDS.forEach((word) => {
    if (lowerText.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  });

  return {
    hasProfanity: foundWords.length > 0,
    words: foundWords,
  };
}

// 자동 밴 시스템 - 유저 제재 기록 추가
async function addUserViolation(author, violationType, content) {
  try {
    // 유저의 제재 기록 확인
    const existingUser = await prisma.forumUser.findFirst({
      where: { username: author },
    });

    if (existingUser) {
      // 기존 유저 업데이트 - 제재 횟수 증가
      const updated = await prisma.forumUser.update({
        where: { id: existingUser.id },
        data: {
          violationCount: { increment: 1 },
          lastViolation: new Date(),
          violationType: violationType,
          violationContent: content.substring(0, 200),
          isBanned: true,
          banReason: `부적절한 언어 사용: ${violationType}`,
          banUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 밴
        },
      });

      return {
        banned: true,
        reason: '부적절한 언어 사용으로 24시간 제재됩니다',
        banUntil: updated.banUntil,
        violationCount: updated.violationCount,
      };
    } else {
      // 새 유저 생성 및 즉시 밴
      const newUser = await prisma.forumUser.create({
        data: {
          username: author,
          email: `${author}@temp.com`, // 임시 이메일
          violationCount: 1,
          lastViolation: new Date(),
          violationType: violationType,
          violationContent: content.substring(0, 200),
          isBanned: true,
          banReason: `부적절한 언어 사용: ${violationType}`,
          banUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 밴
          createdAt: new Date(),
        },
      });

      return {
        banned: true,
        reason: '부적절한 언어 사용으로 24시간 제재됩니다',
        banUntil: newUser.banUntil,
        violationId: newUser.id,
      };
    }
  } catch (error) {
    console.error('Error adding user violation:', error);
    return { banned: false, error: 'Failed to process violation' };
  }
}

// 밴된 유저 확인
async function checkUserBan(author) {
  try {
    const user = await prisma.forumUser.findFirst({
      where: {
        username: author,
        isBanned: true,
        banUntil: {
          gt: new Date(), // 아직 밴 기간이 남아있는 경우
        },
      },
    });

    return user
      ? {
          banned: true,
          reason: user.banReason,
          banUntil: user.banUntil,
          violationCount: user.violationCount,
        }
      : { banned: false };
  } catch (error) {
    console.error('Error checking user ban:', error);
    return { banned: false };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { category, page = 1, limit = 10, search, postId } = req.query;

      // 개별 게시물 조회
      if (postId) {
        console.log(
          '🔍 포스트 조회 시도, postId:',
          postId,
          'type:',
          typeof postId
        );

        const post = await prisma.forumPost.findUnique({
          where: {
            id: parseInt(postId),
          },
          include: {
            category: true,
            replies: {
              orderBy: {
                createdAt: 'asc',
              },
            },
            _count: {
              select: {
                replies: true,
                likedBy: true,
              },
            },
          },
        });

        console.log(
          '📄 조회된 포스트:',
          post ? `ID: ${post.id}, 제목: ${post.title}` : 'null'
        );

        if (!post) {
          console.log('❌ 포스트를 찾을 수 없음, postId:', postId);
          return res.status(404).json({ error: 'Post not found' });
        }

        // 조회수 증가
        await prisma.forumPost.update({
          where: { id: parseInt(postId) },
          data: {
            views: {
              increment: 1,
            },
          },
        });

        // 응답 데이터 형식화
        const formattedPost = {
          id: post.id,
          title: post.title,
          content: post.content,
          author: post.author,
          categoryId: post.categoryId,
          category: {
            name: post.category?.name || 'General',
            icon: post.category?.icon || '📝',
          },
          views: post.views + 1,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likes: post._count.likedBy,
          replyCount: post._count.replies,
          isLiked: false,
        };

        const formattedReplies = post.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          author: reply.author,
          createdAt: reply.createdAt,
          likes: 0,
        }));

        return res.status(200).json({
          post: formattedPost,
          replies: formattedReplies,
        });
      }

      // 기존 게시물 목록 조회 로직
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // 검색 조건 구성
      const where = {};
      if (category && category !== 'all') {
        where.categoryId = category;
      }
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { content: { contains: search } },
        ];
      }

      // 게시글 조회
      const posts = await prisma.forumPost.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { replies: true, likedBy: true },
          },
        },
        orderBy: [
          { isPinned: 'desc' }, // 고정글 우선
          { createdAt: 'desc' },
        ],
        skip,
        take: parseInt(limit),
      });

      // 총 개수
      const total = await prisma.forumPost.count({ where });

      res.status(200).json({
        posts: posts.map((post) => ({
          ...post,
          replyCount: post._count.replies,
          likeCount: post._count.likedBy,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } else if (req.method === 'POST') {
      const { title, content, preview, author, categoryId } = req.body;

      if (!title || !content || !author || !categoryId) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
      }

      // 1. 먼저 유저 밴 상태 확인
      const banStatus = await checkUserBan(author);
      if (banStatus.banned) {
        return res.status(403).json({
          error: 'BANNED_USER',
          message: `제재된 사용자입니다. 사유: ${banStatus.reason}`,
          banUntil: banStatus.banUntil,
          violationCount: banStatus.violationCount,
        });
      }

      // 2. 비속어 검사 (제목과 내용)
      const titleCheck = checkProfanity(title);
      const contentCheck = checkProfanity(content);

      if (titleCheck.hasProfanity || contentCheck.hasProfanity) {
        // 비속어 감지 시 자동 밴 처리
        const allBadWords = [...titleCheck.words, ...contentCheck.words];
        const banResult = await addUserViolation(
          author,
          'PROFANITY',
          `제목: ${title}, 내용: ${content}`
        );

        return res.status(400).json({
          error: 'PROFANITY_DETECTED',
          message: '부적절한 언어가 감지되어 게시글 작성이 차단되었습니다',
          details: {
            words: allBadWords,
            banned: banResult.banned,
            banReason: banResult.reason,
            banUntil: banResult.banUntil,
            violationCount: banResult.violationCount,
          },
        });
      }

      // 3. 비속어가 없으면 게시글 생성
      console.log('Creating post with data:', {
        title,
        content: content.substring(0, 100) + '...',
        author,
        categoryId,
      });

      // 카테고리 존재 확인 및 자동 생성
      const categoryExists = await prisma.forumCategory.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        console.error('Category not found:', categoryId);

        // 기본 카테고리라면 자동 생성 시도
        const defaultCategories = {
          strategy: {
            id: 'strategy',
            name: '전략 & 팁',
            description: '게임 전략, 팁, 가이드를 공유하세요',
            icon: '🧠',
            color: 'blue',
            order: 1,
          },
          general: {
            id: 'general',
            name: '자유 게시판',
            description: '자유롭게 이야기를 나누세요',
            icon: '💬',
            color: 'green',
            order: 2,
          },
          questions: {
            id: 'questions',
            name: '질문 & 답변',
            description: '궁금한 점을 물어보고 답변해주세요',
            icon: '❓',
            color: 'orange',
            order: 3,
          },
          clan: {
            id: 'clan',
            name: '클랜 모집',
            description: '클랜원을 모집하거나 클랜을 찾아보세요',
            icon: '👥',
            color: 'purple',
            order: 4,
          },
          showcase: {
            id: 'showcase',
            name: '플레이 영상',
            description: '멋진 플레이 영상을 공유하세요',
            icon: '🎬',
            color: 'red',
            order: 5,
          },
        };

        if (defaultCategories[categoryId]) {
          try {
            console.log('자동으로 기본 카테고리를 생성합니다:', categoryId);
            await prisma.forumCategory.create({
              data: defaultCategories[categoryId],
            });
            console.log('✅ 기본 카테고리 생성 완료:', categoryId);
          } catch (createError) {
            console.error('카테고리 자동 생성 실패:', createError);
            return res.status(400).json({
              error: '선택한 카테고리가 존재하지 않습니다.',
              details: `카테고리 ID: ${categoryId}`,
              suggestion: '포럼 카테고리를 먼저 초기화해주세요.',
            });
          }
        } else {
          return res.status(400).json({
            error: '선택한 카테고리가 존재하지 않습니다.',
            details: `카테고리 ID: ${categoryId}`,
          });
        }
      }

      const post = await prisma.forumPost.create({
        data: {
          title,
          content,
          preview: preview || content.substring(0, 200),
          author,
          categoryId,
        },
        include: {
          category: true,
          _count: {
            select: { replies: true, likedBy: true },
          },
        },
      });

      console.log('Post created successfully:', post.id);

      res.status(201).json({
        ...post,
        replyCount: post._count.replies,
        likeCount: post._count.likedBy,
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Forum posts API error:', error);

    // 더 자세한 에러 정보 반환
    const errorMessage = error.message || '서버 오류가 발생했습니다.';
    const errorDetails =
      process.env.NODE_ENV === 'development'
        ? {
            stack: error.stack,
            code: error.code,
            meta: error.meta,
          }
        : null;

    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
    });
  } finally {
    await prisma.$disconnect();
  }
}
