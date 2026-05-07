import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const TOPIC_LABEL = {
  bug:     '🐛 버그/오류',
  feature: '💡 기능 제안',
  data:    '📊 데이터 오류',
  forum:   '🚨 포럼 신고',
  other:   '📬 기타',
};

export default function AdminDashboard() {
  const [authed,   setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState('inquiries'); // 'inquiries' | 'users'

  const [inquiries,   setInquiries]   = useState([]);
  const [inqLoading,  setInqLoading]  = useState(false);
  const [inqExpanded, setInqExpanded] = useState(null);

  const [users,      setUsers]      = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // 저장된 인증 복원
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed');
    if (saved === 'true') setAuthed(true);
  }, []);

  const adminPw = () => sessionStorage.getItem('admin_pw') || '';

  // 문의 목록 로드
  useEffect(() => {
    if (!authed || tab !== 'inquiries') return;
    setInqLoading(true);
    fetch('/api/admin/inquiries', { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => setInquiries(d.inquiries || []))
      .catch(() => setInquiries([]))
      .finally(() => setInqLoading(false));
  }, [authed, tab]);

  // 구글 유저 목록 로드
  useEffect(() => {
    if (!authed || tab !== 'users') return;
    setUsersLoading(true);
    fetch('/api/admin/users', { headers: { 'x-admin-token': adminPw() } })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [authed, tab]);

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

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'inquiries', label: '📬 문의함' },
              { key: 'users',     label: '👤 구글 로그인 유저' },
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
        </div>
      </div>
    </>
  );
}
