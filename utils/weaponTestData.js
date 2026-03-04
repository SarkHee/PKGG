// ─────────────────────────────────────────────
// PKGG 무기 성향 테스트 데이터 & 로직
// ─────────────────────────────────────────────

/** 설문 10문항 */
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
];

/** 각 차원별 최대 획득 가능 점수 (정규화 분모) */
export const MAX_SCORES = {
  aggression: 28,
  stability:  20,
  precision:  22,
  survival:   18,
  teamwork:   21,
  distance:   14,
  ammo_556:   10,
  ammo_762:    9,
  ammo_9mm:    7,
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
    playstyle: '핫드랍 후 즉시 교전, 7.62mm 고화력으로 단시간 내 다수 제거',
    tip: 'AKM/Beryl의 강한 반동을 컨트롤하는 연습이 핵심입니다.',
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
    playstyle: '좋은 포지션에서 볼트액션으로 적을 한 발씩 제거, 이동 최소화',
    tip: '빠른 볼트 사이클링과 스코프 인/아웃 연습이 중요합니다.',
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
    playstyle: '빠르게 건물 진입, 짧은 거리에서 SMG 연사로 순식간에 제압',
    tip: '건물 진입 전 코너 확인과 빠른 피킹 연습이 필수입니다.',
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
    playstyle: '중거리에서 M416로 안정적 교전, 함부로 노출하지 않는 포지션 선택',
    tip: '엄폐물 활용과 빠른 피킹을 통한 안전한 딜링이 핵심입니다.',
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
    playstyle: '팀원 엄호와 지원 중심, 어시스트와 팀 기여도를 최우선으로',
    tip: '팀원의 상황을 파악하고 제때 지원하는 소통 능력이 중요합니다.',
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
    playstyle: 'DMR로 원거리 압박 + 팀 콜링, 전체 맵 흐름을 읽으며 전략 수립',
    tip: '미니맵 활용과 적 동선 예측 능력을 길러보세요.',
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
    playstyle: '교전 최소화, 원 수축에 맞춰 은신 이동, 파이널에서 역전',
    tip: '연막탄과 붕대를 잘 활용하고 소리 없이 이동하는 것이 핵심입니다.',
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
    playstyle: '팀과 함께 공격적으로 돌격, AR로 교전 주도',
    tip: '돌격 후 엄호를 위한 팀원 배치를 미리 소통해두세요.',
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
    playstyle: 'DMR로 50~200m 거리 유지, 정밀한 반자동 연사로 지속 딜링',
    tip: '리코일 패턴을 익히고 부분 스코프(2x~4x)를 적극 활용하세요.',
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
    playstyle: '극도로 먼 거리에서 AWM/M24로 원샷, 위치를 들키지 않는 것이 최우선',
    tip: '탄도 보정(총알 낙하)과 이동 타겟 리딩을 꾸준히 연습하세요.',
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
    playstyle: '샷건/SMG로 최단거리 진입 후 순식간에 제압, 이동이 곧 전략',
    tip: '샷건은 너무 가까우면 펠릿이 분산됩니다. 최적 거리 5~10m를 노리세요.',
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
    playstyle: '상황에 따라 다양한 전술 구사, 특정 스타일에 고집하지 않음',
    tip: '다양한 상황을 경험하며 자신만의 플레이스타일을 찾아보세요.',
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

/** 간단한 UUID v4 생성 (클라이언트/서버 공용) */
export function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
