// pages/mypage.js — 마이페이지 (프로필 + PUBG 연동 + 일일 목표)
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Layout from '../components/layout/Layout';

// ── 일일 목표 ────────────────────────────────────────────────────────────────
const GOAL_META = {
  damage: { icon: '💥', label: '단판 최고 딜량', unit: '',   step: 50,  type: 'int' },
  kills:  { icon: '🔫', label: '단판 최고 킬',   unit: '킬', step: 1,   type: 'int' },
  top10:  { icon: '🏅', label: 'Top10 횟수',     unit: '회', step: 1,   type: 'int' },
  win:    { icon: '🏆', label: '치킨 횟수',       unit: '회', step: 1,   type: 'int' },
};

const DIFF_META = {
  easy:   { label: '이지', emoji: '🟢', accent: 'green',  desc: '현재 실력보다 살짝 낮게 — 부담 없이 달성' },
  medium: { label: '중간', emoji: '🟡', accent: 'yellow', desc: '현재 실력의 120% — 집중하면 가능' },
  hell:   { label: '헬',   emoji: '🔴', accent: 'red',    desc: '현재 실력의 180% — 최고의 컨디션 필요' },
};

const DIFF_ACCENT = {
  green:  { border: 'border-green-500/50',  bg: 'bg-green-500/10',  text: 'text-green-400',  bar: 'bg-green-500',  btn: 'bg-green-600 hover:bg-green-500' },
  yellow: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500', btn: 'bg-yellow-600 hover:bg-yellow-500' },
  red:    { border: 'border-red-500/50',    bg: 'bg-red-500/10',    text: 'text-red-400',    bar: 'bg-red-500',    btn: 'bg-red-600 hover:bg-red-500' },
};

function buildGoalTargets(stats, diff) {
  const dmg  = stats?.avgDamage || 200;
  const kill = stats?.avgKills  || 2;
  const wr   = stats?.winRate   || 2;
  const sets = {
    easy:   { damage: Math.max(100, Math.round(dmg  * 0.85 / 50) * 50), kills: Math.max(1, Math.round(kill * 0.9)), top10: 2, win: 1 },
    medium: { damage: Math.round(dmg  * 1.2  / 50) * 50,                kills: Math.max(2, Math.round(kill * 1.3)), top10: 3, win: wr > 5 ? 2 : 1 },
    hell:   { damage: Math.round(dmg  * 1.8  / 50) * 50,                kills: Math.max(4, Math.round(kill * 2.0)), top10: 5, win: 2 },
  };
  return sets[diff];
}

const GOAL_KEY = 'pkgg_daily_goals';
const today = () => new Date().toISOString().slice(0, 10);

