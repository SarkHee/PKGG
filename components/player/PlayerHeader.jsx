import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Tooltip from '../ui/Tooltip';
import { calculateMMR, getMMRTier, MMR_DISCLAIMER, calculateSeasonMMR } from '../../utils/mmrCalculator';
import { classifyPlaystyle, MAJOR } from '../../utils/playstyleClassifier';
import { useT } from '../../utils/i18n';
import ReportCard from './ReportCard';

// DB 캐시 업데이트 시간 → 상대 표시
function timeAgo(isoString, t) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return t('ph.time.just_now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('ph.time.min_ago')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('ph.time.hour_ago')}`;
  return `${Math.floor(diff / 86400)}${t('ph.time.day_ago')}`;
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
  matchesLoading = false,
  availableSeasons = [],
  selectedSeasonId = null,
  onSeasonChange,
  seasonChanging = false,
}) => {
  const [showRankedDetails, setShowRankedDetails] = useState(false);
  const [showSeasonDetails, setShowSeasonDetails] = useState(false);
  const [showRecentDetails, setShowRecentDetails] = useState(false);

  // 봇킬 분석 스탯 상태 (일반게임 카드) — useEffect는 nickname 선언 후 아래에 위치
  const [botStats, setBotStats] = useState(null);

  // 리포트 모달
  const [showReport, setShowReport]     = useState(false);
  const [reportData, setReportData]     = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError]   = useState('');
  const [reportSaving, setReportSaving] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const reportCardRef = useRef(null);

  const openReport = async () => {
    setShowReport(true);
    if (reportData) return;
    setReportLoading(true);
    setReportError('');
    try {
      const res = await fetch(`/api/report/${encodeURIComponent(nickname)}?shard=${shard}`);
      const json = await res.json();
      if (!res.ok) { setReportError(json.error || '데이터 조회 실패'); return; }
      setReportData(json);
    } catch (e) {
      setReportError(e.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportSave = async () => {
    if (reportSaving || !reportCardRef.current) return;
    setReportSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(reportCardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `pkgg_report_${nickname}.png`;
      a.click();
    } catch (e) {
      console.error('리포트 저장 실패:', e);
    } finally {
      setReportSaving(false);
    }
  };

  const handleReportCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/report/${encodeURIComponent(nickname)}?shard=${shard}`);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    } catch {}
  };
  const excludeEvents = true;
  const { t } = useT();
  const router = useRouter();
  const shard = (router.query.server || 'steam');
  const nickname = profile?.nickname || '';

  // 봇킬 분석 스탯 fetch (nickname/shard 선언 후)
  useEffect(() => {
    if (!nickname) return;
    fetch(`/api/player/bot-stats?nickname=${encodeURIComponent(nickname)}&shard=${shard}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.analyzedCount > 0) setBotStats(d); })
      .catch(() => {});
  }, [nickname, shard]);

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
  const SEASON_NORMAL_MODES = new Set(['squad', 'squad-fpp', 'duo', 'duo-fpp', 'solo', 'solo-fpp'])
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
  // combinedStat가 없으면 (일반전 없음) null — 경쟁전만 한 유저는 경쟁전 카드만 표시
  const seasonStat = combinedStat || null;

  // 봇 비율 → 전체 시즌 평균에 적용한 추정값
  // botKillRatio / botDamageRatio: 텔레메트리 분석 경기에서 계산된 봇 비중
  const estRealKills  = (botStats && seasonStat && botStats.botKillRatio   != null)
    ? Math.max(0, parseFloat((seasonStat.avgKills  * (1 - botStats.botKillRatio)).toFixed(2)))
    : null
  const estRealDamage = (botStats && seasonStat && botStats.botDamageRatio != null)
    ? Math.max(0, Math.round(seasonStat.avgDamage * (1 - botStats.botDamageRatio)))
    : null
  // 분석 경기가 20개 미만이면 비율 신뢰도 낮음 → 추정 레이블
  const isEstimate = botStats ? botStats.analyzedCount < 20 : false

  // PKGG 점수: mmr prop (경쟁전 포함 서버사이드 계산값) 우선, 없으면 시즌 일반전 기준 계산
  let displayMmr = mmr || calculateSeasonMMR(seasonData) || 1000;
  const mmrSource = t('ph.mmr_source');

  // 이벤트 모드 필터 — matchType OR gameMode OR mapName 기반
  const EVENT_MATCH_TYPES = new Set(['event', 'casual', 'airoyale', 'custom', 'arcade', 'training', 'trainingroom', 'tutorialatoz', 'seasonal'])
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

  // 봇 비율 보정 PKGG 점수 재계산
  // 일반전 데이터 있고 봇 분석 완료된 경우만 적용 (경쟁전 전용 플레이어는 그대로 유지)
  if (seasonStat && (estRealKills !== null || estRealDamage !== null)) {
    const corrected = calculateMMR({
      avgDamage:      estRealDamage ?? seasonStat.avgDamage,
      avgKills:       estRealKills  ?? seasonStat.avgKills,
      avgAssists:     combinedStat.avgAssists,
      winRate:        combinedStat.winRate,
      top10Rate:      combinedStat.top10Rate,
      avgSurviveTime: combinedStat.avgSurvival,
    })
    if (corrected) displayMmr = corrected
  }

  const calculateFormStatus = (matches) => {
    if (!matches || matches.length < 5)
      return { formKey: 'insufficient', commentKey: 'insufficient_c' };

    const recent5 = matches.slice(0, 5);
    const previous5 = matches.slice(5, 10);

    if (previous5.length === 0) return { formKey: 'new', commentKey: 'new_c' };

    const recent5Avg = recent5.reduce((sum, m) => sum + (m.damage || 0), 0) / recent5.length;
    const previous5Avg = previous5.reduce((sum, m) => sum + (m.damage || 0), 0) / previous5.length;
    const improvement = ((recent5Avg - previous5Avg) / previous5Avg) * 100;

    if (improvement > 15) return { formKey: 'surge', commentKey: 'surge_c' };
    if (improvement > 5) return { formKey: 'up', commentKey: 'up_c' };
    if (improvement > -5) return { formKey: 'stable', commentKey: 'stable_c' };
    if (improvement > -15) return { formKey: 'down', commentKey: 'down_c' };
    return { formKey: 'drop', commentKey: 'drop_c' };
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

  const getFormStyle = (formKey) => {
    if (formKey === 'surge' || formKey === 'up') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (formKey === 'down' || formKey === 'drop') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  };

  return (
    <>
    {/* 최신화 로딩 오버레이 */}
    {refreshing && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-2xl min-w-[260px]">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-xl">🔄</span>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-800 dark:text-white mb-1">{t('ph.refresh_overlay_title')}</div>
            {refreshMsg ? (
              <div className="text-xs text-blue-500 font-medium">{refreshMsg}</div>
            ) : (
              <div className="text-xs text-gray-400">{t('ph.refresh_overlay_desc')}</div>
            )}
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ── 리포트 카드 모달 ── */}
    {showReport && (
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.75)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}
      >
        <div className="relative flex flex-col items-center gap-4 max-w-full">
          {/* 닫기 버튼 */}
          <button
            onClick={() => setShowReport(false)}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 flex items-center justify-center text-sm font-bold transition-all"
          >✕</button>

          {/* 카드 영역 */}
          <div style={{ maxWidth: '100%', overflowX: 'auto', borderRadius: 16, boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(127,119,221,0.3)' }}>
            {reportLoading && (
              <div style={{ width: 800, maxWidth: '100%', height: 420, background: 'linear-gradient(135deg, #0D0B1A 0%, #140D2E 50%, #0D1B2A 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div className="w-5 h-5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                <span style={{ color: 'rgba(165,160,240,0.7)', fontSize: 14 }}>불러오는 중...</span>
              </div>
            )}
            {reportError && (
              <div style={{ width: 800, maxWidth: '100%', height: 420, background: '#0D0B1A', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ color: '#F87171', fontSize: 14, fontWeight: 700 }}>데이터를 불러올 수 없습니다</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{reportError}</span>
              </div>
            )}
            {reportData && !reportLoading && (
              <div ref={reportCardRef}>
                <ReportCard data={reportData} />
              </div>
            )}
          </div>

          {/* 공유 버튼 */}
          {reportData && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={handleReportSave}
                disabled={reportSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: '#7F77DD' }}
              >{reportSaving ? '저장 중...' : '💾 이미지 저장'}</button>
              <button
                onClick={handleReportCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: reportCopied ? '#34D399' : 'white' }}
              >{reportCopied ? '✓ 복사됨' : '🔗 링크 복사'}</button>
              <a
                href={`/report/${encodeURIComponent(nickname)}?shard=${shard}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(165,160,240,0.8)', textDecoration: 'none' }}
              >↗ 새 탭에서 열기</a>
            </div>
          )}
        </div>
      </div>
    )}

    <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
      {/* 상단 헤더 영역 - 다크 블루 배경 */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          {/* 플레이어 기본 정보 */}
          <div className="flex items-start gap-3 sm:gap-5 min-w-0 flex-1">
            {/* 아바타 */}
            <div className="hidden sm:flex w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0">
              {(profile?.nickname || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 w-full sm:w-auto sm:flex-1 flex flex-col gap-1.5">
              {/* 1행: 닉네임 */}
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-3xl font-black text-white tracking-tight truncate leading-tight">
                  {profile?.nickname || '-'}
                </h1>
                {/* 업데이트 시간 (데스크탑) */}
                {timeAgo(profile?.lastCachedAt, t) && (() => {
                  const isLive = dataSource === 'pubg_api_refreshed' || dataSource === 'pubg_api'
                  const ago = timeAgo(profile.lastCachedAt, t)
                  return (
                    <span suppressHydrationWarning className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border flex-shrink-0 ${
                      isLive ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300' : 'bg-gray-700/70 border-gray-600/50 text-gray-400'
                    }`} title={profile.lastCachedAt ? new Date(profile.lastCachedAt).toLocaleString('ko-KR') : ''}>
                      {isLive ? '✓' : '🕐'} {ago} {t('ph.update_label')}
                    </span>
                  )
                })()}
              </div>

              {/* 2행: 업데이트시간(모바일) + 플랫폼 + 클랜 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 업데이트 시간 (모바일 전용) */}
                {timeAgo(profile?.lastCachedAt, t) && (() => {
                  const isLive = dataSource === 'pubg_api_refreshed' || dataSource === 'pubg_api'
                  return (
                    <span suppressHydrationWarning className={`sm:hidden inline-flex items-center gap-0.5 text-[10px] font-medium ${
                      isLive ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      {isLive ? '✓' : '🕐'} {timeAgo(profile.lastCachedAt, t)} {t('ph.update_label')}
                    </span>
                  )
                })()}
                {/* 플랫폼 */}
                {(() => {
                  const PLATFORM = {
                    steam:   { label: 'Steam',       icon: '🎮', cls: 'bg-[#1b2838]/80 border-[#2a475e] text-[#c7d5e0]' },
                    kakao:   { label: 'Kakao',        icon: '🟡', cls: 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300' },
                    psn:     { label: 'PSN',          icon: '🎯', cls: 'bg-blue-900/60 border-blue-500/50 text-blue-300' },
                    xbox:    { label: 'Xbox',         icon: '🟢', cls: 'bg-green-900/40 border-green-600/50 text-green-300' },
                    console: { label: 'Console',      icon: '🎯', cls: 'bg-gray-700/60 border-gray-500/50 text-gray-300' },
                  };
                  const p = PLATFORM[shard] || PLATFORM.steam;
                  return (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold border ${p.cls}`}>
                      {p.icon} {p.label}
                    </span>
                  );
                })()}
                {/* 클랜 */}
                {clanInfo && (
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-700/50 text-blue-200 border border-blue-600/40 rounded-lg text-[10px] font-semibold max-w-[120px] truncate">
                    [{clanInfo.tag || 'CLAN'}] {clanInfo.name || '클랜'}
                    {clanInfo.level ? ` Lv.${clanInfo.level}` : ''}
                  </span>
                )}
              </div>

              {/* 3행: 플레이스타일 + MMR 티어 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 플레이스타일 */}
                <Tooltip content={`${psResult.desc}\n\n💡 ${psResult.tip}`}>
                  <span className="flex items-center gap-1 cursor-help">
                    <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border ${majorInfo.bg} ${majorInfo.border} ${majorInfo.color}`}>
                      {majorInfo.icon} {majorInfo.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white ${psResult.bg}`}>
                      {psResult.label}
                    </span>
                  </span>
                </Tooltip>
                {/* 상습 팀킬러 — 분석된 경기 중 5% 이상에서 아군 킬 발생 */}
                {botStats?.isTeamKiller && (
                  <Tooltip content={`분석된 ${botStats.analyzedCount}경기 중 ${botStats.teamKillMatchCount}경기(${(botStats.teamKillRate * 100).toFixed(1)}%)에서 아군 킬이 발생했습니다.`}>
                    <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold border bg-red-100 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700 cursor-help">
                      ⚠️ 상습 팀킬러
                    </span>
                  </Tooltip>
                )}
                {/* MMR 티어 (모바일 전용) */}
                {(() => {
                  const tier = getMMRTier(displayMmr);
                  return (
                    <div className={`sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border ${tier.bgColor} ${tier.borderColor}`}>
                      <span className="text-sm leading-none">{tier.emoji}</span>
                      <span className={`text-[10px] font-black ${tier.textColor}`}>{displayMmr.toLocaleString()}</span>
                      <span className={`text-[9px] font-semibold ${tier.textColor} opacity-70`}>{tier.label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 우측 액션 영역 */}
          <div className="flex flex-col gap-1.5 sm:items-end">
            {/* 데스크탑 1줄: 즐겨찾기 · 비교 · 카드 · 티어 */}
            <div className="hidden sm:flex items-center gap-1.5">
              {nickname && (
                <Tooltip content={isFav ? t('ph.fav_remove') : t('ph.fav_add')}>
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
                <Tooltip content={t('ph.compare_tooltip')}>
                  <button
                    onClick={() => router.push(`/compare?a=${encodeURIComponent(nickname)}&shard=${shard}`)}
                    className="px-2.5 py-1.5 rounded-xl border border-white/20 bg-white/5 text-gray-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 text-sm font-bold transition-all select-none"
                  >⚔️ {t('ph.compare')}</button>
                </Tooltip>
              )}
              {nickname && (
                <Tooltip content="시즌 리포트 카드 보기">
                  <button
                    onClick={openReport}
                    className="px-2.5 py-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/25 hover:border-purple-400/60 hover:text-purple-200 text-sm font-bold transition-all select-none"
                  >📊 리포트</button>
                </Tooltip>
              )}
              {(() => {
                const tier = getMMRTier(displayMmr);
                const tooltipText = `${t('ph.mmr_tooltip_full')}\n\n📌 ${mmrSource}`;
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
            {/* 데스크탑 2줄: 시즌 선택 · 최신화 */}
            <div className="hidden sm:flex items-center gap-1.5">
              <select
                className="px-2.5 py-1.5 bg-blue-800/60 border border-blue-600/50 rounded-lg text-xs font-medium text-blue-100 hover:bg-blue-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <option value="current">{t('ph.current_season')}</option>
                )}
              </select>
              {seasonChanging && (
                <div className="w-3.5 h-3.5 animate-spin rounded-full border border-blue-300 border-t-transparent flex-shrink-0" />
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
                  <><div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" /><span>{t('ph.refreshing')}</span></>
                ) : cooldown > 0 ? `${cooldown}s` : (
                  <><span>🔄</span><span>{t('ph.refresh')}</span></>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* 모바일 액션 버튼 — 헤더 전체 너비 (Tooltip 제거: 모바일 hover 없음) */}
        {nickname && (
          <div className="grid grid-cols-4 gap-2 sm:hidden w-full mt-3">
            <button
              onClick={toggleFavorite}
              className={`h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold transition-all select-none ${
                isFav
                  ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300'
                  : 'bg-white/5 border-white/20 text-gray-400'
              }`}
            ><span className="text-sm leading-none">{isFav ? '★' : '☆'}</span><span>즐겨찾기</span></button>
            <button
              onClick={() => router.push(`/compare?a=${encodeURIComponent(nickname)}&shard=${shard}`)}
              className="h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/20 bg-white/5 text-gray-300 text-[10px] font-bold transition-all select-none"
            ><span className="text-sm leading-none">⚔️</span><span>비교</span></button>
            <button
              onClick={openReport}
              className="h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px] font-bold transition-all select-none"
            ><span className="text-sm leading-none">📊</span><span>리포트</span></button>
            <button
              onClick={onRefresh}
              disabled={refreshing || cooldown > 0}
              className={`h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold transition-all duration-200 ${
                refreshing || cooldown > 0
                  ? 'bg-blue-800/40 text-blue-400 cursor-not-allowed border border-blue-700/40'
                  : 'bg-blue-500 text-white border border-blue-400/50'
              }`}
            >
              {refreshing
                ? <div className="animate-spin rounded-full h-3.5 w-3.5 border border-white border-t-transparent" />
                : cooldown > 0
                ? <><span className="text-sm leading-none">🔄</span><span>{cooldown}s</span></>
                : <><span className="text-sm leading-none">🔄</span><span>갱신</span></>}
            </button>
          </div>
        )}
      </div>

      {/* 스탯 카드 영역 */}
      <div className="bg-white dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700 items-stretch">

          {/* ── 1. 시즌 성과 ── */}
          <div className="p-3 sm:p-5 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('ph.normal_game')}</h2>
                  {seasonStat && (
                    <span className="text-xs bg-blue-50 text-blue-500 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                      {seasonStat.rounds}{t('ph.games_unit')}
                    </span>
                  )}
                </div>
                {botStats && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-500">봇참여게임</span>
                    <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                      {botStats.analyzedCount}경기 분석 완료
                      {botStats.botKillRatio > 0 && (
                        <span className="text-gray-400 ml-1">
                          (봇킬 {(botStats.botKillRatio * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {seasonStat ? (
              <>
                {/* 핵심 스탯 2개 — 봇 비율 보정 추정값 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-400 mb-1 font-medium flex items-center justify-center gap-1">
                      {estRealDamage != null ? '실딜' : t('ph.avg_damage')}
                    </div>
                    <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                      {estRealDamage != null ? estRealDamage : seasonStat.avgDamage}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-400 mb-1 font-medium flex items-center justify-center gap-1">
                      {estRealKills != null ? '실킬' : t('ph.avg_kills')}
                    </div>
                    <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                      {estRealKills != null ? estRealKills : seasonStat.avgKills}
                    </div>
                  </div>
                </div>

                {/* 보조 스탯 3개 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{t('ph.win_rate')}</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{seasonStat.winRate}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">TOP10</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{seasonStat.top10Rate}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{t('ph.survival')}</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{Math.round(seasonStat.avgSurvival / 60)}{t('ph.min_unit')}</div>
                  </div>
                </div>

                {/* 상세 통계 버튼 */}
                <button
                  onClick={() => setShowSeasonDetails(!showSeasonDetails)}
                  className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors"
                >
                  {showSeasonDetails ? t('ph.hide_details') : t('ph.show_mode_details')}
                </button>

                {showSeasonDetails && (() => {
                  const seasonData = Object.values(seasonStats || {})[0] || {};
                  const MODE_META = {
                    'squad-fpp': { label: t('ph.mode_squad'), view: t('ph.view_fpp'), fpp: true },
                    'squad':     { label: t('ph.mode_squad'), view: t('ph.view_tpp'), fpp: false },
                    'duo-fpp':   { label: t('ph.mode_duo'),   view: t('ph.view_fpp'), fpp: true },
                    'duo':       { label: t('ph.mode_duo'),   view: t('ph.view_tpp'), fpp: false },
                    'solo-fpp':  { label: t('ph.mode_solo'),  view: t('ph.view_fpp'), fpp: true },
                    'solo':      { label: t('ph.mode_solo'),  view: t('ph.view_tpp'), fpp: false },
                  };
                  const activeModes = Object.entries(seasonData).filter(([, ms]) => (ms.rounds || 0) > 0);
                  return (
                    <div className="mt-3 rounded-xl border border-blue-100 dark:border-blue-800 overflow-hidden">
                      <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t('ph.mode_stats_title')}</span>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {activeModes.length === 0 ? (
                          <div className="text-xs text-gray-400 text-center py-2">{t('ph.mode_no_data')}</div>
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
                                { label: t('ph.games_col'), value: ms.rounds || 0 },
                                { label: t('ph.avg_deal'), value: Math.round(ms.avgDamage || 0) },
                                { label: t('ph.avg_kill_col'), value: ((ms.totalKills || 0) / (ms.rounds || 1)).toFixed(1) },
                                { label: t('ph.win_rate'), value: (((ms.wins || 0) / (ms.rounds || 1)) * 100).toFixed(1) + '%' },
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
                <div className="text-sm text-gray-500">{t('ph.no_season_data')}</div>
                <div className="text-xs text-gray-400 mt-1">{t('ph.no_season_hint')}</div>
              </div>
            )}
          </div>

          {/* ── 2. 최근 N경기 ── */}
          <div className="p-3 sm:p-5 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-cyan-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('ph.recent_label')} {recent20Stats.totalMatches}{t('ph.games_unit')}</h2>
              <span className="px-1.5 py-0.5 bg-cyan-50 border border-cyan-200 rounded-full text-[10px] text-cyan-500 font-medium">{t('ph.event_excluded')}</span>
              {/* 폼 배지 + 말풍선 */}
              <div className="ml-auto relative flex flex-col items-end">
                {recent20Form.commentKey && (
                  <div className="animate-bounce absolute -top-9 right-0 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg pointer-events-none shadow-md z-10">
                    {t(`ph.form.${recent20Form.commentKey}`)}
                    <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getFormStyle(recent20Form.formKey)}`}>
                  {t(`ph.form.${recent20Form.formKey}`)}
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
                      const avgRealDmg = correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.isBotCorrected ? (m.realDamage ?? m.damage ?? 0) : (m.damage ?? 0)), 0) / n
                        : null
                      const totalBotDmg = correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.botDamage ?? 0), 0) / n
                        : null
                      return <>
                        <div className="text-xs text-cyan-500 mb-1 font-medium">
                          {correctedCount > 0 ? '최근 실딜' : t('ph.avg_damage')}
                        </div>
                        <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                          {avgRealDmg !== null ? avgRealDmg.toFixed(0) : recent20Stats.avgDamage.toFixed(0)}
                        </div>
                        {totalBotDmg !== null && totalBotDmg > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{t('ph.bot_avg_dmg_excl').replace('{n}', totalBotDmg.toFixed(0))}</div>
                        )}
                        {totalBotDmg === 0 && correctedCount > 0 && (
                          <div className="text-[10px] text-emerald-500 mt-0.5">{t('ph.bot_dmg_none')}</div>
                        )}
                      </>
                    })()}
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl p-3 text-center">
                    {(() => {
                      const recent20 = filteredRecentMatches.slice(0, 20)
                      const correctedCount = recent20.filter((m) => m.isBotCorrected).length
                      const n = recent20.length || 1
                      const avgReal = correctedCount > 0
                        ? recent20.reduce((s, m) => s + (m.isBotCorrected ? (m.realKills ?? m.kills ?? 0) : (m.kills ?? 0)), 0) / n
                        : null
                      return <>
                        <div className="text-xs text-cyan-500 mb-1 font-medium">
                          {correctedCount > 0 ? '최근 실킬' : t('ph.avg_kills')}
                        </div>
                        <div className="text-lg font-black text-gray-900 dark:text-gray-100">
                          {avgReal !== null ? avgReal.toFixed(1) : recent20Stats.avgKills.toFixed(1)}
                        </div>
                        {avgReal !== null && (
                          <div className="text-[10px] text-gray-400 mt-0.5">봇킬 제외</div>
                        )}
                      </>
                    })()}
                  </div>
                </div>

                {/* 보조 스탯 3개 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{t('ph.win_rate')}</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{recent20Stats.winRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Top10</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{recent20Stats.top10Rate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{t('ph.assists')}</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {recent20Stats.avgAssists.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* 상세 통계 버튼 */}
                <button
                  onClick={() => setShowRecentDetails(!showRecentDetails)}
                  className="w-full py-2 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 text-xs font-bold rounded-lg transition-colors"
                >
                  {showRecentDetails ? t('ph.hide_details') : t('ph.show_recent_details')}
                </button>

                {showRecentDetails && (() => {
                  const recent = filteredRecentMatches.slice(0, recent20Stats.totalMatches);
                  const correctedCount = recent.filter((m) => m.isBotCorrected).length
                  const effectiveDmg = (m) =>
                    m.isBotCorrected ? (m.realDamage ?? m.damage ?? 0) : (m.damage || 0)
                  const maxDmg = Math.max(...recent.map(effectiveDmg));
                  const totalKills = recent.reduce((s, m) => s + (m.kills || 0), 0);
                  const totalDmg = recent.reduce((s, m) => s + effectiveDmg(m), 0);
                  const botDmgExcluded = recent.reduce((s, m) => s + (m.botDamage ?? 0), 0)
                  const totalDeaths = recent.filter((m) => (m.rank || m.placement || 100) > 1).length;
                  const avgSurv = recent20Stats.avgSurvivalTime;
                  const totalAssists = recent.reduce((s, m) => s + (m.assists || 0), 0);

                  const effectiveKills = correctedCount > 0
                    ? recent.reduce((s, m) => s + (m.isBotCorrected ? (m.realKills ?? m.kills ?? 0) : (m.kills ?? 0)), 0)
                    : totalKills
                  const kd = totalDeaths > 0
                    ? (effectiveKills / totalDeaths).toFixed(2)
                    : effectiveKills.toFixed(2)

                  return (
                    <>
                      <div className="mt-3 rounded-xl border border-cyan-100 dark:border-cyan-800 overflow-hidden">
                        <div className="px-3 py-2 bg-cyan-50 dark:bg-cyan-900/20 border-b border-cyan-100 dark:border-cyan-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">{t('ph.extra_stats_title')}</span>
                          {correctedCount > 0 && <span className="text-[10px] text-cyan-400">🤖 {t('ph.bot_excl_label')}</span>}
                        </div>
                        <div className="p-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { label: correctedCount > 0 ? t('ph.max_real_dmg') : t('ph.max_damage'), value: Math.round(maxDmg).toLocaleString(), color: 'text-orange-500' },
                              { label: correctedCount > 0 ? t('ph.real_kd') : t('ph.kd'), value: kd, color: 'text-red-500' },
                              { label: t('ph.avg_survival_label'), value: Math.round(avgSurv / 60) + t('ph.min_unit'), color: 'text-gray-500 dark:text-gray-400' },
                              { label: correctedCount > 0 ? t('ph.total_real_dmg') : t('ph.total_dmg'), value: Math.round(totalDmg).toLocaleString(), color: 'text-cyan-600', sub: correctedCount > 0 && botDmgExcluded > 0 ? t('ph.bot_dmg_excl_sub').replace('{n}', Math.round(botDmgExcluded).toLocaleString()) : null },
                              { label: correctedCount > 0 ? t('ph.total_real_kills') : t('ph.total_kills'), value: effectiveKills.toLocaleString(), color: 'text-red-400' },
                              { label: t('ph.total_assists'), value: totalAssists.toLocaleString(), color: 'text-blue-400' },
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
                <div className="text-sm font-medium text-cyan-500">{t('ph.matches_loading_title')}</div>
                <div className="text-xs text-gray-400">{t('ph.matches_loading_desc')}</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-3xl mb-2">🎮</div>
                <div className="text-sm text-gray-500">{t('ph.no_recent_matches')}</div>
              </div>
            )}
          </div>

          {/* ── 3. 경쟁전 ── */}
          <div className="p-3 sm:p-5 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('ph.ranked_game')}</h2>
              <span className="ml-auto text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-semibold">{t('ph.pubg_official')}</span>
            </div>

            {rankedSummary && rankedSummary.games > 0 ? (
              <>
                {/* 핵심 스탯 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-amber-500 mb-1 font-medium">{t('ph.rank_label')}</div>
                    <div className="text-base font-black text-gray-900 dark:text-gray-100">
                      {rankedSummary.currentTier || rankedSummary.tier || 'Unranked'}
                      {rankedSummary.subTier && rankedSummary.subTier > 0 ? ` ${rankedSummary.subTier}` : ''}
                    </div>
                    <div className="text-xs text-amber-500 font-semibold">{rankedSummary.rp || 0} RP</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">{t('ph.game_count')}</div>
                    <div className="text-base font-black text-gray-900 dark:text-gray-100">{rankedSummary.games || 0}</div>
                    <div className="text-xs text-gray-400">K/D {(rankedSummary.kd || 0).toFixed(1)}</div>
                  </div>
                </div>

                {/* 보조 스탯 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{t('ph.avg_deal')}</div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{(rankedSummary.avgDamage || 0).toFixed(0)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">{t('ph.win_rate')}</div>
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
                  {showRankedDetails ? t('ph.hide_details') : t('ph.show_ranked_details')}
                </button>

                {showRankedDetails && (
                  <div className="mt-3 rounded-xl border border-amber-100 dark:border-amber-800 overflow-hidden">
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{t('ph.ranked_detail_title')}</span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {/* 킬/데스/KDA */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: t('ph.kills'), value: (rankedSummary.kills || 0).toLocaleString(), color: 'text-red-500' },
                          { label: t('ph.deaths'), value: (rankedSummary.deaths || 0).toLocaleString(), color: 'text-gray-500' },
                          { label: t('ph.kda'), value: typeof rankedSummary.kda === 'number' ? rankedSummary.kda.toFixed(1) : '0.0', color: 'text-blue-500' },
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
                          { label: t('ph.assists'), value: (rankedSummary.assists || 0).toLocaleString(), color: 'text-blue-400' },
                          { label: t('ph.wins'), value: (rankedSummary.wins || 0).toLocaleString(), color: 'text-green-500' },
                          { label: t('ph.knockdowns'), value: (rankedSummary.dBNOs || 0).toLocaleString(), color: 'text-purple-400' },
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
                          { label: t('ph.total_dmg'), value: (rankedSummary.damageDealt || 0).toLocaleString(), color: 'text-orange-500' },
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
                          { label: t('ph.best_tier'), value: rankedSummary.bestTier || 'Unranked', color: 'text-amber-500' },
                          { label: t('ph.best_rp'), value: (rankedSummary.bestRankPoint || 0).toLocaleString(), color: 'text-amber-500' },
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
                <div className="text-sm text-gray-500 font-medium">{t('ph.no_ranked_data')}</div>
                <div className="text-xs text-gray-400 mt-1">{t('ph.no_ranked_hint')}</div>
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
