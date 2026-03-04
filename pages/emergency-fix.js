import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function EmergencyFix() {
  const [status, setStatus] = useState('확인 중...');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/forum/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        setStatus(
          data.length > 0
            ? `✅ ${data.length}개 카테고리 정상`
            : '❌ 카테고리 없음'
        );
      } else {
        setStatus('❌ API 오류');
      }
    } catch (error) {
      setStatus('❌ 연결 오류');
    }
  };

  const fixCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/forum/debug', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.count}개 카테고리 복구 완료!`);
        checkStatus(); // 상태 새로고침
      } else {
        const error = await response.json();
        alert(`❌ 복구 실패: ${error.error}`);
      }
    } catch (error) {
      alert(`❌ 네트워크 오류: ${error.message}`);
    }
    setLoading(false);
  };

  const testPostCreation = async () => {
    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '긴급 테스트 게시글',
          content: '카테고리 복구 후 테스트 중입니다.',
          author: '시스템테스트',
          categoryId: 'clan',
        }),
      });

      if (response.ok) {
        alert('✅ 게시글 작성 성공! 클랜 모집 카테고리가 정상 작동합니다.');
      } else {
        const error = await response.json();
        alert(`❌ 게시글 작성 실패: ${error.error}\n상세: ${error.details}`);
      }
    } catch (error) {
      alert(`❌ 네트워크 오류: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>긴급 포럼 복구 | PKGG</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <h1 className="text-2xl font-bold text-red-800 mb-2">
              🚨 긴급 포럼 복구
            </h1>
            <p className="text-red-700">카테고리가 사라진 문제를 해결합니다.</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">현재 상태</h2>
            <div className="flex items-center justify-between">
              <span className="text-lg">{status}</span>
              <button
                onClick={checkStatus}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🔄 다시 확인
              </button>
            </div>

            {categories.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">존재하는 카테고리:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-2 bg-gray-50 rounded">
                      <span className="mr-2">{cat.icon}</span>
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({cat.postCount || 0}개 게시글)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">복구 도구</h2>
            <div className="space-y-3">
              <button
                onClick={fixCategories}
                disabled={loading}
                className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
              >
                {loading ? '복구 중...' : '🔧 카테고리 강제 복구'}
              </button>

              <button
                onClick={testPostCreation}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                🧪 클랜 모집 게시글 작성 테스트
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              💡 수동 복구 방법
            </h3>
            <p className="text-yellow-700 text-sm mb-2">
              위 방법이 안 되면 터미널에서 다음 명령어 실행:
            </p>
            <code className="block bg-yellow-100 p-2 rounded text-sm">
              node emergency-restore.js
            </code>
          </div>
        </div>
      </div>
    </>
  );
}
