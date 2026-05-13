-- PlayerMatch 테이블에 봇 분석 필드 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE "PlayerMatch"
  ADD COLUMN IF NOT EXISTS "botKills"       INTEGER,
  ADD COLUMN IF NOT EXISTS "realKills"      INTEGER,
  ADD COLUMN IF NOT EXISTS "botDamage"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "realDamage"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "botAssist"      INTEGER,
  ADD COLUMN IF NOT EXISTS "isBotCorrected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "botAnalyzedAt"  TIMESTAMP(3);

-- 인덱스: 봇 분석 미완료 행 조회용 (refresh-stale 등에서 활용)
CREATE INDEX IF NOT EXISTS "PlayerMatch_isBotCorrected_idx"
  ON "PlayerMatch" ("isBotCorrected");
