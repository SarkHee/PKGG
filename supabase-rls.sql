-- ============================================================
-- PKGG Supabase RLS (Row Level Security) 활성화 스크립트
-- Supabase 대시보드 → SQL Editor에서 전체 복붙 후 실행
-- ============================================================

-- ▶ 참고: Prisma는 DATABASE_URL(직접 PostgreSQL 연결)을 사용하므로
--   RLS 활성화해도 서버 API 동작에는 영향 없음.
--   PostgREST(Supabase REST API) 직접 접근만 차단/허용됨.

-- ============================================================
-- 1단계: 모든 테이블 RLS 활성화
-- ============================================================

-- Prisma @@map 없는 테이블 (모델명 = 테이블명)
ALTER TABLE "Clan"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClanMember"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerMatch"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerModeStats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumCategory"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumPost"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumReply"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumLike"       ENABLE ROW LEVEL SECURITY;

-- Prisma @@map 적용 테이블 (snake_case)
ALTER TABLE forum_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pubg_news             ENABLE ROW LEVEL SECURITY;
ALTER TABLE weapon_test_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_update_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cache          ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_analyses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_tips         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stat_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_wars             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_war_players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_counter      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2단계: 공개 읽기 정책 (SELECT 허용)
-- ============================================================

-- 클랜/멤버/매치 데이터 (공개 통계)
CREATE POLICY "public_select" ON "Clan"            FOR SELECT USING (true);
CREATE POLICY "public_select" ON "ClanMember"      FOR SELECT USING (true);
CREATE POLICY "public_select" ON "PlayerMatch"     FOR SELECT USING (true);
CREATE POLICY "public_select" ON "PlayerModeStats" FOR SELECT USING (true);

-- 포럼 (게시글·댓글·카테고리 공개)
-- 주의: ForumPost.password, ForumReply.password 컬럼 존재
--       실제 포럼 삭제 인증은 서버 API에서만 처리하므로 문제 없음
CREATE POLICY "public_select" ON "ForumCategory" FOR SELECT USING (true);
CREATE POLICY "public_select" ON "ForumPost"     FOR SELECT USING (true);
CREATE POLICY "public_select" ON "ForumReply"    FOR SELECT USING (true);
CREATE POLICY "public_select" ON "ForumLike"     FOR SELECT USING (true);

-- 공개 데이터
CREATE POLICY "public_select" ON pubg_news             FOR SELECT USING (true);
CREATE POLICY "public_select" ON notices               FOR SELECT USING (true);
CREATE POLICY "public_select" ON coaching_tips         FOR SELECT USING (true);
CREATE POLICY "public_select" ON player_cache          FOR SELECT USING (true);
CREATE POLICY "public_select" ON player_analyses       FOR SELECT USING (true);
CREATE POLICY "public_select" ON training_sessions     FOR SELECT USING (true);
CREATE POLICY "public_select" ON player_stat_snapshots FOR SELECT USING (true);
CREATE POLICY "public_select" ON weapon_test_results   FOR SELECT USING (true);

-- 클랜 내전·리뷰 (공개 기록)
-- 주의: clan_wars.password 컬럼 존재 (내전 수정 인증용)
CREATE POLICY "public_select" ON clan_wars        FOR SELECT USING (true);
CREATE POLICY "public_select" ON clan_war_players FOR SELECT USING (true);
CREATE POLICY "public_select" ON player_reviews   FOR SELECT USING (true);

-- 후원 카운터 (공개 카운트 표시)  ← Supabase 경고 발생 원인
CREATE POLICY "public_select" ON donation_counter FOR SELECT USING (true);

-- ============================================================
-- 3단계: 민감 테이블 — 공개 접근 완전 차단
--         (RLS 활성화 + 정책 없음 = 모든 PostgREST 접근 차단)
-- ============================================================

-- forum_users: 이메일, 제재 이력, 밴 정보 포함 → 차단
-- (정책 없음 — 이 테이블은 관리자 서버 API 전용)

-- users: steamId, kakaoId 포함 → 차단
-- (정책 없음 — 이 테이블은 인증 서버 API 전용)

-- ranking_update_logs: 내부 운영 로그 → 차단
-- (정책 없음 — 이 테이블은 cron/admin API 전용)

-- ============================================================
-- 완료 확인 쿼리 (실행 후 아래로 RLS 상태 확인)
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
