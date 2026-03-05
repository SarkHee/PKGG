/**
 * PKGG 통합 플레이스타일 분류기 (v3)
 *
 * 기존 3곳에 분산된 분류 로직을 하나로 통합.
 * playstyle.js / aiCoaching.js / clan-analytics.js 모두 이 함수를 사용.
 *
 * ────────────────────────────────────────────────────────────
 *  입력 stats 키 (모두 선택적, 없으면 0)
 *   avgDamage      : 게임당 평균 딜량
 *   avgKills       : 게임당 평균 킬
 *   avgAssists     : 게임당 평균 어시스트
 *   avgSurviveTime : 게임당 평균 생존 시간 (초) — avgSurvivalTime 도 허용
 *   winRate        : 승률 (0~100 %)
 *   top10Rate      : Top10 진입률 (0~100 %)
 *   headshotRate   : 헤드샷 비율 (0~100 %, 선택)  ← v3 신규
 * ────────────────────────────────────────────────────────────
 *
 *  반환 객체
 *   label    : 한국어 이름 (이모지 포함)  예) "🔥 공격 캐리"
 *   code     : 영문 코드 (aiCoaching 호환) 예) "AGGRESSIVE"
 *   desc     : 한 줄 설명
 *   color    : Tailwind 텍스트 색상 클래스
 *   bg       : Tailwind 배경 색상 클래스
 *   border   : Tailwind 테두리 색상 클래스
 *   primary  : 이 타입을 결정한 주요 지표
 */

/** 내부: 0~100 클램프 */
const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/**
 * 스탯 → 정규화 점수 (0~100)
 * 기준값: 배그 스쿼드 상위 10% 플레이어 수준
 */
function normalize(stats) {
  const dmg    = clamp(stats.avgDamage      / 500 * 100);
  const kill   = clamp(stats.avgKills       / 5   * 100);
  const surv   = clamp(stats.avgSurviveTime / 1800 * 100);
  const place  = clamp((stats.winRate * 2 + stats.top10Rate) / 3);
  const assist = clamp(stats.avgAssists     / 3   * 100);
  const hs     = clamp(stats.headshotRate   / 60  * 100); // 60%를 만점 기준
  return { dmg, kill, surv, place, assist, hs };
}

/**
 * 플레이스타일 분류 메인 함수
 * @param {Object} rawStats
 * @returns {{ label, code, desc, color, bg, border, primary }}
 */
