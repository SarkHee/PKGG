import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const TOPIC_LABEL = {
  bug:     '🐛 버그/오류',
  feature: '💡 기능 제안',
  data:    '📊 데이터 오류',
  forum:   '🚨 포럼 신고',
  other:   '📬 기타',
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const googleAuthed = session?.user?.isAdmin === true;

  const [authed,   setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Google 관리자 세션이 있으면 자동 인증
  const isAuthed = googleAuthed || authed;

  const [tab, setTab] = useState('inquiries');

  const [inquiries,   setInquiries]   = useState([]);
  const [inqLoading,  setInqLoading]  = useState(false);
  const [inqExpanded, setInqExpanded] = useState(null);

  const [users,      setUsers]      = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [leaderReqs,      setLeaderReqs]      = useState([]);
  const [leaderReqLoading, setLeaderReqLoading] = useState(false);
  const [leaderReqAction,  setLeaderReqAction]  = useState({});

  // 검색 제한 유저
  const [restricted,       setRestricted]       = useState([]);
  const [restrictedLoading, setRestrictedLoading] = useState(false);
  const [restrictedForm,   setRestrictedForm]   = useState({ nickname: '', type: 'search_restricted', reason: '' });
  const [restrictedAdding, setRestrictedAdding] = useState(false);

  // 배치 실행
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult,  setBatchResult]  = useState(null);

  // 신규 등록 유저
  const [newUsers,        setNewUsers]        = useState([]);
  const [newUsersLoading, setNewUsersLoading] = useState(false);
  const [newUsersDate,    setNewUsersDate]    = useState(() => {
    const kst = new Date(Date.now() + 9 * 3600000);
    return kst.toISOString().split('T')[0];
  });
  const [newUsersTotal,   setNewUsersTotal]   = useState(0);
  const [newUsersPage,    setNewUsersPage]    = useState(1);
  const [seedRunning,     setSeedRunning]     = useState(false);
  const [seedResult,      setSeedResult]      = useState(null);
  const [newUsersStatus,  setNewUsersStatus]  = useState('all'); // all | unset | noSeason | normal | banned
  const [cronLog,         setCronLog]         = useState(null);

  const runSeedUsers = async (type = 'all') => {
    if (seedRunning) return;
    setSeedRunning(true);
    setSeedResult(null);
    try {
      const res = await fetch(`/api/admin/seed-users?type=${type}`, {
        method: 'POST',
        headers: { 'x-admin-token': password || '' },
      });
      const data = await res.json();
      setSeedResult(data);
      // 완료 후 목록 새로고침
      const r2 = await fetch(`/api/admin/new-users?date=${newUsersDate}&page=${newUsersPage}&status=${newUsersStatus}`, { headers: { 'x-admin-token': adminPw() } });
      const d2 = await r2.json();
      setNewUsers(d2.users || []);
      setNewUsersTotal(d2.total || 0);
      setCronLog(d2.cronLog || null);
    } catch (e) {
      setSeedResult({ error: e.message });
    } finally {
      setSeedRunning(false);
    }
  };

  const runBatch = async () => {
    if (batchRunning) return;
    setBatchRunning(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/admin/run-batch', {
        method: 'POST',
        headers: { 'x-admin-token': adminPw() },
      });
      const data = await res.json();
      setBatchResult(data);
    } catch (e) {
      setBatchResult({ error: e.message });
    } finally {
      setBatchRunning(false);
    }
  };

  // 저장된 인증 복원
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed');
    if (saved === 'true') setAuthed(true);
  }, []);

  // 검색 제한 목록 로드
  useEffect(() => {
    if (!isAuthed || tab !== 'restricted') return;
    setRestrictedLoading(true);
    fetch('/api/admin/restricted-players', { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => setRestricted(d.list || []))
      .catch(() => setRestricted([]))
      .finally(() => setRestrictedLoading(false));
  }, [isAuthed, tab]);

  const handleRestrictedAdd = async (e) => {
    e.preventDefault();
    if (!restrictedForm.nickname.trim()) return;
    setRestrictedAdding(true);
    try {
      const res = await fetch('/api/admin/restricted-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminPw() },
        body: JSON.stringify(restrictedForm),
      });
      const d = await res.json();
      if (d.ok) {
        setRestricted((prev) => [d.row, ...prev.filter((r) => r.id !== d.row.id)]);
        setRestrictedForm({ nickname: '', type: 'search_restricted', reason: '' });
      } else {
        alert(d.error || '추가 실패');
      }
    } catch { alert('오류 발생'); }
    finally { setRestrictedAdding(false); }
  };

  const handleRestrictedDelete = async (id) => {
    if (!confirm('제한을 해제하시겠습니까?')) return;
    const res = await fetch('/api/admin/restricted-players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminPw() },
      body: JSON.stringify({ id }),
    });
    if ((await res.json()).ok) setRestricted((prev) => prev.filter((r) => r.id !== id));
  };

  const adminPw = () => sessionStorage.getItem('admin_pw') || '';

  // 문의 목록 로드
  useEffect(() => {
    if (!isAuthed || tab !== 'inquiries') return;
    setInqLoading(true);
    fetch('/api/admin/inquiries', { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => setInquiries(d.inquiries || []))
      .catch(() => setInquiries([]))
      .finally(() => setInqLoading(false));
  }, [isAuthed, tab]);

  // 리더 변경 요청 목록 로드
  useEffect(() => {
    if (!isAuthed || tab !== 'leaderRequests') return;
    setLeaderReqLoading(true);
    fetch('/api/admin/clan-leader-requests', { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => setLeaderReqs(d.requests || []))
      .catch(() => setLeaderReqs([]))
      .finally(() => setLeaderReqLoading(false));
  }, [isAuthed, tab]);

  // 구글 유저 목록 로드
  useEffect(() => {
    if (!isAuthed || tab !== 'users') return;
    setUsersLoading(true);
    fetch('/api/admin/users', { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [isAuthed, tab]);

  // 신규 등록 유저 로드
  useEffect(() => {
    if (!isAuthed || tab !== 'newUsers') return;
    setNewUsersLoading(true);
    fetch(`/api/admin/new-users?date=${newUsersDate}&page=${newUsersPage}&status=${newUsersStatus}`, { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => { setNewUsers(d.users || []); setNewUsersTotal(d.total || 0); setCronLog(d.cronLog || null); })
      .catch(() => setNewUsers([]))
      .finally(() => setNewUsersLoading(false));
  }, [isAuthed, tab, newUsersDate, newUsersPage, newUsersStatus]);

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

  const handleLeaderReqAction = async (id, action) => {
    setLeaderReqAction((p) => ({ ...p, [id]: 'loading' }));
    try {
      const res = await fetch('/api/admin/clan-leader-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminPw() },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setLeaderReqs((prev) => prev.map((r) => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
        setLeaderReqAction((p) => ({ ...p, [id]: 'done' }));
      }
    } catch {
      setLeaderReqAction((p) => ({ ...p, [id]: null }));
    }
  };

  // ── 로딩 중 ──────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">확인 중...</div>
      </div>
    );
  }

  // ── 비밀번호 화면 (Google 관리자 아닐 때) ──────────────────────
  if (!isAuthed) {
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
            {googleAuthed && (
              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-lg">
                {session.user.email}
              </span>
            )}
            <Link href="/" className="text-sm text-gray-400 hover:text-white">← 메인</Link>
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

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* 탭 */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { key: 'inquiries',      label: '📬 문의함' },
              { key: 'leaderRequests', label: '👑 리더 변경 요청' },
              { key: 'users',          label: '👤 구글 로그인 유저' },
              { key: 'restricted',     label: '🚫 검색 제한' },
              { key: 'batch',          label: '⚙️ 배치 실행' },
              { key: 'newUsers',       label: '🆕 신규 유저' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 문의함 탭 */}
          {tab === 'inquiries' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-bold">문의함</h1>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  총 {inquiries.length}건
                </span>
              </div>

              {inqLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : inquiries.length === 0 ? (
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center text-gray-500">
                  접수된 문의가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {inquiries.map((inq) => (
                    <div key={inq.id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setInqExpanded(inqExpanded === inq.id ? null : inq.id)}
                        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-800 transition-colors"
                      >
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 flex-shrink-0">
                          {TOPIC_LABEL[inq.topic] || inq.topic}
                        </span>
                        <span className="text-sm text-white flex-1 truncate">{inq.message}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(inq.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">{inqExpanded === inq.id ? '▲' : '▼'}</span>
                      </button>

                      {inqExpanded === inq.id && (
                        <div className="px-5 pb-5 border-t border-gray-700 pt-4 space-y-3">
                          <div className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed bg-gray-800 rounded-lg p-4">
                            {inq.message}
                          </div>
                          {inq.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">답변 이메일:</span>
                              <a href={`mailto:${inq.email}`} className="text-blue-400 hover:underline">
                                {inq.email}
                              </a>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            접수: {new Date(inq.createdAt).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 리더 변경 요청 탭 */}
          {tab === 'leaderRequests' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-bold">클랜 리더 변경 요청</h1>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  총 {leaderReqs.filter((r) => r.status === 'pending').length}건 대기 중
                </span>
              </div>

              {leaderReqLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : leaderReqs.length === 0 ? (
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center text-gray-500">
                  접수된 요청이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderReqs.map((req) => (
                    <div key={req.id} className={`bg-gray-900 border rounded-xl px-5 py-4 ${
                      req.status === 'pending' ? 'border-gray-700' :
                      req.status === 'approved' ? 'border-green-800/50' : 'border-red-900/50'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* 클랜 + 리더 변경 표시 */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{req.clanName}</span>
                            <span className="text-sm text-gray-400">{req.currentLeader}</span>
                            <span className="text-gray-600">→</span>
                            <span className="text-sm text-blue-400 font-semibold">{req.requestNickname}</span>
                          </div>
                          {/* 사유 */}
                          <p className="text-xs text-gray-400 leading-relaxed">{req.reason}</p>
                          <p className="text-[10px] text-gray-600 mt-1.5">
                            {new Date(req.createdAt).toLocaleString('ko-KR')}
                          </p>
                        </div>

                        {/* 상태 / 버튼 */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {req.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleLeaderReqAction(req.id, 'approve')}
                                disabled={leaderReqAction[req.id] === 'loading'}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                승인
                              </button>
                              <button
                                onClick={() => handleLeaderReqAction(req.id, 'reject')}
                                disabled={leaderReqAction[req.id] === 'loading'}
                                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                거절
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              req.status === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                            }`}>
                              {req.status === 'approved' ? '✓ 승인됨' : '✕ 거절됨'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 구글 유저 탭 */}
          {tab === 'users' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-bold">구글 로그인 유저</h1>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  총 {users.length}명
                </span>
              </div>

              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : users.length === 0 ? (
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center text-gray-500">
                  구글 로그인 유저가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-3 flex items-center gap-4">
                      {u.image && (
                        <img src={u.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{u.name || '이름 없음'}</div>
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {u.pubgAccounts?.length > 0 ? (
                          <div className="text-xs text-blue-400">
                            {u.pubgAccounts.map((a) => a.nickname).join(', ')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">PUBG 미연결</div>
                        )}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                            : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* 검색 제한 탭 */}
          {tab === 'restricted' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-bold">검색 제한 유저</h1>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">총 {restricted.length}명</span>
              </div>

              {/* 추가 폼 */}
              <form onSubmit={handleRestrictedAdd} className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gray-400 mb-1">닉네임</label>
                  <input
                    value={restrictedForm.nickname}
                    onChange={(e) => setRestrictedForm((p) => ({ ...p, nickname: e.target.value }))}
                    placeholder="정확한 닉네임 입력"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                    required
                  />
                </div>
                <div className="min-w-[160px]">
                  <label className="block text-xs text-gray-400 mb-1">타입</label>
                  <select
                    value={restrictedForm.type}
                    onChange={(e) => setRestrictedForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="search_restricted">🔍 검색 제한</option>
                    <option value="banned">🚫 정지 (검색 차단)</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs text-gray-400 mb-1">사유 (선택)</label>
                  <input
                    value={restrictedForm.reason}
                    onChange={(e) => setRestrictedForm((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="비공개 요청, 신고 등"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={restrictedAdding}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-semibold text-white"
                >
                  {restrictedAdding ? '추가 중...' : '+ 추가'}
                </button>
              </form>

              {/* 목록 */}
              {restrictedLoading ? (
                <div className="text-gray-500 text-sm">불러오는 중...</div>
              ) : restricted.length === 0 ? (
                <div className="text-gray-500 text-sm">등록된 제한 유저 없음</div>
              ) : (
                <div className="space-y-2">
                  {restricted.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.type === 'banned'
                            ? 'bg-red-900/50 text-red-400 border border-red-800'
                            : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                        }`}>
                          {r.type === 'banned' ? '🚫 정지' : '🔍 검색 제한'}
                        </span>
                        <span className="font-mono text-white text-sm">{r.nickname}</span>
                        {r.reason && <span className="text-xs text-gray-500">{r.reason}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600">
                          {r.createdBy && <span>{r.createdBy} · </span>}
                          {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                        <button
                          onClick={() => handleRestrictedDelete(r.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-800/50 hover:border-red-700"
                        >
                          해제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 배치 실행 탭 */}
          {tab === 'batch' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-xl font-bold">⚙️ 배치 실행</h1>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
                <h2 className="text-sm font-bold text-white mb-1">텔레메트리 배치</h2>
                <p className="text-xs text-gray-500 mb-4">
                  유저 스탯 갱신 · 팀원 자동 등록 · 신규 유저 스탯 채우기<br />
                  매일 새벽 2시 자동 실행 / 여기서 수동 실행 가능 (소요 약 2~3분)
                </p>
                <button
                  onClick={runBatch}
                  disabled={batchRunning}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    batchRunning
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {batchRunning ? '⏳ 실행 중...' : '▶ 지금 실행'}
                </button>
              </div>

              {batchResult && (
                <div className={`rounded-xl border p-6 ${batchResult.error ? 'border-red-700 bg-red-900/20' : 'border-green-700 bg-green-900/20'}`}>
                  {batchResult.error ? (
                    <p className="text-red-400 text-sm">❌ 오류: {batchResult.error}</p>
                  ) : (
                    <>
                      <p className="text-green-400 font-bold mb-4">✅ 완료 ({batchResult.elapsedSec}초)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: '대상 유저',     value: batchResult.total },
                          { label: '처리 유저',     value: batchResult.usersProcessed },
                          { label: '분석 경기',     value: batchResult.analyzed },
                          { label: '스킵',          value: batchResult.skipped },
                          { label: '팀원 신규 등록', value: batchResult.teammateSaved },
                          { label: '신규 스탯 채움', value: batchResult.seedUpdated },
                          { label: '클랜 자동 등록', value: batchResult.clanAutoRegistered },
                          { label: '정지 감지',     value: batchResult.bannedDetected },
                          { label: '타임아웃',      value: batchResult.timedOut ? '⚠️ 예' : '없음' },
                        ].map((item) => (
                          <div key={item.label} className="bg-gray-800 rounded-lg px-4 py-3">
                            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                            <div className="text-lg font-bold text-white">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 신규 등록 유저 탭 */}
          {tab === 'newUsers' && (
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h1 className="text-xl font-bold">🆕 신규 등록 유저</h1>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">총 {newUsersTotal}명</span>
              </div>

              {/* 날짜 칩 필터 (오늘 포함 최근 14일) */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(Date.now() + 9 * 3600000);
                  d.setUTCDate(d.getUTCDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  const label = i === 0 ? '오늘' : `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => { setNewUsersDate(dateStr); setNewUsersPage(1); }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        newUsersDate === dateStr ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* 상태 필터 + 필터별 액션 버튼 */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {[
                  { key: 'all',      label: '전체' },
                  { key: 'unset',    label: '미초기화' },
                  { key: 'noSeason', label: '시즌없음' },
                  { key: 'normal',   label: '정상' },
                  { key: 'banned',   label: '정지' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setNewUsersStatus(key); setNewUsersPage(1); }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      newUsersStatus === key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  {newUsersStatus === 'unset' && (
                    <button
                      onClick={() => runSeedUsers('unset')}
                      disabled={seedRunning}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        seedRunning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white'
                      }`}
                    >
                      {seedRunning ? '⏳ 처리 중...' : '🔄 스탯 채우기'}
                    </button>
                  )}
                  {newUsersStatus === 'noSeason' && (
                    <button
                      onClick={() => runSeedUsers('noSeason')}
                      disabled={seedRunning}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        seedRunning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {seedRunning ? '⏳ 처리 중...' : '🔍 플랫폼 재확인 + 재시도'}
                    </button>
                  )}
                  {newUsersStatus === 'all' && (
                    <button
                      onClick={() => runSeedUsers('all')}
                      disabled={seedRunning}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        seedRunning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white'
                      }`}
                    >
                      {seedRunning ? '⏳ 처리 중...' : '🔄 미초기화 스탯 채우기'}
                    </button>
                  )}
                </div>
              </div>

              {/* 텔레메트리 배치 로그 */}
              {cronLog ? (
                <div className={`rounded-xl border px-4 py-2.5 mb-3 text-xs flex items-center gap-3 ${
                  cronLog.status === 'success' ? 'border-green-800 bg-green-900/10 text-green-400'
                  : cronLog.status === 'partial' ? 'border-yellow-800 bg-yellow-900/10 text-yellow-400'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400'
                }`}>
                  <span className="font-bold">🤖 새벽 2시 텔레메트리</span>
                  <span>{cronLog.status === 'success' ? '✅ 완료' : cronLog.status === 'partial' ? '⚠️ 부분완료' : '❌ 실패'}</span>
                  {(() => {
                    try {
                      const d = JSON.parse(cronLog.details || '{}');
                      return (
                        <span className="text-gray-400">
                          경기분석 {d.analyzed ?? 0}건 · 스탯채움 {d.seedUpdated ?? 0}명 · 팀원등록 {d.teammateSaved ?? 0}명
                          {d.shardFixed > 0 && ` · 플랫폼수정 ${d.shardFixed}명`}
                        </span>
                      );
                    } catch { return null; }
                  })()}
                  <span className="ml-auto text-gray-600">
                    {new Date(cronLog.updateTime).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-800 px-4 py-2 mb-3 text-xs text-gray-600">
                  🤖 이 날짜의 텔레메트리 실행 기록 없음
                </div>
              )}

              {seedResult && (
                <div className={`rounded-xl border px-4 py-3 mb-4 text-sm ${seedResult.error ? 'border-red-700 bg-red-900/20 text-red-400' : 'border-green-700 bg-green-900/20 text-green-400'}`}>
                  {seedResult.error
                    ? `❌ 오류: ${seedResult.error}`
                    : <>
                        <div>{`✅ 완료 — 대상 ${seedResult.total}명 중 ${seedResult.updated}명 스탯 채움 (${seedResult.elapsedSec}초)`}</div>
                        {seedResult.shardFixed > 0 && <div className="mt-1 text-xs text-blue-400">· 플랫폼 오류 자동 수정: {seedResult.shardFixed}명 (Steam↔카카오)</div>}
                        {seedResult.skipped > 0 && (
                          <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                            {seedResult.skipNoRounds > 0 && <div>· 이번 시즌 플레이 없음: {seedResult.skipNoRounds}명</div>}
                            {seedResult.skipApi > 0 && <div>· API 오류 (HTTP {seedResult.sampleApiStatus}): {seedResult.skipApi}명</div>}
                            {seedResult.skipErr > 0 && <div>· 예외: {seedResult.skipErr}명 {seedResult.sampleException ? `(${seedResult.sampleException})` : ''}</div>}
                          </div>
                        )}
                      </>
                  }
                </div>
              )}

              {newUsersLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : newUsers.length === 0 ? (
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center text-gray-500">
                  해당 기간 신규 등록 유저가 없습니다.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-800">
                          <th className="text-left py-2 px-3">닉네임</th>
                          <th className="text-left py-2 px-3">플랫폼</th>
                          <th className="text-left py-2 px-3">클랜</th>
                          <th className="text-right py-2 px-3">평균딜</th>
                          <th className="text-right py-2 px-3">판수</th>
                          <th className="text-right py-2 px-3">PK점수</th>
                          <th className="text-right py-2 px-3">등록일</th>
                          <th className="text-center py-2 px-3">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {newUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="py-2 px-3 font-medium text-white">{u.nickname}</td>
                            <td className="py-2 px-3 text-gray-400 text-xs">{u.pubgShardId === 'kakao' ? '카카오' : 'Steam'}</td>
                            <td className="py-2 px-3 text-xs">
                              {u.clan
                                ? <span className="text-purple-400">{u.clan.pubgClanTag ? `[${u.clan.pubgClanTag}] ` : ''}{u.clan.name}</span>
                                : <span className="text-gray-700">-</span>
                              }
                            </td>
                            <td className="py-2 px-3 text-right text-gray-300">
                              {u.avgDamage > 0 ? Math.round(u.avgDamage) : u.avgDamage === -1 ? <span className="text-yellow-600 text-xs">시즌없음</span> : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-400">{u.roundsPlayed || 0}</td>
                            <td className="py-2 px-3 text-right text-yellow-400 font-bold">{u.score > 0 ? u.score.toLocaleString() : '-'}</td>
                            <td className="py-2 px-3 text-right text-gray-500 text-xs">
                              {new Date(u.lastUpdated).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {u.isBanned
                                ? <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">정지</span>
                                : u.avgDamage === -1
                                  ? <span className="text-xs text-yellow-500 bg-yellow-900/20 px-2 py-0.5 rounded-full">시즌없음</span>
                                  : u.avgDamage === 0
                                    ? <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">미초기화</span>
                                    : <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">정상</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 페이지네이션 */}
                  {newUsersTotal > 50 && (
                    <div className="flex gap-2 justify-center mt-4">
                      <button
                        onClick={() => setNewUsersPage((p) => Math.max(1, p - 1))}
                        disabled={newUsersPage === 1}
                        className="px-4 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40"
                      >
                        이전
                      </button>
                      <span className="px-4 py-1.5 text-sm text-gray-400">
                        {newUsersPage} / {Math.ceil(newUsersTotal / 50)}
                      </span>
                      <button
                        onClick={() => setNewUsersPage((p) => p + 1)}
                        disabled={newUsersPage >= Math.ceil(newUsersTotal / 50)}
                        className="px-4 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
