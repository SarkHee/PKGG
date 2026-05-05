/**
 * PKGG 플레이스타일 분류기 v4
 * 5대 카테고리 × 5세부 타입 = 25종
 *
 * 입력 stats:
 *   avgDamage / avgKills / avgAssists
 *   avgSurviveTime (또는 avgSurvivalTime) / winRate / top10Rate / headshotRate
 *
 * 반환:
 *   label / code / desc / color / bg / border / primary
 *   major / majorLabel / majorIcon / majorColor   ← v4 신규
 */

const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v))

function normalize(s) {
  return {
    dmg:    clamp(s.avgDamage      / 500  * 100),
    kill:   clamp(s.avgKills       / 5    * 100),
    surv:   clamp(s.avgSurviveTime / 1800 * 100),
    place:  clamp((s.winRate * 2 + s.top10Rate) / 3),
    assist: clamp(s.avgAssists     / 3    * 100),
    hs:     clamp(s.headshotRate   / 60   * 100),
  }
}

// ── 대카테고리 ──────────────────────────────────────────────────────────────
export const MAJOR = {
  OFFENSIVE: { label: '공격형',   icon: '⚔️', color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/40' },
  SURVIVAL:  { label: '생존형',   icon: '🛡️', color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/40' },
  LONGRANGE: { label: '원거리형', icon: '🎯', color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/40' },
  TEAMPLAY:  { label: '팀플형',   icon: '🤝', color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/40' },
  BALANCED:  { label: '밸런스형', icon: '⚖️', color: 'text-gray-300',   bg: 'bg-gray-400/10',   border: 'border-gray-400/40' },
}

// ── 세부 타입 25종 + UNKNOWN ─────────────────────────────────────────────────
export const TYPES = {

  // ══ A. 공격형 ═══════════════════════════════════════════════════════════════

  // A1
  HYPER_CARRY: {
    major: 'OFFENSIVE', code: 'AGGRESSIVE',
    label: '👑 하이퍼 캐리',
    desc:  '딜량·킬·순위 전부 최상위. 혼자서 경기를 뒤집는 에이스 플레이어',
    tip:   '당신은 팀의 핵심 에이스입니다. 포지셔닝만 더 신중하게 하면 치킨 횟수가 폭발적으로 늘어납니다.',
    color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', primary: '딜량 + 킬 + Top10',
  },
  // A2
  ASSAULT_CARRY: {
    major: 'OFFENSIVE', code: 'AGGRESSIVE',
    label: '🔥 돌격 캐리',
    desc:  '높은 딜과 킬로 팀 교전을 주도하는 정통 공격수',
    tip:   '교전 주도권이 탁월합니다. 팀원 위치를 확인하고 돌진하면 써드파티 피해를 줄일 수 있습니다.',
    color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', primary: '딜량 + 킬',
  },
  // A3
  DAMAGE_BOMBER: {
    major: 'OFFENSIVE', code: 'AGGRESSIVE',
    label: '💥 딜 폭격기',
    desc:  '극단적인 딜량으로 팀 화력을 책임지는 딜 전문가 — 마무리보다 화력 집중',
    tip:   '딜량이 압도적입니다. 넉다운 후 빠른 마무리 타이밍을 익히면 킬도 함께 오릅니다.',
    color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', primary: '딜량 (킬 효율 개선 여지)',
  },
  // A4
  EARLY_RUSHER: {
    major: 'OFFENSIVE', code: 'AGGRESSIVE',
    label: '🚀 초반 러셔',
    desc:  '핫드랍에서 폭발적인 킬을 쌓는 돌격대장 — 생존 시간이 짧은 것이 과제',
    tip:   '초반 킬 능력이 뛰어납니다. 살아남는 연습에 집중하면 전체 성과가 크게 달라집니다.',
    color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30', primary: '킬 + 짧은 생존시간',
  },
  // A5
  KILL_HUNTER: {
    major: 'OFFENSIVE', code: 'AGGRESSIVE',
    label: '⚡ 킬 사냥꾼',
    desc:  '막타 효율을 극대화하는 킬 수집가 — 딜 대비 킬 비율이 높음',
    tip:   '마무리 감각이 탁월합니다. 딜도 직접 쌓는 습관을 들이면 종합 지표가 크게 향상됩니다.',
    color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', primary: '킬 (막타 특화)',
  },

  // ══ B. 생존형 ═══════════════════════════════════════════════════════════════

  // B1
  ENDGAME_MASTER: {
    major: 'SURVIVAL', code: 'PASSIVE',
    label: '🏆 엔드게임 마스터',
    desc:  '높은 승률과 Top10으로 후반 게임을 지배하는 순위 특화 플레이어',
    tip:   '엔드게임 실력이 탁월합니다. 딜을 더 적극적으로 넣으면 완벽한 플레이어가 됩니다.',
    color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', primary: '승률 + Top10',
  },
  // B2
  FULL_CAMPER: {
    major: 'SURVIVAL', code: 'PASSIVE',
    label: '🏕️ 완전 존버형',
    desc:  '교전을 극도로 회피하며 오래 사는 생존 극단주의자',
    tip:   '생존 시간이 매우 깁니다. 교전 타이밍을 조금씩 늘려가면 순위와 딜이 함께 오릅니다.',
    color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', primary: '생존시간 (교전 최소화)',
  },
  // B3
  CHICKEN_RUNNER: {
    major: 'SURVIVAL', code: 'PASSIVE',
    label: '🐔 치킨런 전문가',
    desc:  '후반까지 버텨 치킨을 노리는 후반 특화 플레이어',
    tip:   '후반 생존 능력이 탁월합니다. 교전 승률을 높이면 치킨 확률이 더욱 올라갑니다.',
    color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/30', primary: 'Top10 + 승률',
  },
  // B4
  SAFE_FARMER: {
    major: 'SURVIVAL', code: 'PASSIVE',
    label: '🌿 안전 파밍형',
    desc:  '조용히 파밍하며 순위를 안정적으로 챙기는 신중파',
    tip:   '안전 의식이 좋습니다. 파밍 후 교전 타이밍을 놓치지 않도록 적극성을 키워보세요.',
    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', primary: '생존시간 + Top10',
  },
  // B5
  PASSIVE_SURVIVOR: {
    major: 'SURVIVAL', code: 'PASSIVE',
    label: '🐢 소극적 생존형',
    desc:  '교전을 최소화하며 순위를 챙기는 조심스러운 플레이어',
    tip:   '교전 회피 능력이 있습니다. 유리한 상황을 판단해 교전에 참여하는 습관을 들여보세요.',
    color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/30', primary: '생존시간 (낮은 딜·킬)',
  },

  // ══ C. 원거리형 ═════════════════════════════════════════════════════════════

  // C1
  HEADSHOT_SNIPER: {
    major: 'LONGRANGE', code: 'SNIPER',
    label: '☠️ 헤드샷 저격수',
    desc:  '정확한 헤드샷으로 적을 즉사시키는 정밀 사수 — 킬과 헤드샷 모두 최상위',
    tip:   '정밀도가 탁월합니다. 이동 타겟에 대한 리드샷 감각을 더 익히면 완성형 저격수가 됩니다.',
    color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/30', primary: '헤드샷 비율 + 킬',
  },
  // C2
  BOLT_SPECIALIST: {
    major: 'LONGRANGE', code: 'SNIPER',
    label: '🎯 볼트액션 전문가',
    desc:  'SR/DMR로 원거리를 지배하는 저격 전문가',
    tip:   '원거리 교전 능력이 우수합니다. 근접 서브 무기를 철저히 준비하면 약점이 줄어듭니다.',
    color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', primary: '헤드샷 + 딜량',
  },
  // C3
  LONGRANGE_DEALER: {
    major: 'LONGRANGE', code: 'SNIPER',
    label: '🔭 원거리 딜러',
    desc:  '원거리에서 딜을 꾸준히 누적하는 DMR 스타일 플레이어',
    tip:   '원거리 딜 누적 능력이 뛰어납니다. 딜 후 포지션 이동을 습관화하면 생존율이 오릅니다.',
    color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30', primary: '딜량 (원거리 특화)',
  },
  // C4
  LONGRANGE_HARASSER: {
    major: 'LONGRANGE', code: 'SNIPER',
    label: '📡 원거리 견제형',
    desc:  '원거리에서 적 체력을 갉아먹는 견제 전문 플레이어',
    tip:   '견제 플레이가 좋습니다. 체력을 깎은 적을 팀원과 협력해 마무리하는 전술을 활용하세요.',
    color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', primary: '딜량 (낮은 킬)',
  },
  // C5
  POSITIONAL_SNIPER: {
    major: 'LONGRANGE', code: 'SNIPER',
    label: '🌑 포지션 저격형',
    desc:  '유리한 지형을 선점하고 기다리는 전략적 저격 플레이어',
    tip:   '포지셔닝 감각이 뛰어납니다. 지형을 잡은 후 적극적인 사격 타이밍을 놓치지 마세요.',
    color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30', primary: '헤드샷 + 생존시간',
  },

  // ══ D. 팀플형 ═══════════════════════════════════════════════════════════════

  // D1
  TACTICAL_LEADER: {
    major: 'TEAMPLAY', code: 'SUPPORT',
    label: '🌟 전술 리더',
    desc:  '높은 승률·어시스트·Top10으로 팀 전체를 이끄는 전략형 리더',
    tip:   '팀 리더십이 탁월합니다. 딜 기여도를 함께 높이면 완벽한 리더가 됩니다.',
    color: 'text-yellow-300', bg: 'bg-yellow-300/10', border: 'border-yellow-300/30', primary: '승률 + 어시스트 + Top10',
  },
  // D2
  ASSIST_SPECIALIST: {
    major: 'TEAMPLAY', code: 'SUPPORT',
    label: '🤝 어시스트 전문가',
    desc:  '팀원에게 킬을 헌납하며 팀 기여를 극대화하는 진정한 팀플레이어',
    tip:   '어시스트 기여도가 매우 높습니다. 마무리 타이밍을 조금 더 적극적으로 잡아보세요.',
    color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', primary: '어시스트',
  },
  // D3
  OFFENSIVE_SUPPORT: {
    major: 'TEAMPLAY', code: 'SUPPORT',
    label: '🛡️ 공격 서포터',
    desc:  '딜과 어시스트를 동시에 챙기는 공격적인 서포터',
    tip:   '딜과 지원을 모두 잘합니다. 팀원의 위치를 항상 파악하고 지원 타이밍을 놓치지 마세요.',
    color: 'text-indigo-300', bg: 'bg-indigo-300/10', border: 'border-indigo-300/30', primary: '딜량 + 어시스트',
  },
  // D4
  DEFENSIVE_SUPPORT: {
    major: 'TEAMPLAY', code: 'SUPPORT',
    label: '🏥 방어 서포터',
    desc:  '팀원 부활과 지원에 특화된 생존 우선 서포터',
    tip:   '팀 유지 능력이 탁월합니다. 연막탄과 힐 아이템을 상시 소지해 부활 성공률을 높이세요.',
    color: 'text-emerald-300', bg: 'bg-emerald-300/10', border: 'border-emerald-300/30', primary: '생존시간 + 어시스트',
  },
  // D5
  TEAM_ACE: {
    major: 'TEAMPLAY', code: 'SUPPORT',
    label: '🎖️ 팀 에이스',
    desc:  '딜·킬·어시스트·승률을 모두 챙기는 팀의 핵심 에이스',
    tip:   '팀 기여도가 전방위적으로 높습니다. 위기 상황에서의 콜링을 더 늘려보세요.',
    color: 'text-blue-300', bg: 'bg-blue-300/10', border: 'border-blue-300/30', primary: '딜 + 킬 + 어시스트 + 승률',
  },

  // ══ E. 밸런스형 ═════════════════════════════════════════════════════════════

  // E1
  ALL_ROUNDER: {
    major: 'BALANCED', code: 'BALANCED',
    label: '⚖️ 완전 올라운더',
    desc:  '모든 지표가 평균 이상. 어떤 상황에도 대응하는 만능 플레이어',
    tip:   '균형 잡힌 실력입니다. 한 가지 특기를 더 강화하면 상위권 진입이 가능합니다.',
    color: 'text-gray-200', bg: 'bg-gray-400/10', border: 'border-gray-400/30', primary: '종합 균형',
  },
  // E2
  MID_RANGE_STABLE: {
    major: 'BALANCED', code: 'BALANCED',
    label: '🎮 중거리 안정형',
    desc:  '중거리 교전을 주도하는 안정적인 밸런스 플레이어',
    tip:   '중거리 교전이 안정적입니다. 원거리 서브와 근접 대응 능력을 보완하면 더욱 강해집니다.',
    color: 'text-slate-300', bg: 'bg-slate-400/10', border: 'border-slate-400/30', primary: '딜량 + 킬 (안정)',
  },
  // E3
  ADAPTIVE: {
    major: 'BALANCED', code: 'BALANCED',
    label: '🔄 상황 대응형',
    desc:  '상황에 따라 유연하게 플레이하는 적응형 플레이어',
    tip:   '적응력이 좋습니다. 특정 상황에서 더 과감한 결정을 내리는 연습을 해보세요.',
    color: 'text-zinc-300', bg: 'bg-zinc-400/10', border: 'border-zinc-400/30', primary: '상황별 대응',
  },
  // E4
  GROWTH: {
    major: 'BALANCED', code: 'BALANCED',
    label: '🌱 성장형',
    desc:  '경험을 쌓으며 빠르게 성장 중인 플레이어 — 무한한 잠재력',
    tip:   '성장 속도가 중요합니다. 연습장에서 기본기를 다지고 고정 착지 루틴을 만들어보세요.',
    color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/30', primary: '성장 잠재력',
  },
  // E5
  GENERAL_BALANCED: {
    major: 'BALANCED', code: 'BALANCED',
    label: '📊 일반 균형형',
    desc:  '전반적으로 평균 수준의 균형 잡힌 플레이어',
    tip:   '꾸준한 플레이어입니다. 딜량을 우선 200 이상으로 끌어올리는 것이 첫 목표입니다.',
    color: 'text-neutral-400', bg: 'bg-neutral-400/10', border: 'border-neutral-400/30', primary: '전반 평균',
  },

  // ── UNKNOWN ──────────────────────────────────────────────────────────────────
  UNKNOWN: {
    major: 'BALANCED', code: 'BALANCED',
    label: '❓ 분류 불가',
    desc:  '데이터가 부족해 스타일을 분류할 수 없습니다',
    tip:   '더 많은 경기를 플레이하면 정확한 스타일 분석이 가능해집니다.',
    color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', primary: '데이터 없음',
  },
}

// ── 분류 메인 함수 ─────────────────────────────────────────────────────────────
export function classifyPlaystyle(rawStats) {
  if (!rawStats) return TYPES.UNKNOWN

  const s = {
    avgDamage:      parseFloat(rawStats.avgDamage      || 0),
    avgKills:       parseFloat(rawStats.avgKills       || 0),
    avgAssists:     parseFloat(rawStats.avgAssists     || 0),
    avgSurviveTime: parseFloat(rawStats.avgSurviveTime ?? rawStats.avgSurvivalTime ?? 0),
    winRate:        parseFloat(rawStats.winRate        || 0),
    top10Rate:      parseFloat(rawStats.top10Rate      || 0),
    headshotRate:   parseFloat(rawStats.headshotRate   || 0),
  }

  if (s.avgDamage === 0 && s.avgKills === 0) return TYPES.UNKNOWN

  // ── 1. A1 하이퍼 캐리 ─────────────────────────────────────────────────────
  if (s.avgDamage >= 550 && s.avgKills >= 4.5)
    return TYPES.HYPER_CARRY

  // ── 2. C1 헤드샷 저격수 ──────────────────────────────────────────────────
  if (s.headshotRate >= 35 && s.avgKills >= 2.5 && s.avgDamage >= 280)
    return TYPES.HEADSHOT_SNIPER

  // ── 3. A2 돌격 캐리 ──────────────────────────────────────────────────────
  if (s.avgDamage >= 380 && s.avgKills >= 3.5)
    return TYPES.ASSAULT_CARRY

  // ── 4. B1 엔드게임 마스터 ─────────────────────────────────────────────────
  if (s.winRate >= 15 && s.top10Rate >= 55)
    return TYPES.ENDGAME_MASTER

  // ── 5. A3 딜 폭격기 ──────────────────────────────────────────────────────
  if (s.avgDamage >= 430 && s.avgKills < 3.2)
    return TYPES.DAMAGE_BOMBER

  // ── 6. D1 전술 리더 ──────────────────────────────────────────────────────
  if (s.winRate >= 12 && s.avgAssists >= 1.8 && s.top10Rate >= 42)
    return TYPES.TACTICAL_LEADER

  // ── 7. A4 초반 러셔 ──────────────────────────────────────────────────────
  if (s.avgKills >= 3.0 && s.avgSurviveTime < 750 && s.avgDamage >= 180)
    return TYPES.EARLY_RUSHER

  // ── 8. C2 볼트액션 전문가 ─────────────────────────────────────────────────
  if (s.headshotRate >= 25 && s.avgDamage >= 300 && s.avgKills >= 1.8)
    return TYPES.BOLT_SPECIALIST

  // ── 9. A5 킬 사냥꾼 ──────────────────────────────────────────────────────
  if (s.avgKills >= 2.5 && s.avgKills > 0 && (s.avgDamage / s.avgKills) < 100)
    return TYPES.KILL_HUNTER

  // ── 10. D2 어시스트 전문가 ───────────────────────────────────────────────
  if (s.avgAssists >= 2.5)
    return TYPES.ASSIST_SPECIALIST

  // ── 11. B2 완전 존버형 ───────────────────────────────────────────────────
  if (s.avgSurviveTime >= 1600 && s.avgDamage < 130)
    return TYPES.FULL_CAMPER

  // ── 12. D5 팀 에이스 ─────────────────────────────────────────────────────
  if (s.winRate >= 8 && s.avgAssists >= 1.2 && s.avgKills >= 2.0 && s.avgDamage >= 260)
    return TYPES.TEAM_ACE

  // ── 13. B3 치킨런 전문가 ─────────────────────────────────────────────────
  if (s.top10Rate >= 45 && s.winRate >= 8 && s.avgKills < 2.0)
    return TYPES.CHICKEN_RUNNER

  // ── 14. C3 원거리 딜러 ───────────────────────────────────────────────────
  if (s.avgDamage >= 360 && s.avgKills < 2.5 && s.headshotRate >= 15)
    return TYPES.LONGRANGE_DEALER

  // ── 15. D3 공격 서포터 ───────────────────────────────────────────────────
  if (s.avgDamage >= 280 && s.avgAssists >= 1.5)
    return TYPES.OFFENSIVE_SUPPORT

  // ── 16. E1 완전 올라운더 ─────────────────────────────────────────────────
  if (s.avgDamage >= 280 && s.avgKills >= 2.0 && s.winRate >= 6 && s.top10Rate >= 30)
    return TYPES.ALL_ROUNDER

  // ── 17. C4 원거리 견제형 ─────────────────────────────────────────────────
  if (s.avgDamage >= 280 && s.avgKills < 2.0 && s.headshotRate >= 10)
    return TYPES.LONGRANGE_HARASSER

  // ── 18. C5 포지션 저격형 ─────────────────────────────────────────────────
  if (s.headshotRate >= 18 && s.avgSurviveTime >= 1100 && s.avgDamage >= 200)
    return TYPES.POSITIONAL_SNIPER

  // ── 19. B4 안전 파밍형 ───────────────────────────────────────────────────
  if (s.avgSurviveTime >= 1200 && s.top10Rate >= 30 && s.avgDamage < 200)
    return TYPES.SAFE_FARMER

  // ── 20. D4 방어 서포터 ───────────────────────────────────────────────────
  if (s.avgSurviveTime >= 1200 && s.avgAssists >= 1.5)
    return TYPES.DEFENSIVE_SUPPORT

  // ── 21. E2 중거리 안정형 ─────────────────────────────────────────────────
  if (s.avgDamage >= 180 && s.avgDamage < 380 && s.avgKills >= 1.5 && s.avgKills < 3.0 && s.avgSurviveTime >= 900)
    return TYPES.MID_RANGE_STABLE

  // ── 22. B5 소극적 생존형 ─────────────────────────────────────────────────
  if (s.avgSurviveTime >= 900 && s.avgDamage < 180 && s.avgKills < 1.5)
    return TYPES.PASSIVE_SURVIVOR

  // ── 23. E3 상황 대응형 ───────────────────────────────────────────────────
  if (s.avgDamage >= 180 && s.avgKills >= 1.3)
    return TYPES.ADAPTIVE

  // ── 24. E4 성장형 ────────────────────────────────────────────────────────
  if (s.avgDamage >= 80 || s.avgKills >= 0.8)
    return TYPES.GROWTH

  // ── 25. E5 일반 균형형 (최종 fallback) ───────────────────────────────────
  return TYPES.GENERAL_BALANCED
}

export function getPlaystyleCode(stats)  { return classifyPlaystyle(stats).code }
export function getPlaystyleLabel(stats) { return classifyPlaystyle(stats).label }
