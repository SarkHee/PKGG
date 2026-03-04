import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const COOLDOWN_MS = 10 * 60 * 1000; // 10분

function getCooldownLeft(clanName) {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(`clan_refresh_${clanName}`);
  if (!saved) return 0;
  const elapsed = Date.now() - Number(saved);
  return Math.max(0, COOLDOWN_MS - elapsed);
}

function setCooldown(clanName) {
  localStorage.setItem(`clan_refresh_${clanName}`, String(Date.now()));
}

function formatMs(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [clans, setClans] = useState([]);
  const [clansLoading, setClansLoading] = useState(false);

  // 갱신 상태: { [clanName]: { loading, result, cooldownLeft } }
  const [refreshState, setRefreshState] = useState({});

  // 저장된 인증 복원
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed');
    if (saved === 'true') setAuthed(true);
  }, []);

  // 클랜 목록 로드
  useEffect(() => {
    if (!authed) return;
    setClansLoading(true);
    fetch('/api/clan')
      .then((r) => r.json())
      .then((data) => {
        const list = data.clans || [];
        setClans(list);

        // 쿨타임 초기화
        const initial = {};
        list.forEach((c) => {
          initial[c.name] = { loading: false, result: null, cooldownLeft: getCooldownLeft(c.name) };
        });
        setRefreshState(initial);
      })
      .catch(() => setClans([]))
      .finally(() => setClansLoading(false));
  }, [authed]);

  // 쿨타임 카운트다운
  useEffect(() => {
    if (!authed) return;
    const timer = setInterval(() => {
      setRefreshState((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const name of Object.keys(next)) {
          const left = getCooldownLeft(name);
          if (next[name].cooldownLeft !== left) {
            next[name] = { ...next[name], cooldownLeft: left };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authed]);

  // 로그인
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem('admin_authed', 'true');
        sessionStorage.setItem('admin_pw', password);
        setAuthed(true);
      } else {
        setAuthError(data.error || '비밀번호가 틀렸습니다.');
      }
    } catch {
      setAuthError('서버 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 클랜 갱신
  const handleRefresh = useCallback(async (clan) => {
    const adminPw = sessionStorage.getItem('admin_pw');
    const memberNames = (clan.members || []).map((m) => m.nickname).filter(Boolean);

    if (memberNames.length === 0) {
      setRefreshState((p) => ({ ...p, [clan.name]: { ...p[clan.name], result: { error: '멤버 없음' } } }));
      return;
    }

    setRefreshState((p) => ({ ...p, [clan.name]: { ...p[clan.name], loading: true, result: null } }));

    try {
      const res = await fetch('/api/clan/batch-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminPw,
        },
        body: JSON.stringify({ clanName: clan.name, memberNames, shard: 'steam' }),
      });
      const data = await res.json();

      if (res.ok) {
        setCooldown(clan.name);
        setRefreshState((p) => ({
          ...p,
          [clan.name]: {
            loading: false,
            result: { ok: true, updated: data.results?.updated, errors: data.results?.errors },
            cooldownLeft: COOLDOWN_MS,
          },
        }));
      } else {
        setRefreshState((p) => ({
          ...p,
          [clan.name]: { ...p[clan.name], loading: false, result: { error: data.error || '오류' } },
        }));
      }
    } catch {
      setRefreshState((p) => ({
        ...p,
        [clan.name]: { ...p[clan.name], loading: false, result: { error: '네트워크 오류' } },
      }));
    }
  }, []);

  // ── 비밀번호 화면 ─────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Head>
          <title>관리자 로그인 | PKGG</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <form onSubmit={handleLogin} className="bg-gray-900 rounded-2xl border border-gray-700 p-8 w-full max-w-sm space-y-5">
            <div className="text-center">
              <div className="text-2xl font-black text-white">PKGG</div>
              <div className="text-sm text-gray-400 mt-1">관리자 전용</div>
            </div>
            <div>
              <input
                type="password"
                placeholder="관리자 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs mt-2">{authError}</p>}
            </div>
            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              {authLoading ? '확인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </>
    );
  }

  // ── 관리자 대시보드 ───────────────────────────────────────────
  return (
    <>
      <Head>
        <title>관리자 대시보드 | PKGG</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-950 text-white">
        {/* 헤더 */}
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="font-black text-lg">PKGG 관리자</span>
            <span className="ml-3 text-xs text-gray-500">대시보드</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/notices" className="text-sm text-gray-400 hover:text-white">공지 관리</Link>
            <Link href="/admin/moderation" className="text-sm text-gray-400 hover:text-white">모더레이션</Link>
            <button
              onClick={() => { sessionStorage.clear(); setAuthed(false); }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              로그아웃
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 클랜 갱신 섹션 */}
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-xl font-bold">클랜 데이터 갱신</h1>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">클랜당 쿨타임 10분</span>
          </div>

          {clansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : clans.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center text-gray-500">
              등록된 클랜이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {clans.map((clan) => {
                const state = refreshState[clan.name] || {};
                const onCooldown = state.cooldownLeft > 0;
                const memberCount = (clan.members || []).length;

                return (
                  <div
                    key={clan.name}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 flex items-center gap-4"
                  >
                    {/* 클랜 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{clan.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">멤버 {memberCount}명</div>
                    </div>

                    {/* 결과 표시 */}
                    <div className="text-xs text-right min-w-[100px]">
                      {state.result?.ok && (
                        <span className="text-emerald-400">
                          ✓ {state.result.updated}명 갱신
                          {state.result.errors > 0 && (
                            <span className="text-red-400 ml-1">/ {state.result.errors}실패</span>
                          )}
                        </span>
                      )}
                      {state.result?.error && (
                        <span className="text-red-400">{state.result.error}</span>
                      )}
                      {onCooldown && !state.loading && (
                        <span className="text-gray-500">{formatMs(state.cooldownLeft)}</span>
                      )}
                    </div>

                    {/* 갱신 버튼 */}
                    <button
                      onClick={() => handleRefresh(clan)}
                      disabled={state.loading || onCooldown}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                        state.loading
                          ? 'bg-gray-700 text-gray-400 cursor-wait'
                          : onCooldown
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {state.loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                          갱신 중
                        </span>
                      ) : onCooldown ? (
                        '쿨타임'
                      ) : (
                        '갱신'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
