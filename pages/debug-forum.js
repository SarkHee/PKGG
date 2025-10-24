import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function DebugForum() {
  const [categories, setCategories] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/forum/debug');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('카테고리 조회 오류:', error);
    }
  };

  const createCategories = async () => {
    try {
      const response = await fetch('/api/forum/debug', {
        method: 'POST',
      });
      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.count}개 카테고리가 생성되었습니다!`);
        fetchCategories(); // 새로고침
      } else {
        alert(`❌ 오류: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ 네트워크 오류: ${error.message}`);
    }
  };

  const testPostCreation = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '테스트 게시글 ' + new Date().getTime(),
          content:
            '이것은 포럼 기능 테스트를 위한 게시글입니다.\n\n정상적으로 저장되는지 확인해보겠습니다.',
          author: '테스트사용자',
          categoryId: 'general',
        }),
      });

      const result = await response.json();

      setTestResult({
        success: response.ok,
        status: response.status,
        data: result,
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
      });
    }

    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>포럼 디버그 | PK.GG</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 제목 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900">
              🔧 포럼 디버그 도구
            </h1>
            <p className="mt-2 text-gray-600">
              포럼 시스템의 상태를 확인하고 테스트합니다.
            </p>
          </div>

          {/* 카테고리 상태 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              📂 포럼 카테고리 상태
            </h2>

            {categories.length === 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">
                  ❌ 카테고리가 없습니다. 먼저 카테고리를 생성해야 합니다.
                </p>
                <div className="mt-3">
                  <button
                    onClick={createCategories}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mr-2"
                  >
                    🔧 카테고리 자동 생성
                  </button>
                  <span className="text-sm text-red-600">
                    또는 터미널에서{' '}
                    <code className="bg-red-100 px-1 rounded">
                      node create-forum-categories.js
                    </code>{' '}
                    실행
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-green-700">
                  ✅ {categories.length}개의 카테고리가 존재합니다:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg mr-2">{cat.icon}</span>
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({cat.id})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={fetchCategories}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔄 다시 확인
            </button>
          </div>

          {/* 게시글 작성 테스트 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              📝 게시글 작성 테스트
            </h2>

            <div className="mb-4">
              <button
                onClick={testPostCreation}
                disabled={loading || categories.length === 0}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ 테스트 중...' : '🚀 게시글 작성 테스트'}
              </button>

              {categories.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ 카테고리가 없어서 테스트할 수 없습니다.
                </p>
              )}
            </div>

            {/* 테스트 결과 */}
            {testResult && (
              <div
                className={`p-4 rounded-lg border ${
                  testResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <h3 className="font-semibold mb-2">
                  {testResult.success ? '✅ 테스트 성공' : '❌ 테스트 실패'}
                </h3>

                {testResult.status && (
                  <p className="text-sm mb-2">
                    <strong>HTTP 상태:</strong> {testResult.status}
                  </p>
                )}

                {testResult.error && (
                  <p className="text-red-700 mb-2">
                    <strong>오류:</strong> {testResult.error}
                  </p>
                )}

                {testResult.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      📄 API 응답 상세보기
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </details>
                )}

                {testResult.success && (
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="text-blue-800 text-sm">
                      🎉 게시글이 성공적으로 생성되었습니다!
                      <br />
                      이제 일반 포럼에서 게시글 작성이 정상적으로 작동할
                      것입니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 도움말 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💡 문제 해결 가이드</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">
                  1. 카테고리가 없는 경우
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  터미널에서{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    node create-forum-categories.js
                  </code>{' '}
                  실행
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  2. 서버 오류가 발생하는 경우
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  • 서버가 실행 중인지 확인 (
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    npm run dev
                  </code>
                  )<br />
                  • 데이터베이스 연결 확인
                  <br />• 브라우저 개발자 도구 콘솔 확인
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  3. 게시글이 저장되지 않는 경우
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  • 위 테스트 도구로 먼저 확인
                  <br />
                  • 브라우저 개발자 도구 Network 탭에서 API 요청 확인
                  <br />• 서버 터미널에서 에러 로그 확인
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
