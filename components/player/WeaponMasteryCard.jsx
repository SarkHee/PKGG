// components/player/WeaponMasteryCard.jsx
// 주사용 무기 통계 카드 (PUBG weapon_mastery API + 공식 PNG 이미지)

import { useState, useEffect } from 'react';
import Image from 'next/image';

// PUBG API weapon ID → 표시명 + 카테고리 + 로컬 PNG 파일명
// 파일은 /public/weapons/ 에 저장됨
const WEAPON_MAP = {
  // ── Assault Rifles ───────────────────────────────────────────────
  Item_Weapon_HK416_C:       { name: 'M416',        category: 'AR',  img: 'Item_Weapon_HK416_C.png' },
  Item_Weapon_AK47_C:        { name: 'AKM',         category: 'AR',  img: 'Item_Weapon_AK47_C.png' },
  Item_Weapon_SCAR_L_C:      { name: 'SCAR-L',      category: 'AR',  img: 'Item_Weapon_SCAR-L_C.png' },
  Item_Weapon_M16A4_C:       { name: 'M16A4',       category: 'AR',  img: 'Item_Weapon_M16A4_C.png' },
  Item_Weapon_Groza_C:       { name: 'Groza',       category: 'AR',  img: 'Item_Weapon_Groza_C.png' },
  Item_Weapon_G36C_C:        { name: 'G36C',        category: 'AR',  img: 'Item_Weapon_G36C_C.png' },
  Item_Weapon_QBZ95_C:       { name: 'QBZ-95',      category: 'AR',  img: 'Item_Weapon_QBZ95_C.png' },
  Item_Weapon_Mk47Mutant_C:  { name: 'Mk47 Mutant', category: 'AR',  img: 'Item_Weapon_Mk47Mutant_C.png' },
  Item_Weapon_ACE32_C:       { name: 'ACE32',       category: 'AR',  img: 'Item_Weapon_ACE32_C.png' },
  Item_Weapon_BerylM762_C:   { name: 'Beryl M762',  category: 'AR',  img: 'Item_Weapon_BerylM762_C.png' },
  Item_Weapon_AUG_C:         { name: 'AUG A3',      category: 'AR',  img: 'Item_Weapon_AUG_C.png' },
  Item_Weapon_K2_C:          { name: 'K2',          category: 'AR',  img: 'Item_Weapon_K2_C.png' },
  Item_Weapon_FAMASG2_C:     { name: 'FAMAS G2',    category: 'AR',  img: 'Item_Weapon_FAMASG2_C.png' },

  // ── DMR ──────────────────────────────────────────────────────────
  Item_Weapon_Mini14_C:      { name: 'Mini 14',     category: 'DMR', img: 'Item_Weapon_Mini14_C.png' },
  Item_Weapon_SKS_C:         { name: 'SKS',         category: 'DMR', img: 'Item_Weapon_SKS_C.png' },
  Item_Weapon_VSS_C:         { name: 'VSS',         category: 'DMR', img: 'Item_Weapon_VSS_C.png' },
  Item_Weapon_Mk14_C:        { name: 'Mk14 EBR',    category: 'DMR', img: 'Item_Weapon_Mk14_C.png' },
  Item_Weapon_FNFal_C:       { name: 'SLR',         category: 'DMR', img: 'Item_Weapon_FNFal_C.png' },
  Item_Weapon_QBU88_C:       { name: 'QBU',         category: 'DMR', img: 'Item_Weapon_QBU88_C.png' },
  Item_Weapon_Mk12_C:        { name: 'Mk12',        category: 'DMR', img: 'Item_Weapon_Mk12_C.png' },
  Item_Weapon_Dragunov_C:    { name: 'Dragunov',    category: 'DMR', img: 'Item_Weapon_Dragunov_C.png' },

  // ── Sniper Rifles ─────────────────────────────────────────────────
  Item_Weapon_Kar98k_C:      { name: 'Kar98k',      category: 'SR',  img: 'Item_Weapon_Kar98k_C.png' },
  Item_Weapon_M24_C:         { name: 'M24',         category: 'SR',  img: 'Item_Weapon_M24_C.png' },
  Item_Weapon_AWM_C:         { name: 'AWM',         category: 'SR',  img: 'Item_Weapon_AWM_C.png' },
  Item_Weapon_Mosin_C:       { name: 'Mosin',       category: 'SR',  img: 'Item_Weapon_Mosin_C.png' },
  Item_Weapon_Win1894_C:     { name: 'Win94',       category: 'SR',  img: 'Item_Weapon_Win1894_C.png' },
  Item_Weapon_L6_C:          { name: 'Lynx AMR',    category: 'SR',  img: 'Item_Weapon_L6_C.png' },

  // ── SMG ───────────────────────────────────────────────────────────
  Item_Weapon_UMP_C:         { name: 'UMP45',       category: 'SMG', img: 'Item_Weapon_UMP_C.png' },
  Item_Weapon_Vector_C:      { name: 'Vector',      category: 'SMG', img: 'Item_Weapon_Vector_C.png' },
  Item_Weapon_UZI_C:         { name: 'Micro UZI',   category: 'SMG', img: 'Item_Weapon_UZI_C.png' },
  Item_Weapon_BizonPP19_C:   { name: 'PP-19 Bizon', category: 'SMG', img: 'Item_Weapon_BizonPP19_C.png' },
  Item_Weapon_MP5K_C:        { name: 'MP5K',        category: 'SMG', img: 'Item_Weapon_MP5K_C.png' },
  Item_Weapon_MP9_C:         { name: 'MP9',         category: 'SMG', img: 'Item_Weapon_MP9_C.png' },
  Item_Weapon_Thompson_C:    { name: 'Tommy Gun',   category: 'SMG', img: 'Item_Weapon_Thompson_C.png' },
  Item_Weapon_P90_C:         { name: 'P90',         category: 'SMG', img: 'Item_Weapon_P90_C.png' },

  // ── LMG ───────────────────────────────────────────────────────────
  Item_Weapon_DP28_C:        { name: 'DP-28',       category: 'LMG', img: 'Item_Weapon_DP28_C.png' },
  Item_Weapon_M249_C:        { name: 'M249',        category: 'LMG', img: 'Item_Weapon_M249_C.png' },
  Item_Weapon_MG3_C:         { name: 'MG3',         category: 'LMG', img: 'Item_Weapon_MG3_C.png' },

  // ── Shotguns ──────────────────────────────────────────────────────
  Item_Weapon_OriginS12_C:   { name: 'S12K',        category: 'SG',  img: 'Item_Weapon_OriginS12_C.png' },
  Item_Weapon_Berreta686_C:  { name: 'S686',        category: 'SG',  img: 'Item_Weapon_Berreta686_C.png' },
  Item_Weapon_Winchester_C:  { name: 'S1897',       category: 'SG',  img: 'Item_Weapon_Winchester_C.png' },
  Item_Weapon_DP12_C:        { name: 'DBS',         category: 'SG',  img: 'Item_Weapon_DP12_C.png' },
  Item_Weapon_Saiga12_C:     { name: 'O12',         category: 'SG',  img: 'Item_Weapon_Saiga12_C.png' },

  // ── Pistols ───────────────────────────────────────────────────────
  Item_Weapon_G18_C:         { name: 'P18C',        category: 'Pistol', img: 'Item_Weapon_G18_C.png' },
  Item_Weapon_M1911_C:       { name: 'P1911',       category: 'Pistol', img: 'Item_Weapon_M1911_C.png' },
  Item_Weapon_DesertEagle_C: { name: 'Deagle',      category: 'Pistol', img: 'Item_Weapon_DesertEagle_C.png' },
  Item_Weapon_NagantM1895_C: { name: 'R1895',       category: 'Pistol', img: 'Item_Weapon_NagantM1895_C.png' },
  Item_Weapon_Rhino_C:       { name: 'R45',         category: 'Pistol', img: 'Item_Weapon_Rhino_C.png' },
  Item_Weapon_Sawnoff_C:     { name: 'Sawed-Off',   category: 'Pistol', img: 'Item_Weapon_Sawnoff_C.png' },
  Item_Weapon_M9_C:          { name: 'P92',         category: 'Pistol', img: 'Item_Weapon_M9_C.png' },

  // ── Special ───────────────────────────────────────────────────────
  Item_Weapon_Crossbow_C:    { name: 'Crossbow',    category: 'Special', img: 'Item_Weapon_Crossbow_C.png' },
};