export function classifyPlaystyle(rawStats) {
  if (!rawStats) return TYPES.UNKNOWN;

  const s = {
    avgDamage:      parseFloat(rawStats.avgDamage      || 0),
    avgKills:       parseFloat(rawStats.avgKills       || 0),
    avgAssists:     parseFloat(rawStats.avgAssists     || 0),
    avgSurviveTime: parseFloat(rawStats.avgSurviveTime ?? rawStats.avgSurvivalTime ?? 0),
    winRate:        parseFloat(rawStats.winRate        || 0),
    top10Rate:      parseFloat(rawStats.top10Rate      || 0),
    headshotRate:   parseFloat(rawStats.headshotRate   || 0),
  };

  // 데이터 없음
  if (s.avgDamage === 0 && s.avgKills === 0) return TYPES.UNKNOWN;

  const n = normalize(s);

  // ── 1. 하이퍼 캐리 ────────────────────────────────────────
  // 딜량·킬·순위 모두 최상위권
  if (s.avgDamage >= 450 && s.avgKills >= 3.5 && s.top10Rate >= 30)
    return TYPES.HYPER_CARRY;

  // ── 2. 정밀 사수형 (v3 신규) ───────────────────────────────
  // 헤드샷 비율이 높고 딜량·킬 모두 안정적 — 저격·정밀 교전 전문
  if (s.headshotRate >= 40 && s.avgDamage >= 250 && s.avgKills >= 2.0)
    return TYPES.PRECISION_SNIPER;

  // ── 3. 공격 캐리 ──────────────────────────────────────────
  // 딜량과 킬 모두 높음, 공격적 플레이
  if (s.avgDamage >= 300 && s.avgKills >= 2.5)
    return TYPES.AGGRESSIVE_CARRY;

  // ── 4. 초반 러셔 (v3 신규) ────────────────────────────────
  // 초반 열혈 교전으로 킬을 쌓지만 생존 시간이 짧음
  if (s.avgKills >= 2.5 && s.avgSurviveTime < 800 && s.avgDamage >= 180)
    return TYPES.EARLY_RUSHER;

  // ── 5. 딜 특화형 ──────────────────────────────────────────
  // 딜량은 높지만 킬로 마무리 못하는 경우 (딜탱)
  if (s.avgDamage >= 280 && s.avgKills < 2.0)
    return TYPES.DAMAGE_DEALER;

  // ── 6. 킬 파밍러 ──────────────────────────────────────────
  // 킬은 많지만 딜 대비 킬 비율이 비정상적으로 높음 (킬 스틸 경향)
  if (s.avgKills >= 3.0 && s.avgKills > 0 && (s.avgDamage / s.avgKills) < 90)
    return TYPES.KILL_FARMER;

  // ── 7. 전술 리더형 (v3 신규) ──────────────────────────────
  // 높은 승률 + 어시스트 + Top10 — 팀을 이끄는 전략형 플레이어
  if (s.winRate >= 12 && s.avgAssists >= 1.5 && s.top10Rate >= 40)
    return TYPES.TACTICAL_LEADER;

  // ── 8. 정밀 교전형 ────────────────────────────────────────
  // 중상위 딜량에 안정적인 킬 — 신중하고 효율적인 교전
  if (s.avgDamage >= 220 && s.avgKills >= 1.8 && s.avgKills < 3.0)
    return TYPES.PRECISION_FIGHTER;

  // ── 9. 생존 승부사 ────────────────────────────────────────
  // 적게 싸우지만 치킨·Top10에 특화
  if (s.winRate >= 12 || (s.top10Rate >= 50 && s.avgDamage < 200))
    return TYPES.SURVIVAL_WINNER;

  // ── 10. 존버 생존형 ────────────────────────────────────────
  // 생존시간은 길지만 교전 회피 — 딜·킬 모두 낮음
  if (s.avgSurviveTime >= 1400 && s.avgDamage < 180 && s.avgKills < 1.5)
    return TYPES.CAMPER;

  // ── 11. 팀 서포터 ──────────────────────────────────────────
  // 어시스트 높음, 팀 기여 중심
  if (s.avgAssists >= 2.0 && (s.top10Rate >= 30 || s.avgDamage >= 160))
    return TYPES.TEAM_SUPPORT;

  // ── 12. 중거리 안정형 ──────────────────────────────────────
  // 딜·킬·생존 모두 평균 수준, 안정적인 플레이
  if (s.avgDamage >= 160 && s.avgKills >= 1.2 && s.avgSurviveTime >= 800)
    return TYPES.BALANCED;

  // ── 13. 공격 지향 (낮은 수준) ─────────────────────────────
  // 딜·킬 있지만 생존 짧음 — 공격적이나 아직 성장 중
  if (s.avgDamage >= 120 && s.avgKills >= 1.0 && s.avgSurviveTime < 800)
    return TYPES.AGGRESSIVE_BEGINNER;

  // ── 14. 성장형 ────────────────────────────────────────────
  return TYPES.BEGINNER;
}

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export const TYPES = {
  HYPER_CARRY: {
    label:   '👑 하이퍼 캐리',
    code:    'AGGRESSIVE',
    desc:    '딜량·킬·순위 모두 최상위권. 팀 전체를 이끄는 에이스',
    color:   'text-purple-400',
    bg:      'bg-purple-400/10',
    border:  'border-purple-400/30',
    primary: '딜량 + 킬 + Top10',
  },
  PRECISION_SNIPER: {
    label:   '🎯 정밀 사수형',
    code:    'AGGRESSIVE',
    desc:    '높은 헤드샷 비율과 안정적인 딜·킬 — 정확한 한 발로 승부하는 전문 사수',
    color:   'text-cyan-400',
    bg:      'bg-cyan-400/10',
    border:  'border-cyan-400/30',
    primary: '헤드샷 비율 + 딜량 + 킬',
  },
  AGGRESSIVE_CARRY: {
    label:   '🔥 공격 캐리',
    code:    'AGGRESSIVE',
    desc:    '높은 딜량과 킬로 팀 딜링을 주도하는 공격형',
    color:   'text-red-400',
    bg:      'bg-red-400/10',
    border:  'border-red-400/30',
    primary: '딜량 + 킬',
  },
  EARLY_RUSHER: {
    label:   '🔫 초반 러셔',
    code:    'AGGRESSIVE',
    desc:    '초반 열혈 교전으로 킬을 쌓지만 생존 시간이 짧은 돌격형 — 포지셔닝 개선 필요',
    color:   'text-rose-400',
    bg:      'bg-rose-400/10',
    border:  'border-rose-400/30',
    primary: '킬 + 낮은 생존시간',
  },
  DAMAGE_DEALER: {
    label:   '💥 딜 특화형',
    code:    'AGGRESSIVE',
    desc:    '딜량은 최상위지만 마무리 킬보다 팀 딜 기여에 집중',
    color:   'text-orange-400',
    bg:      'bg-orange-400/10',
    border:  'border-orange-400/30',
    primary: '딜량',
  },
  KILL_FARMER: {
    label:   '⚡ 킬 파밍러',
    code:    'AGGRESSIVE',
    desc:    '킬 수는 많지만 딜 효율이 낮음 — 막타 위주의 플레이',
    color:   'text-yellow-400',
    bg:      'bg-yellow-400/10',
    border:  'border-yellow-400/30',
    primary: '킬 (낮은 딜/킬 비율)',
  },
  TACTICAL_LEADER: {
    label:   '🤝 전술 리더형',
    code:    'SUPPORT',
    desc:    '높은 승률과 어시스트로 팀 전체를 이끄는 전략형 플레이어',
    color:   'text-indigo-400',
    bg:      'bg-indigo-400/10',
    border:  'border-indigo-400/30',
    primary: '승률 + 어시스트 + Top10',
  },
  PRECISION_FIGHTER: {
    label:   '⚔️ 정밀 교전형',
    code:    'AGGRESSIVE',
    desc:    '신중하게 교전하고 효율적으로 킬을 가져오는 안정적 공격수',
    color:   'text-blue-400',
    bg:      'bg-blue-400/10',
    border:  'border-blue-400/30',
    primary: '딜량 + 킬 효율',
  },
  SURVIVAL_WINNER: {
    label:   '🛡️ 생존 승부사',
    code:    'PASSIVE',
    desc:    '적게 싸우고 확실하게 치킨·Top10을 챙기는 순위 전문가',
    color:   'text-teal-400',
    bg:      'bg-teal-400/10',
    border:  'border-teal-400/30',
    primary: '승률 + Top10',
  },
  CAMPER: {
    label:   '🏕️ 존버 생존형',
    code:    'PASSIVE',
    desc:    '교전을 최대한 회피하며 오래 살아남는 수비 중심 플레이',
    color:   'text-green-400',
    bg:      'bg-green-400/10',
    border:  'border-green-400/30',
    primary: '생존시간',
  },
  TEAM_SUPPORT: {
    label:   '🧠 팀 서포터',
    code:    'SUPPORT',
    desc:    '어시스트와 팀 기여에 집중, 팀원을 살려주는 플레이',
    color:   'text-sky-400',
    bg:      'bg-sky-400/10',
    border:  'border-sky-400/30',
    primary: '어시스트 + Top10',
  },
  BALANCED: {
    label:   '⚖️ 올라운더',
    code:    'BALANCED',
    desc:    '딜·킬·생존 모두 평균 이상. 어떤 상황에도 대응 가능',
    color:   'text-gray-300',
    bg:      'bg-gray-400/10',
    border:  'border-gray-400/30',
    primary: '종합 균형',
  },
  AGGRESSIVE_BEGINNER: {
    label:   '🌋 공격 지향형',
    code:    'AGGRESSIVE',
    desc:    '교전 의지는 높지만 생존률이 낮음 — 포지셔닝 개선 필요',
    color:   'text-amber-400',
    bg:      'bg-amber-400/10',
    border:  'border-amber-400/30',
    primary: '딜량 (낮은 생존시간)',
  },
  BEGINNER: {
    label:   '🌱 성장형',
    code:    'BALANCED',
    desc:    '전반적으로 낮은 스탯 — 경험을 쌓으며 성장 중',
    color:   'text-lime-400',
    bg:      'bg-lime-400/10',
    border:  'border-lime-400/30',
    primary: '성장 잠재력',
  },
  UNKNOWN: {
    label:   '❓ 분류 불가',
    code:    'BALANCED',
    desc:    '데이터가 부족해 스타일을 분류할 수 없습니다',
    color:   'text-gray-500',
    bg:      'bg-gray-500/10',
    border:  'border-gray-500/30',
    primary: '데이터 없음',
  },
};

/**
 * aiCoaching.js 호환 — code(AGGRESSIVE 등)만 필요한 경우
 */
export function getPlaystyleCode(stats) {
  return classifyPlaystyle(stats).code;
}

/**
 * label(한국어 이모지 포함)만 필요한 경우
 */
export function getPlaystyleLabel(stats) {
  return classifyPlaystyle(stats).label;
}
