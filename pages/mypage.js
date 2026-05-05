// pages/mypage.js — 마이페이지 (프로필 + PUBG 연동 + 일일 목표)
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Layout from '../components/layout/Layout';

// ── 일일 목표 ────────────────────────────────────────────────────────────────
const PRESET_GOALS = [
  { id: 'kd',       icon: '💀', label: 'K/D 비율',      unit: '',    target: 2.0,  step: 0.1, min: 0.5, max: 10,   type: 'float' },
  { id: 'damage',   icon: '💥', label: '평균 데미지',    unit: '',    target: 400,  step: 10,  min: 100, max: 2000,  type: 'int' },
  { id: 'kills',    icon: '🔫', label: '킬 수',          unit: '킬',  target: 5,    step: 1,   min: 1,   max: 50,    type: 'int' },
  { id: 'top10',    icon: '🏅', label: 'Top10 진입',    unit: '회',  target: 3,    step: 1,   min: 1,   max: 20,    type: 'int' },
  { id: 'win',      icon: '🏆', label: '치킨 먹기',     unit: '회',  target: 1,    step: 1,   min: 1,   max: 5,     type: 'int' },
  { id: 'headshot', icon: '🎯', label: '헤드샷 비율',   unit: '%',   target: 20,   step: 5,   min: 5,   max: 80,    type: 'int' },
  { id: 'survive',  icon: '⏱️', label: '평균 생존시간',  unit: '분', target: 15,   step: 1,   min: 5,   max: 40,    type: 'int' },
  { id: 'games',    icon: '🎮', label: '게임 수',        unit: '판',  target: 10,   step: 1,   min: 1,   max: 50,    type: 'int' },
];
const GOAL_KEY = 'pkgg_daily_goals';
const today = () => new Date().toISOString().slice(0, 10);

function recommendGoals(stats) {
  if (!stats) return null;
  return [
    { id: 'damage', target: Math.round(((stats.avgDamage || 300) * 1.1) / 10) * 10 },
    { id: 'kills',  target: Math.max(1, Math.round((stats.avgKills || 2) * 1.2)) },
    { id: 'win',    target: (stats.winRate || 0) > 5 ? 2 : 1 },
  ];
}

