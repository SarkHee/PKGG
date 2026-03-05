// ─────────────────────────────────────────────
// PKGG 무기 성향 테스트 데이터 & 로직 (v2)
// ─────────────────────────────────────────────

/** 설문 12문항 */
export const SURVEY_QUESTIONS = [
  {
    id: 1,
    question: '드랍 직후, 적이 바로 앞에 있다. 당신의 선택은?',
    icon: '🪂',
    category: '전투 본능',
    options: [
      { text: '맨손이라도 일단 달려든다', desc: '본능적 전투 의지', points: { aggression: 3 } },
      { text: '무기 찾을 때까지 피한다', desc: '냉철한 생존 판단', points: { survival: 3, stability: 1 } },
      { text: '팀원에게 도움을 요청한다', desc: '영리한 팀워크', points: { teamwork: 3, survival: 1 } },
      { text: '지형지물로 상황을 판단한다', desc: '전략적 사고', points: { stability: 2, precision: 1 } },
    ],
  },
  {
    id: 2,
    question: '가장 선호하는 교전 거리는?',
    icon: '🎯',
    category: '전투 스타일',
    options: [
      { text: '10m 이내 — 코 앞에서 제압', desc: '근접 전투 특화', points: { aggression: 2, ammo_9mm: 3 } },
      { text: '30~100m — AR 중거리', desc: '범용 전투 스타일', points: { stability: 3, ammo_556: 3 } },
      { text: '100~300m — DMR 원거리', desc: '원거리 압박 선호', points: { precision: 2, ammo_762: 2, distance: 2 } },
      { text: '300m 이상 — SR 초장거리', desc: '저격 전문가', points: { precision: 3, ammo_762: 3, distance: 3 } },
    ],
  },
  {
    id: 3,
    question: '스쿼드에서 자연스럽게 맡게 되는 역할은?',
    icon: '👥',
    category: '팀 내 역할',
    options: [
      { text: '선봉 — 앞서서 적과 맞붙는다', desc: '공격적 선도자', points: { aggression: 3, teamwork: 1 } },
      { text: '커버 — 팀원 뒤에서 엄호', desc: '팀 방패', points: { teamwork: 3, survival: 1 } },
      { text: '저격수 — 원거리에서 지원', desc: '원거리 지원', points: { precision: 3, distance: 3 } },
      { text: '콜러 — 전략과 동선을 결정', desc: '두뇌 지휘관', points: { stability: 3, teamwork: 2 } },
    ],
  },
  {
    id: 4,
    question: '파이널 서클, 적 2명이 교전 중이다. 어떻게 한다?',
    icon: '🔴',
    category: '순간 판단력',
    options: [
      { text: '바로 개입, 둘 다 잡는다', desc: '대담한 승부사', points: { aggression: 3 } },
      { text: '한 명이 죽을 때까지 기다린다', desc: '냉정한 계산', points: { precision: 2, stability: 2 } },
      { text: '조용히 포지션 잡고 생존 우선', desc: '신중한 생존자', points: { survival: 3, stability: 1 } },
      { text: '팀원과 협력해 포위 공격', desc: '팀플레이 신봉자', points: { teamwork: 3, aggression: 1 } },
    ],
  },
  {
    id: 5,
    question: '무기를 고를 때 가장 중요한 기준은?',
    icon: '🔫',
    category: '무기 철학',
    options: [
      { text: '연사속도 — 빠르게 쏟아붓는다', desc: '속사 위주', points: { aggression: 2, ammo_9mm: 2, ammo_556: 1 } },
      { text: '명중률 — 한 발 한 발 정확하게', desc: '정밀 사격 중시', points: { precision: 3, ammo_762: 1 } },
      { text: '범용성 — 중거리 AR 하나면 충분', desc: '실용주의자', points: { stability: 3, ammo_556: 3 } },
      { text: '1타 위력 — 강력한 볼트액션', desc: '원샷 원킬 추구', points: { precision: 3, ammo_762: 3, distance: 2 } },
    ],
  },
  {
    id: 6,
    question: '이동 중 갑자기 총격을 받았다. 당신은?',
    icon: '💨',
    category: '반응 패턴',
    options: [
      { text: '총소리 방향으로 반격 돌격', desc: '즉각 반격', points: { aggression: 3 } },
      { text: '엄폐물 뒤로 숨어 냉정하게 판단', desc: '침착한 대응', points: { survival: 2, stability: 2 } },
      { text: '팀원들에게 위치 알리고 협공', desc: '팀 신호 우선', points: { teamwork: 3, survival: 1 } },
      { text: '연막을 치고 안전하게 후퇴', desc: '전술적 회피', points: { survival: 3, stability: 1 } },
    ],
  },
  {
    id: 7,
    question: '적을 쓰러뜨릴 때 가장 만족스러운 방법은?',
    icon: '🏆',
    category: '킬 쾌감',
    options: [
      { text: 'SMG/샷건으로 근접 제압', desc: '근거리 다연발', points: { aggression: 3, ammo_9mm: 2 } },
      { text: 'AR로 정확한 연사 제압', desc: '중거리 제압', points: { aggression: 2, ammo_556: 3 } },
      { text: 'DMR로 정확한 헤드샷 연속', desc: '정밀 반자동', points: { precision: 3, ammo_762: 2, distance: 1 } },
      { text: 'SR로 원거리 원샷 원킬', desc: '원거리 원킬', points: { precision: 3, ammo_762: 3, distance: 3 } },
    ],
  },
  {
    id: 8,
    question: '하루를 마무리할 때 가장 뿌듯한 순간은?',
    icon: '😊',
    category: '게임의 의미',
    options: [
      { text: '킬 수가 많았을 때', desc: '교전 즐기는 타입', points: { aggression: 3 } },
      { text: '치킨(1등)을 먹었을 때', desc: '결과 지향형', points: { survival: 2, stability: 2 } },
      { text: '팀원이 "덕분에 이겼다"고 말할 때', desc: '팀 기여 중시', points: { teamwork: 3 } },
      { text: '먼 거리 헤드샷을 성공시켰을 때', desc: '기술 성취형', points: { precision: 3, distance: 2 } },
    ],
  },
  {
    id: 9,
    question: '루트를 선택할 때 당신의 기준은?',
    icon: '🗺️',
    category: '전략 성향',
    options: [
      { text: '핫드랍 — 액션이 많을수록 좋아', desc: '전투 욕구 최우선', points: { aggression: 3 } },
      { text: '조용한 곳 — 안정적 파밍 후 도전', desc: '안전 파밍 선호', points: { survival: 3, ammo_556: 1 } },
      { text: '팀과 상의해서 결정', desc: '팀 우선주의', points: { teamwork: 3, stability: 1 } },
      { text: '원 중심, 고지대 포지션 선점', desc: '전략 포지셔너', points: { precision: 2, survival: 2, distance: 1 } },
    ],
  },
  {
    id: 10,
    question: '당신에게 "배틀로얄의 재미"란?',
    icon: '🎮',
    category: '게임 철학',
    options: [
      { text: '적을 압도하는 전투력을 뽐내는 것', desc: '전투형', points: { aggression: 3, precision: 1 } },
      { text: '마지막까지 살아남아 치킨 먹기', desc: '생존형', points: { survival: 3, stability: 1 } },
      { text: '팀원들과 소통하며 협력하는 것', desc: '팀플형', points: { teamwork: 3, stability: 1 } },
      { text: '긴장감 속 완벽한 판단과 플레이', desc: '전략형', points: { precision: 2, stability: 2 } },
    ],
  },
  {
    id: 11,
    question: '주로 사용하는 조준경(스코프) 배율은?',
    icon: '🔭',
    category: '무기 세팅',
    options: [
      { text: '1x~2x — 빠른 근접 대응', desc: '근거리 속사 세팅', points: { aggression: 2, ammo_9mm: 1 } },
      { text: '3x~4x — 범용 중거리 세팅', desc: '중거리 안정 세팅', points: { stability: 2, ammo_556: 2 } },
      { text: '6x~8x — 원거리 압박 세팅', desc: '원거리 저격 세팅', points: { precision: 2, distance: 2, ammo_762: 1 } },
      { text: '홀로사이트 — 빠른 조준 우선', desc: '스피드 공격 세팅', points: { aggression: 1, ammo_9mm: 2 } },
    ],
  },
  {
    id: 12,
    question: '게임 중 가장 억울한 상황은?',
    icon: '😤',
    category: '플레이 가치관',
    options: [
      { text: '1등 직전에 다운되거나 빠질 때', desc: '결과 집착형', points: { survival: 3, stability: 1 } },
      { text: '킬 스틸 당했을 때', desc: '전투 성과 중시', points: { aggression: 2, precision: 1 } },
      { text: '팀원이 혼자 고립돼 죽었을 때', desc: '팀워크 신봉자', points: { teamwork: 3 } },
      { text: '포지션 실수로 허무하게 당했을 때', desc: '전략 완벽주의', points: { precision: 2, stability: 2 } },
    ],
  },
];

