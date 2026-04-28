import { useState, useEffect, useRef } from 'react';
import { analyzePlayStyle } from '../../utils/aiCoaching';

// PUBG 스쿼드 기준 백분위 추정 (공식 통계 기반 추정치)
function getDmgPercentile(dmg) {
  if (dmg >= 550) return { label: '상위 5%',  color: 'text-red-500' };
  if (dmg >= 430) return { label: '상위 10%', color: 'text-orange-500' };
  if (dmg >= 350) return { label: '상위 20%', color: 'text-yellow-600' };
  if (dmg >= 270) return { label: '상위 35%', color: 'text-green-500' };
  if (dmg >= 200) return { label: '상위 50%', color: 'text-blue-500' };
  if (dmg >= 140) return { label: '상위 65%', color: 'text-gray-500' };
  return                  { label: '하위 35%', color: 'text-gray-400' };
}
function getKillPercentile(k) {
  if (k >= 4.0) return { label: '상위 5%',  color: 'text-red-500' };
  if (k >= 3.0) return { label: '상위 10%', color: 'text-orange-500' };
  if (k >= 2.0) return { label: '상위 25%', color: 'text-yellow-600' };
  if (k >= 1.5) return { label: '상위 40%', color: 'text-green-500' };
  if (k >= 1.0) return { label: '상위 55%', color: 'text-blue-500' };
  return               { label: '하위 45%', color: 'text-gray-400' };
}
function getWinPercentile(w) {
  if (w >= 20) return { label: '상위 5%',  color: 'text-red-500' };
  if (w >= 15) return { label: '상위 10%', color: 'text-orange-500' };
  if (w >= 8)  return { label: '상위 20%', color: 'text-yellow-600' };
  if (w >= 5)  return { label: '상위 35%', color: 'text-green-500' };
  if (w >= 3)  return { label: '상위 50%', color: 'text-blue-500' };
  return              { label: '하위 50%', color: 'text-gray-400' };
}
function getTop10Percentile(t) {
  if (t >= 60) return { label: '상위 5%',  color: 'text-red-500' };
  if (t >= 50) return { label: '상위 15%', color: 'text-orange-500' };
  if (t >= 35) return { label: '상위 30%', color: 'text-yellow-600' };
  if (t >= 25) return { label: '상위 50%', color: 'text-blue-500' };
  return              { label: '하위 50%', color: 'text-gray-400' };
}

// 전문용어 툴팁 컴포넌트
function Term({ word, desc }) {
  return (
    <span className="relative group/term inline-flex items-center gap-0.5">
      <span className="font-semibold">{word}</span>
      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center cursor-help flex-shrink-0">?</span>
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 w-56 px-2.5 py-2 bg-gray-800 text-white text-xs rounded-xl leading-relaxed opacity-0 group-hover/term:opacity-100 transition-opacity z-50 shadow-xl whitespace-normal">
        {desc}
      </span>
    </span>
  );
}

// 개선 포인트 설명에서 용어 자동 툴팁 적용
const TERM_MAP = [
  { word: 'DMR', desc: 'Designated Marksman Rifle. 지정사수소총. SKS·Mini14·SLR 같은 반자동 저격 계열 총기로, AR보다 사거리가 길고 SR보다 연사가 빠릅니다.' },
  { word: 'AR', desc: 'Assault Rifle. 돌격소총. M416·AKM·SCAR-L 등 전투용 메인 총기로 다양한 거리에서 사용합니다.' },
  { word: 'SR', desc: 'Sniper Rifle. 저격소총. Kar98k·AWM·M24 등 볼트액션 방식으로 원거리 1~2발 킬을 노리는 총기입니다.' },
  { word: 'SMG', desc: 'Submachine Gun. 기관단총. UMP45·Vector 등 근거리에서 빠른 연사로 실내 교전에 강한 총기입니다.' },
  { word: '피킹', desc: 'Peeking. 엄폐물 뒤에서 잠깐 몸을 내밀어 적을 사격하는 기술. 노출 시간을 최소화해 피격 위험을 줄입니다.' },
  { word: 'K/D', desc: 'Kill/Death Ratio. 킬 수를 사망 수로 나눈 비율. 1.0이면 죽을 때마다 1명을 처치한다는 의미입니다.' },
  { word: 'eDPI', desc: 'Effective DPI. 마우스 DPI × 게임 내 감도. 실제 조준 민감도를 하나의 수치로 표현한 값입니다.' },
  { word: 'DBNOs', desc: 'Down But Not Out. 쓰러졌지만 아직 살아있는 상태. 팀원이 부활시켜 줄 수 있습니다.' },
  { word: '써드파티', desc: 'Third Party. 두 팀이 교전 중일 때 제3세력이 끼어들어 체력이 소모된 쌍방을 사냥하는 전술입니다.' },
  { word: '투척류', desc: '프래그 그레네이드(폭발), 연막탄(시야차단), 섬광탄(시력마비), 화염병(지역거부) 등 손으로 던지는 폭발물 계열 아이템 총칭입니다.' },
];

function DescWithTerms({ text }) {
  if (!text) return null;
  let parts = [text];
  for (const { word, desc } of TERM_MAP) {
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const segs = part.split(word);
      if (segs.length === 1) return [part];
      return segs.flatMap((s, i) =>
        i < segs.length - 1 ? [s, <Term key={`${word}-${i}`} word={word} desc={desc} />] : [s]
      );
    });
  }
  return <>{parts}</>;
}

