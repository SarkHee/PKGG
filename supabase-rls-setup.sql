-- ============================================================
-- PKGG — Supabase 권한 설정 SQL
-- 2026-10-30 Supabase 기본 권한 변경 대응
-- Supabase SQL Editor에서 실행하세요.
-- 멱등성 보장: 여러 번 실행해도 안전합니다.
-- ============================================================

-- ============================================================
-- 1단계: 테이블 권한(GRANT) 부여
-- ============================================================

-- anon: SELECT만
GRANT SELECT ON TABLE
  "Clan",
  "ClanMember",
  "PlayerMatch",
  "PlayerModeStats",
  "ForumCategory",
  "ForumPost",
  "ForumReply",
  "ForumLike",
  forum_users,
  pubg_news,
  weapon_test_results,
  ranking_update_logs,
  notices,
  player_cache,
  player_analyses,
  coaching_tips,
  users,
  training_sessions,
  player_stat_snapshots,
  clan_wars,
  clan_war_players,
  player_reviews,
  auth_users,
  pubg_accounts,
  donation_counter,
  feedbacks,
  clan_leader_requests,
  inquiries,
  map_markers,
  player_weapon_stats
TO anon;

-- authenticated: 전체 CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "Clan",
  "ClanMember",
  "PlayerMatch",
  "PlayerModeStats",
  "ForumCategory",
  "ForumPost",
  "ForumReply",
  "ForumLike",
  forum_users,
  pubg_news,
  weapon_test_results,
  ranking_update_logs,
  notices,
  player_cache,
  player_analyses,
  coaching_tips,
  users,
  training_sessions,
  player_stat_snapshots,
  clan_wars,
  clan_war_players,
  player_reviews,
  auth_users,
  pubg_accounts,
  donation_counter,
  feedbacks,
  clan_leader_requests,
  inquiries,
  map_markers,
  player_weapon_stats
TO authenticated;

-- service_role: 전체 CRUD (RLS는 기본적으로 우회하지만 명시적 GRANT 필요)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "Clan",
  "ClanMember",
  "PlayerMatch",
  "PlayerModeStats",
  "ForumCategory",
  "ForumPost",
  "ForumReply",
  "ForumLike",
  forum_users,
  pubg_news,
  weapon_test_results,
  ranking_update_logs,
  notices,
  player_cache,
  player_analyses,
  coaching_tips,
  users,
  training_sessions,
  player_stat_snapshots,
  clan_wars,
  clan_war_players,
  player_reviews,
  auth_users,
  pubg_accounts,
  donation_counter,
  feedbacks,
  clan_leader_requests,
  inquiries,
  map_markers,
  player_weapon_stats
TO service_role;

-- SEQUENCE 권한: INSERT 시 autoincrement ID 생성에 필요
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================
-- 2단계: RLS 활성화
-- ============================================================

ALTER TABLE "Clan"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClanMember"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerMatch"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerModeStats"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumCategory"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumPost"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumReply"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ForumLike"           ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE auth_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pubg_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_counter      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_leader_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_markers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_weapon_stats   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3단계: 기존 정책 제거 (멱등성 보장)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
  tables TEXT[] := ARRAY[
    '"Clan"', '"ClanMember"', '"PlayerMatch"', '"PlayerModeStats"',
    '"ForumCategory"', '"ForumPost"', '"ForumReply"', '"ForumLike"',
    'forum_users', 'pubg_news', 'weapon_test_results', 'ranking_update_logs',
    'notices', 'player_cache', 'player_analyses', 'coaching_tips',
    'users', 'training_sessions', 'player_stat_snapshots',
    'clan_wars', 'clan_war_players', 'player_reviews',
    'auth_users', 'pubg_accounts', 'donation_counter',
    'feedbacks', 'clan_leader_requests', 'inquiries',
    'map_markers', 'player_weapon_stats'
  ];
  policy_suffixes TEXT[] := ARRAY['anon_select', 'auth_all'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOREACH pol IN ARRAY policy_suffixes LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 4단계: 기본 RLS 정책 생성
-- anon     → SELECT 허용 (공개 데이터 읽기)
-- authenticated → 전체 허용 (서버사이드 Prisma 호환)
-- service_role → RLS 자동 우회 (Supabase 기본값, 정책 불필요)
-- ============================================================

-- "Clan"
CREATE POLICY anon_select ON "Clan" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "Clan" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "ClanMember"
CREATE POLICY anon_select ON "ClanMember" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "ClanMember" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "PlayerMatch"
CREATE POLICY anon_select ON "PlayerMatch" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "PlayerMatch" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "PlayerModeStats"
CREATE POLICY anon_select ON "PlayerModeStats" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "PlayerModeStats" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "ForumCategory"
CREATE POLICY anon_select ON "ForumCategory" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "ForumCategory" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "ForumPost"
CREATE POLICY anon_select ON "ForumPost" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "ForumPost" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "ForumReply"
CREATE POLICY anon_select ON "ForumReply" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "ForumReply" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- "ForumLike"
CREATE POLICY anon_select ON "ForumLike" FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON "ForumLike" FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- forum_users
CREATE POLICY anon_select ON forum_users FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON forum_users FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- pubg_news
CREATE POLICY anon_select ON pubg_news FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON pubg_news FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- weapon_test_results
CREATE POLICY anon_select ON weapon_test_results FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON weapon_test_results FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- ranking_update_logs
CREATE POLICY anon_select ON ranking_update_logs FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON ranking_update_logs FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- notices
CREATE POLICY anon_select ON notices FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON notices FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- player_cache
CREATE POLICY anon_select ON player_cache FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON player_cache FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- player_analyses
CREATE POLICY anon_select ON player_analyses FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON player_analyses FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- coaching_tips
CREATE POLICY anon_select ON coaching_tips FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON coaching_tips FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- users
CREATE POLICY anon_select ON users FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON users FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- training_sessions
CREATE POLICY anon_select ON training_sessions FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON training_sessions FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- player_stat_snapshots
CREATE POLICY anon_select ON player_stat_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON player_stat_snapshots FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- clan_wars
CREATE POLICY anon_select ON clan_wars FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON clan_wars FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- clan_war_players
CREATE POLICY anon_select ON clan_war_players FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON clan_war_players FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- player_reviews
CREATE POLICY anon_select ON player_reviews FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON player_reviews FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- auth_users
CREATE POLICY anon_select ON auth_users FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON auth_users FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- pubg_accounts
CREATE POLICY anon_select ON pubg_accounts FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON pubg_accounts FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- donation_counter
CREATE POLICY anon_select ON donation_counter FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON donation_counter FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- feedbacks
CREATE POLICY anon_select ON feedbacks FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON feedbacks FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- clan_leader_requests
CREATE POLICY anon_select ON clan_leader_requests FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON clan_leader_requests FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- inquiries
CREATE POLICY anon_select ON inquiries FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON inquiries FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- map_markers
CREATE POLICY anon_select ON map_markers FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON map_markers FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- player_weapon_stats
CREATE POLICY anon_select ON player_weapon_stats FOR SELECT TO anon USING (true);
CREATE POLICY auth_all    ON player_weapon_stats FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 완료: 설정 확인 쿼리
-- 아래를 실행해서 결과를 검증하세요.
-- ============================================================

-- RLS 활성화 확인
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' ORDER BY tablename;

-- 정책 목록 확인
-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