/** 각 차원별 최대 획득 가능 점수 (정규화 분모) — 12문항 기준 */
export const MAX_SCORES = {
  aggression: 32,
  stability:  24,
  precision:  26,
  survival:   21,
  teamwork:   24,
  distance:   16,
  ammo_556:   12,
  ammo_762:   10,
  ammo_9mm:    9,
};

/** 레이더 차트 라벨 */
export const VECTOR_LABELS = {
  aggression: '공격성',
  stability:  '안정성',
  precision:  '정밀도',
  survival:   '생존력',
  teamwork:   '팀워크',
  distance:   '교전거리',
  ammo_556:   '5.56mm',
  ammo_762:   '7.62mm',
  ammo_9mm:   '9mm',
};

/** 12가지 성향 타입 */
export const PERSONALITY_TYPES = [
  {
    id: 'war_tyrant',
    name: '전장의 폭군',
    nameEn: 'War Tyrant',
    emoji: '☠️',
    primaryWeapon: 'AR',
    weapons: ['AKM', 'Beryl M762', 'DP-28'],
    color: '#ef4444',
    bgClass: 'from-red-600 to-red-900',
    borderClass: 'border-red-500',
    description: '겁 없이 달려들어 AK계열로 모든 것을 박살내는 타입. 적이 보이면 생각 전에 몸이 먼저 반응한다. 팀원의 걱정도 무시하고 돌진하지만 그 기세에 적이 먼저 무너진다.',
    strengths: ['압도적인 교전 능력', '심리적 압박', '빠른 첫 킬 선점'],
    weaknesses: ['원거리 교전에 취약', '탄약 소모가 빠름', '포지셔닝이 위험할 수 있음'],
    playstyle: '핫드랍 후 즉시 교전, 7.62mm 고화력으로 단시간 내 다수 제거',
    tip: 'AKM/Beryl의 강한 반동을 컨트롤하는 연습이 핵심입니다.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: 'AKM/Beryl을 최우선 파밍. 7.62mm 탄약을 200발 이상 확보하고, 그립과 콤펜세이터로 반동을 잡으세요.' },
      { phase: '중반 교전', icon: '⚔️', guide: '적극적으로 교전을 개시해 킬을 선점. DP-28으로 엄폐물 뒤 적을 지속 압박하며 팀원을 위한 시야를 열어줍니다.' },
      { phase: '후반 파이널', icon: '🏆', guide: '파이널에서 근접 교전을 유도해 화력 우위를 점하세요. 원거리 상대는 팀원에게 맡기고 당신은 진입 특공대 역할을 담당합니다.' },
    ],
    teamSynergy: ['iron_wall', 'strategic_commander'],
    counterType: 'ghost_sniper',
    vector: { aggression:0.9, stability:0.3, precision:0.4, survival:0.2, teamwork:0.3, distance:0.3, ammo_556:0.2, ammo_762:0.9, ammo_9mm:0.4 },
  },
  {
    id: 'precision_assassin',
    name: '정밀 암살자',
    nameEn: 'Precision Assassin',
    emoji: '🎯',
    primaryWeapon: 'SR',
    weapons: ['Kar98k', 'M24', 'Mosin-Nagant'],
    color: '#8b5cf6',
    bgClass: 'from-purple-600 to-purple-900',
    borderClass: 'border-purple-500',
    description: '적의 동선을 예측하고 완벽한 타이밍에 단 한 발로 끝낸다. 실수란 없다. 당신의 헤드샷은 팀의 사기를 바꾸는 신호탄이다.',
    strengths: ['높은 헤드샷 적중률', '원거리 지배력', '심리적 위협'],
    weaknesses: ['근접 교전에 완전 취약', '볼트액션 재장전 공백', '이동 중 정확도 크게 하락'],
    playstyle: '좋은 포지션에서 볼트액션으로 적을 한 발씩 제거, 이동 최소화',
    tip: '빠른 볼트 사이클링과 스코프 인/아웃 연습이 중요합니다.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '볼트액션 + AR 콤비 확보가 필수. 헬멧 레벨3, 8x 스코프, 총기 부품(총구·그립) 우선 파밍.' },
      { phase: '중반 교전', icon: '⚔️', guide: '고지대 포지션 선점 후 이동하는 적에게 선제 헤드샷. 발사 후 즉시 포지션을 바꿔 위치 노출을 최소화하세요.' },
      { phase: '후반 파이널', icon: '🏆', guide: '엄폐물 사이 볼트 교전이 핵심. 근접 상황이 오면 반드시 AR로 전환하고, 근접은 팀원에게 맡기세요.' },
    ],
    teamSynergy: ['cqc_destroyer', 'team_maestro'],
    counterType: 'cqc_destroyer',
    vector: { aggression:0.2, stability:0.4, precision:0.9, survival:0.5, teamwork:0.2, distance:0.9, ammo_556:0.1, ammo_762:0.8, ammo_9mm:0.0 },
  },
  {
    id: 'cqc_destroyer',
    name: '근접 파괴자',
    nameEn: 'CQC Destroyer',
    emoji: '🏃',
    primaryWeapon: 'SMG',
    weapons: ['UMP45', 'PP-19 Bizon', 'Vector'],
    color: '#f97316',
    bgClass: 'from-orange-500 to-orange-800',
    borderClass: 'border-orange-500',
    description: '빠른 발놀림으로 건물 속을 누비며 근접에서 상대를 압도한다. SMG의 연사로 적이 반응하기도 전에 이미 끝나있다.',
    strengths: ['건물 클리어 특화', '빠른 이동속도', '압도적 근접 DPS'],
    weaknesses: ['원거리 교전 완전 불가', '오픈 필드에서 매우 취약', '탄창이 빠르게 소모됨'],
    playstyle: '빠르게 건물 진입, 짧은 거리에서 SMG 연사로 순식간에 제압',
    tip: '건물 진입 전 코너 확인과 빠른 피킹 연습이 필수입니다.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '건물 밀집 지역(미라마 로스 레오네스 등) 선택. PP-19 Bizon의 대용량 탄창(53발)으로 초반 다수 교전도 문제없습니다.' },
      { phase: '중반 교전', icon: '⚔️', guide: 'Vector의 높은 DPS로 건물 진입 즉시 제압. 코너 확인 → 진입 → 클리어 패턴을 몸에 익히세요.' },
      { phase: '후반 파이널', icon: '🏆', guide: '파이널 건물 클리어 전담. 팀원이 외부에서 원거리 커버할 때 당신은 실내 진입과 근접 제압을 담당합니다.' },
    ],
    teamSynergy: ['precision_assassin', 'strategic_commander'],
    counterType: 'ghost_sniper',
    vector: { aggression:0.8, stability:0.2, precision:0.3, survival:0.2, teamwork:0.2, distance:0.1, ammo_556:0.1, ammo_762:0.1, ammo_9mm:0.9 },
  },
  {
    id: 'iron_wall',
    name: '철벽 수호자',
    nameEn: 'Iron Wall Guardian',
    emoji: '🛡️',
    primaryWeapon: 'AR',
    weapons: ['M416', 'QBZ', 'SCAR-L'],
    color: '#0ea5e9',
    bgClass: 'from-sky-500 to-sky-800',
    borderClass: 'border-sky-400',
    description: '팀원의 방패가 되어주는 존재. 안정적인 포지셔닝으로 교전에서 절대 먼저 지지 않는다. 당신이 버텨주는 한 팀은 무너지지 않는다.',
    strengths: ['높은 생존율', '안정적 딜링', '포지셔닝 전문'],
    weaknesses: ['공격 주도권 부족', '과도한 수비로 기회를 놓칠 수 있음', 'carry 능력 제한적'],
    playstyle: '중거리에서 M416로 안정적 교전, 함부로 노출하지 않는 포지션 선택',
    tip: '엄폐물 활용과 빠른 피킹을 통한 안전한 딜링이 핵심입니다.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: 'M416 + 중배율 스코프(4x~6x) 확보. 레벨3 장비와 힐링 아이템을 우선 파밍해 생존력을 최대화하세요.' },
      { phase: '중반 교전', icon: '⚔️', guide: '팀원이 교전할 때 측면 엄호 담당. 자신은 노출을 최소화하며 정밀 딜링을 지원합니다.' },
      { phase: '후반 파이널', icon: '🏆', guide: 'QBZ의 낮은 반동으로 지속 딜. 최적 엄폐물을 선점하는 것이 파이널 생존의 핵심입니다.' },
    ],
    teamSynergy: ['war_tyrant', 'team_maestro'],
    counterType: 'midrange_dominator',
    vector: { aggression:0.2, stability:0.9, precision:0.5, survival:0.8, teamwork:0.5, distance:0.5, ammo_556:0.8, ammo_762:0.3, ammo_9mm:0.2 },
  },
  {
    id: 'team_maestro',
    name: '팀플레이 마에스트로',
    nameEn: 'Team Maestro',
    emoji: '🤝',
    primaryWeapon: 'AR',
    weapons: ['SCAR-L', 'G36C', 'M416'],
    color: '#10b981',
    bgClass: 'from-emerald-500 to-emerald-800',
    borderClass: 'border-emerald-500',
    description: '팀원의 움직임을 읽고 최적의 타이밍에 지원한다. 혼자 빛나기보다 팀이 이기게 만드는 것이 목표. 당신 덕분에 팀이 이긴다.',
    strengths: ['높은 어시스트', '팀 시너지 극대화', '커버 능력'],
    weaknesses: ['1:1 솔로 교전 다소 약함', '팀 의존도 높음', '혼자 carry 어려움'],
    playstyle: '팀원 엄호와 지원 중심, 어시스트와 팀 기여도를 최우선으로',
    tip: '팀원의 상황을 파악하고 제때 지원하는 소통 능력이 중요합니다.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '팀과 함께 드랍해 분업 파밍. 팀 전체 장비 현황을 파악하고 부족한 아이템을 공유하세요.' },
      { phase: '중반 교전', icon: '⚔️', guide: 'G36C로 팀원 측면 엄호. 킬보다 어시스트를 통한 팀 딜링 극대화가 핵심 역할입니다.' },
      { phase: '후반 파이널', icon: '🏆', guide: '팀원 힐링 아이템 관리를 담당. 치료 지원으로 팀 전체 생존율을 높이는 것이 당신의 승리 전략입니다.' },
    ],
    teamSynergy: ['strategic_commander', 'war_tyrant'],
    counterType: 'explosive_rusher',
    vector: { aggression:0.2, stability:0.7, precision:0.3, survival:0.5, teamwork:0.9, distance:0.4, ammo_556:0.7, ammo_762:0.2, ammo_9mm:0.2 },
  },
  {
    id: 'strategic_commander',
    name: '전략적 지휘관',
    nameEn: 'Strategic Commander',
    emoji: '👑',
    primaryWeapon: 'DMR',
    weapons: ['SKS', 'Mini14', 'SLR'],
    color: '#f59e0b',
    bgClass: 'from-amber-500 to-amber-800',
    borderClass: 'border-amber-400',
    description: '전체 판세를 읽고 팀의 움직임을 지휘한다. 원거리에서 정보를 수집하며 완벽한 전술을 구사한다. 당신의 콜링이 승패를 가른다.',
    strengths: ['전략적 판단', '원거리 정보 수집', '팀 지휘 능력'],
    weaknesses: ['근접 교전에서 DMR 한계', '정보 수집에 집중하다 직접 교전 타이밍을 놓칠 수 있음'],
    playstyle: 'DMR로 원거리 압박 + 팀 콜링, 전체 맵 흐름을 읽으며 전략 수립',
    tip: '미니맵 활용과 적 동선 예측 능력을 길러보세요.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '원 중심 + 고지대를 동시에 확보. Mini14로 이동 중인 적을 원거리에서 위협하며 팀 루팅 시간을 벌어줍니다.' },
      { phase: '중반 교전', icon: '⚔️', guide: 'DMR로 오픈 필드 교전을 담당. 팀원에게 적 위치를 실시간으로 콜링하는 것이 가장 중요한 역할입니다.' },
      { phase: '후반 파이널', icon: '🏆', guide: 'SLR 반자동으로 엄폐물 뒤 적 지속 압박. 포지션 선점이 파이널의 전부입니다. 팀 이동 타이밍을 지시하세요.' },
    ],
    teamSynergy: ['team_maestro', 'cqc_destroyer'],
    counterType: 'explosive_rusher',
    vector: { aggression:0.3, stability:0.8, precision:0.7, survival:0.5, teamwork:0.8, distance:0.7, ammo_556:0.5, ammo_762:0.6, ammo_9mm:0.1 },
  },
  {
    id: 'ninja_survivor',
    name: '닌자 생존자',
    nameEn: 'Ninja Survivor',
    emoji: '🥷',
    primaryWeapon: 'SMG',
    weapons: ['Vector', 'UMP45', 'Micro UZI'],
    color: '#6366f1',
    bgClass: 'from-indigo-500 to-indigo-800',
    borderClass: 'border-indigo-500',
    description: '존재감 없이 끝까지 살아남는 마지막의 승자. 싸우지 않아도 이기는 법을 알고 있다. 적들이 서로 싸우는 동안 당신은 이미 결승권에 있다.',
    strengths: ['최고 생존율', '은신 이동', '후반 유리한 포지션'],
    weaknesses: ['킬 기여도 낮음', '팀원 지원 한계', '솔로 생존에 치중해 팀 기여 부족'],
    playstyle: '교전 최소화, 원 수축에 맞춰 은신 이동, 파이널에서 역전',
    tip: '연막탄과 붕대를 잘 활용하고 소리 없이 이동하는 것이 핵심입니다.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '조용한 구역 드랍 후 연막탄 최우선 파밍. 최소 2개 이상의 연막탄과 충분한 힐링 아이템을 확보하세요.' },
      { phase: '중반 교전', icon: '⚔️', guide: '교전 소음 지역을 우회. 원 수축에 따라 조용히 이동하며 교전은 최소화합니다. 포지션이 전략입니다.' },
      { phase: '후반 파이널', icon: '🏆', guide: '3-4등까지 철저히 은신. 적들이 교전할 때 연막 + 이동으로 어부지리를 노립니다. 마지막 순간에 집중하세요.' },
    ],
    teamSynergy: ['precision_assassin', 'iron_wall'],
    counterType: 'war_tyrant',
    vector: { aggression:0.1, stability:0.6, precision:0.4, survival:1.0, teamwork:0.2, distance:0.3, ammo_556:0.2, ammo_762:0.3, ammo_9mm:0.5 },
  },
  {
    id: 'assault_commando',
    name: '돌격 특공대',
    nameEn: 'Assault Commando',
    emoji: '🚀',
    primaryWeapon: 'AR',
    weapons: ['M416', 'AUG A3', 'Groza'],
    color: '#dc2626',
    bgClass: 'from-red-500 to-rose-800',
    borderClass: 'border-red-400',
    description: '선봉에서 팀을 이끌며 맹렬히 돌격한다. 팀원이 뒤를 믿고 따라올 수 있도록 앞에서 길을 연다. 당신의 돌격이 팀의 승리를 만든다.',
    strengths: ['공격적 팀 리더십', '교전 개시 능력', '압박 전술'],
    weaknesses: ['단독 돌격 시 포위 위험', '후방 노출에 취약', '팀 없이 단독 carry 어려움'],
    playstyle: '팀과 함께 공격적으로 돌격, AR로 교전 주도',
    tip: '돌격 후 엄호를 위한 팀원 배치를 미리 소통해두세요.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '팀원과 함께 드랍. Groza 획득 시 돌격 화력이 크게 향상됩니다. M416로 시작해도 충분합니다.' },
      { phase: '중반 교전', icon: '⚔️', guide: '팀 신호 확인 후 선봉 돌격. AUG A3의 낮은 반동으로 안정적인 교전 개시가 핵심. 돌격 전 팀원 위치 확인 필수.' },
      { phase: '후반 파이널', icon: '🏆', guide: '팀원 커버 확보 후 적 진영으로 진입. M416 전자동 연사로 혼전 상황을 제압하세요.' },
    ],
    teamSynergy: ['precision_assassin', 'team_maestro'],
    counterType: 'ninja_survivor',
    vector: { aggression:0.8, stability:0.5, precision:0.4, survival:0.3, teamwork:0.6, distance:0.3, ammo_556:0.8, ammo_762:0.4, ammo_9mm:0.2 },
  },
  {
    id: 'midrange_dominator',
    name: '중거리 지배자',
    nameEn: 'Mid-Range Dominator',
    emoji: '⚡',
    primaryWeapon: 'DMR',
    weapons: ['Mini14', 'QBU', 'MK14 EBR'],
    color: '#0891b2',
    bgClass: 'from-cyan-500 to-cyan-800',
    borderClass: 'border-cyan-400',
    description: '50~200m 중거리를 완벽하게 지배한다. AR과 DMR의 경계에서 정밀한 반자동 사격으로 적을 끊임없이 압박한다.',
    strengths: ['중거리 정밀 사격', '지속적 압박', '딜링 효율'],
    weaknesses: ['5m 이내 근접에서 DMR 불리', '볼트액션 없어 초장거리 한계', 'AR보다 연사속도 느림'],
    playstyle: 'DMR로 50~200m 거리 유지, 정밀한 반자동 연사로 지속 딜링',
    tip: '리코일 패턴을 익히고 부분 스코프(2x~4x)를 적극 활용하세요.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: 'Mini14와 4x 스코프를 확보해 중거리 교전 준비. AR은 보조 무기로 근접 대비. 탄약 충분히 확보.' },
      { phase: '중반 교전', icon: '⚔️', guide: '고지대 + 50~200m 거리 유지가 핵심. QBU의 낮은 반동으로 안정적인 정밀 연사를 구사하세요.' },
      { phase: '후반 파이널', icon: '🏆', guide: 'MK14 전자동 모드로 근접 상황 보완 가능. 50~100m 거리 유지가 최적 전투 조건입니다.' },
    ],
    teamSynergy: ['cqc_destroyer', 'iron_wall'],
    counterType: 'explosive_rusher',
    vector: { aggression:0.5, stability:0.7, precision:0.8, survival:0.4, teamwork:0.3, distance:0.7, ammo_556:0.7, ammo_762:0.4, ammo_9mm:0.0 },
  },
  {
    id: 'ghost_sniper',
    name: '유령 저격수',
    nameEn: 'Ghost Sniper',
    emoji: '👻',
    primaryWeapon: 'SR',
    weapons: ['AWM', 'M24', 'WIN94'],
    color: '#7c3aed',
    bgClass: 'from-violet-600 to-violet-900',
    borderClass: 'border-violet-500',
    description: '아무도 모르는 곳에서 단 한 발로 전세를 바꾼다. 당신이 존재했다는 것조차 적은 모른다. 그러나 결과는 분명하다.',
    strengths: ['초장거리 지배', '심리적 공포', '원샷 일격'],
    weaknesses: ['근접 교전 완전 무방비', '볼트 리로딩 중 교전 불가', '이동 중 저격 사실상 불가'],
    playstyle: '극도로 먼 거리에서 AWM/M24로 원샷, 위치를 들키지 않는 것이 최우선',
    tip: '탄도 보정(총알 낙하)과 이동 타겟 리딩을 꾸준히 연습하세요.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: 'AWM/M24 파밍이 최우선. 보조 AR 필수 확보. 8x 스코프와 7.62mm 탄약 최대치로 확보하세요.' },
      { phase: '중반 교전', icon: '⚔️', guide: '300m+ 거리 안전 포지션 유지. 발사 후 즉시 엎드리거나 포지션을 이동해 위치 노출을 최소화하세요.' },
      { phase: '후반 파이널', icon: '🏆', guide: '원거리를 유지하며 2-3팀 교전을 관전 후 어부지리를 노립니다. 근접 상황은 AR로 즉시 전환이 필수입니다.' },
    ],
    teamSynergy: ['cqc_destroyer', 'assault_commando'],
    counterType: 'ninja_survivor',
    vector: { aggression:0.1, stability:0.5, precision:1.0, survival:0.7, teamwork:0.1, distance:1.0, ammo_556:0.0, ammo_762:1.0, ammo_9mm:0.0 },
  },
  {
    id: 'explosive_rusher',
    name: '폭발적 러셔',
    nameEn: 'Explosive Rusher',
    emoji: '💥',
    primaryWeapon: 'SHOTGUN',
    weapons: ['S12K', 'S686', 'DBS'],
    color: '#ea580c',
    bgClass: 'from-orange-600 to-red-800',
    borderClass: 'border-orange-500',
    description: '생각보다 행동이 먼저. 적이 반응하기도 전에 끝내버리는 초공격형. 화약 냄새 없이는 살 수 없다. 폭발적 순간 딜링으로 상황을 정의한다.',
    strengths: ['폭발적 순간 딜링', '순간 판단력', '압도적 근접 화력'],
    weaknesses: ['중/원거리 교전 완전 불가', '탄환 수 적어 다수 상대 불리', '리로딩 타이밍이 치명적'],
    playstyle: '샷건/SMG로 최단거리 진입 후 순식간에 제압, 이동이 곧 전략',
    tip: '샷건은 너무 가까우면 펠릿이 분산됩니다. 최적 거리 5~10m를 노리세요.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: '건물 진입 즉시 샷건 탐색. S12K 확보가 최우선. 보조 SMG도 반드시 챙겨 중거리 상황을 대비하세요.' },
      { phase: '중반 교전', icon: '⚔️', guide: 'DBS 연사로 2명까지 연속 제압 가능. 건물 진입 선봉 역할을 담당하며 팀원이 뒤를 받쳐주도록 소통하세요.' },
      { phase: '후반 파이널', icon: '🏆', guide: '파이널 마지막 건물 진입에 특화. 5m 이내 교전을 유도하고, 리로딩 타이밍을 반드시 주의하세요.' },
    ],
    teamSynergy: ['ghost_sniper', 'strategic_commander'],
    counterType: 'ghost_sniper',
    vector: { aggression:1.0, stability:0.1, precision:0.2, survival:0.1, teamwork:0.2, distance:0.1, ammo_556:0.3, ammo_762:0.1, ammo_9mm:0.6 },
  },
  {
    id: 'balance_master',
    name: '밸런스 마스터',
    nameEn: 'Balance Master',
    emoji: '⚖️',
    primaryWeapon: 'AR',
    weapons: ['M416', 'Beryl M762', 'SCAR-L'],
    color: '#64748b',
    bgClass: 'from-slate-500 to-slate-800',
    borderClass: 'border-slate-400',
    description: '특정 스타일에 치우치지 않고 모든 상황에 유연하게 대응한다. 어떤 팀에 들어가도 제 역할을 해낸다. 당신의 균형감각이 팀의 강점이다.',
    strengths: ['상황 적응력', '다양한 역할 소화', '안정적 퍼포먼스'],
    weaknesses: ['특화된 역할 부재', '전문성 부족으로 역할이 모호할 수 있음', '특정 상황 압도적 우위 없음'],
    playstyle: '상황에 따라 다양한 전술 구사, 특정 스타일에 고집하지 않음',
    tip: '다양한 상황을 경험하며 자신만의 플레이스타일을 찾아보세요.',
    situationalGuide: [
      { phase: '초반 루팅', icon: '🎒', guide: 'M416 확보 후 상황에 따라 유연하게 대응. 어떤 교전에도 준비된 올라운더는 상황을 보고 역할을 결정합니다.' },
      { phase: '중반 교전', icon: '⚔️', guide: '팀 상황에 맞춰 역할을 자유롭게 전환. 필요에 따라 선봉, 지원, 저격 등 어떤 역할도 소화 가능합니다.' },
      { phase: '후반 파이널', icon: '🏆', guide: '다양한 전술로 상황에 대응. 균형잡힌 판단력이 파이널에서의 진정한 강점입니다. 팀에서 부족한 역할을 채우세요.' },
    ],
    teamSynergy: ['war_tyrant', 'ninja_survivor'],
    counterType: 'precision_assassin',
    vector: { aggression:0.5, stability:0.6, precision:0.5, survival:0.5, teamwork:0.5, distance:0.5, ammo_556:0.5, ammo_762:0.5, ammo_9mm:0.3 },
  },
];