function DailyGoals({ playerStats, statsLoading, nickname, shard }) {
  const [phase,         setPhase]       = useState('loading');
  const [date]                          = useState(today());
  const [difficulty,    setDiff]        = useState(null);
  const [targets,       setTargets]     = useState({});
  const [progress,      setProgress]    = useState({});
  const [startTime,     setStartTime]   = useState(null);
  const [refreshing,    setRefreshing]  = useState(false);
  const [lastRefresh,   setLastRefresh] = useState(null);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [showDelayHint, setShowDelayHint] = useState(false);

  const GOAL_IDS = ['damage', 'kills', 'top10', 'win'];

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(GOAL_KEY) || 'null');
      if (data?.date === date && data?.phase && data?.difficulty) {
        setDiff(data.difficulty);
        setTargets(data.targets || {});
        setProgress(data.progress || {});
        setStartTime(data.startTime || null);
        setPhase(data.phase);
      } else {
        setPhase('select');
      }
    } catch { setPhase('select'); }
  }, [date]);

  // 트래킹 중이면 마운트 시 자동 1회 조회
  useEffect(() => {
    if (phase === 'track' && nickname && shard) fetchProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, nickname, shard]);

  const save = (ph, diff, tgt, prog, sTime) =>
    localStorage.setItem(GOAL_KEY, JSON.stringify({
      date, phase: ph, difficulty: diff, targets: tgt, progress: prog,
      startTime: sTime ?? startTime,
    }));

  const startTracking = (diff) => {
    if (!playerStats) return;
    const tgt  = buildGoalTargets(playerStats, diff);
    const init = Object.fromEntries(GOAL_IDS.map(id => [id, 0]));
    const now  = new Date().toISOString();
    setDiff(diff); setTargets(tgt); setProgress(init); setStartTime(now); setPhase('track');
    save('track', diff, tgt, init, now);
  };

  // 전적 API로 진행상황 자동 계산
  const fetchProgress = async (currentProgress = null) => {
    if (!nickname || !shard) return;
    setRefreshing(true);
    try {
      const r = await fetch(`/api/matches/load-more?nickname=${encodeURIComponent(nickname)}&shard=${shard}&offset=0&limit=20`);
      if (!r.ok) return;
      const d = await r.json();
      if (!d.matches?.length) return;

      // 목표 시작 이후 경기만 필터
      const base = startTime ? new Date(startTime) : new Date(date);
      const newMatches = d.matches.filter(m =>
        m.matchTimestamp && new Date(m.matchTimestamp) > base
      );
      setNewMatchCount(newMatches.length);
      if (!newMatches.length) return;

      // 딜량·킬: 단판 최고값 / Top10·치킨: 누적 횟수
      const fromMatches = {
        damage: Math.max(...newMatches.map(m => Math.round(m.damage || 0))),
        kills:  Math.max(...newMatches.map(m => m.kills || 0)),
        top10:  newMatches.filter(m => {
          const rank = m.rank ?? m.placement ?? 100;
          return rank > 0 && rank <= 10;
        }).length,
        win: newMatches.filter(m => {
          const rank = m.rank ?? m.placement ?? 100;
          return rank === 1;
        }).length,
      };

      // 수동 입력보다 전적 값이 높으면 전적 우선, 낮으면 유지
      const prev = currentProgress || progress;
      const merged = Object.fromEntries(
        GOAL_IDS.map(id => [id, Math.max(prev[id] || 0, fromMatches[id] || 0)])
      );

      setProgress(merged);
      setLastRefresh(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));

      const storedDiff = JSON.parse(localStorage.getItem(GOAL_KEY) || '{}').difficulty;
      save('track', storedDiff || difficulty, targets, merged);

      const storedTargets = JSON.parse(localStorage.getItem(GOAL_KEY) || '{}').targets || targets;
      const allDone = GOAL_IDS.every(id => (merged[id] || 0) >= (storedTargets[id] ?? 0));
      if (allDone) {
        setPhase('done');
        save('done', storedDiff || difficulty, storedTargets, merged);
      }
    } catch (e) {
      console.warn('[DailyGoals] 전적 조회 실패:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(GOAL_KEY);
    setPhase('select'); setDiff(null); setTargets({}); setProgress({});
    setStartTime(null); setLastRefresh(null); setNewMatchCount(0);
  };

  if (phase === 'loading') return (
    <div className="h-20 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (phase === 'done') {
    const ac = DIFF_ACCENT[DIFF_META[difficulty]?.accent || 'green'];
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🎉</div>
        <p className="text-xl font-bold text-white mb-1">오늘의 목표 달성!</p>
        <p className="text-sm text-gray-400 mb-1">
          난이도 <span className={`font-bold ${ac.text}`}>{DIFF_META[difficulty]?.emoji} {DIFF_META[difficulty]?.label}</span> 클리어
        </p>
        <p className="text-xs text-gray-600 mb-6">수고하셨습니다. 내일도 화이팅!</p>
        <button onClick={reset} className={`px-5 py-2 ${ac.btn} text-white rounded-lg text-sm font-semibold transition-colors`}>다시 시작</button>
      </div>
    );
  }

  if (phase === 'select') {
    if (statsLoading) return (
      <div className="h-20 flex items-center justify-center gap-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
        스탯 불러오는 중...
      </div>
    );
    if (!playerStats) return (
      <div className="text-center py-8 text-gray-600 text-sm">
        <p className="text-2xl mb-2">🎮</p>
        대표 PUBG 계정을 연동하면<br />스탯 기반 목표를 추천해드립니다.
      </div>
    );
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 text-center">
          내 평균 딜량 <span className="text-gray-300 font-bold">{Math.round(playerStats.avgDamage)}</span> · 평균 킬 <span className="text-gray-300 font-bold">{(playerStats.avgKills || 0).toFixed(1)}</span> 기준 추천
        </p>
        {Object.entries(DIFF_META).map(([diff, meta]) => {
          const tgt = buildGoalTargets(playerStats, diff);
          const ac  = DIFF_ACCENT[meta.accent];
          return (
            <button key={diff} onClick={() => startTracking(diff)}
              className={`w-full text-left p-4 rounded-xl border ${ac.border} ${ac.bg} hover:opacity-90 transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-base font-black ${ac.text}`}>{meta.emoji} {meta.label}</span>
                <span className="text-[10px] text-gray-500">{meta.desc}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {GOAL_IDS.map(id => {
                  const g = GOAL_META[id];
                  return (
                    <span key={id} className="text-xs text-gray-400">
                      {g.icon} {g.label} <span className={`font-bold ${ac.text}`}>{tgt[id]}{g.unit}</span>
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── track 단계 ──────────────────────────────────────────────────────────────
  const ac = DIFF_ACCENT[DIFF_META[difficulty]?.accent || 'green'];
  const completedCount = GOAL_IDS.filter(id => (progress[id] || 0) >= (targets[id] ?? 0)).length;

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className={`${ac.bg} border ${ac.border} rounded-xl px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#374151" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                  strokeDasharray={`${(completedCount / GOAL_IDS.length) * 94.2} 94.2`} strokeLinecap="round"
                  style={{ stroke: difficulty === 'easy' ? '#22c55e' : difficulty === 'medium' ? '#eab308' : '#ef4444' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {completedCount}/{GOAL_IDS.length}
              </span>
            </div>
            <div>
              <p className={`text-sm font-bold ${ac.text}`}>
                {DIFF_META[difficulty]?.emoji} {DIFF_META[difficulty]?.label} 도전 중
              </p>
              <p className="text-xs text-gray-500">
                {newMatchCount > 0 ? `목표 시작 후 ${newMatchCount}경기 감지` : `목표 시작 후 신규 경기 없음`} · {date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchProgress(); setShowDelayHint(true); }}
              disabled={refreshing || !nickname}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                refreshing
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {refreshing
                ? <span className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin inline-block" />
                : '↻'}
              {refreshing ? '조회 중' : '전적 반영'}
            </button>
            <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">초기화</button>
          </div>
        </div>
        {(lastRefresh || showDelayHint) && (
          <p className="text-[10px] text-gray-600 mt-1.5 text-right">
            {lastRefresh && `마지막 반영: ${lastRefresh} · `}최대 10~15분 뒤 반영됩니다
          </p>
        )}
      </div>

      {/* 목표 카드들 */}
      {GOAL_IDS.map((id) => {
        const g    = GOAL_META[id];
        const cur  = progress[id] || 0;
        const tgt  = targets[id] ?? 0;
        const pct  = Math.min(100, tgt > 0 ? Math.round((cur / tgt) * 100) : 0);
        const done = cur >= tgt;
        const isCountGoal = id === 'top10' || id === 'win';
        return (
          <div key={id} className={`p-4 rounded-xl border transition-all ${done ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{g.icon}</span>
                <div>
                  <span className="text-sm font-semibold text-gray-200">{g.label}</span>
                  <span className="text-[10px] text-gray-600 ml-1.5">{isCountGoal ? '누적 횟수' : '단판 최고'}</span>
                </div>
                {done && <span className="text-xs text-green-400 font-bold">✓ 달성!</span>}
              </div>
              <span className={`text-sm font-bold ${done ? 'text-green-400' : ac.text}`}>
                {cur}{g.unit} / {tgt}{g.unit}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${done ? 'bg-green-500' : ac.bar}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}

      {!nickname && (
        <p className="text-xs text-gray-600 text-center">대표 계정이 없으면 자동 반영이 되지 않습니다.</p>
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function MyPage() {
  const { data: session, status } = useSession();
  const [userData, setUserData]   = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [nickname, setNickname]   = useState('');
  const [platform, setPlatform]   = useState('steam');
  const [linking, setLinking]     = useState(false);
  const [linkMsg, setLinkMsg]     = useState(null);
  const [settingMain, setSettingMain] = useState(false);
  const [playerStats, setPlayerStats]   = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [clanLeaderLoading, setClanLeaderLoading] = useState(false);
  const [clanLeaderMsg, setClanLeaderMsg] = useState(null);
  const [showLeaderRequestPopup, setShowLeaderRequestPopup] = useState(false);
  const [leaderRequestReason, setLeaderRequestReason] = useState('');
  const [leaderRequestLoading, setLeaderRequestLoading] = useState(false);
  const [leaderRequestMsg, setLeaderRequestMsg] = useState(null);

  useEffect(() => { if (status === 'authenticated') fetchUser(); }, [status]);

  const fetchUser = async () => {
    setLoadingUser(true);
    try {
      const r = await fetch('/api/user/me');
      if (r.ok) { const d = await r.json(); setUserData(d.user); fetchMainStats(d.user); }
    } finally { setLoadingUser(false); }
  };

  const fetchMainStats = async (user) => {
    const main = user?.pubgAccounts?.find((a) => a.id === user.mainAccountId);
    if (!main) return;
    setStatsLoading(true);
    try {
      const r = await fetch(`/api/pubg/search?nickname=${encodeURIComponent(main.nickname)}&shard=${main.platform}`);
      if (r.ok) {
        const d = await r.json();
        const s = d.results?.[0]?.stats;
        if (s) setPlayerStats({ avgDamage: s.avgDamage || 0, avgKills: s.avgKills || 0, winRate: s.winRate || 0 });
      }
    } catch {}
    finally { setStatsLoading(false); }
  };

  const handleLinkPubg = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLinking(true); setLinkMsg(null);
    try {
      const r = await fetch('/api/user/link-pubg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: nickname.trim(), platform }) });
      const d = await r.json();
      if (r.ok) { setLinkMsg({ ok: true, text: `${d.account.nickname} 연동 완료!` }); setNickname(''); fetchUser(); }
      else setLinkMsg({ ok: false, text: d.error });
    } finally { setLinking(false); }
  };

  const handleSetMain = async (accountId) => {
    setSettingMain(true);
    try { await fetch('/api/user/set-main-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }) }); fetchUser(); }
    finally { setSettingMain(false); }
  };

  const handleSetClanLeader = async () => {
    setClanLeaderLoading(true);
    setClanLeaderMsg(null);
    try {
      const r = await fetch('/api/user/set-clan-leader', { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        setClanLeaderMsg({ ok: true, text: `${d.clanName} 클랜 리더로 등록됐습니다.` });
        fetchUser();
      } else {
        setClanLeaderMsg({ ok: false, text: d.error || '등록 실패' });
      }
    } catch {
      setClanLeaderMsg({ ok: false, text: '네트워크 오류' });
    } finally {
      setClanLeaderLoading(false);
    }
  };

  const handleLeaderRequest = async () => {
    if (leaderRequestReason.trim().length < 5) {
      setLeaderRequestMsg({ ok: false, text: '변경 사유를 5자 이상 입력해주세요.' });
      return;
    }
    setLeaderRequestLoading(true);
    setLeaderRequestMsg(null);
    try {
      const r = await fetch('/api/user/request-clan-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: leaderRequestReason }),
      });
      const d = await r.json();
      if (r.ok) {
        setLeaderRequestMsg({ ok: true, text: '변경 요청이 접수됐습니다. 관리자 검토 후 처리됩니다.' });
        setLeaderRequestReason('');
        setTimeout(() => { setShowLeaderRequestPopup(false); setLeaderRequestMsg(null); }, 2500);
      } else {
        setLeaderRequestMsg({ ok: false, text: d.error || '요청 실패' });
      }
    } catch {
      setLeaderRequestMsg({ ok: false, text: '네트워크 오류' });
    } finally {
      setLeaderRequestLoading(false);
    }
  };

  // ── 로딩 ──
  if (status === 'loading') return (
    <Layout>
      <div className="min-h-screen bg-gray-950" style={{ marginTop: '-5rem' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </Layout>
  );

  // ── 미로그인 ──
  if (status === 'unauthenticated') return (
    <Layout>
      <Head><title>마이페이지 — PK.GG</title></Head>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6" style={{ marginTop: '-5rem' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white mb-2">로그인이 필요합니다</h1>
          <p className="text-gray-400 text-sm mb-8">구글 계정으로 로그인하면 PUBG 연동, 일일 목표 등을 이용할 수 있습니다.</p>
          <button onClick={() => signIn('google')}
            className="flex items-center gap-3 mx-auto px-6 py-3 bg-white hover:bg-gray-100 rounded-xl text-gray-800 font-semibold text-sm transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 로그인
          </button>
        </div>
      </div>
    </Layout>
  );

  const user = session.user;
  const mainAccount = userData?.pubgAccounts?.find((a) => a.id === userData?.mainAccountId);

  return (
    <Layout>
      <Head><title>마이페이지 — PK.GG</title></Head>
      <div className="min-h-screen bg-gray-950 text-white" style={{ marginTop: '-5rem' }}>
        <div className="max-w-2xl mx-auto px-4 pt-28 pb-16 space-y-5">

          {/* ── 프로필 ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                <Image src={user.image} alt={user.name || ''} width={64} height={64} className="rounded-full border-2 border-gray-700" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {user.name?.[0] || '?'}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{user.name}</h1>
                <p className="text-sm text-gray-400">{user.email}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-[11px] text-gray-400">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google 로그인
                </span>
              </div>
            </div>
          </div>

          {/* ── PUBG 계정 연동 ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              🎮 <span>PUBG 계정 연동</span>
            </h2>

            {loadingUser ? (
              <div className="h-10 flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" /> 불러오는 중...
              </div>
            ) : userData?.pubgAccounts?.length > 0 ? (
              <div className="space-y-2 mb-5">
                {userData.pubgAccounts.map((acc) => {
                  const isMain = acc.id === userData.mainAccountId;
                  return (
                    <div key={acc.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isMain ? 'border-blue-500/40 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{acc.platform === 'steam' ? '🖥️' : '📱'}</span>
                        <div>
                          <Link href={`/player/${acc.platform}/${acc.nickname}`}
                            className="text-sm font-bold text-gray-100 hover:text-blue-400 transition-colors">
                            {acc.nickname}
                          </Link>
                          <div className="text-xs text-gray-500">{acc.platform === 'steam' ? 'Steam' : 'Kakao'}</div>
                        </div>
                        {isMain && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">대표</span>}
                      </div>
                      {!isMain && (
                        <button onClick={() => handleSetMain(acc.id)} disabled={settingMain}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold disabled:opacity-50 transition-colors">
                          대표 설정
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-5 text-center py-3">연동된 PUBG 계정이 없습니다.</p>
            )}

            {/* 연동 폼 */}
            <form onSubmit={handleLinkPubg} className="space-y-2">
              <div className="flex gap-2">
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-700 rounded-lg text-sm bg-gray-800 text-gray-300 focus:outline-none focus:border-blue-500">
                  <option value="steam">Steam</option>
                  <option value="kakao">Kakao</option>
                </select>
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder="PUBG 닉네임"
                  className="flex-1 px-3 py-2 border border-gray-700 rounded-lg text-sm bg-gray-800 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
                <button type="submit" disabled={linking || !nickname.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
                  {linking ? '확인 중...' : '연동'}
                </button>
              </div>
              {linkMsg && (
                <p className={`text-xs font-medium ${linkMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {linkMsg.ok ? '✅' : '❌'} {linkMsg.text}
                </p>
              )}
            </form>

            {mainAccount && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-600 mb-2">대표 계정 바로가기</p>
                <Link href={`/player/${mainAccount.platform}/${mainAccount.nickname}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-semibold text-gray-300 transition-colors">
                  📊 {mainAccount.nickname} 전적 보기
                </Link>
              </div>
            )}
          </div>

          {/* ── 클랜 정보 ── */}
          {userData?.clan && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">🏰 소속 클랜</span>
                <Link
                  href={`/clan/${encodeURIComponent(userData.clan.name)}`}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  상세보기 →
                </Link>
              </h2>
              <div className="flex items-start gap-4">
                {/* 클랜 아이콘 */}
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                  {userData.clan.pubgClanTag ? userData.clan.pubgClanTag.charAt(0).toUpperCase() : '🏰'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {userData.clan.pubgClanTag && (
                      <span className="text-xs font-bold text-blue-400">[{userData.clan.pubgClanTag}]</span>
                    )}
                    <span className="text-base font-bold text-white">{userData.clan.name}</span>
                    {userData.clan.pubgClanLevel && (
                      <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Lv.{userData.clan.pubgClanLevel}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>👥 {userData.clan.memberCount}명</span>
                    {userData.clan.avgScore > 0 && <span>⚡ 평균 {userData.clan.avgScore} MMR</span>}
                    {userData.clan.region && <span>🌏 {userData.clan.region}</span>}
                  </div>
                  {userData.clan.leader && (
                    <div className="mt-1 text-xs text-gray-500">
                      리더: <span className="text-gray-300">{userData.clan.leader}</span>
                    </div>
                  )}
                  {userData.clan.description && (
                    <p className="mt-2 text-xs text-gray-400 leading-relaxed line-clamp-2">{userData.clan.description}</p>
                  )}
                </div>
              </div>

              {/* 리더 등록 / 변경 문의 버튼 */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  {userData.clan.leader === mainAccount?.nickname
                    ? '✅ 현재 이 클랜의 리더입니다.'
                    : userData.clan.leader
                      ? `현재 리더: ${userData.clan.leader}`
                      : '대표 계정을 이 클랜의 리더로 등록할 수 있습니다.'}
                </div>
                {userData.clan.leader === mainAccount?.nickname ? null
                  : !userData.clan.leader ? (
                    // 리더 미등록 — 첫 등록 버튼
                    <button
                      onClick={handleSetClanLeader}
                      disabled={clanLeaderLoading || !mainAccount}
                      className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      {clanLeaderLoading ? '등록 중...' : '클랜 리더 등록'}
                    </button>
                  ) : (
                    // 이미 다른 리더 존재 — 변경 문의 버튼
                    <button
                      onClick={() => { setShowLeaderRequestPopup(true); setLeaderRequestMsg(null); }}
                      className="flex-shrink-0 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      리더 변경 문의
                    </button>
                  )
                }
              </div>
              {clanLeaderMsg && (
                <p className={`mt-2 text-xs font-medium ${clanLeaderMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {clanLeaderMsg.ok ? '✅' : '❌'} {clanLeaderMsg.text}
                </p>
              )}

              {/* 리더 변경 문의 팝업 */}
              {showLeaderRequestPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                  <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">리더 변경 문의</span>
                      <button onClick={() => setShowLeaderRequestPopup(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
                    </div>

                    {/* 현재 → 변경 표시 */}
                    <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-16 flex-shrink-0">현 리더</span>
                        <span className="text-white font-semibold">{userData.clan.leader}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="w-16"></span>
                        <span>↓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-16 flex-shrink-0">변경 리더</span>
                        <span className="text-blue-400 font-semibold">{mainAccount?.nickname}</span>
                      </div>
                    </div>

                    {/* 사유 입력 */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">변경 사유</label>
                      <textarea
                        value={leaderRequestReason}
                        onChange={(e) => setLeaderRequestReason(e.target.value)}
                        rows={3}
                        placeholder="변경 사유를 입력해주세요..."
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    {leaderRequestMsg && (
                      <p className={`text-xs font-medium ${leaderRequestMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {leaderRequestMsg.ok ? '✅' : '❌'} {leaderRequestMsg.text}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowLeaderRequestPopup(false)}
                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold rounded-xl transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleLeaderRequest}
                        disabled={leaderRequestLoading}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {leaderRequestLoading ? '제출 중...' : '변경 요청'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 커뮤니티 활동 ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
              ✏️ <span>커뮤니티 활동</span>
            </h2>
            <Link
              href="/mypage/posts"
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-sm font-medium text-gray-200">내가 쓴 글 확인하기</p>
                  <p className="text-xs text-gray-500 mt-0.5">커뮤니티 포럼에 작성한 글 목록</p>
                </div>
              </div>
              <span className="text-gray-500 group-hover:text-blue-400 transition-colors">→</span>
            </Link>
          </div>

          {/* ── 일일 목표 ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              📅 <span>일일 목표</span>
              {mainAccount && (
                <span className="text-xs font-normal text-gray-500">
                  {playerStats ? `${mainAccount.nickname} 스탯 기반 자동 추천` : statsLoading ? '스탯 로딩 중...' : `${mainAccount.nickname}`}
                </span>
              )}
            </h2>
            <DailyGoals playerStats={playerStats} statsLoading={statsLoading} nickname={mainAccount?.nickname} shard={mainAccount?.platform} />
          </div>

        </div>
      </div>
    </Layout>
  );
}
