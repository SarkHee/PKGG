import { useState } from 'react';
import Head from 'next/head';
import Header from "../../components/layout/Header";

export default function TestForum() {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // 테스트 게시글 생성
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '테스트 게시글 ' + Date.now(),
          content: '이것은 포럼 기능 테스트를 위한 게시글입니다.',
          author: '테스트사용자',
          categoryId: 'general',
        }),
      });

      const result = await response.json();

      setTestResult({
        success: response.ok,
        status: response.status,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    setIsLoading(false);
  };

  return (
    <>
      <Head>
        <title>포럼 테스트 | PK.GG</title>
      </Head>
      <Header />

      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">포럼 기능 테스트</h1>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">게시글 작성 테스트</h2>
            <p className="text-gray-600 mb-4">
              아래 버튼을 클릭하여 포럼 게시글 작성 API가 정상적으로 작동하는지
              확인할 수 있습니다.
            </p>

            <button
              onClick={runTest}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg"
            >
              {isLoading ? '테스트 중...' : '테스트 실행'}
            </button>
          </div>

          {testResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                테스트 결과 {testResult.success ? '✅' : '❌'}
              </h3>

              <div className="space-y-2">
                <p>
                  <strong>상태:</strong> {testResult.success ? '성공' : '실패'}
                </p>
                <p>
                  <strong>HTTP 코드:</strong> {testResult.status || 'N/A'}
                </p>
                <p>
                  <strong>시간:</strong> {testResult.timestamp}
                </p>
              </div>

              {testResult.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800">오류 정보:</h4>
                  <p className="text-red-700">{testResult.error}</p>
                </div>
              )}

              {testResult.data && (
                <div className="mt-4">
                  <h4 className="font-semibold">API 응답:</h4>
                  <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}

              {!testResult.success && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800">
                    문제 해결 방법:
                  </h4>
                  <ul className="mt-2 text-yellow-700 space-y-1">
                    <li>1. 서버가 실행 중인지 확인하세요 (npm run dev)</li>
                    <li>2. 데이터베이스가 초기화되었는지 확인하세요</li>
                    <li>3. 포럼 카테고리가 생성되었는지 확인하세요</li>
                    <li>4. 브라우저 개발자 도구의 Network 탭을 확인하세요</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              포럼 초기 설정 확인 사항
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-semibold text-green-800">
                  ✅ 정상 작동 조건
                </h4>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• 서버 실행됨 (localhost:3000)</li>
                  <li>• 데이터베이스 연결됨</li>
                  <li>• 포럼 카테고리 존재함</li>
                  <li>• API 엔드포인트 응답함</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-semibold text-red-800">
                  ❌ 문제 발생 가능 원인
                </h4>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• 서버가 중지됨</li>
                  <li>• 데이터베이스 오류</li>
                  <li>• 카테고리 테이블 비어있음</li>
                  <li>• API 엔드포인트 오류</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <strong>수동 초기화 명령어:</strong>
              <br />
              <code className="bg-gray-200 px-2 py-1 rounded">
                node test-forum-fix.js
              </code>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