// 무기 카테고리 분류 (WeaponMasteryCard와 동일 기준)
const WEAPON_CAT = {
  Item_Weapon_HK416_C: { name: 'M416', cat: 'AR' },
  Item_Weapon_AK47_C: { name: 'AKM', cat: 'AR' },
  Item_Weapon_SCAR_L_C: { name: 'SCAR-L', cat: 'AR' },
  Item_Weapon_M16A4_C: { name: 'M16A4', cat: 'AR' },
  Item_Weapon_Groza_C: { name: 'Groza', cat: 'AR' },
  Item_Weapon_G36C_C: { name: 'G36C', cat: 'AR' },
  Item_Weapon_QBZ95_C: { name: 'QBZ-95', cat: 'AR' },
  Item_Weapon_Mk47Mutant_C: { name: 'Mk47 Mutant', cat: 'AR' },
  Item_Weapon_ACE32_C: { name: 'ACE32', cat: 'AR' },
  Item_Weapon_BerylM762_C: { name: 'Beryl M762', cat: 'AR' },
  Item_Weapon_AUG_C: { name: 'AUG A3', cat: 'AR' },
  Item_Weapon_K2_C: { name: 'K2', cat: 'AR' },
  Item_Weapon_FAMASG2_C: { name: 'FAMAS G2', cat: 'AR' },
  Item_Weapon_Mini14_C: { name: 'Mini 14', cat: 'DMR' },
  Item_Weapon_SKS_C: { name: 'SKS', cat: 'DMR' },
  Item_Weapon_VSS_C: { name: 'VSS', cat: 'DMR' },
  Item_Weapon_Mk14_C: { name: 'Mk14 EBR', cat: 'DMR' },
  Item_Weapon_FNFal_C: { name: 'SLR', cat: 'DMR' },
  Item_Weapon_QBU88_C: { name: 'QBU', cat: 'DMR' },
  Item_Weapon_Mk12_C: { name: 'Mk12', cat: 'DMR' },
  Item_Weapon_Dragunov_C: { name: 'Dragunov', cat: 'DMR' },
  Item_Weapon_Kar98k_C: { name: 'Kar98k', cat: 'SR' },
  Item_Weapon_M24_C: { name: 'M24', cat: 'SR' },
  Item_Weapon_AWM_C: { name: 'AWM', cat: 'SR' },
  Item_Weapon_Mosin_C: { name: 'Mosin', cat: 'SR' },
  Item_Weapon_Win1894_C: { name: 'Win94', cat: 'SR' },
  Item_Weapon_L6_C: { name: 'Lynx AMR', cat: 'SR' },
  Item_Weapon_UMP_C: { name: 'UMP45', cat: 'SMG' },
  Item_Weapon_Vector_C: { name: 'Vector', cat: 'SMG' },
  Item_Weapon_UZI_C: { name: 'Micro UZI', cat: 'SMG' },
  Item_Weapon_BizonPP19_C: { name: 'PP-19 Bizon', cat: 'SMG' },
  Item_Weapon_MP5K_C: { name: 'MP5K', cat: 'SMG' },
  Item_Weapon_MP9_C: { name: 'MP9', cat: 'SMG' },
  Item_Weapon_Thompson_C: { name: 'Tommy Gun', cat: 'SMG' },
  Item_Weapon_P90_C: { name: 'P90', cat: 'SMG' },
};

const STYLE_NAMES = {
  AGGRESSIVE: '공격형',
  PASSIVE: '생존형',
  SNIPER: '저격형',
  SUPPORT: '지원형',
  BALANCED: '균형형',
};

const STYLE_ICONS = {
  AGGRESSIVE: '⚔️',
  PASSIVE: '🛡️',
  SNIPER: '🎯',
  SUPPORT: '🤝',
  BALANCED: '⚖️',
};

// PUBG-specific playstyle descriptions
const STYLE_DESCRIPTIONS = {
  AGGRESSIVE: '초반 핫드랍을 즐기며 교전을 주도하는 스타일. 킬과 딜량으로 팀을 이끌지만 무리한 돌진에 주의 필요',
  PASSIVE: '안전지대 위주로 포지셔닝하며 꾸준히 Top10에 진입하는 안정형. 킬 기회 포착이 추가 성장 포인트',
  SNIPER: '원거리 라이플로 교전을 주도하는 스타일. 정밀한 에임과 포지셔닝 선택이 핵심',
  SUPPORT: '팀원과 함께하며 어시스트와 정보 공유로 팀 승리를 만드는 협력형 플레이어',
  BALANCED: '공격과 생존을 상황에 따라 유연하게 전환하는 올라운더 플레이어',
};

// 무기별 사거리·특성·핵심 조언
const WEAPON_CHARS = {
  'M416':         { range: '중거리',   tip: '4배율+보정기 조합으로 200m까지 점사 가능 — AR 중 범용성 1위' },
  'AKM':          { range: '근거리',   tip: '50m 이내에서 DPS 최강이지만 원거리 반동은 크므로 점사 2~3발씩 끊어 쏘세요' },
  'Beryl M762':   { range: '근중거리', tip: '수직그립+보정기 없으면 반동 제어 불가 — 연습장에서 25발 연속 명중 훈련 필수' },
  'SCAR-L':       { range: '중거리',   tip: '낮은 반동으로 중거리 연사가 안정적 — DMR 서브와 조합 시 전거리 커버 완성' },
  'QBZ-95':       { range: '중거리',   tip: '탄퍼짐이 낮아 6배율 장착 시 중원거리 정밀 사격에 강함' },
  'AUG A3':       { range: '중원거리', tip: '유일하게 8배율 장착 가능한 AR — 원거리 교전에서 SR 대용 가능' },
  'Groza':        { range: '근거리',   tip: '공중보급 무기, 50m 이내 DPS 최강 — 원거리 서브는 반드시 준비하세요' },
  'ACE32':        { range: '중거리',   tip: 'AKM 탄약을 쓰는 중거리 AR — AKM보다 반동 낮고 탄속 빠름' },
  'K2':           { range: '중거리',   tip: 'QBZ 계열 안정성 + M416 수준 부착물 호환 — 아시아 서버 숨겨진 강자' },
  'FAMAS G2':     { range: '중거리',   tip: '3점사 특화 — 버스트 모드로 100m 교전 시 명중률이 크게 오름' },
  'Mk47 Mutant':  { range: '중원거리', tip: '2점사 특화 AR — 반자동으로 전환 시 SKS 수준 중원거리 딜 가능' },
  'Kar98k':       { range: '원거리',   tip: '300m 기준 조준점 3밀 상향 조준이 핵심 — 적 이동 방향 리드샷 연습 필수' },
  'M24':          { range: '원거리',   tip: '탄속 빠르고 재장전 빠름 — 볼트액션 중 연속 2발 기회가 가장 많음' },
  'AWM':          { range: '초원거리', tip: '레벨3 헬멧도 1샷 관통 — 공중보급 확보 시 엔드게임 포지션 싸움 지배 가능' },
  'Mosin':        { range: '원거리',   tip: 'Kar98k보다 탄속 빠르지만 부착물 적음 — 기본 에임이 좋은 유저에게 유리' },
  'Win94':        { range: '중거리',   tip: '스코프 고정(2.7배율), 빠른 연사 — 중거리 핸드건처럼 운용 가능' },
  'SKS':          { range: '중원거리', tip: '소음기 필수, 8배율로 원거리 연속 견제 — 사격 후 포지션 즉시 이동 필수' },
  'Mini 14':      { range: '중원거리', tip: '탄속이 DMR 중 가장 빠름 — 이동 타겟 리드샷 난이도 가장 낮음' },
  'SLR':          { range: '원거리',   tip: 'DMR 중 피해량 최강이지만 강한 반동 — 서포트그립+소음기로 반동 완화 필수' },
  'Mk14 EBR':     { range: '원거리',   tip: '공중보급 무기, 자동사격 가능한 DMR — 근접에서 AR처럼 쓰거나 원거리 저격 모두 가능' },
  'QBU':          { range: '중원거리', tip: '수평 반동이 적어 이동 중 사격 안정성 우수 — 미라마 맵에서 특히 강함' },
  'Mk12':         { range: '중원거리', tip: 'AR 탄 사용 DMR — AR/DMR 모두 사용 가능, 보급 없이도 탄약 걱정 적음' },
  'UMP45':        { range: '근거리',   tip: '소음기 장착 시 총소리 거의 없음 — 실내 기습과 넉다운 완료 후 부활 커버에 최적' },
  'Vector':       { range: '근거리',   tip: '연사속도 SMG 중 1위, 5m 이내 최강 — 확장탄창 필수, 탄약 관리 주의' },
  'PP-19 Bizon':  { range: '근거리',   tip: '53발 대용량 탄창이 강점 — 여러 적과 연속 교전 시 재장전 없이 처리 가능' },
  'MP5K':         { range: '근거리',   tip: '차량 위에서 사격 가능한 유일한 SMG — 기동전 및 이동 중 교전에 특화' },
  'P90':          { range: '근중거리', tip: '50발 탄창에 중거리까지 유효한 유일한 SMG — AR 부재 시 대체 가능' },
}

