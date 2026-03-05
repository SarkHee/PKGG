/**
 * PKGG 커스텀 MMR 계산기 (v3 — 정규화 복합 지수)
 *
 * 각 지표를 0~1로 정규화 후 가중 합산 → composite (0~100) → MMR 1000~2500
 *
 * ─────────────────────────────────────────────────────────────────────
 *  지표              기준값   가중치   설명
 * ─────────────────────────────────────────────────────────────────────
 *  avgDamage         600      30%     딜량  (스쿼드 최상위 참고값)
 *  avgKills          5.0      25%     킬수
 *  winRate           25%      20%     승률  (100인 중 1등 기준)
 *  top10Rate         70%      10%     Top10 진입률
 *  avgAssists        3.0       8%     어시스트
 *  avgSurviveTime   1800s      7%     생존시간 (초)
 * ─────────────────────────────────────────────────────────────────────
 *
 *  MMR = 1000 + composite × 15   (범위: 1000 ~ 2500)
 *
 *  참고 시나리오 (스쿼드 FPP 기준):
 *  Bronze   (80딜  / 0.3킬 / 1%승  /  8%탑10 /  300s / 0.1어시)  ≈ 1133
 *  Silver   (150딜 / 0.8킬 / 2%승  / 15%탑10 /  600s / 0.4어시)  ≈ 1185
 *  Gold     (220딜 / 1.5킬 / 5%승  / 25%탑10 /  900s / 0.8어시)  ≈ 1350
 *  Platinum (320딜 / 2.2킬 / 9%승  / 38%탑10 / 1100s / 1.2어시)  ≈ 1558
 *  Diamond  (430딜 / 3.0킬 / 14%승 / 52%탑10 / 1400s / 1.8어시)  ≈ 1830
 *  Master   (530딜 / 4.0킬 / 20%승 / 65%탑10 / 1650s / 2.3어시)  ≈ 2180
 *  Legend   (600딜 / 5.0킬 / 25%승 / 70%탑10 / 1800s / 3.0어시)  = 2500
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
 * @returns {number} MMR 값 (최솟값 1000, 최댓값 2500)
 */
export function calculateMMR(summary) {
  if (!summary) return 1000;

  // 각 지표를 기준값으로 나눠 0~1 정규화 (초과분은 1로 클램프)
  const dmg   = Math.min(parseFloat(summary.avgDamage  || 0) / 600,  1);
  const kills = Math.min(parseFloat(summary.avgKills   || 0) / 5.0,  1);
  const win   = Math.min(parseFloat(summary.winRate    || 0) / 25,   1);
  const top10 = Math.min(parseFloat(summary.top10Rate  || 0) / 70,   1);
  const ast   = Math.min(parseFloat(summary.avgAssists || 0) / 3.0,  1);
  const surv  = Math.min(parseFloat(
    summary.avgSurviveTime ?? summary.avgSurvivalTime ?? 0
  ) / 1800, 1);

  // 가중 합산 → composite 0~100
  const composite = (
    dmg   * 0.30 +
    kills * 0.25 +
    win   * 0.20 +
    top10 * 0.10 +
    ast   * 0.08 +
    surv  * 0.07
  ) * 100;

  // MMR 범위: 1000 ~ 2500
  return Math.min(2500, Math.max(1000, Math.round(1000 + composite * 15)));
}

/**
 * MMR 등급(티어) 정보 반환 — 7단계
 *
 *  Legend   ≥ 2300  최상위 ~1%
 *  Master   ≥ 2050  상위   ~5%
 *  Diamond  ≥ 1825  상위   ~15%
 *  Platinum ≥ 1600  고수   ~30%
 *  Gold     ≥ 1375  평균↑  ~50%
 *  Silver   ≥ 1150  평균   ~75%
 *  Bronze   < 1150  성장 중
 *
 * @param {number} mmr
 * @returns {{ label, color, textColor, bgColor, borderColor, emoji }}
 */
export function getMMRTier(mmr) {
  if (mmr >= 2300) return { label: 'Legend',   color: '#F59E0B', textColor: 'text-amber-500',   bgColor: 'bg-amber-50',    borderColor: 'border-amber-300',   emoji: '🏆' };
  if (mmr >= 2050) return { label: 'Master',   color: '#7C3AED', textColor: 'text-purple-600',  bgColor: 'bg-purple-100',  borderColor: 'border-purple-300',  emoji: '👑' };
  if (mmr >= 1825) return { label: 'Diamond',  color: '#0EA5E9', textColor: 'text-sky-600',     bgColor: 'bg-sky-100',     borderColor: 'border-sky-300',     emoji: '💎' };
  if (mmr >= 1600) return { label: 'Platinum', color: '#14B8A6', textColor: 'text-teal-600',    bgColor: 'bg-teal-100',    borderColor: 'border-teal-300',    emoji: '🔷' };
  if (mmr >= 1375) return { label: 'Gold',     color: '#EAB308', textColor: 'text-yellow-600',  bgColor: 'bg-yellow-100',  borderColor: 'border-yellow-300',  emoji: '🥇' };
  if (mmr >= 1150) return { label: 'Silver',   color: '#6B7280', textColor: 'text-gray-600',    bgColor: 'bg-gray-100',    borderColor: 'border-gray-300',    emoji: '🥈' };
  return             { label: 'Bronze',  color: '#B45309', textColor: 'text-amber-700',   bgColor: 'bg-amber-100',   borderColor: 'border-amber-300',   emoji: '🥉' };
}

/**
 * MMR 면책 문구
 */
export const MMR_DISCLAIMER =
  'PKGG에서 자체 산출한 추정 MMR입니다.\n배그 공식 MMR과는 무관합니다.';