const CATEGORY_BAR = {
  AR:      'bg-blue-500',
  DMR:     'bg-violet-500',
  SR:      'bg-indigo-600',
  SMG:     'bg-emerald-500',
  LMG:     'bg-orange-500',
  SG:      'bg-red-500',
  Pistol:  'bg-amber-400',
  Special: 'bg-pink-500',
  Other:   'bg-gray-400',
};

const CATEGORY_BADGE = {
  AR:      'bg-blue-50 text-blue-600 border-blue-200',
  DMR:     'bg-violet-50 text-violet-600 border-violet-200',
  SR:      'bg-indigo-50 text-indigo-600 border-indigo-200',
  SMG:     'bg-emerald-50 text-emerald-600 border-emerald-200',
  LMG:     'bg-orange-50 text-orange-600 border-orange-200',
  SG:      'bg-red-50 text-red-600 border-red-200',
  Pistol:  'bg-amber-50 text-amber-600 border-amber-200',
  Special: 'bg-pink-50 text-pink-600 border-pink-200',
  Other:   'bg-gray-50 text-gray-500 border-gray-200',
};

// API 무기 ID → WEAPON_MAP 키 해석
function resolveWeapon(rawId) {
  if (WEAPON_MAP[rawId]) return { key: rawId, ...WEAPON_MAP[rawId] };

  // Case-insensitive 또는 부분 매칭 시도
  const lowerRaw = rawId.toLowerCase();
  const matchKey = Object.keys(WEAPON_MAP).find((k) =>
    k.toLowerCase() === lowerRaw ||
    k.toLowerCase().includes(lowerRaw) ||
    lowerRaw.includes(k.toLowerCase().replace('item_weapon_', '').replace('_c', ''))
  );
  if (matchKey) return { key: matchKey, ...WEAPON_MAP[matchKey] };

  // 폴백: 내부 ID를 읽기 좋게 변환
  const name = rawId
    .replace(/^Item_Weapon_/i, '')
    .replace(/_C$/i, '')
    .replace(/_/g, ' ');
  return { key: rawId, name, category: 'Other', img: null };
}