// 두 무기 조합에 대한 맞춤 전술 팁 생성
function getDynamicTip(dynPrimary, dynSecondary, playStyle) {
  if (!dynPrimary) return null

  const p  = dynPrimary.name
  const pC = dynPrimary.cat
  const pK = dynPrimary.kills
  const s  = dynSecondary?.name
  const sC = dynSecondary?.cat
  const sK = dynSecondary?.kills
  const pDesc = WEAPON_CHARS[p]?.tip || ''

  if (dynPrimary && dynSecondary) {
    if ((pC === 'AR' || pC === 'SMG') && (sC === 'SR' || sC === 'DMR')) {
      const sDesc = WEAPON_CHARS[s]?.tip || ''
      return `실전 데이터: ${p} ${pK}킬 · ${s} ${sK}킬. ${p}로 100m 이내 교전을 주도하고 ${s}로 원거리 견제를 더하면 전 거리 대응이 완성됩니다. ${pDesc ? `→ ${pDesc}` : ''}`
    }
    if (pC === 'AR' && sC === 'SMG') {
      return `실전 데이터: ${p} ${pK}킬 · ${s} ${sK}킬. ${p}로 중거리 교전, ${s}로 실내 클리어링을 담당하는 균형 잡힌 조합입니다. ${pDesc ? `→ ${pDesc}` : ''}`
    }
    if ((pC === 'SR' || pC === 'DMR') && (sC === 'AR' || sC === 'SMG')) {
      return `실전 데이터: ${p} ${pK}킬 · ${s} ${sK}킬. 원거리 저격 후 ${s}로 진입하는 공격적 저격 운용. 사격 직후 포지션 즉시 이동이 핵심.`
    }
    return `실전 데이터: ${p} ${pK}킬 · ${s} ${sK}킬. ${pDesc ? pDesc : '검증된 무기 조합으로 상황에 맞게 유연하게 운용하세요.'}`
  }

  return `실전 데이터: ${p} ${pK}킬. ${pDesc || '꾸준히 사용해 가장 숙련된 무기입니다.'}`
}

// PUBG-specific weapon recommendations per playstyle
const WEAPON_RECOMMENDATIONS = {
  AGGRESSIVE: {
    primary: { name: 'M416', note: 'AR 전체 중 가장 안정적인 반동, 중근거리 최강', attach: '보정기+수직그립+확장탄창' },
    secondary: { name: 'UMP45', note: '근접 클리어링 및 실내 교전 최적', attach: '소음기+확장탄창' },
    tip: 'M416 + UMP45 조합으로 15m~200m 교전을 모두 커버하세요',
  },
  PASSIVE: {
    primary: { name: 'SCAR-L / QBZ', note: '반동 제어가 쉬워 안정적인 중거리 딜', attach: '보정기+수직그립' },
    secondary: { name: 'SKS / Mini14', note: '원거리 견제로 상대 접근을 차단', attach: '8배율+소음기' },
    tip: '안전지대 외곽에서 DMR로 블루존 압박 상대를 사냥하세요',
  },
  SNIPER: {
    primary: { name: 'Kar98k / M24', note: '1샷 헬멧 관통으로 넉다운 가능한 볼트액션', attach: '8배율+탄알집' },
    secondary: { name: 'Mini14 / SLR', note: '반자동 원거리 지원 및 DMR 연속 딜', attach: '8배율+소음기' },
    tip: 'Kar98k 300m 기준 조준점을 약 3밀 위로 보정하는 감각을 익히세요',
  },
  SUPPORT: {
    primary: { name: 'M416', note: '다목적 지원, 어느 상황에서도 팀 엄호 가능', attach: '소음기+수직그립+확장탄창' },
    secondary: { name: 'S686 / 어도부', note: '근접 적 방어 및 팀원 부활 커버', attach: '소음기' },
    tip: '레벨3 헬멧·방탄복 습득 시 팀원에게 먼저 제공하세요',
  },
  BALANCED: {
    primary: { name: 'M416', note: '모든 거리를 커버하는 배그 최고의 다용도 AR', attach: '보정기+수직그립+확장탄창' },
    secondary: { name: '상황별 선택', note: '근접엔 UMP45, 원거리엔 SKS / Mini14', attach: '상황에 맞게' },
    tip: 'M416을 기준으로 상황에 맞는 서브 무기를 유연하게 바꾸세요',
  },
};

const PRIORITY_BADGE = {
  긴급: 'bg-red-100 text-red-700',
  중요: 'bg-orange-100 text-orange-700',
  권장: 'bg-blue-100 text-blue-700',
};

