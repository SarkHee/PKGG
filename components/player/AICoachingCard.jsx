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
      return `실전 데이터: ${p} ${pK}킬 · ${s} ${sK}킬. ${p}로 100m 이내 교전을 주도하고 ${s}로 원거리 견제를 병행하면 전거리 대응 완성. ${pDesc ? `→ ${pDesc}` : ''}`
    }
    if (pC === 'AR' && sC === 'SMG') {
      return `실전 데이터: ${p} ${pK}킬 · ${s} ${sK}킬. ${p}로 중거리 교전, ${s}로 실내 클리어링을 담당하는 밸런스 조합. ${pDesc ? `→ ${pDesc}` : ''}`
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
    actions.push({ priority: '긴급', action: `Training Grounds에서 M416 반동(우하방)을 마우스로 당겨올리는 연습을 매일 15분씩 하세요. 100m 타겟에 30발 연속 명중을 목표로 잡으면 딜량이 빠르게 향상됩니다` });
  } else if (stats.avgDamage < 280) {
    actions.push({ priority: '중요', action: `딜량 ${Math.round(stats.avgDamage)} — 교전 전 앉거나 엎드려 반동을 줄이고, 100~150m 거리에서 4배율 스코프로 점사(2~3발) 습관을 들이세요` });
  } else if (stats.avgDamage < 400) {
    actions.push({ priority: '권장', action: `딜량 ${Math.round(stats.avgDamage)} 양호. 200m+ 원거리에서 DMR(SKS·Mini14) 견제를 추가하면 딜량과 어시스트를 동시에 올릴 수 있습니다` });
  } else {
    actions.push({ priority: '권장', action: `딜량 ${Math.round(stats.avgDamage)} 상위권. 팀원 부활 커버 시 DMR로 상대 포지션을 압박하고, 교전 후 이동하는 타이밍에 추가 딜을 넣는 고급 전술을 연습하세요` });
  }

  // 2. 승률/엔드게임
  if (stats.winRate < 3) {
    actions.push({ priority: '긴급', action: `Top10 이후엔 먼저 뛰지 마세요 — 언덕·바위·건물 1층에 고정하고 상대가 이동할 때 사냥하세요. 먼저 움직이면 먼저 맞습니다` });
  } else if (stats.winRate < 8) {
    actions.push({ priority: '중요', action: `Top5 진입 후 고지대(언덕·능선)를 우선 확보하세요. 조준선 우위 = 교전 우위. 평지에서 위를 향해 싸우면 무조건 불리합니다` });
  } else {
    actions.push({ priority: '권장', action: `승률 ${stats.winRate.toFixed(1)}% 우수. 연막탄 1~2개 상시 소지로 불리한 포지션에서 탈출 루트를 만드는 고급 기술을 연습하세요` });
  }

  // 3. 플레이스타일 특화
  const styleActions = {
    AGGRESSIVE: '교전 직전 팀원 위치를 확인하고 "돌격합니다" 콜을 하세요. 1명 단독 돌진보다 팀 엄호 사격 + 1명 진입 조합이 생존율을 2배 높입니다. 써드파티를 항상 경계하세요',
    PASSIVE:    '중반(약 15분 후) 에너지드링크 3개를 상시 유지하여 블루존을 맞으며 이동할 수 있게 하세요. 붕대에만 의존하면 노출 시간이 길어져 죽습니다',
    SNIPER:     '스나이핑 후 즉시 20m 옆으로 이동하세요. 1발 쏜 자리에 계속 있으면 역스나이핑 당합니다. 반드시 "쏘고 이동"을 반복하세요',
    SUPPORT:    '스모크 그레네이드 1~2개와 어도부 권총을 항상 소지하세요. 팀원 넉다운 시 스모크로 시야 차단 후 안전하게 부활시키는 루틴을 팀과 공유하세요',
    BALANCED:   '교전 참여 여부를 3초 내에 결정하세요. 유리하면 즉시 공격, 불리하면 즉시 이탈 — 이 판단력이 승률을 결정합니다',
  };
  actions.push({ priority: '중요', action: styleActions[playStyle] || styleActions.BALANCED });

  // 4. Top10 / 생존 시간 기반
  if (stats.top10Rate < 20) {
    actions.push({ priority: '긴급', action: `Top10 ${stats.top10Rate.toFixed(0)}% — 블루존 축소 30초 전 이동이 핵심. 미니맵을 5초마다 확인하고 에너지드링크 3개 이상 상시 소지하세요` });
  } else if (stats.avgSurvivalTime < 600) {
    actions.push({ priority: '중요', action: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 핫드랍에서 3명 이상 경쟁이면 즉시 옆 건물로 이동하세요. 루팅 경쟁 회피가 초반 생존의 핵심입니다` });
  } else if (stats.avgKills < 1.5) {
    actions.push({ priority: '중요', action: `경기당 ${stats.avgKills.toFixed(1)}킬 — 블루존으로 이동 중인 적을 미리 포지션 잡고 기다리는 것이 가장 쉬운 킬 방법입니다` });
  } else {
    actions.push({ priority: '권장', action: `투척류(수류탄)를 적극 활용하세요. 교전 전 프래그 1개로 적을 이동시키거나 체력을 깎으면 교전 승률이 크게 오릅니다. 매 루팅 시 투척류 우선 수거를 습관화하세요` });
  }

  // 5. 헤드샷 또는 어시스트 또는 일관성
  if (stats.headshotRate > 0 && stats.headshotRate < 20) {
    actions.push({ priority: '권장', action: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 에임 트레이너(이 사이트 훈련 메뉴)에서 '반응속도' 모드를 매일 5분 연습하면 2~3주 내 체감 향상됩니다` });
  } else if (stats.avgAssists < 1.0) {
    actions.push({ priority: '권장', action: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 내가 처치 못해도 팀원이 마무리할 수 있도록 먼저 딜을 넣는 '선딜 후 커버' 플레이를 의식적으로 연습하세요` });
  } else if (stats.winRate >= 8 && stats.avgDamage >= 350) {
    actions.push({ priority: '권장', action: `상위권 지표 유지 중. 팀 콜링(적 위치·이동 방향 공유)을 습관화하면 팀 전체 성과가 오르고 치킨 확률이 추가로 높아집니다` });
  } else {
    actions.push({ priority: '권장', action: `착지 지점 2~3곳을 고정하고 루팅 동선을 패턴화하세요. 매 게임 변수를 줄이면 평균 성과가 안정되고 일관성이 오릅니다` });
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
    list.push({ title: '딜량 향상 (1단계)', desc: `현재 ${Math.round(stats.avgDamage)} → ${next} 목표. Training Grounds에서 AR 반동 제어 10분씩, 100m 타겟에 30발 연속 명중을 목표로 하세요` });
  } else if (stats.avgDamage < 280) {
    const next = Math.min(280, Math.round(stats.avgDamage / 10) * 10 + 40);
    list.push({ title: '중거리 딜링 개선', desc: `현재 ${Math.round(stats.avgDamage)} → ${next} 목표. 4배율로 100~150m 거리에서 2~3발 점사 습관을 들이세요` });
  } else if (stats.avgDamage < 400) {
    list.push({ title: '딜량 상위권 진입', desc: `현재 ${Math.round(stats.avgDamage)} → 400 목표(상위 15% 기준). 교전 시 상대를 넉다운시키고 팀원이 처치하도록 피해를 극대화하는 '딜딜킬' 전략을 써보세요` });
  } else {
    list.push({ title: '딜량 유지 + 원거리 확장', desc: `딜량 ${Math.round(stats.avgDamage)}은 상위권. DMR(SKS·Mini14) 서브 활용으로 200m+ 견제를 추가하면 교전 없이도 어시스트와 딜을 쌓을 수 있습니다` });
  }

  // ── 킬/교전 ──
  if (stats.avgKills < 1.0)
    list.push({ title: '교전 참여 늘리기', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 1킬 목표. 블루존으로 이동 중인 적을 미리 포지션 잡고 기다리는 것부터 시작하세요` });
  else if (stats.avgKills < 2.0)
    list.push({ title: '써드파티 킬 추가', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 2킬 목표. 써드파티 — 교전 중인 두 팀이 있으면 이기는 쪽 뒤에서 기다렸다가 체력 낮은 생존자를 사냥하세요` });
  else if (stats.avgKills < 3.0)
    list.push({ title: '연속 교전 처리 능력', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 3킬 목표. 1명 처치 후 즉시 다음 타겟으로 전환하는 속도가 핵심 — 교전 후 재장전 타이밍을 항상 의식하세요` });
  else
    list.push({ title: '킬 후 포지션 이탈', desc: `킬 ${stats.avgKills.toFixed(1)}개로 교전 능력 우수. 킬 직후 동일 포지션에 머물면 팀원 복수가 오므로, 사격 후 즉시 10~20m 측면 이동을 습관화하세요` });

  // ── 승률/엔드게임 ──
  if (stats.winRate < 3)
    list.push({ title: 'Top15 생존 습관', desc: `승률 ${stats.winRate.toFixed(1)}% — 먼저 총 쏘지 않고 상대가 이동할 때 사냥하는 습관이 먼저입니다. 치킨보다 Top15 진입을 목표로 잡으세요` });
  else if (stats.winRate < 6)
    list.push({ title: 'Top5 고지대 선점', desc: `승률 ${stats.winRate.toFixed(1)}% → 6% 목표. 마지막 원에서 언덕·바위 뒤 조준선 우위 포지션을 먼저 잡는 것이 치킨 확률을 2배 올립니다` });
  else if (stats.winRate < 12)
    list.push({ title: '엔드게임 연막탄 활용', desc: `승률 ${stats.winRate.toFixed(1)}% → 12% 목표. 연막탄 1~2개 상시 소지 — 불리한 포지션에서 이동 경로를 만드는 것만으로 엔드게임 생존율이 크게 오릅니다` });
  else
    list.push({ title: '치킨 결정력 향상', desc: `승률 ${stats.winRate.toFixed(1)}% 최상위권. 마지막 2팀 상황에서 상대 포지션 파악 후 그레네이드 1개로 이동을 강제하는 고급 전술을 연습하세요` });

  // ── Top10 생존 ──
  if (stats.top10Rate < 20)
    list.push({ title: '안전지대 이동 타이밍', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 블루존 축소 30초 전 이동 시작이 핵심. 미니맵을 5초마다 확인하고 에너지드링크 3개 이상 상시 소지하세요` });
  else if (stats.top10Rate < 35)
    list.push({ title: '중반 포지션 선점', desc: `Top10 ${stats.top10Rate.toFixed(0)}% → 35% 목표. 1차 원 축소 전 미리 이동해 건물 안쪽·능선 뒤를 선점하세요. 늦게 진입할수록 노출 시간이 길어집니다` });
  else if (stats.top10Rate < 50)
    list.push({ title: 'Top10 → 치킨 전환율', desc: `Top10 ${stats.top10Rate.toFixed(0)}%로 후반 진입은 잘 됩니다. 이제는 Top10 진입 후 교전 참여 타이밍을 늦추고 3위 이하로 좁혀진 뒤 움직이세요` });

  // ── 헤드샷 (데이터 있을 때만) ──
  if (stats.headshotRate > 0) {
    if (stats.headshotRate < 15)
      list.push({ title: '헤드샷 정확도 향상', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — Training Grounds에서 정지 타겟 헤드 조준부터 연습하세요. 헤드샷 1회가 바디샷 2회 이상의 효과입니다` });
    else if (stats.headshotRate < 30)
      list.push({ title: '이동 타겟 헤드샷', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 정지 타겟은 잘 맞추지만 이동 타겟 리드샷 연습이 필요합니다. 에임 트레이너 '이동 타겟' 모드 30초씩 하세요` });
  }

  // ── 생존 시간 ──
  if (stats.avgSurvivalTime < 480)
    list.push({ title: '착지 전략 변경', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 핫드랍 3명 이상 경쟁 시 즉시 옆 건물로 이동하세요. 루팅 경쟁 회피가 초반 생존의 핵심입니다` });
  else if (stats.avgSurvivalTime < 900)
    list.push({ title: '중반 생존력 향상', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 에너지드링크 2개를 마시며 블루존 피해를 버티는 이동이 가능합니다. 힐 아이템 우선 루팅 습관을 들이세요` });

  // ── 어시스트 ──
  if (stats.avgAssists < 0.8)
    list.push({ title: '팀 기여도 향상', desc: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 교전 시 내가 처치 못해도 팀원이 마무리할 수 있도록 먼저 딜을 넣어주는 '선딜 후 커버' 습관을 들이세요` });

  // ── 일관성 ──
  if (analysis?.consistencyIndex < 40)
    list.push({ title: '착지 루틴 고정', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 착지 지점 2~3곳을 고정하고 루팅 동선을 패턴화하세요. 변수를 줄이면 평균 성과가 안정됩니다` });
  else if (analysis?.consistencyIndex < 60)
    list.push({ title: '컨디션 무관 루틴화', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 게임 시작 전 Training Grounds 5분 워밍업으로 컨디션 편차를 줄이면 최악의 경기 빈도가 감소합니다` });

  // ── 수류탄 킬 관련 팁 (항상 추가) ──
  list.push({ title: '건물 진입 전 투척류 선사용', desc: '건물 안으로 들어가기 전 투척류(수류탄)를 1개 먼저 던지세요. 적이 밖으로 나오거나 체력이 깎여 교전이 훨씬 유리해집니다. 루팅 시 투척류를 가장 먼저 챙기는 습관을 만드세요' });

  // ── 최소 4개 보장 ──
  const extras = [
    { title: '차량 이동 활용', desc: '안전지대 이동 시 차량을 사용하면 블루존 피해를 줄이고 에너지드링크 소비도 절약됩니다. 차량 소리가 부담이면 시동을 끄고 내리막길 활강을 활용하세요' },
    { title: '엄폐물 거리 유지', desc: '엄폐물에 너무 붙어있으면 투척류(수류탄)에 취약합니다. 엄폐물에서 1~2m 거리를 두고 피킹(Peeking)하면 반응 시간이 늘어납니다' },
    { title: '팀원 넉다운 복구 루틴', desc: '팀원 넉다운 시 즉시 연막탄 투척 → 시야 차단 → 안전하게 부활 루틴을 팀과 공유하세요. 부활 성공률이 팀 승률에 직결됩니다' },
  ]
  let ei = 0
  while (list.length < 4 && ei < extras.length) {
    list.push(extras[ei++])
  }

  return list;
}