// ─── 계산 함수들 ───────────────────────────────

/** 선택된 답변 배열로부터 정규화된 벡터 계산 */
export function computeVector(answers) {
  const raw = { aggression:0, stability:0, precision:0, survival:0, teamwork:0, distance:0, ammo_556:0, ammo_762:0, ammo_9mm:0 };
  answers.forEach((answerIdx, qIdx) => {
    const q = SURVEY_QUESTIONS[qIdx];
    if (!q) return;
    const opt = q.options[answerIdx];
    if (!opt) return;
    Object.entries(opt.points).forEach(([k, v]) => { raw[k] = (raw[k] || 0) + v; });
  });
  const normalized = {};
  Object.keys(raw).forEach((k) => {
    normalized[k] = MAX_SCORES[k] > 0 ? Math.min(1, raw[k] / MAX_SCORES[k]) : 0;
  });
  return normalized;
}

/** 코사인 유사도 (0~1) */
export function cosineSimilarity(a, b) {
  const keys = Object.keys(a);
  const dot  = keys.reduce((s, k) => s + (a[k]||0)*(b[k]||0), 0);
  const magA = Math.sqrt(keys.reduce((s, k) => s + (a[k]||0)**2, 0));
  const magB = Math.sqrt(keys.reduce((s, k) => s + (b[k]||0)**2, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** 벡터에 가장 가까운 성향 타입 반환 */
export function findBestType(vector) {
  let best = null, bestScore = -1;
  PERSONALITY_TYPES.forEach((type) => {
    const score = cosineSimilarity(vector, type.vector);
    if (score > bestScore) { bestScore = score; best = type; }
  });
  return { type: best, score: bestScore };
}

/**
 * 유사도 상위 N개 타입 반환 (유사 타입 표시용)
 * @param {Object} vector - 정규화된 성향 벡터
 * @param {number} n - 반환할 타입 수
 * @returns {{ type, score }[]}
 */
export function findTopTypes(vector, n = 3) {
  return PERSONALITY_TYPES
    .map((tp) => ({ type: tp, score: cosineSimilarity(vector, tp.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/** 간단한 UUID v4 생성 (클라이언트/서버 공용) */
export function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