// Build PUBG-specific action plans — 5개 항목
function getPUBGActions(stats, playStyle) {
  const actions = [];

  // 1. 딜량 기반
  if (stats.avgDamage < 150) {
    actions.push({ priority: '긴급', action: `평균 딜량 ${Math.round(stats.avgDamage)} — 연습장에서 M416으로 100m 타겟 연속 명중 훈련을 15분만 해도 체감 변화가 생깁니다.` });
  } else if (stats.avgDamage < 280) {
    actions.push({ priority: '중요', action: `평균 딜량 ${Math.round(stats.avgDamage)} — 교전 전 앉아서 반동을 줄이고 4배율로 2~3발씩 끊어 쏘는 습관만 들여도 딜량이 눈에 띄게 오릅니다.` });
  } else if (stats.avgDamage < 400) {
    actions.push({ priority: '권장', action: `딜량 ${Math.round(stats.avgDamage)} 양호. DMR(SKS·Mini14)로 원거리 견제를 추가하면 어시스트와 딜이 함께 오릅니다.` });
  } else {
    actions.push({ priority: '권장', action: `딜량 ${Math.round(stats.avgDamage)} 상위권. 팀원 부활 커버 중 DMR로 상대를 압박하면 생존율도 같이 오릅니다.` });
  }

  // 2. 승률/엔드게임
  if (stats.winRate < 3) {
    actions.push({ priority: '긴급', action: `Top10 이후엔 먼저 움직이지 마세요. 언덕·바위 뒤에 자리 잡고 상대가 이동할 때 처치하는 것이 치킨의 시작입니다.` });
  } else if (stats.winRate < 8) {
    actions.push({ priority: '중요', action: `Top5부터 고지대를 먼저 잡으세요. 위에서 아래로 쏘는 쪽이 항상 유리합니다.` });
  } else {
    actions.push({ priority: '권장', action: `승률 ${stats.winRate.toFixed(1)}% 우수. 연막탄 1~2개를 항상 소지하면 불리한 포지션에서도 탈출할 수 있습니다.` });
  }

  // 3. 플레이스타일 특화
  const styleActions = {
    AGGRESSIVE: '돌격 전 팀원 위치를 확인하세요. 혼자 돌진보다 엄호 + 1명 진입 조합이 생존율을 크게 높이고 써드파티도 방어할 수 있습니다.',
    PASSIVE:    '에너지드링크 3개를 상시 유지하면 블루존 데미지를 받으면서도 이동이 가능합니다. 붕대만 챙기면 힐하는 동안 노출 시간이 늘어나니 에너지를 우선 확보하세요.',
    SNIPER:     '저격 후 즉시 20m 옆으로 포지션을 바꾸세요. 같은 자리에 오래 있으면 역저격을 당합니다.',
    SUPPORT:    '연막탄 1개와 어드레날린을 항상 챙기세요. 팀원이 쓰러졌을 때 연막으로 시야를 막고 살려주는 루틴 하나가 팀 승률을 크게 올립니다.',
    BALANCED:   '교전할지 말지를 3초 내에 결정하는 습관을 들이세요. 유리하면 바로 공격, 불리하면 바로 이탈이 승률의 핵심입니다.',
  };
  actions.push({ priority: '중요', action: styleActions[playStyle] || styleActions.BALANCED });

  // 4. Top10 / 생존 시간 기반
  if (stats.top10Rate < 20) {
    actions.push({ priority: '긴급', action: `Top10 ${stats.top10Rate.toFixed(0)}% — 블루존 줄어들기 30초 전에 이동을 시작하고, 에너지드링크 3개는 항상 가지고 다니세요.` });
  } else if (stats.avgSurvivalTime < 600) {
    actions.push({ priority: '중요', action: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 착지 지점에 경쟁자가 많으면 바로 옆 건물로 넘어가세요. 루팅 경쟁이 초반 사망의 주원인입니다.` });
  } else if (stats.avgKills < 1.5) {
    actions.push({ priority: '중요', action: `경기당 ${stats.avgKills.toFixed(1)}킬 — 블루존 이동 중인 적을 미리 자리 잡고 기다리는 것이 가장 쉽게 킬을 늘리는 방법입니다.` });
  } else {
    actions.push({ priority: '권장', action: `수류탄을 적극 쓰세요. 교전 전 프래그 1개가 적을 이동시키거나 체력을 깎아 교전 승률을 크게 높입니다.` });
  }

  // 5. 헤드샷 또는 어시스트 또는 일관성
  if (stats.headshotRate > 0 && stats.headshotRate < 20) {
    actions.push({ priority: '권장', action: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 훈련 메뉴의 에임 트레이너에서 반응속도 모드를 5분씩 꾸준히 하면 2~3주 내 변화를 느낄 수 있습니다.` });
  } else if (stats.avgAssists < 1.0) {
    actions.push({ priority: '권장', action: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 처치를 못해도 먼저 딜을 넣어주는 '선딜 후 커버' 플레이 하나만 챙겨도 팀 기여도가 달라집니다.` });
  } else if (stats.winRate >= 8 && stats.avgDamage >= 350) {
    actions.push({ priority: '권장', action: `상위권 지표를 잘 유지하고 있습니다. 적 위치·이동 방향을 팀원에게 공유하는 콜링을 습관화하면 팀 전체 승률이 추가로 올라갑니다.` });
  } else {
    actions.push({ priority: '권장', action: `착지 지점 2~3곳을 고정하고 루팅 동선을 패턴화하세요. 매 게임의 변수를 줄이면 평균 성과가 안정되고 일관성이 높아집니다.` });
  }

  return actions;
}

// Build PUBG-specific strengths
function getPUBGStrengths(stats, analysis) {
  const list = [];

  if (stats.avgDamage >= 400)
    list.push({ title: '화력 우수', desc: `평균 딜량 ${Math.round(stats.avgDamage)} — 경기당 4명에게 피해를 주는 상위권 수준` });
  else if (stats.avgDamage >= 250)
    list.push({ title: '안정적인 딜량', desc: `평균 딜량 ${Math.round(stats.avgDamage)} — 팀 딜량에 꾸준히 기여` });

  if (stats.avgKills >= 3.0)
    list.push({ title: '킬링 머신', desc: `경기당 평균 ${stats.avgKills.toFixed(1)}킬 — 팀 전투력을 혼자 끌어올리는 수준` });
  else if (stats.avgKills >= 2.0)
    list.push({ title: '교전 능력 우수', desc: `경기당 평균 ${stats.avgKills.toFixed(1)}킬 — 안정적인 전투 기여도` });

  if (stats.winRate >= 15)
    list.push({ title: '치킨 본능', desc: `승률 ${stats.winRate.toFixed(1)}% — 최종 안전지대 운영 탁월` });
  else if (stats.winRate >= 8)
    list.push({ title: '엔드게임 실력', desc: `승률 ${stats.winRate.toFixed(1)}% — 상황판단과 포지셔닝 능숙` });

  if (stats.top10Rate >= 50)
    list.push({ title: '뛰어난 생존력', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 안전지대 관리와 이동 타이밍 최상` });
  else if (stats.top10Rate >= 35)
    list.push({ title: '안정적 생존', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 꾸준히 후반부까지 살아남는 실력` });

  if (stats.avgAssists >= 1.5)
    list.push({ title: '팀 기여 탁월', desc: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 팀원 지원과 협력 플레이 능숙` });

  if (stats.headshotRate >= 30)
    list.push({ title: '헤드샷 정확도', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 빠른 넉다운으로 교전 효율 높음` });

  if (stats.avgSurvivalTime >= 1400)
    list.push({ title: '포지셔닝 능력', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 루팅과 이동 경로 선택이 뛰어남` });

  if (analysis?.consistencyIndex > 70)
    list.push({ title: '일관성 있는 실력', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 컨디션에 무관하게 믿을 수 있는 퍼포먼스` });

  if (list.length === 0)
    list.push({ title: '성장 잠재력', desc: `${stats.totalMatches}경기 데이터 기반 — 꾸준한 플레이로 빠른 성장이 예상됨` });

  return list;
}

// Build PUBG-specific improvements — 최소 4개 보장
function getPUBGImprovements(stats, analysis) {
  const list = [];

  // ── 딜량 ──
  if (stats.avgDamage < 180) {
    const next = Math.round(stats.avgDamage / 10) * 10 + 30;
    list.push({ title: '딜량 향상 (1단계)', desc: `현재 ${Math.round(stats.avgDamage)} → ${next} 목표. 연습장에서 M416 반동 제어 10분씩, 100m 타겟 30발 명중 훈련이 가장 빠른 길입니다.` });
  } else if (stats.avgDamage < 280) {
    const next = Math.min(280, Math.round(stats.avgDamage / 10) * 10 + 40);
    list.push({ title: '중거리 딜링 개선', desc: `현재 ${Math.round(stats.avgDamage)} → ${next} 목표. 4배율로 100~150m에서 2~3발 점사하는 습관이 딜량을 빠르게 올립니다.` });
  } else if (stats.avgDamage < 400) {
    list.push({ title: '딜량 상위권 진입', desc: `현재 ${Math.round(stats.avgDamage)} → 400 목표. 상대를 넉다운시키고 팀원이 처치하는 '딜딜킬' 전략으로 경기당 딜을 늘리세요.` });
  } else {
    list.push({ title: '딜량 유지 + 원거리 확장', desc: `딜량 ${Math.round(stats.avgDamage)} 상위권. DMR(SKS·Mini14)로 200m+ 견제를 추가하면 어시스트도 함께 오릅니다.` });
  }

  // ── 킬/교전 ──
  if (stats.avgKills < 1.0)
    list.push({ title: '교전 참여 늘리기', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 1킬 목표. 블루존으로 이동하는 적을 미리 자리 잡고 기다리는 것부터 시작하세요.` });
  else if (stats.avgKills < 2.0)
    list.push({ title: '써드파티 킬 추가', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 2킬 목표. 두 팀이 싸우면 뒤에서 기다렸다가 체력 낮은 생존자를 정리하세요.` });
  else if (stats.avgKills < 3.0)
    list.push({ title: '연속 교전 처리 능력', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 3킬 목표. 1명 처치 후 재장전과 동시에 다음 타겟으로 시선을 돌리는 속도가 핵심입니다.` });
  else
    list.push({ title: '킬 후 포지션 이탈', desc: `킬 ${stats.avgKills.toFixed(1)}개로 교전 능력 우수. 사격 후 같은 자리에 있으면 복수가 오니 즉시 10~20m 옆으로 이동하는 습관을 들이세요.` });

  // ── 승률/엔드게임 ──
  if (stats.winRate < 3)
    list.push({ title: 'Top15 생존 습관', desc: `승률 ${stats.winRate.toFixed(1)}% — 상대가 이동할 때 사냥하는 자리 우선 전략이 먼저입니다. 치킨보다 Top15 진입을 목표로 잡으세요.` });
  else if (stats.winRate < 6)
    list.push({ title: 'Top5 고지대 선점', desc: `승률 ${stats.winRate.toFixed(1)}% → 6% 목표. 마지막 원에서 언덕·바위 뒤를 먼저 잡으면 교전이 훨씬 유리해집니다.` });
  else if (stats.winRate < 12)
    list.push({ title: '엔드게임 연막탄 활용', desc: `승률 ${stats.winRate.toFixed(1)}% → 12% 목표. 연막탄 1~2개 상시 소지로 불리한 포지션에서도 탈출 루트를 만들 수 있습니다.` });
  else
    list.push({ title: '치킨 결정력 향상', desc: `승률 ${stats.winRate.toFixed(1)}% 최상위권. 마지막 2팀 상황에서 그레네이드로 상대 이동을 강제하는 전술을 연습해보세요.` });

  // ── Top10 생존 ──
  if (stats.top10Rate < 20)
    list.push({ title: '안전지대 이동 타이밍', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 블루존이 줄어들기 30초 전에 먼저 이동하는 것이 핵심입니다. 에너지드링크 3개를 항상 챙기세요.` });
  else if (stats.top10Rate < 35)
    list.push({ title: '중반 포지션 선점', desc: `Top10 ${stats.top10Rate.toFixed(0)}% → 35% 목표. 1차 원 줄어들기 전에 미리 이동해 건물 안쪽·능선 뒤를 선점하세요.` });
  else if (stats.top10Rate < 50)
    list.push({ title: 'Top10 → 치킨 전환율', desc: `Top10 ${stats.top10Rate.toFixed(0)}%로 후반 진입은 잘 됩니다. Top5부터 교전 타이밍을 늦추고 기다리면 치킨 확률이 오릅니다.` });

  // ── 헤드샷 (데이터 있을 때만) ──
  if (stats.headshotRate > 0) {
    if (stats.headshotRate < 15)
      list.push({ title: '헤드샷 정확도 향상', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 연습장에서 정지 타겟 헤드 조준부터 시작하세요. 헤드샷 1회가 바디샷 2회 이상의 효과입니다.` });
    else if (stats.headshotRate < 30)
      list.push({ title: '이동 타겟 헤드샷', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 에임 트레이너 '이동 타겟' 모드로 리드샷 감각을 익히세요.` });
  }

  // ── 생존 시간 ──
  if (stats.avgSurvivalTime < 480)
    list.push({ title: '착지 전략 변경', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 착지 경쟁자가 많으면 바로 옆 건물로 넘어가세요. 루팅 경쟁 회피가 초반 생존의 핵심입니다.` });
  else if (stats.avgSurvivalTime < 900)
    list.push({ title: '중반 생존력 향상', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 에너지드링크 2개를 마시면 블루존을 맞으면서도 이동이 가능합니다. 힐보다 에너지드링크를 먼저 챙기세요.` });

  // ── 어시스트 ──
  if (stats.avgAssists < 0.8)
    list.push({ title: '팀 기여도 향상', desc: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 처치보다 먼저 딜을 넣어주는 '선딜 후 커버' 하나만 챙겨도 팀 기여도가 눈에 띄게 오릅니다.` });

  // ── 일관성 ──
  if (analysis?.consistencyIndex < 40)
    list.push({ title: '착지 루틴 고정', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 착지 지점 2~3곳을 고정하면 변수가 줄어 평균 성과가 안정됩니다.` });
  else if (analysis?.consistencyIndex < 60)
    list.push({ title: '컨디션 무관 루틴화', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 게임 전 연습장 5분 워밍업으로 컨디션 편차를 줄이면 최악의 경기 빈도가 감소합니다.` });

  // ── 수류탄 킬 관련 팁 (항상 추가) ──
  list.push({ title: '건물 진입 전 수류탄 선사용', desc: '건물에 들어가기 전 수류탄 1개를 먼저 던지세요. 적이 나오거나 체력이 깎여 교전이 유리해집니다. 루팅 시 투척류를 가장 먼저 챙기는 습관을 만드세요.' });

  // ── 최소 4개 보장 ──
  const extras = [
    { title: '차량 이동 활용', desc: '안전지대 이동 시 차량을 쓰면 블루존 피해를 줄이고 힐 소비도 아낄 수 있습니다. 소리가 부담이면 시동을 끄고 내리막 활강을 활용하세요.' },
    { title: '엄폐물 거리 유지', desc: '엄폐물에 너무 붙어 있으면 수류탄에 취약합니다. 1~2m 거리를 두고 피킹하면 반응 시간이 늘어납니다.' },
    { title: '팀원 부활 루틴', desc: '팀원이 쓰러지면 연막탄으로 시야를 막고 부활시키는 루틴을 팀과 미리 공유하세요. 부활 성공률이 팀 승률에 직결됩니다.' },
  ]
  let ei = 0
  while (list.length < 4 && ei < extras.length) {
    list.push(extras[ei++])
  }

  return list;
}

export default function AICoachingCard({ playerStats, rankedStats, playerInfo }) {
  const [activeTab, setActiveTab] = useState('normal')
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const savedKeyRef = useRef('');

  // 유저 실제 무기 데이터 (AR·SR·DMR 최다 킬 무기)
  const [userWeaponRec, setUserWeaponRec] = useState(null);

  const getValue = (v) => {
    if (v == null) return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const hasRanked = rankedStats && (rankedStats.games > 0 || rankedStats.roundsPlayed > 0)

  // 현재 탭 기준 stats 계산
  const currentSource = activeTab === 'ranked' && hasRanked ? rankedStats : playerStats
  const isRankedTab = activeTab === 'ranked' && hasRanked

  const rankedGames = getValue(rankedStats?.games ?? rankedStats?.roundsPlayed)
  const rankedStatsObj = hasRanked ? {
    avgKills: rankedGames > 0 ? parseFloat(((getValue(rankedStats?.kills)) / rankedGames).toFixed(2)) : 0,
    avgDamage: getValue(rankedStats?.avgDamage),
    avgSurvivalTime: 0,
    avgAssists: rankedGames > 0 ? parseFloat(((getValue(rankedStats?.assists)) / rankedGames).toFixed(2)) : 0,
    winRate: getValue(rankedStats?.winRate),
    top10Rate: getValue(rankedStats?.top10Rate),
    headshotRate: getValue(rankedStats?.headshotRate),
    totalMatches: rankedGames,
    kd: getValue(rankedStats?.kd),
  } : null

  // 실제 수치 기반 stable key
  const statsKey = playerStats
    ? [
        playerStats.avgKills ?? playerStats.averageKills ?? 0,
        playerStats.avgDamage ?? playerStats.averageDamage ?? 0,
        playerStats.winRate ?? 0,
        playerStats.totalMatches ?? playerStats.roundsPlayed ?? 0,
      ].join('|')
    : '';

  const normalStats = {
    avgKills: getValue(playerStats?.avgKills ?? playerStats?.averageKills),
    avgDamage: getValue(playerStats?.avgDamage ?? playerStats?.averageDamage),
    avgSurvivalTime: getValue(playerStats?.avgSurvivalTime ?? playerStats?.avgSurviveTime),
    avgAssists: getValue(playerStats?.avgAssists),
    winRate: getValue(playerStats?.winRate),
    top10Rate: getValue(playerStats?.top10Rate),
    headshotRate: getValue(playerStats?.headshotRate),
    totalMatches: getValue(playerStats?.totalMatches ?? playerStats?.roundsPlayed),
    kd: getValue(playerStats?.kd),
  }

  const stats = isRankedTab ? rankedStatsObj : normalStats

  // 유저 실제 무기 사용 통계 조회 → 최다 킬 AR / SR·DMR 추출
  useEffect(() => {
    if (!playerInfo?.nickname) return;
    const shard = playerInfo.server || 'steam';
    let cancelled = false;

    const resolveId = playerInfo.playerId
      ? Promise.resolve(playerInfo.playerId)
      : fetch(`/api/pubg/player-id?nickname=${encodeURIComponent(playerInfo.nickname)}&shard=${shard}`)
          .then((r) => r.json())
          .then((d) => d.playerId || null)
          .catch(() => null);

    resolveId.then((pid) => {
      if (!pid || cancelled) return;
      return fetch(`/api/pubg/stats/mastery/${shard}/${pid}/weapon`)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled || !json?.success) return;
          const attrs = json.data?.attributes || {};
          const summaries = attrs.weaponsummaries || attrs.WeaponSummaries || attrs.weaponSummaries || {};
          const parsed = Object.entries(summaries)
            .map(([id, v]) => {
              const info = WEAPON_CAT[id];
              if (!info) return null;
              const s = v.StatsTotal || {};
              const o = v.OfficialStatsTotal || {};
              const c = v.CompetitiveStatsTotal || {};
              const kills = (s.Kills || 0) + (o.Kills || 0) + (c.Kills || 0);
              return kills > 0 ? { name: info.name, cat: info.cat, kills } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.kills - a.kills);

          const bestAR    = parsed.find((w) => w.cat === 'AR');
          const bestSMG   = parsed.find((w) => w.cat === 'SMG');
          const bestSRDMR = parsed.find((w) => w.cat === 'SR' || w.cat === 'DMR');
          // AR·SMG 중 킬수 1등
          const bestARorSMG = (!bestAR && !bestSMG)
            ? null
            : (!bestSMG || (bestAR && bestAR.kills >= bestSMG.kills))
              ? bestAR
              : bestSMG;
          if (bestARorSMG || bestSRDMR) setUserWeaponRec({ bestARorSMG, bestSRDMR });
        })
        .catch(() => {});
    });

    return () => { cancelled = true; };
  }, [playerInfo?.nickname, playerInfo?.server, playerInfo?.playerId]);

  useEffect(() => {
    if (!statsKey) return;
    try {
      const result = analyzePlayStyle(normalStats);
      setAnalysis(result);
      if (savedKeyRef.current !== statsKey) {
        savedKeyRef.current = statsKey;
        fetch('/api/player/ai-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerNickname: playerInfo?.nickname,
            playerServer: playerInfo?.server,
            analysis: result,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('AI 분석 오류:', e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsKey]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full animate-pulse" />
            <div className="space-y-1.5">
              <p className="text-white font-bold text-sm">🔍 전적 분석 중...</p>
              <p className="text-violet-200 text-xs">AI 코치가 보급품 상자 열고 있습니다</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3 animate-pulse">
          <div className="h-14 bg-gray-100 rounded-lg" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasNormalData = normalStats.avgKills > 0 || normalStats.avgDamage > 0 || normalStats.winRate > 0
  const hasRankedData = rankedStatsObj && (rankedStatsObj.avgDamage > 0 || rankedStatsObj.winRate > 0)

  const currentStats = isRankedTab && hasRankedData ? rankedStatsObj : normalStats
  const currentAnalysis = analysis ? (() => {
    try { return isRankedTab && hasRankedData ? analyzePlayStyle(rankedStatsObj) : analysis } catch { return analysis }
  })() : null

  if (!hasNormalData || !analysis) {
    return (
      <div className="rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-3xl mb-3">📊</div>
        <div className="text-sm font-bold text-gray-600 mb-1">분석 데이터 부족</div>
        <div className="text-xs text-gray-400">
          시즌 통계 데이터가 충분하지 않아 AI 코칭을 제공하기 어렵습니다.
          <br />더 많은 게임을 플레이한 후 다시 확인해보세요.
        </div>
      </div>
    );
  }

  const displayStats = currentStats
  const displayAnalysis = currentAnalysis || analysis

  const strengths = getPUBGStrengths(displayStats, displayAnalysis);
  const improvements = getPUBGImprovements(displayStats, displayAnalysis);
  const actions = getPUBGActions(displayStats, displayAnalysis.playStyle);
  const staticWeapons = WEAPON_RECOMMENDATIONS[displayAnalysis.playStyle] || WEAPON_RECOMMENDATIONS.BALANCED;

  // 유저 실제 사용 무기가 있으면 덮어씌움
  const dynPrimary = userWeaponRec?.bestARorSMG;
  const dynSecondary = userWeaponRec?.bestSRDMR;
  const dynamicTip = getDynamicTip(dynPrimary, dynSecondary, analysis.playStyle);
  const weapons = {
    ...staticWeapons,
    primary: dynPrimary
      ? { name: dynPrimary.name, note: `${dynPrimary.cat === 'SMG' ? 'SMG' : 'AR'} 중 ${dynPrimary.kills}킬 1위 — 실전 검증된 주무기`, attach: staticWeapons.primary.attach }
      : staticWeapons.primary,
    secondary: dynSecondary
      ? { name: dynSecondary.name, note: `SR/DMR 중 ${dynSecondary.kills}킬 1위 — 실전 검증된 보조무기`, attach: staticWeapons.secondary.attach }
      : staticWeapons.secondary,
    tip: dynamicTip || staticWeapons.tip,
  };

  const styleColor = {
    AGGRESSIVE: 'from-red-600 to-orange-600',
    PASSIVE: 'from-blue-600 to-cyan-600',
    SNIPER: 'from-purple-600 to-violet-600',
    SUPPORT: 'from-green-600 to-teal-600',
    BALANCED: 'from-violet-600 to-indigo-600',
  };

  const statBenchmarks = [
    {
      label: '평균 킬',
      value: displayStats.avgKills.toFixed(1),
      color: 'text-red-600',
      pct:   getKillPercentile(displayStats.avgKills),
    },
    {
      label: '평균 딜량',
      value: Math.round(displayStats.avgDamage),
      color: 'text-orange-600',
      pct:   getDmgPercentile(displayStats.avgDamage),
    },
    {
      label: '승률',
      value: `${displayStats.winRate.toFixed(1)}%`,
      color: 'text-green-600',
      pct:   getWinPercentile(displayStats.winRate),
    },
    {
      label: 'Top 10',
      value: `${displayStats.top10Rate.toFixed(1)}%`,
      color: 'text-blue-600',
      pct:   getTop10Percentile(displayStats.top10Rate),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div
        className={`bg-gradient-to-r ${styleColor[displayAnalysis.playStyle] || 'from-violet-600 to-indigo-600'} px-6 py-5 text-white`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl flex-shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">AI 맞춤 코칭 리포트</div>
            <div className="text-white/70 text-xs">
              {playerInfo?.nickname}님의 {displayStats.totalMatches}경기 심층 분석
            </div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <div className="text-sm font-black">
              {STYLE_ICONS[displayAnalysis.playStyle]} {STYLE_NAMES[displayAnalysis.playStyle]}
            </div>
            <div className="text-white/70 text-xs">신뢰도 {Math.round(displayAnalysis.playstyleScore)}%</div>
          </div>
        </div>

        {/* 일반전 / 경쟁전 탭 */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('normal')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'normal'
                ? 'bg-white text-gray-800'
                : 'bg-white/20 text-white/80 hover:bg-white/30'
            }`}
          >
            일반전
          </button>
          <button
            onClick={() => setActiveTab('ranked')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'ranked'
                ? 'bg-white text-gray-800'
                : hasRanked
                ? 'bg-white/20 text-white/80 hover:bg-white/30'
                : 'bg-white/20 text-white/60 hover:bg-white/30'
            }`}
          >
            경쟁전 {!hasRanked && <span className="text-[10px] opacity-70">(데이터 없음)</span>}
          </button>
          {isRankedTab && rankedStats?.tier && rankedStats.tier !== 'Unranked' && (
            <span className="ml-auto px-2 py-1 bg-white/20 rounded-full text-[11px] text-white/90 font-semibold">
              🏅 {rankedStats.tier} · RP {rankedStats.rp || 0}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 경쟁전 데이터 없음 안내 */}
        {activeTab === 'ranked' && !hasRanked ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-3">🏅</div>
            <div className="text-sm font-bold text-gray-600 mb-1">경쟁전 데이터가 없습니다</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              이번 시즌 경쟁전 플레이 기록이 없거나,<br />데이터를 불러오지 못했습니다.
            </div>
            <div className="text-xs text-gray-400 mt-2">최신화 버튼을 눌러 최신 데이터를 확인하세요.</div>
          </div>
        ) : <>
        {/* 경쟁전 탭 안내 */}
        {isRankedTab && hasRankedData && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <span>🏅</span>
            <span>경쟁전 {displayStats.totalMatches}경기 기준 분석입니다. 생존시간은 경쟁전 API에서 제공되지 않습니다.</span>
          </div>
        )}

        {/* 플레이 스타일 설명 */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{STYLE_ICONS[displayAnalysis.playStyle]}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">
              {playerInfo?.nickname}님은{' '}
              <span className="text-violet-700">{STYLE_NAMES[displayAnalysis.playStyle]} 플레이어</span>입니다
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{STYLE_DESCRIPTIONS[displayAnalysis.playStyle]}</div>
          </div>
        </div>

        {/* 핵심 4개 지표 */}
        <div className="grid grid-cols-4 gap-2">
          {statBenchmarks.map(({ label, value, color, pct }) => (
            <div key={label} className="bg-white rounded-lg p-2.5 text-center border border-gray-200">
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              <div className={`text-[11px] font-semibold mt-0.5 ${pct.color}`}>
                {pct.label}
              </div>
            </div>
          ))}
        </div>

        {/* AI 분석 지수 3개 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">AI 성향 분석 지수</div>
          <div className="space-y-3">
            {[
              {
                label: '공격성',
                value: displayAnalysis.aggressionIndex,
                barColor: 'bg-red-400',
                icon: '⚔️',
                desc:
                  displayAnalysis.aggressionIndex > 70
                    ? '매우 공격적'
                    : displayAnalysis.aggressionIndex > 45
                    ? '적극적'
                    : '신중함',
              },
              {
                label: '생존성',
                value: displayAnalysis.survivalIndex,
                barColor: 'bg-blue-400',
                icon: '🛡️',
                desc:
                  displayAnalysis.survivalIndex > 70
                    ? '생존 최우선'
                    : displayAnalysis.survivalIndex > 45
                    ? '균형 잡힘'
                    : '개선 필요',
              },
              {
                label: '일관성',
                value: displayAnalysis.consistencyIndex,
                barColor: 'bg-green-400',
                icon: '📈',
                desc:
                  displayAnalysis.consistencyIndex > 70
                    ? '매우 안정적'
                    : displayAnalysis.consistencyIndex > 45
                    ? '보통'
                    : '기복 심함',
              },
            ].map(({ label, value, barColor, icon, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm w-5 text-center">{icon}</span>
                <span className="text-xs text-gray-600 w-12 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, Math.round(value))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{Math.round(value)}</span>
                <span className="text-xs text-gray-400 w-16 hidden sm:block">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 강점 & 개선 포인트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 강점 */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-600 text-sm">🏆</span>
              <span className="text-xs font-bold text-emerald-800">{playerInfo?.nickname}님의 강점</span>
            </div>
            <div className="space-y-2">
              {strengths.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-emerald-800">{s.title}</div>
                    <div className="text-xs text-emerald-600">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 개선 포인트 */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-600 text-sm">⚡</span>
              <span className="text-xs font-bold text-orange-800">개선 우선순위</span>
            </div>
            <div className="space-y-2">
              {improvements.slice(0, 4).map((imp, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-orange-800">{imp.title}</div>
                    <div className="text-xs text-orange-600 leading-relaxed">
                      <DescWithTerms text={imp.desc} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 추천 무기 & 전술 (PUBG 특화) */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-slate-600 text-sm">🔫</span>
            <span className="text-xs font-bold text-slate-800">
              {STYLE_NAMES[analysis.playStyle]} 스타일 추천 무기
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { label: '주무기', ...weapons.primary },
              { label: '보조무기', ...weapons.secondary },
            ].map(({ label, name, note, attach }) => (
              <div key={label} className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                <div className="text-sm font-black text-slate-800">{name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{note}</div>
                <div className="text-xs text-blue-600 mt-1 font-medium">부착물: {attach}</div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 rounded px-3 py-2 text-xs text-blue-700 border border-blue-100">
            💡 {weapons.tip}
          </div>
        </div>

        {/* 즉시 실행 액션 플랜 (PUBG 특화) */}
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-indigo-600 text-sm">🚀</span>
            <span className="text-xs font-bold text-indigo-800">다음 게임부터 바로 적용할 개선 포인트</span>
          </div>
          <div className="space-y-2">
            {actions.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-white/80 rounded-lg px-3 py-2.5 border border-indigo-100"
              >
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_BADGE[item.priority]}`}
                >
                  {item.priority}
                </span>
                <span className="text-xs text-gray-700 leading-relaxed"><DescWithTerms text={item.action} /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          {isRankedTab ? '경쟁전' : '일반전'} {displayStats.totalMatches}경기 데이터 기반 AI 분석 •{' '}
          {new Date().toLocaleDateString('ko-KR')} 업데이트
        </div>
        </> }
      </div>
    </div>
  );
}
