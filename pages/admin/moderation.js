import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';

export default function ModerationPanel() {
  const [bannedUsers, setBannedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('banned-users');
  const [manualBanForm, setManualBanForm] = useState({
    username: '',
    banDuration: 24,
    reason: ''
  });

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  const fetchBannedUsers = async () => {
    try {
      const response = await fetch('/api/forum/moderation?action=banned-users');
      const data = await response.json();
      
      if (response.ok) {
        setBannedUsers(data.users || []);
      } else {
        console.error('Failed to fetch banned users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching banned users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (username) => {
    if (!confirm(`${username} 사용자의 제재를 해제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/forum/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'unban',
          username: username
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('제재가 해제되었습니다.');
        fetchBannedUsers(); // 목록 새로고침
      } else {
        alert(`제재 해제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('제재 해제 중 오류가 발생했습니다.');
    }
  };

  const handleManualBan = async (e) => {
    e.preventDefault();

    if (!manualBanForm.username || !manualBanForm.reason) {
      alert('사용자명과 제재 사유를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/forum/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'manual-ban',
          username: manualBanForm.username,
          banDuration: manualBanForm.banDuration,
          reason: manualBanForm.reason
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('사용자가 제재되었습니다.');
        setManualBanForm({ username: '', banDuration: 24, reason: '' });
        fetchBannedUsers(); // 목록 새로고침
      } else {
        alert(`제재 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('제재 중 오류가 발생했습니다.');
    }
  };

  const checkUserBan = async () => {
    const username = prompt('확인할 사용자명을 입력하세요:');
    if (!username) return;

    try {
      const response = await fetch(`/api/forum/moderation?action=check-ban&username=${encodeURIComponent(username)}`);
      const data = await response.json();

      if (response.ok) {
        if (data.banned) {
          alert(`${username}은(는) 제재된 사용자입니다.\n사유: ${data.banInfo.reason}\n제재 해제: ${new Date(data.banInfo.banUntil).toLocaleString('ko-KR')}\n위반 횟수: ${data.banInfo.violationCount}`);
        } else {
          alert(`${username}은(는) 제재되지 않은 사용자입니다.`);
        }
      } else {
        alert(`확인 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking user ban:', error);
      alert('확인 중 오류가 발생했습니다.');
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getViolationTypeText = (type) => {
    switch (type) {
      case 'PROFANITY': return '부적절한 언어';
      case 'SPAM': return '스팸';
      case 'MANUAL_BAN': return '관리자 제재';
      default: return type || '기타';
    }
  };

  const getBanStatusColor = (banUntil) => {
    const now = new Date();
    const banEnd = new Date(banUntil);
    
    if (banEnd <= now) return 'text-green-600'; // 제재 만료
    
    const hoursLeft = (banEnd - now) / (1000 * 60 * 60);
    if (hoursLeft < 1) return 'text-red-600'; // 1시간 미만
    if (hoursLeft < 24) return 'text-orange-600'; // 24시간 미만
    return 'text-red-500'; // 24시간 이상
  };

  return (
    <>
      <Head>
        <title>포럼 관리자 패널 | PK.GG</title>
        <meta name="description" content="포럼 사용자 제재 관리" />
      </Head>

      <Header />
      
      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">포럼 관리자 패널</h1>
              <span className="text-sm bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-200 px-3 py-1 rounded-full font-medium">
                관리자 전용
              </span>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={checkUserBan}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                🔍 사용자 제재 상태 확인
              </button>
            </div>
          </div>

          {/* 탭 메뉴 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('banned-users')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'banned-users'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                🚫 제재된 사용자 ({bannedUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('manual-ban')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'manual-ban'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                ⚡ 수동 제재
              </button>
            </div>

            {/* 제재된 사용자 목록 */}
            {activeTab === 'banned-users' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  현재 제재된 사용자 목록
                </h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">목록을 불러오는 중...</p>
                  </div>
                ) : bannedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-3 block">✅</span>
                    <p className="text-gray-600 dark:text-gray-400">현재 제재된 사용자가 없습니다.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3">사용자명</th>
                          <th className="px-6 py-3">제재 사유</th>
                          <th className="px-6 py-3">위반 유형</th>
                          <th className="px-6 py-3">위반 횟수</th>
                          <th className="px-6 py-3">제재 기간</th>
                          <th className="px-6 py-3">상태</th>
                          <th className="px-6 py-3">액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bannedUsers.map(user => (
                          <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                              {user.banReason}
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                {getViolationTypeText(user.violationType)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                              {user.violationCount}회
                            </td>
                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                              {formatDateTime(user.banUntil)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`font-medium ${getBanStatusColor(user.banUntil)}`}>
                                {new Date(user.banUntil) > new Date() ? '제재 중' : '만료'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleUnban(user.username)}
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                제재 해제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 수동 제재 폼 */}
            {activeTab === 'manual-ban' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  사용자 수동 제재
                </h3>
                
                <form onSubmit={handleManualBan} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      사용자명 *
                    </label>
                    <input
                      type="text"
                      value={manualBanForm.username}
                      onChange={(e) => setManualBanForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="제재할 사용자명 입력"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      제재 기간 (시간) *
                    </label>
                    <select
                      value={manualBanForm.banDuration}
                      onChange={(e) => setManualBanForm(prev => ({ ...prev, banDuration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value={1}>1시간</option>
                      <option value={6}>6시간</option>
                      <option value={24}>24시간 (1일)</option>
                      <option value={72}>72시간 (3일)</option>
                      <option value={168}>168시간 (7일)</option>
                      <option value={720}>720시간 (30일)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      제재 사유 *
                    </label>
                    <textarea
                      value={manualBanForm.reason}
                      onChange={(e) => setManualBanForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="제재 사유를 상세히 입력하세요"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-vertical"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    ⚡ 제재 실행
                  </button>
                </form>
                
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">⚠️ 주의사항</h4>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                    <li>• 수동 제재는 신중하게 사용하세요</li>
                    <li>• 제재 사유는 명확하고 구체적으로 작성하세요</li>
                    <li>• 제재된 사용자는 포럼 사용이 제한됩니다</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