// 순위 배지 색상
function rankBadgeClass(i) {
  if (i === 0) return 'bg-yellow-400 text-white';
  if (i === 1) return 'bg-gray-300 text-gray-700';
  if (i === 2) return 'bg-amber-600 text-white';
  return 'bg-gray-100 text-gray-500';
}

// 무기 숙련도 점수: 킬 수(60점) + 딜 효율(40점)
function calcWeaponScore(kills, damage) {
  const killScore = Math.min(kills / 200, 1) * 60
  // 딜/킬 비율: 150 이하 = 0점, 300 이상 = 40점 (선형 보간)
  const dPerKill = kills > 0 ? damage / kills : 0
  const effScore = Math.max(0, Math.min((dPerKill - 150) / 150, 1)) * 40
  return Math.round(killScore + effScore)
}

function getWeaponGrade(score) {
  if (score >= 75) return { grade: 'S', label: '최상급',  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-300' }
  if (score >= 55) return { grade: 'A', label: '상급',    color: 'text-green-600',  bg: 'bg-green-50 border-green-300' }
  if (score >= 35) return { grade: 'B', label: '중상급',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-300' }
  if (score >= 15) return { grade: 'C', label: '중급',    color: 'text-gray-500',   bg: 'bg-gray-100 border-gray-300' }
  return               { grade: 'D', label: '입문',    color: 'text-red-400',    bg: 'bg-red-50 border-red-200' }
}

// 재시도 포함 fetch 헬퍼 (최대 maxRetry회, 500 에러만 재시도)
async function fetchWithRetry(url, maxRetry = 2, delayMs = 800) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const res = await fetch(url);
      // 429(Rate Limit) 또는 5xx 에러만 재시도
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetry) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetry) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('fetch failed');
}

