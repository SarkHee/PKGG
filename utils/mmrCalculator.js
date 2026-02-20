/**
 * PK.GG 커스텀 MMR 계산기
 *
 * PUBG는 공식 MMR을 제공하지 않으므로,
 * 시즌 통계 기반으로 PK.GG만의 MMR을 산출합니다.
 *
 * 공식: MMR = 1000(기본)
 *           + avgDamage  × 0.5   (딜량 기여: 최대 ~300)
 *           + avgKills   × 50    (킬 기여: 최대 ~250)
 *           + winRate    × 10    (승률 기여: 0~100%)
 *           + top10Rate  × 3     (생존 기여: 0~100%)
 *
 * 예) 평균 플레이어(딜150/킬1.5/승률3/탑10_25%): ≈ 1261
 *     우수 플레이어(딜300/킬3/승률10/탑10_50%):  ≈ 1550
 *     상위 플레이어(딜500/킬5/승률20/탑10_80%):  ≈ 1940
 */

/**
 * summary 객체로부터 MMR 계산
 * @param {Object} summary - { avgDamage, avgKills, winRate, top10Rate }
 * @returns {number} MMR 값 (최소 1000)
 */
export function calculateMMR(summary) {
  if (!summary) return 1000;

  const avgDamage  = parseFloat(summary.avgDamage  || 0);
  const avgKills   = parseFloat(summary.avgKills   || 0);
  const winRate    = parseFloat(summary.winRate    || 0);
  const top10Rate  = parseFloat(summary.top10Rate  || 0);

  const mmr = Math.round(
    1000
    + avgDamage * 0.5
    + avgKills  * 50
    + winRate   * 10
    + top10Rate * 3
  );

  return Math.max(1000, mmr);
}

/**
 * MMR 등급 정보 반환
 * @param {number} mmr
 * @returns {{ label: string, color: string, textColor: string, emoji: string }}
 */
export function getMMRTier(mmr) {
  if (mmr >= 2000) return { label: 'Master',    color: '#7C3AED', textColor: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-300', emoji: '👑' };
  if (mmr >= 1800) return { label: 'Diamond',   color: '#0EA5E9', textColor: 'text-sky-600',    bgColor: 'bg-sky-100',    borderColor: 'border-sky-300',    emoji: '💎' };
  if (mmr >= 1600) return { label: 'Platinum',  color: '#14B8A6', textColor: 'text-teal-600',   bgColor: 'bg-teal-100',   borderColor: 'border-teal-300',   emoji: '🔷' };
  if (mmr >= 1400) return { label: 'Gold',      color: '#EAB308', textColor: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300', emoji: '🥇' };
  if (mmr >= 1200) return { label: 'Silver',    color: '#6B7280', textColor: 'text-gray-600',   bgColor: 'bg-gray-100',   borderColor: 'border-gray-300',   emoji: '🥈' };
  return              { label: 'Bronze',    color: '#B45309', textColor: 'text-amber-700',  bgColor: 'bg-amber-100',  borderColor: 'border-amber-300',  emoji: '🥉' };
}

/**
 * MMR 면책 문구 (고정 텍스트)
 */
export const MMR_DISCLAIMER =
  'PK.GG에서 자체 산출한 추정 MMR입니다.\n배그 공식 MMR과는 무관합니다.';