export default function AICoachingCard({ playerStats, playerInfo }) {
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

  // 실제 수치 기반 stable key — 부모가 매 렌더마다 새 객체를 넘겨도 값이 같으면 동일한 문자열
  const statsKey = playerStats
    ? [
        playerStats.avgKills ?? playerStats.averageKills ?? 0,
        playerStats.avgDamage ?? playerStats.averageDamage ?? 0,
        playerStats.winRate ?? 0,
        playerStats.totalMatches ?? playerStats.roundsPlayed ?? 0,
      ].join('|')
    : '';

  const stats = {
    avgKills: getValue(playerStats?.avgKills ?? playerStats?.averageKills),
    avgDamage: getValue(playerStats?.avgDamage ?? playerStats?.averageDamage),
    avgSurvivalTime: getValue(playerStats?.avgSurvivalTime ?? playerStats?.avgSurviveTime),
    avgAssists: getValue(playerStats?.avgAssists),
    winRate: getValue(playerStats?.winRate),
    top10Rate: getValue(playerStats?.top10Rate),
    headshotRate: getValue(playerStats?.headshotRate),
    totalMatches: getValue(playerStats?.totalMatches ?? playerStats?.roundsPlayed),
    kd: getValue(playerStats?.kd),
  };

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
      const result = analyzePlayStyle(stats);
      setAnalysis(result);
      // 동일한 통계값으로는 API 1회만 호출
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
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-white/30 rounded" />
              <div className="h-3 w-48 bg-white/20 rounded" />
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

  const hasData = stats.avgKills > 0 || stats.avgDamage > 0 || stats.winRate > 0;
  if (!hasData || !analysis) {
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

  const strengths = getPUBGStrengths(stats, analysis);
  const improvements = getPUBGImprovements(stats, analysis);
  const actions = getPUBGActions(stats, analysis.playStyle);
  const staticWeapons = WEAPON_RECOMMENDATIONS[analysis.playStyle] || WEAPON_RECOMMENDATIONS.BALANCED;

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
      value: stats.avgKills.toFixed(1),
      color: 'text-red-600',
      pct:   getKillPercentile(stats.avgKills),
    },
    {
      label: '평균 딜량',
      value: Math.round(stats.avgDamage),
      color: 'text-orange-600',
      pct:   getDmgPercentile(stats.avgDamage),
    },
    {
      label: '승률',
      value: `${stats.winRate.toFixed(1)}%`,
      color: 'text-green-600',
      pct:   getWinPercentile(stats.winRate),
    },
    {
      label: 'Top 10',
      value: `${stats.top10Rate.toFixed(1)}%`,
      color: 'text-blue-600',
      pct:   getTop10Percentile(stats.top10Rate),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div
        className={`bg-gradient-to-r ${styleColor[analysis.playStyle] || 'from-violet-600 to-indigo-600'} px-6 py-5 text-white`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl flex-shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">AI 맞춤 코칭 리포트</div>
            <div className="text-white/70 text-xs">
              {playerInfo?.nickname}님의 {stats.totalMatches}경기 심층 분석
            </div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <div className="text-sm font-black">
              {STYLE_ICONS[analysis.playStyle]} {STYLE_NAMES[analysis.playStyle]}
            </div>
            <div className="text-white/70 text-xs">신뢰도 {Math.round(analysis.playstyleScore)}%</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 플레이 스타일 설명 */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{STYLE_ICONS[analysis.playStyle]}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">
              {playerInfo?.nickname}님은{' '}
              <span className="text-violet-700">{STYLE_NAMES[analysis.playStyle]} 플레이어</span>입니다
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{STYLE_DESCRIPTIONS[analysis.playStyle]}</div>
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
                value: analysis.aggressionIndex,
                barColor: 'bg-red-400',
                icon: '⚔️',
                desc:
                  analysis.aggressionIndex > 70
                    ? '매우 공격적'
                    : analysis.aggressionIndex > 45
                    ? '적극적'
                    : '신중함',
              },
              {
                label: '생존성',
                value: analysis.survivalIndex,
                barColor: 'bg-blue-400',
                icon: '🛡️',
                desc:
                  analysis.survivalIndex > 70
                    ? '생존 최우선'
                    : analysis.survivalIndex > 45
                    ? '균형 잡힘'
                    : '개선 필요',
              },
              {
                label: '일관성',
                value: analysis.consistencyIndex,
                barColor: 'bg-green-400',
                icon: '📈',
                desc:
                  analysis.consistencyIndex > 70
                    ? '매우 안정적'
                    : analysis.consistencyIndex > 45
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
          시즌 {stats.totalMatches}경기 데이터 기반 AI 분석 •{' '}
          {new Date().toLocaleDateString('ko-KR')} 업데이트
        </div>
      </div>
    </div>
  );
}