function DailyGoals({ playerStats }) {
  const [phase, setPhase]               = useState('loading');
  const [date]                          = useState(today());
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [targets, setTargets]           = useState({});
  const [progress, setProgress]         = useState({});
  const [inputVal, setInputVal]         = useState({});

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(GOAL_KEY) || 'null');
      if (data?.date === date && data?.phase) {
        setSelectedGoals(data.selectedGoals || []);
        setTargets(data.targets || {});
        setProgress(data.progress || {});
        setInputVal(data.progress || {});
        setPhase(data.phase);
      } else {
        setPhase('setup');
      }
    } catch { setPhase('setup'); }
  }, [date]);

  const save = (ph, sel, tgt, prog) =>
    localStorage.setItem(GOAL_KEY, JSON.stringify({ date, phase: ph, selectedGoals: sel, targets: tgt, progress: prog }));

  const toggleGoal = (id) =>
    setSelectedGoals((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const startTracking = () => {
    if (!selectedGoals.length) return;
    const init = Object.fromEntries(selectedGoals.map((id) => [id, 0]));
    setProgress(init); setInputVal(init); setPhase('track');
    save('track', selectedGoals, targets, init);
  };

  const updateProgress = (id, val) => {
    const next = { ...progress, [id]: val };
    setProgress(next); setInputVal(next);
    save('track', selectedGoals, targets, next);
    const allDone = selectedGoals.every((sid) => {
      const g = PRESET_GOALS.find((p) => p.id === sid);
      return (sid === id ? val : next[sid] || 0) >= (targets[sid] ?? g?.target ?? 0);
    });
    if (allDone && selectedGoals.length) { setPhase('done'); save('done', selectedGoals, targets, next); }
  };

  const reset = () => {
    localStorage.removeItem(GOAL_KEY);
    setPhase('setup'); setSelectedGoals([]); setTargets({}); setProgress({}); setInputVal({});
  };

  const recommended = recommendGoals(playerStats);

  if (phase === 'loading') return (
    <div className="h-24 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (phase === 'done') return (
    <div className="text-center py-10">
      <div className="text-5xl mb-3">🎉</div>
      <p className="text-xl font-bold text-white mb-1">오늘의 목표 달성!</p>
      <p className="text-sm text-gray-400 mb-5">수고하셨습니다. 내일도 화이팅!</p>
      <button onClick={reset} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">초기화</button>
    </div>
  );

  if (phase === 'setup') return (
    <div className="space-y-4">
      {recommended && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-400 mb-2">📊 내 PUBG 스탯 기반 추천 목표</p>
          <div className="flex flex-wrap gap-2">
            {recommended.map((r) => {
              const g = PRESET_GOALS.find((p) => p.id === r.id);
              return (
                <button key={r.id}
                  onClick={() => { setSelectedGoals((prev) => prev.includes(r.id) ? prev : [...prev, r.id]); setTargets((t) => ({ ...t, [r.id]: r.target })); }}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold transition-colors"
                >
                  {g?.icon} {g?.label} {r.target}{g?.unit} 추가
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PRESET_GOALS.map((g) => {
          const sel = selectedGoals.includes(g.id);
          return (
            <button key={g.id} onClick={() => toggleGoal(g.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                sel ? 'border-blue-500/60 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="text-xl mb-1">{g.icon}</div>
              <div className="text-xs font-semibold text-gray-300">{g.label}</div>
              {sel && (
                <div className="mt-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setTargets((t) => ({ ...t, [g.id]: Math.max(g.min, (t[g.id] ?? g.target) - g.step) }))}
                    className="w-5 h-5 rounded bg-gray-700 text-gray-300 text-xs flex items-center justify-center hover:bg-gray-600">−</button>
                  <span className="text-xs font-bold text-blue-400 min-w-[2rem] text-center">
                    {g.type === 'float' ? (targets[g.id] ?? g.target).toFixed(1) : (targets[g.id] ?? g.target)}{g.unit}
                  </span>
                  <button onClick={() => setTargets((t) => ({ ...t, [g.id]: Math.min(g.max, (t[g.id] ?? g.target) + g.step) }))}
                    className="w-5 h-5 rounded bg-gray-700 text-gray-300 text-xs flex items-center justify-center hover:bg-gray-600">+</button>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selectedGoals.length > 0 && (
        <button onClick={startTracking} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">
          목표 {selectedGoals.length}개 설정 → 트래킹 시작
        </button>
      )}
    </div>
  );

  // track 단계
  const completedCount = selectedGoals.filter((id) => {
    const g = PRESET_GOALS.find((p) => p.id === id);
    return (progress[id] || 0) >= (targets[id] ?? g?.target ?? 0);
  }).length;

  return (
    <div className="space-y-3">
      {/* 전체 진행 */}
      <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#374151" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#3B82F6" strokeWidth="3"
                strokeDasharray={`${(completedCount / selectedGoals.length) * 94.2} 94.2`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {completedCount}/{selectedGoals.length}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {completedCount === selectedGoals.length ? '🎉 모든 목표 달성!' : `${selectedGoals.length - completedCount}개 남음`}
            </p>
            <p className="text-xs text-gray-500">{date}</p>
          </div>
        </div>
        <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">초기화</button>
      </div>

      {selectedGoals.map((id) => {
        const g   = PRESET_GOALS.find((p) => p.id === id);
        if (!g) return null;
        const cur  = progress[id] || 0;
        const tgt  = targets[id] ?? g.target;
        const pct  = Math.min(100, Math.round((cur / tgt) * 100));
        const done = cur >= tgt;
        return (
          <div key={id} className={`p-4 rounded-xl border transition-all ${done ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{g.icon}</span>
                <span className="text-sm font-semibold text-gray-200">{g.label}</span>
                {done && <span className="text-xs text-green-400 font-bold">✓ 달성!</span>}
              </div>
              <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-blue-400'}`}>
                {g.type === 'float' ? cur.toFixed(1) : cur}{g.unit} / {g.type === 'float' ? tgt.toFixed(1) : tgt}{g.unit}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
              <div className={`h-1.5 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateProgress(id, Math.max(0, cur - g.step))}
                className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold transition-colors">−</button>
              <input type="number" value={inputVal[id] ?? cur}
                onChange={(e) => setInputVal((v) => ({ ...v, [id]: e.target.value }))}
                onBlur={(e) => updateProgress(id, Math.max(0, g.type === 'float' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0))}
                className="flex-1 text-center text-sm font-bold border border-gray-600 rounded-lg py-1 bg-gray-900 text-white focus:outline-none focus:border-blue-500"
              />
              <button onClick={() => updateProgress(id, cur + g.step)}
                className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold transition-colors">+</button>
            </div>
          </div>
        );
      })}
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
  const [playerStats, setPlayerStats] = useState(null);

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
    try {
      const r = await fetch(`/api/pubg/search?nickname=${encodeURIComponent(main.nickname)}&shard=${main.platform}`);
      if (r.ok) { const d = await r.json(); if (d.player) setPlayerStats({ avgDamage: d.player.avgDamage, avgKills: d.player.avgKills, winRate: d.player.winRate }); }
    } catch {}
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

          {/* ── 일일 목표 ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              📅 <span>일일 목표</span>
              {mainAccount && playerStats && (
                <span className="text-xs font-normal text-gray-500">({mainAccount.nickname} 기준 추천)</span>
              )}
            </h2>
            <DailyGoals playerStats={playerStats} />
          </div>

        </div>
      </div>
    </Layout>
  );
}
