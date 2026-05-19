import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Tooltip from '../ui/Tooltip';
import { calculateMMR, getMMRTier, MMR_DISCLAIMER, calculateSeasonMMR } from '../../utils/mmrCalculator';
import PlayerShareCard from './PlayerShareCard';
import { classifyPlaystyle, MAJOR } from '../../utils/playstyleClassifier';

// DB 캐시 업데이트 시간 → 상대 표시
function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// localStorage 즐겨찾기 헬퍼 (최대 10개)
const FAV_KEY = 'pkgg_favorites';
function loadFavorites() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
function saveFavorites(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
}

const PlayerHeader = ({
  profile,
  summary,
  rankedSummary,
  seasonStats,
  clanInfo,
  recentMatches,
  onRefresh,
  refreshing,
  cooldown,
  refreshMsg,
  mmr = 1000,
  dataSource,
  onBotFilterChange,
  matchesLoading = false,
  availableSeasons = [],
  selectedSeasonId = null,
  onSeasonChange,
  seasonChanging = false,
}) => {
  const [showRankedDetails, setShowRankedDetails] = useState(false);
  const [showSeasonDetails, setShowSeasonDetails] = useState(false);
  const [showRecentDetails, setShowRecentDetails] = useState(false);
  const [botFilterOn, setBotFilterOn] = useState(false);
  const excludeEvents = true;
  const router = useRouter();
  const shard = (router.query.server || 'steam');
  const nickname = profile?.nickname || '';

  // 공유 카드 저장
  const shareCardRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const handleSaveCard = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `pkgg_${nickname}.png`;
      a.click();
    } catch (e) {
      console.error('카드 저장 실패:', e);
    } finally {
      setSaving(false);
    }
  };

  const [showBotSeasonAlert, setShowBotSeasonAlert] = useState(false);

  const handleBotFilter = () => {
    if (selectedSeasonId) {
      setShowBotSeasonAlert(true);
      setTimeout(() => setShowBotSeasonAlert(false), 3500);
      return;
    }
    setBotFilterOn((v) => {
      onBotFilterChange?.(!v);
      return !v;
    });
  };

  // 리뷰 로드

  // 즐겨찾기 상태
  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    if (!nickname) return;
    const favs = loadFavorites();
    setIsFav(favs.some(f => f.nickname === nickname && f.shard === shard));
  }, [nickname, shard]);

  const toggleFavorite = () => {
    const favs = loadFavorites();
    if (isFav) {
      saveFavorites(favs.filter(f => !(f.nickname === nickname && f.shard === shard)));
      setIsFav(false);
    } else {
      const next = [{ nickname, shard }, ...favs.filter(f => !(f.nickname === nickname && f.shard === shard))].slice(0, 10);
      saveFavorites(next);
      setIsFav(true);
    }
  };

  // ── 시즌 통계 전체 모드 통합 집계 (이벤트 모드 제외) ──
  const SEASON_NORMAL_MODES = new Set(['squad', 'squad-fpp', 'duo', 'duo-fpp', 'solo', 'solo-fpp', 'ranked-squad', 'ranked-squad-fpp', 'ranked-duo', 'ranked-duo-fpp', 'ranked-solo', 'ranked-solo-fpp'])
  const seasonData = Object.values(seasonStats || {})[0] || {};
  let tR = 0, tW = 0, tT10 = 0, tDmg = 0, tKills = 0, tAssists = 0, tSurvival = 0;
  for (const [modeKey, ms] of Object.entries(seasonData)) {
    if (!SEASON_NORMAL_MODES.has(modeKey)) continue;
    const r = ms.rounds || 0;
    if (r === 0) continue;
    tR += r; tW += ms.wins || 0; tT10 += ms.top10s || 0;
    tDmg += (ms.avgDamage || 0) * r;
    tKills += (ms.totalKills || 0);
    tAssists += (ms.assists || 0);
    tSurvival += (ms.avgSurvivalTime || 0) * r;
  }
  const combinedStat = tR > 0 ? {
    rounds:      tR,
    avgDamage:   Math.round(tDmg / tR),
    avgKills:    parseFloat((tKills / tR).toFixed(2)),
    avgAssists:  parseFloat((tAssists / tR).toFixed(2)),
    winRate:     parseFloat(((tW / tR) * 100).toFixed(1)),
    top10Rate:   parseFloat(((tT10 / tR) * 100).toFixed(1)),
    avgSurvival: Math.round(tSurvival / tR),
  } : null;
  if (combinedStat) {
    combinedStat.score = calculateMMR({
      avgDamage:      combinedStat.avgDamage,
      avgKills:       combinedStat.avgKills,
      avgAssists:     combinedStat.avgAssists,
      winRate:        combinedStat.winRate,
      top10Rate:      combinedStat.top10Rate,
      avgSurviveTime: combinedStat.avgSurvival,
    });
  }
  // combinedStat가 없으면 summary 데이터로 폴백
  const seasonStat = combinedStat || (summary?.avgDamage ? {
    rounds:      summary.roundsPlayed || 0,
    avgDamage:   Math.round(summary.avgDamage || 0),
    avgKills:    parseFloat((summary.avgKills || 0).toFixed(2)),
    winRate:     parseFloat((summary.winRate || 0).toFixed(1)),
    top10Rate:   parseFloat((summary.top10Rate || 0).toFixed(1)),
    avgSurvival: Math.round(summary.avgSurviveTime || 0),
    score:       calculateMMR(summary),
  } : null);

  // PKGG 점수: mmr prop (경쟁전 포함 서버사이드 계산값) 우선, 없으면 시즌 일반전 기준 계산
  const displayMmr = mmr || calculateSeasonMMR(seasonData) || 1000;
  const mmrSource = '시즌 전체 기준 (일반+경쟁전, 이벤트 제외)';

  // 이벤트 모드 필터 — matchType OR gameMode OR mapName 기반
  const EVENT_MATCH_TYPES = new Set(['event', 'casual', 'airoyale', 'custom', 'arcade'])
  const EVENT_GAME_MODE_KEYWORDS = ['tdm', 'ibr', 'arcade', 'training']
  const EVENT_MAP_KEYWORDS = ['_tdm_', '_training_', 'range_main', 'pillarcompound', 'boardwalk']
  const isEventMatch = (m) => {
    const mt = (m.matchType || '').toLowerCase()
    const gm = (m.gameMode || '').toLowerCase()
    const mn = (m.mapName || '').toLowerCase()
    return EVENT_MATCH_TYPES.has(mt)
      || EVENT_GAME_MODE_KEYWORDS.some((k) => gm.includes(k))
      || EVENT_MAP_KEYWORDS.some((k) => mn.includes(k))
  }
  const filteredRecentMatches = (recentMatches || []).filter((m) => !isEventMatch(m))

  // 최근 20경기 통계 계산
  const calculate20MatchStats = (matches) => {
    if (!matches || matches.length === 0) {
      return {
        avgDamage: 0,
        avgKills: 0,
        avgAssists: 0,
        winRate: 0,
        top10Rate: 0,
        avgSurvivalTime: 0,
        totalMatches: 0,
      };
    }

    const recent20 = matches.slice(0, 20);
    const totalMatches = recent20.length;

    const totalDamage = recent20.reduce((sum, match) => sum + (match.damage || 0), 0);
    const totalKills = recent20.reduce((sum, match) => sum + (match.kills || 0), 0);
    const totalAssists = recent20.reduce((sum, match) => sum + (match.assists || 0), 0);
    const totalSurvivalTime = recent20.reduce((sum, match) => sum + (match.surviveTime || 0), 0);

    const wins = recent20.filter((match) => (match.rank || match.placement) === 1).length;
    const top10s = recent20.filter((match) => (match.rank || match.placement) <= 10).length;

    return {
      avgDamage: totalMatches > 0 ? totalDamage / totalMatches : 0,
      avgKills: totalMatches > 0 ? totalKills / totalMatches : 0,
      avgAssists: totalMatches > 0 ? totalAssists / totalMatches : 0,
      winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
      top10Rate: totalMatches > 0 ? (top10s / totalMatches) * 100 : 0,
      avgSurvivalTime: totalMatches > 0 ? totalSurvivalTime / totalMatches : 0,
      totalMatches,
    };
  };

  const recent20Stats = calculate20MatchStats(filteredRecentMatches);


  const calculateFormStatus = (matches) => {
    if (!matches || matches.length < 5)
      return { form: '데이터 부족', comment: '경기가 더 필요합니다.' };

    const recent5 = matches.slice(0, 5);
    const previous5 = matches.slice(5, 10);

    if (previous5.length === 0) return { form: '신규', comment: '신규 플레이어입니다.' };

    const recent5Avg = recent5.reduce((sum, m) => sum + (m.damage || 0), 0) / recent5.length;
    const previous5Avg = previous5.reduce((sum, m) => sum + (m.damage || 0), 0) / previous5.length;
    const improvement = ((recent5Avg - previous5Avg) / previous5Avg) * 100;

    if (improvement > 15) return { form: '급상승', comment: '최근 성과가 크게 향상되었습니다!' };
    if (improvement > 5) return { form: '상승', comment: '꾸준히 성과가 향상되고 있습니다.' };
    if (improvement > -5) return { form: '안정', comment: '일정한 성과를 유지하고 있습니다.' };
    if (improvement > -15) return { form: '하락', comment: '최근 성과가 다소 아쉽습니다.' };
    return { form: '급감', comment: '컨디션 회복이 필요해 보입니다.' };
  };

  const recent20Form = calculateFormStatus(filteredRecentMatches);

  // v4: 실제 스탯 기반 플레이스타일 분류
  const psResult = classifyPlaystyle({
    avgDamage:      summary?.avgDamage      || seasonStat?.avgDamage      || 0,
    avgKills:       summary?.avgKills       || seasonStat?.avgKills       || 0,
    avgAssists:     summary?.avgAssists     || seasonStat?.avgAssists     || 0,
    avgSurviveTime: summary?.avgSurvivalTime || seasonStat?.avgSurvival   || 0,
    winRate:        summary?.winRate        || seasonStat?.winRate        || 0,
    top10Rate:      summary?.top10Rate      || seasonStat?.top10Rate      || 0,
    headshotRate:   summary?.headshotRate   || 0,
  })
  const majorInfo = MAJOR[psResult.major] || MAJOR.BALANCED

  const getFormStyle = (form) => {
    if (form === '급상승' || form === '상승') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (form === '하락' || form === '급감') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  };

  return (
    <>
    {/* 최신화 로딩 오버레이 */}
    {refreshing && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-2xl">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-xl">🔄</span>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800 mb-0.5">전적 최신화 중...</div>
            <div className="text-xs text-gray-400">PUBG API에서 데이터를 불러오고 있습니다</div>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )}
    {/* 공유 카드 (화면 밖에 렌더링, PNG 캡처용) */}
    <PlayerShareCard
      cardRef={shareCardRef}
      nickname={nickname}
      shard={shard}
      mmr={mmr}
      seasonStat={seasonStat}
      playstyle={psResult.label}
      clanInfo={clanInfo}
    />
    <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
      {/* 상단 헤더 영역 - 다크 블루 배경 */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* 플레이어 기본 정보 */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            {/* 아바타 */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg flex-shrink-0">
              {(profile?.nickname || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              {/* 닉네임 + DB 캐시 시간 */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight truncate">
                  {profile?.nickname || '-'}
                </h1>
                {timeAgo(profile?.lastCachedAt) && (() => {
                  const isLive = dataSource === 'pubg_api_refreshed' || dataSource === 'pubg_api'
                  const isDb = dataSource === 'database' || dataSource === 'memory_cache'
                  return (
                    <span suppressHydrationWarning className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      isLive
                        ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300'
                        : isDb
                        ? 'bg-gray-700/70 border-gray-600/50 text-gray-400'
                        : 'bg-gray-700/70 border-gray-600/50 text-gray-400'
                    }`}>
                      {isLive ? '✓' : '🕐'} {timeAgo(profile.lastCachedAt)} 업데이트
                    </span>
                  )
                })()}
              </div>
              {/* 플랫폼 배지 */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {(() => {
                  const PLATFORM = {
                    steam:   { label: 'Steam',  icon: '🎮', cls: 'bg-[#1b2838]/80 border-[#2a475e] text-[#c7d5e0]' },
                    kakao:   { label: '카카오배그', icon: '🟡', cls: 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300' },
                    psn:     { label: 'PlayStation', icon: '🎯', cls: 'bg-blue-900/60 border-blue-500/50 text-blue-300' },
                    xbox:    { label: 'Xbox',   icon: '🟢', cls: 'bg-green-900/40 border-green-600/50 text-green-300' },
                    console: { label: 'Console', icon: '🎯', cls: 'bg-gray-700/60 border-gray-500/50 text-gray-300' },
                  };
                  const p = PLATFORM[shard] || PLATFORM.steam;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.cls}`}>
                      {p.icon} {p.label}
                    </span>
                  );
                })()}
              </div>
              {/* 클랜 + 플레이스타일 */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {clanInfo && (
                  <span className="px-3 py-1 bg-blue-700/60 text-blue-200 border border-blue-600/50 rounded-full text-xs font-semibold backdrop-blur-sm">
                    [{clanInfo.tag || 'CLAN'}] {clanInfo.name || '클랜'}
                    {clanInfo.level ? ` Lv.${clanInfo.level}` : ''}
                  </span>
                )}
                <Tooltip content={`${psResult.desc}\n\n💡 ${psResult.tip}`}>
                  <span className="flex items-center gap-1 cursor-help">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${majorInfo.bg} ${majorInfo.border} ${majorInfo.color}`}>
                      {majorInfo.icon} {majorInfo.label}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${psResult.bg}`}>
                      {psResult.label}
                    </span>
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* 우측 액션 버튼 — 2줄 */}
          <div className="flex flex-col items-end gap-1.5">
            {/* 1줄: 즐겨찾기 · 비교 · 카드 · 티어 */}
            <div className="flex items-center gap-1.5">
              {nickname && (
                <Tooltip content={isFav ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}>
                  <button
                    onClick={toggleFavorite}
                    className={`px-2.5 py-1.5 rounded-xl border text-sm font-bold transition-all select-none ${
                      isFav
                        ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/30'
                        : 'bg-white/5 border-white/20 text-gray-400 hover:bg-white/10 hover:text-yellow-300'
                    }`}
                  >{isFav ? '★' : '☆'}</button>
                </Tooltip>
              )}
              {nickname && (
                <Tooltip content="이 플레이어와 비교하기">
                  <button
                    onClick={() => router.push(`/compare?a=${encodeURIComponent(nickname)}&shard=${shard}`)}
                    className="px-2.5 py-1.5 rounded-xl border border-white/20 bg-white/5 text-gray-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 text-sm font-bold transition-all select-none"
                  >⚔️<span className="hidden sm:inline"> 비교</span></button>
                </Tooltip>
              )}
              {nickname && (
                <Tooltip content="전적 카드 PNG 저장">
                  <button
                    onClick={handleSaveCard}
                    disabled={saving}
                    className="px-2.5 py-1.5 rounded-xl border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-sm font-bold transition-all select-none disabled:opacity-50"
                  >{saving ? '저장 중...' : <>📷<span className="hidden sm:inline"> 카드</span></>}</button>
                </Tooltip>
              )}
              <div className="relative">
                <button
                  onClick={handleBotFilter}
                  title={botFilterOn ? '봇(AI) 킬을 제외한 실제 플레이어 킬만 표시해요' : '봇(AI) 킬이 포함된 수치예요'}
                  className={`px-2.5 py-1.5 rounded-xl border text-sm font-bold transition-all select-none ${
                    selectedSeasonId
                      ? 'border-white/10 bg-white/5 text-gray-500 cursor-not-allowed'
                      : botFilterOn
                      ? 'bg-cyan-500 border-cyan-400 text-white'
                      : 'border-white/20 bg-white/5 text-gray-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300'
                  }`}
                >🤖<span className="hidden sm:inline">{botFilterOn ? ' 봇킬 제외 ✓' : ' 봇킬 포함'}</span></button>

                {/* 이전 시즌 클릭 시 토스트 */}
                {showBotSeasonAlert && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
                    <div className="flex items-start gap-2.5 bg-gray-900 border border-amber-500/60 rounded-2xl px-4 py-3 shadow-2xl max-w-xs w-max">
                      <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
                      <div className="text-sm font-bold text-amber-400">이전 시즌은 봇킬 분석 불가</div>
                    </div>
                  </div>
                )}
              </div>
              {(() => {
                const tier = getMMRTier(displayMmr);
                const tooltipText = `PKGG 추정 점수 — 배그 공식 수치 아님\n\n계산 기준\n💥 평균 딜량   30%\n🎯 평균 킬수   25%\n🏆 승률        20%\n🛡️ Top10 진입  10%\n🤝 평균 어시   8%\n⏱️ 평균 생존   7%\n\n📌 ${mmrSource}`;
                return (
                  <Tooltip content={tooltipText}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-help ${tier.bgColor} ${tier.borderColor} select-none`}>
                      <span className="text-base leading-none">{tier.emoji}</span>
                      <div className="flex flex-col leading-none">
                        <span className={`text-xs font-black ${tier.textColor}`}>{displayMmr.toLocaleString()}</span>
                        <span className={`text-[10px] font-semibold ${tier.textColor} opacity-70`}>{tier.label}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-bold ml-0.5">?</span>
                    </div>
                  </Tooltip>
                );
              })()}
            </div>
            {/* 2줄: 현재시즌 · 이벤트제외 · 최신화 */}
            <div className="flex items-center gap-1.5">
              <select
                className="hidden sm:block px-2.5 py-1.5 bg-blue-800/60 border border-blue-600/50 rounded-lg text-xs font-medium text-blue-100 hover:bg-blue-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                value={selectedSeasonId || 'current'}
                onChange={e => onSeasonChange?.(e.target.value)}
                disabled={seasonChanging}
              >
                {availableSeasons.length > 0 ? (
                  availableSeasons.map(s => (
                    <option key={s.id} value={s.isCurrentSeason ? 'current' : s.id}>
                      {s.label}
                    </option>
                  ))
                ) : (
                  <option value="current">현재 시즌</option>
                )}
              </select>
              {seasonChanging && (
                <div className="hidden sm:block w-3.5 h-3.5 animate-spin rounded-full border border-blue-300 border-t-transparent flex-shrink-0" />
              )}
              <button
                onClick={onRefresh}
                disabled={refreshing || cooldown > 0}
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-1.5 ${
                  refreshing || cooldown > 0
                    ? 'bg-blue-800/40 text-blue-400 cursor-not-allowed border border-blue-700/40'
                    : 'bg-blue-500 hover:bg-blue-400 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {refreshing ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" /><span className="hidden sm:inline">최신화 중</span></>
                ) : cooldown > 0 ? `${cooldown}s` : (
                  <><span>🔄</span><span className="hidden sm:inline">최신화</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 스탯 카드 영역 */}
      <div className="bg-white dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700 items-stretch">

          {/* ── 1. 시즌 성과 ── */}
          <div className="p-4 sm:p-5 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">일반게임</h2>
              {seasonStat && (
                <span className="ml-auto text-xs bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">
                  {seasonStat.rounds}경기
                </span>
              )}
            </div>

            {seasonStat ? (
              <>
                {/* 핵심 스탯 2개 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-400 mb-1 font-medium">평균 딜량</div>
                    <div className="text-lg font-black text-gray-900 dark:text-gray-100">{seasonStat.avgDamage}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-400 mb-1 font-medium">평균 킬</div>
                    <div className="text-lg font-black text-gray-900 dark:text-gray-100">{seasonStat.avgKills}</div>
                  </div>
                </div>

                {/* 보조 스탯 3개 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">승률</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{seasonStat.winRate}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">TOP10</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{seasonStat.top10Rate}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">생존</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{Math.round(seasonStat.avgSurvival / 60)}분</div>
                  </div>
                </div>

                {/* 상세 통계 버튼 */}
                <button
                  onClick={() => setShowSeasonDetails(!showSeasonDetails)}
                  className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors"
                >
                  {showSeasonDetails ? '▲ 상세 숨기기' : '▼ 모드별 상세 통계'}
                </button>

                {showSeasonDetails && (() => {
                  const seasonData = Object.values(seasonStats || {})[0] || {};
                  const MODE_META = {
                    'squad-fpp': { label: '스쿼드', view: '1인칭', fpp: true },
                    'squad':     { label: '스쿼드', view: '3인칭', fpp: false },
                    'duo-fpp':   { label: '듀오',   view: '1인칭', fpp: true },
                    'duo':       { label: '듀오',   view: '3인칭', fpp: false },
                    'solo-fpp':  { label: '솔로',   view: '1인칭', fpp: true },
                    'solo':      { label: '솔로',   view: '3인칭', fpp: false },
                  };
                  const activeModes = Object.entries(seasonData).filter(([, ms]) => (ms.rounds || 0) > 0);
                  return (
                    <div className="mt-3 rounded-xl border border-blue-100 dark:border-blue-800 overflow-hidden">
                      <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">모드별 통계</span>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {activeModes.length === 0 ? (
                          <div className="text-xs text-gray-400 text-center py-2">모드 데이터 없음</div>
                        ) : activeModes.map(([mode, ms]) => {
                          const meta = MODE_META[mode] || { label: mode, view: '', fpp: false };
                          return (
                          <div key={mode} className={`rounded-lg bg-white dark:bg-gray-800 border p-2 ${meta.fpp ? 'border-orange-200 dark:border-orange-800' : 'border-blue-100 dark:border-blue-800'}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{meta.label}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.fpp ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                {meta.view}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                              {[
                                { label: '게임', value: ms.rounds || 0 },
                                { label: '평균딜', value: Math.round(ms.avgDamage || 0) },
                                { label: '평균킬', value: ((ms.totalKills || 0) / (ms.rounds || 1)).toFixed(1) },
                                { label: '승률', value: (((ms.wins || 0) / (ms.rounds || 1)) * 100).toFixed(1) + '%' },
                              ].map(({ label, value }) => (
                                <div key={label} className={`rounded p-1.5 text-center ${meta.fpp ? 'bg-orange-50/60 dark:bg-orange-900/20' : 'bg-blue-50/60 dark:bg-blue-900/20'}`}>
                                  <div className={`text-[10px] font-medium ${meta.fpp ? 'text-orange-400' : 'text-blue-400'}`}>{label}</div>
                                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm text-gray-500">시즌 데이터가 없습니다</div>
                <div className="text-xs text-gray-400 mt-1">최신화 버튼으로 데이터를 불러오세요</div>
              </div>
            )}
          </div>

          {/* ── 2. 최근 N경기 ── */}
          <div className="p-4 sm:p-5 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-cyan-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">최근 {recent20Stats.totalMatches}경기</h2>
              <span className="px-1.5 py-0.5 bg-cyan-50 border border-cyan-200 rounded-full text-[10px] text-cyan-500 font-medium">이벤트 제외</span>
              {/* 폼 배지 + 말풍선 */}
              <div className="ml-auto relative flex flex-col items-end">
                {recent20Form.comment && (
                  <div className="animate-bounce absolute -top-9 right-0 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg pointer-events-none shadow-md z-10">
                    {recent20Form.comment}
                    <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getFormStyle(recent20Form.form)}`}>
                  {recent20Form.form}
                </span>
              </div>
            </div>

            {recent20Stats.totalMatches > 0 ? (
              <>
                {/* 핵심 스탯 2개 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl p-3 text-center">
                    {(() => {
                      const recent20 = filteredRecentMatches.slice(0, 20)
                      const correctedCount = recent20.filter((m) => m.isBotCorrected).length
                      const n = recent20.length || 1
                      const avgRealDmg = botFilterOn && correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.isBotCorrected ? (m.realDamage ?? m.damage ?? 0) : (m.damage ?? 0)), 0) / n
                        : null
                      const totalBotDmg = botFilterOn && correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.botDamage ?? 0), 0) / n
                        : null
                      return <>
                        <div className="text-xs text-cyan-500 mb-1 font-medium">
                          {botFilterOn ? '실 딜량 평균' : '평균 딜량'}
                        </div>
                        <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                          {avgRealDmg !== null ? avgRealDmg.toFixed(0) : recent20Stats.avgDamage.toFixed(0)}
                        </div>
                        {totalBotDmg !== null && totalBotDmg > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">봇 평균 데미지 {totalBotDmg.toFixed(0)} 제외</div>
                        )}
                        {totalBotDmg === 0 && correctedCount > 0 && (
                          <div className="text-[10px] text-emerald-500 mt-0.5">봇 딜 없음 — 차이 없음</div>
                        )}
                        {botFilterOn && correctedCount === 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">분석 데이터 없음</div>
                        )}
                      </>
                    })()}
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl p-3 text-center">
                    {(() => {
                      const recent20 = filteredRecentMatches.slice(0, 20)
                      const correctedCount = recent20.filter((m) => m.isBotCorrected).length
                      const n = recent20.length || 1
                      const avgReal = botFilterOn && correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.isBotCorrected ? (m.realKills ?? m.kills ?? 0) : (m.kills ?? 0)), 0) / n
                        : null
                      const avgBot = botFilterOn && correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.botKills ?? 0), 0) / n
                        : null
                      return <>
                        <div className="text-xs text-cyan-500 mb-1 font-medium">
                          {botFilterOn ? '실킬 평균' : '평균 킬'}
                        </div>
                        <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                          {avgReal !== null ? avgReal.toFixed(1) : recent20Stats.avgKills.toFixed(1)}
                        </div>
                        {avgBot !== null && (
                          <div className="text-[10px] text-gray-400 mt-0.5">봇 {avgBot.toFixed(1)}킬 제외</div>
                        )}
                        {botFilterOn && correctedCount === 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">데이터 없음</div>
                        )}
                      </>
                    })()}
                  </div>
                </div>

                {/* 보조 스탯 3개 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">승률</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{recent20Stats.winRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Top10</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{recent20Stats.top10Rate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{botFilterOn ? '실 어시스트' : '어시스트'}</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {(() => {
                        if (!botFilterOn) return recent20Stats.avgAssists.toFixed(1)
                        const recent20 = filteredRecentMatches.slice(0, 20)
                        const corrected = recent20.filter((m) => m.isBotCorrected)
                        if (corrected.length === 0) return recent20Stats.avgAssists.toFixed(1)
                        const avgReal = corrected.reduce((s, m) => s + Math.max(0, (m.assists ?? 0) - (m.botAssist ?? 0)), 0) / corrected.length
                        return avgReal.toFixed(1)
                      })()}
                    </div>
                  </div>
                </div>

                {/* 상세 통계 버튼 */}
                <button
                  onClick={() => setShowRecentDetails(!showRecentDetails)}
                  className="w-full py-2 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 text-xs font-bold rounded-lg transition-colors"
                >
                  {showRecentDetails ? '▲ 상세 숨기기' : '▼ 추가 상세 통계'}
                </button>

                {showRecentDetails && (() => {
                  const recent = filteredRecentMatches.slice(0, recent20Stats.totalMatches);
                  const effectiveDmg = (m) =>
                    botFilterOn && m.isBotCorrected ? (m.realDamage ?? m.damage ?? 0) : (m.damage || 0)
                  const maxDmg = Math.max(...recent.map(effectiveDmg));
                  const totalKills = recent.reduce((s, m) => s + (m.kills || 0), 0);
                  const totalDmg = recent.reduce((s, m) => s + effectiveDmg(m), 0);
                  const botDmgExcluded = botFilterOn
                    ? recent.reduce((s, m) => s + (m.botDamage ?? 0), 0)
                    : 0
                  const totalDeaths = recent.filter((m) => (m.rank || m.placement || 100) > 1).length;
                  const avgSurv = recent20Stats.avgSurvivalTime;
                  const totalAssists = recent.reduce((s, m) => s + (m.assists || 0), 0);

                  const effectiveKills = botFilterOn
                    ? recent.reduce((s, m) => s + (m.isBotCorrected ? (m.realKills ?? m.kills ?? 0) : (m.kills ?? 0)), 0)
                    : totalKills
                  const kd = totalDeaths > 0
                    ? (effectiveKills / totalDeaths).toFixed(2)
                    : effectiveKills.toFixed(2)

                  return (
                    <>
                      <div className="mt-3 rounded-xl border border-cyan-100 dark:border-cyan-800 overflow-hidden">
                        <div className="px-3 py-2 bg-cyan-50 dark:bg-cyan-900/20 border-b border-cyan-100 dark:border-cyan-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">추가 통계</span>
                          {botFilterOn && <span className="text-[10px] text-cyan-400">🤖 봇딜 제외</span>}
                        </div>
                        <div className="p-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { label: botFilterOn ? '최고 실딜' : '최고 딜량', value: Math.round(maxDmg).toLocaleString(), color: 'text-orange-500' },
                              { label: botFilterOn ? '실K/D' : 'K/D', value: kd, color: 'text-red-500' },
                              { label: '평균 생존', value: Math.round(avgSurv / 60) + '분', color: 'text-gray-500 dark:text-gray-400' },
                              { label: botFilterOn ? '총 실딜량' : '총 딜량', value: Math.round(totalDmg).toLocaleString(), color: 'text-cyan-600', sub: botFilterOn && botDmgExcluded > 0 ? `봇 ${Math.round(botDmgExcluded).toLocaleString()} 제외` : null },
                              { label: botFilterOn ? '총 실킬' : '총 킬', value: effectiveKills.toLocaleString(), color: 'text-red-400' },
                              { label: '총 어시스트', value: totalAssists.toLocaleString(), color: 'text-blue-400' },
                            ].map(({ label, value, color, sub }) => (
                              <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700">
                                <div className={`text-[10px] font-medium mb-0.5 ${color}`}>{label}</div>
                                <div className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</div>
                                {sub && <div className="text-[9px] text-gray-400 mt-0.5">{sub}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 봇킬 분석 — 매치별 내역 */}
                    </>
                  );
                })()}
              </>
            ) : matchesLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <svg className="w-6 h-6 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <div className="text-sm font-medium text-cyan-500">매치 데이터 분석 중...</div>
                <div className="text-xs text-gray-400">봇킬 분석 포함 — 잠시 기다려 주세요</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-3xl mb-2">🎮</div>
                <div className="text-sm text-gray-500">최근 경기 데이터가 없습니다</div>
              </div>
            )}
          </div>

          {/* ── 3. 경쟁전 ── */}
          <div className="p-4 sm:p-5 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">경쟁전</h2>
              <span className="ml-auto text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-semibold">PUBG 공식</span>
            </div>

            {rankedSummary && rankedSummary.games > 0 ? (
              <>
                {/* 핵심 스탯 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-amber-500 mb-1 font-medium">랭크</div>
                    <div className="text-base font-black text-gray-900 dark:text-gray-100">
                      {rankedSummary.currentTier || rankedSummary.tier || 'Unranked'}
                      {rankedSummary.subTier && rankedSummary.subTier > 0 ? ` ${rankedSummary.subTier}` : ''}
                    </div>
                    <div className="text-xs text-amber-500 font-semibold">{rankedSummary.rp || 0} RP</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">게임수</div>
                    <div className="text-base font-black text-gray-900 dark:text-gray-100">{rankedSummary.games || 0}</div>
                    <div className="text-xs text-gray-400">K/D {(rankedSummary.kd || 0).toFixed(1)}</div>
                  </div>
                </div>

                {/* 보조 스탯 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">평균딜</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{(rankedSummary.avgDamage || 0).toFixed(0)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">승률</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{(rankedSummary.winRate || 0).toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">TOP10</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {typeof rankedSummary.top10Ratio === 'number'
                        ? (rankedSummary.top10Ratio * 100).toFixed(1)
                        : (rankedSummary.top10Rate || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* 상세 통계 버튼 */}
                <button
                  onClick={() => setShowRankedDetails(!showRankedDetails)}
                  className="w-full py-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg transition-colors"
                >
                  {showRankedDetails ? '▲ 상세 숨기기' : '▼ 상세 통계 보기'}
                </button>

                {showRankedDetails && (
                  <div className="mt-3 rounded-xl border border-amber-100 dark:border-amber-800 overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">상세 경쟁전 통계</span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {/* 킬/데스/KDA */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: '킬', value: (rankedSummary.kills || 0).toLocaleString(), color: 'text-red-500' },
                          { label: '데스', value: (rankedSummary.deaths || 0).toLocaleString(), color: 'text-gray-500' },
                          { label: 'KDA', value: typeof rankedSummary.kda === 'number' ? rankedSummary.kda.toFixed(1) : '0.0', color: 'text-blue-500' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700">
                            <div className={`text-[10px] font-medium mb-0.5 ${color}`}>{label}</div>
                            <div className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</div>
                          </div>
                        ))}
                      </div>
                      {/* 어시스트/승리/기절 */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: '어시스트', value: (rankedSummary.assists || 0).toLocaleString(), color: 'text-blue-400' },
                          { label: '승리', value: (rankedSummary.wins || 0).toLocaleString(), color: 'text-green-500' },
                          { label: '기절', value: (rankedSummary.dBNOs || 0).toLocaleString(), color: 'text-purple-400' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700">
                            <div className={`text-[10px] font-medium mb-0.5 ${color}`}>{label}</div>
                            <div className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</div>
                          </div>
                        ))}
                      </div>
                      {/* 총딜 */}
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          { label: '총 딜량', value: (rankedSummary.damageDealt || 0).toLocaleString(), color: 'text-orange-500' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700">
                            <div className={`text-[10px] font-medium mb-0.5 ${color}`}>{label}</div>
                            <div className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</div>
                          </div>
                        ))}
                      </div>
                      {/* 최고 티어/RP */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: '최고 티어', value: rankedSummary.bestTier || 'Unranked', color: 'text-amber-500' },
                          { label: '최고 RP', value: (rankedSummary.bestRankPoint || 0).toLocaleString(), color: 'text-amber-500' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 text-center border border-gray-100 dark:border-gray-700">
                            <div className={`text-[10px] font-medium mb-0.5 ${color}`}>{label}</div>
                            <div className="text-sm font-black text-gray-900 dark:text-gray-100">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm text-gray-500 font-medium">아직 경쟁전 기록이 없습니다</div>
                <div className="text-xs text-gray-400 mt-1">경쟁전에 참여하면 랭크 정보가 표시됩니다</div>
              </div>
            )}
          </div>
        </div>

        {refreshMsg && (
          <div className="px-8 py-3 bg-blue-50 border-t border-blue-100 text-center text-sm text-blue-700 font-medium">
            {refreshMsg}
          </div>
        )}

      </div>
    </div>
    </>
  );
};

export default PlayerHeader;
