/**
 * PKGG 커스텀 MMR 계산기 (v2)
 *
 * PUBG 공식 MMR은 제공되지 않으므로, 시즌 통계 기반으로 PKGG 독자 MMR을 산출합니다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  항목            계수     설명                      기여 범위 (참고)
 * ─────────────────────────────────────────────────────────────────────────────
 *  avgDamage      × 0.35   딜량 기여                  딜 300 → +105
 *  avgKills       × 35     킬 기여                    킬 2.5 → +87
 *  winRate        × 12     승률 기여 (%)              승률 10% → +120
 *  top10Rate      × 2.5    Top10 생존 기여 (%)        Top10 30% → +75
 *  avgSurviveTime × 0.05   생존시간 기여 (초)         1000s → +50
 *  avgAssists     × 20     어시스트 기여              어시 1.0 → +20
 *  base           1000     기본 점수
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  참고 시나리오 (스쿼드 기준):
 *  초보    (80딜  / 0.3킬 / 1%승  / 8%탑10  / 300s  / 0.1어시)  ≈ 1087
 *  하위권  (120딜 / 0.8킬 / 2%승  / 12%탑10 / 500s  / 0.4어시)  ≈ 1157
 *  평균    (180딜 / 1.5킬 / 4%승  / 20%탑10 / 750s  / 0.8어시)  ≈ 1267
 *  평균↑   (250딜 / 2.0킬 / 7%승  / 30%탑10 / 950s  / 1.0어시)  ≈ 1384
 *  고수    (350딜 / 2.8킬 / 12%승 / 45%탑10 / 1200s / 1.5어시)  ≈ 1567
 *  상위권  (450딜 / 3.5킬 / 18%승 / 60%탑10 / 1500s / 2.0어시)  ≈ 1761
 *  최상위  (600딜 / 5.0킬 / 25%승 / 75%탑10 / 1800s / 2.5어시)  ≈ 2012
 */

/**
 * summary 객체로부터 MMR 계산
 *
 * @param {Object} summary
 *   - avgDamage      {number}  게임당 평균 딜량
 *   - avgKills       {number}  게임당 평균 킬 수
 *   - winRate        {number}  승률 (0~100 %)
 *   - top10Rate      {number}  Top10 진입률 (0~100 %)
 *   - avgSurviveTime {number}  게임당 평균 생존시간 (초) — avgSurvivalTime 도 허용
 *   - avgAssists     {number}  게임당 평균 어시스트 수
 * @returns {number} MMR 값 (최솟값 1000)
 */
export function calculateMMR(summary) {
  if (!summary) return 1000;

  const avgDamage      = parseFloat(summary.avgDamage      || 0);
  const avgKills       = parseFloat(summary.avgKills       || 0);
  const winRate        = parseFloat(summary.winRate        || 0);
  const top10Rate      = parseFloat(summary.top10Rate      || 0);
  // PlayerHeader 등에서 avgSurvivalTime 이름을 쓰는 경우도 허용
  const avgSurviveTime = parseFloat(
    summary.avgSurviveTime ?? summary.avgSurvivalTime ?? 0
  );
  const avgAssists     = parseFloat(summary.avgAssists     || 0);

  const mmr = Math.round(
    1000
    + avgDamage      * 0.35
    + avgKills       * 35
    + winRate        * 12
    + top10Rate      * 2.5
    + avgSurviveTime * 0.05
    + avgAssists     * 20
  );

  return Math.max(1000, mmr);
}

/**
 * MMR 등급(티어) 정보 반환
 *
 * 기준 (새 공식 기반):
 *   Master   ≥ 1900  최상위 ~1%
 *   Diamond  ≥ 1700  상위   ~5%
 *   Platinum ≥ 1500  고수   ~12%
 *   Gold     ≥ 1350  평균↑  ~28%
 *   Silver   ≥ 1180  평균   ~55%
 *   Bronze   < 1180  성장 중
 *
 * @param {number} mmr
 * @returns {{ label, color, textColor, bgColor, borderColor, emoji }}
 */
export function getMMRTier(mmr) {
  if (mmr >= 1900) return { label: 'Master',   color: '#7C3AED', textColor: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-300', emoji: '👑' };
  if (mmr >= 1700) return { label: 'Diamond',  color: '#0EA5E9', textColor: 'text-sky-600',    bgColor: 'bg-sky-100',    borderColor: 'border-sky-300',    emoji: '💎' };
  if (mmr >= 1500) return { label: 'Platinum', color: '#14B8A6', textColor: 'text-teal-600',   bgColor: 'bg-teal-100',   borderColor: 'border-teal-300',   emoji: '🔷' };
  if (mmr >= 1350) return { label: 'Gold',     color: '#EAB308', textColor: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300', emoji: '🥇' };
  if (mmr >= 1180) return { label: 'Silver',   color: '#6B7280', textColor: 'text-gray-600',   bgColor: 'bg-gray-100',   borderColor: 'border-gray-300',   emoji: '🥈' };
  return             { label: 'Bronze',  color: '#B45309', textColor: 'text-amber-700',  bgColor: 'bg-amber-100',  borderColor: 'border-amber-300',  emoji: '🥉' };
}

/**
 * MMR 면책 문구
 */
export const MMR_DISCLAIMER =
  'PKGG에서 자체 산출한 추정 MMR입니다.\n배그 공식 MMR과는 무관합니다.';
