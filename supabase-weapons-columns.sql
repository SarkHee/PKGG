-- ============================================================
-- player_weapon_stats 컬럼 추가 및 unique 제약 변경
-- 기존: (playerId, weaponId) → 신규: (playerId, weaponId, match_id) 경기별 저장
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. 기존 unique 제약 제거
ALTER TABLE player_weapon_stats
  DROP CONSTRAINT IF EXISTS "player_weapon_stats_playerid_weaponid_key";

-- 2. 컬럼 추가
ALTER TABLE player_weapon_stats
  ADD COLUMN IF NOT EXISTS bot_kills    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_kills   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assists      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shots_fired  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shots_hit    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_id     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_count INT NOT NULL DEFAULT 0;

-- 3. 새 unique 제약: (playerId, weaponId, match_id)
ALTER TABLE player_weapon_stats
  ADD CONSTRAINT "player_weapon_stats_player_weapon_match_key"
  UNIQUE ("playerId", "weaponId", match_id);

-- 4. 기존 데이터는 match_id='' 로 일괄 처리 (충돌 방지)
-- 중복 제거 후 unique 제약 적용 순서에 주의
-- 기존 데이터가 있다면 아래 실행:
-- DELETE FROM player_weapon_stats a
-- USING player_weapon_stats b
-- WHERE a.id > b.id AND a."playerId" = b."playerId" AND a."weaponId" = b."weaponId" AND a.match_id = b.match_id;