export default function WeaponMasteryCard({ playerId, nickname, shard = 'steam', force = false }) {
  const [weapons, setWeapons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [rawError, setRawError] = useState(null);
  const [sortBy, setSortBy] = useState('kills');
  const [resolvedId, setResolvedId] = useState(playerId || null);
  // playerId가 없을 때 ID 조회 중 여부 (빈 상태 오표시 방지)
  const [idResolving, setIdResolving] = useState(!playerId && !!nickname);

  // playerId가 없으면 nickname으로 ID 조회
  useEffect(() => {
    if (playerId) {
      setResolvedId(playerId);
      setIdResolving(false);
      return;
    }
    if (!nickname) {
      setIdResolving(false);
      return;
    }
    setIdResolving(true);
    fetch(`/api/pubg/player-id?nickname=${encodeURIComponent(nickname)}&shard=${shard}`)
      .then((r) => r.json())
      .then((data) => { if (data.playerId) setResolvedId(data.playerId); })
      .catch(() => {})
      .finally(() => setIdResolving(false));
  }, [playerId, nickname, shard]);

  useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRawError(null);

    const masteryUrl = `/api/pubg/stats/mastery/${shard}/${resolvedId}/weapon${force ? '?force=1' : ''}`;
    fetchWithRetry(masteryUrl)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) {
          setError(json.error || '무기 데이터를 불러올 수 없습니다.');
          setRawError(json.code ? `[${json.code}] ${json.details || ''}` : (json.details || null));
          console.warn('[WeaponMastery] API error:', json);
          return;
        }

        console.log('[WeaponMastery] raw attrs keys:', Object.keys(json.data?.attributes || {}));

        // PUBG API weapon_mastery 구조 (v22.0.0 이후):
        // - StatsTotal: 18.2 이전 누적 (더 이상 업데이트 안됨)
        // - OfficialStatsTotal: 18.2 이후 일반 게임 누적
        // - CompetitiveStatsTotal: 18.2 이후 경쟁전 누적
        // → 세 소스를 모두 합산해야 정확한 전체 킬 수가 나옴
        const attrs = json.data?.attributes || {};
        const summaries = attrs.weaponsummaries || attrs.WeaponSummaries || attrs.weaponSummaries || {};
        console.log('[WeaponMastery] summaries count:', Object.keys(summaries).length);

        const parsed = Object.entries(summaries)
          .map(([id, v]) => {
            const info = resolveWeapon(id);
            const s  = v.StatsTotal           || {};
            const o  = v.OfficialStatsTotal   || {};
            const c  = v.CompetitiveStatsTotal || {};

            const kills      = (s.Kills || 0) + (o.Kills || 0) + (c.Kills || 0);
            const damage     = Math.round((s.DamagePlayer || 0) + (o.DamagePlayer || 0) + (c.DamagePlayer || 0));
            const longestKill = Math.round(Math.max(s.LongestKill || 0, o.LongestKill || 0, c.LongestKill || 0));
            return { id, ...info, kills, damage, longestKill };
          })
          .filter((w) => w.kills > 0)
          .sort((a, b) => b.kills - a.kills);

        setWeapons(parsed);
      })
      .catch((e) => {
        if (cancelled) return;
        setError('무기 데이터를 불러오는 중 오류가 발생했습니다.');
        setRawError(e.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // 컴포넌트 언마운트 시 비동기 결과 무시 (리렌더 방지)
    return () => { cancelled = true; };
  }, [resolvedId, shard, force]);

  const sorted = [...weapons].sort((a, b) => {
    if (sortBy === 'kills')  return b.kills - a.kills;
    if (sortBy === 'damage') return b.damage - a.damage;
    return 0;
  });

  const top5 = sorted.slice(0, 5);
  const maxVal = top5.length > 0 ? top5[0][sortBy] || 1 : 1;

  if (!resolvedId && !nickname) return null;

  return (
    <div>
      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <p className="text-xs text-gray-400">누적 전체 기록 기준 · 상위 5개 무기</p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'kills',  label: '킬수' },
            { key: 'damage', label: '데미지' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                sortBy === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 (ID 조회 중 or 무기 데이터 조회 중) */}
      {(idResolving || loading) && (
        <div className="flex items-center justify-center py-14 gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">
            {idResolving ? '플레이어 정보 조회 중...' : '무기 데이터 로딩 중...'}
          </span>
        </div>
      )}

      {/* 에러 */}
      {!idResolving && !loading && error && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <span className="text-3xl">🔒</span>
          <p className="text-sm text-gray-500">{error}</p>
          {rawError && (
            <p className="text-xs text-gray-400 max-w-xs">{rawError}</p>
          )}
          <p className="text-xs text-gray-400">weapon_mastery API는 PUBG 로그인 후 최근 플레이 기록이 필요합니다</p>
        </div>
      )}

      {/* 데이터 없음 (ID 조회 완료 후에만 표시) */}
      {!idResolving && !loading && !error && weapons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <span className="text-3xl">🎮</span>
          <p className="text-sm text-gray-500">무기 사용 기록이 없습니다</p>
          <p className="text-xs text-gray-400">게임을 더 플레이하면 데이터가 쌓입니다</p>
        </div>
      )}

      {/* 무기 목록 */}
      {!idResolving && !loading && !error && top5.length > 0 && (
        <div className="space-y-4">
          {top5.map((w, i) => {
            const val    = w[sortBy];
            const barPct = Math.round((val / maxVal) * 100);
            const barColor  = CATEGORY_BAR[w.category]   || 'bg-gray-400';
            const badgeCls  = CATEGORY_BADGE[w.category] || 'bg-gray-50 text-gray-500 border-gray-200';
            const weaponScore = calcWeaponScore(w.kills, w.damage);
            const { grade, label, color: gradeColor, bg: gradeBg } = getWeaponGrade(weaponScore);

            return (
              <div
                key={w.id}
                className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                {/* 무기 이미지 */}
                <div className="relative w-20 h-14 flex-shrink-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
                  {w.img ? (
                    <Image
                      src={`/weapons/${w.img}`}
                      alt={w.name}
                      width={80}
                      height={56}
                      className="object-contain w-full h-full p-1"
                      unoptimized
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-2xl">🔫</span>
                  )}
                  {/* 순위 뱃지 */}
                  <span className={`absolute top-1 left-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${rankBadgeClass(i)}`}>
                    {i + 1}
                  </span>
                </div>

                {/* 정보 영역 */}
                <div className="flex-1 min-w-0">
                  {/* 이름 + 카테고리 + 등급 */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-bold text-gray-800 truncate">{w.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${badgeCls}`}>
                      {w.category}
                    </span>
                    <span className="relative group flex-shrink-0 flex items-center gap-1 cursor-default">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${gradeBg} ${gradeColor}`}>
                        {grade}
                      </span>
                      <span className={`text-[10px] font-semibold ${gradeColor}`}>
                        {label}
                      </span>
                      {/* 툴팁 */}
                      <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <span className="block bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2.5 shadow-xl leading-relaxed">
                          <span className="block font-bold text-yellow-300 mb-1">📊 등급 산출 기준</span>
                          <span className="block text-gray-300 mb-1.5">
                            킬 수와 킬당 딜량을 조합해<br />
                            <span className="text-white font-semibold">PKGG가 자체 산출</span>한 등급입니다.<br />
                            <span className="text-gray-500 text-[10px]">공식 통계와 무관합니다</span>
                          </span>
                          <span className="block border-t border-gray-700 pt-1.5 mt-1 space-y-0.5">
                            <span className="block text-gray-400 mb-0.5">이 무기 실적 (계정 전체 누적)</span>
                            <span className="block">
                              킬 <span className="text-white font-bold">{w.kills.toLocaleString()}회</span>
                              {' · '}킬당 딜 <span className="text-white font-bold">{w.kills > 0 ? Math.round(w.damage / w.kills).toLocaleString() : 0}</span>
                            </span>
                          </span>
                        </span>
                        <span className="block w-2 h-2 bg-gray-900 rotate-45 ml-3 -mt-1" />
                      </span>
                    </span>
                  </div>

                  {/* 바 차트 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 flex-shrink-0 w-16 text-right">
                      {sortBy === 'kills'  && `${val.toLocaleString()}킬`}
                      {sortBy === 'damage' && `${val.toLocaleString()}`}
                    </span>
                  </div>

                  {/* 보조 스탯 3개 */}
                  <div className="flex gap-3 text-[11px] text-gray-500">
                    <span>킬 <span className="font-semibold text-gray-700">{w.kills.toLocaleString()}</span></span>
                    <span>데미지 <span className="font-semibold text-gray-700">{w.damage.toLocaleString()}</span></span>
                    {w.longestKill > 0 && (
                      <span>최장 <span className="font-semibold text-gray-700">{w.longestKill}m</span></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 전체 무기 수 안내 */}
      {!loading && !error && weapons.length > 5 && (
        <p className="text-[11px] text-gray-400 text-center mt-4">
          총 <span className="font-semibold">{weapons.length}</span>개 무기 기록 중 상위 5개 표시
        </p>
      )}

      {/* 면책 문구 */}
      <p className="text-[10px] text-gray-300 text-center mt-4">
        PUBG 공식 weapon_mastery API · update 18.2 이후 누적 기록
      </p>
    </div>
  );
}
