import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';

const TOPICS = [
  { id: 'bug', label: '버그 / 오류 제보', icon: '🐛' },
  { id: 'feature', label: '기능 제안', icon: '💡' },
  { id: 'data', label: '데이터 오류', icon: '📊' },
  { id: 'forum', label: '포럼 신고', icon: '🚨' },
  { id: 'other', label: '기타 문의', icon: '📬' },
];

export default function ContactPage() {
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  const EMAIL = 'sssyck123@gmail.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <Head>
        <title>문의 | PK.GG</title>
        <meta name="description" content="PK.GG에 버그 제보, 기능 제안, 기타 문의를 보내주세요." />
        <meta name="robots" content="noindex" />
      </Head>
      <Header />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">

          {/* 타이틀 */}
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
              ← PK.GG 홈으로
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">문의하기</h1>
            <p className="text-gray-500 text-sm mt-1">버그 제보, 기능 제안, 기타 문의는 언제든지 환영합니다.</p>
          </div>

          {/* 이메일 카드 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">이메일로 문의하기</p>
              <p className="text-lg font-semibold text-gray-900">{EMAIL}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copied ? '✅ 복사됨' : '복사'}
              </button>
              <a
                href={`mailto:${EMAIL}`}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                메일 보내기
              </a>
            </div>
          </div>

          {/* 문의 유형 선택 가이드 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">어떤 내용으로 문의하시나요?</h2>
            <div className="space-y-2">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelected(selected === topic.id ? null : topic.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all text-sm ${
                    selected === topic.id
                      ? 'border-blue-400 bg-blue-50 text-blue-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{topic.icon}</span>
                  <span className="font-medium">{topic.label}</span>
                </button>
              ))}
            </div>

            {/* 선택 시 안내 메시지 */}
            {selected === 'bug' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 leading-relaxed">
                <p className="font-semibold mb-1">버그 제보 시 포함해주세요</p>
                <ul className="list-disc list-inside space-y-1 text-orange-700">
                  <li>어떤 페이지에서 발생했는지</li>
                  <li>어떤 동작을 했을 때 발생했는지</li>
                  <li>브라우저 종류 및 버전 (가능하면)</li>
                  <li>스크린샷 첨부 (가능하면)</li>
                </ul>
              </div>
            )}
            {selected === 'data' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 leading-relaxed">
                <p className="font-semibold mb-1">데이터 오류 제보 시 포함해주세요</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>오류가 발생한 플레이어 닉네임 또는 클랜명</li>
                  <li>어떤 수치가 잘못되었는지 (실제값 vs 표시값)</li>
                  <li>PUBG 인게임에서 확인한 값 (스크린샷)</li>
                </ul>
              </div>
            )}
            {selected === 'forum' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 leading-relaxed">
                <p className="font-semibold mb-1">포럼 신고 시 포함해주세요</p>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  <li>신고할 게시글 URL 또는 게시글 번호</li>
                  <li>신고 사유 (욕설, 허위정보, 스팸 등)</li>
                </ul>
              </div>
            )}
            {selected === 'feature' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 leading-relaxed">
                <p className="font-semibold mb-1">기능 제안 시 포함해주세요</p>
                <ul className="list-disc list-inside space-y-1 text-green-700">
                  <li>원하는 기능을 구체적으로 설명해주세요</li>
                  <li>어떤 상황에서 필요한 기능인지 알려주세요</li>
                </ul>
              </div>
            )}
          </div>

          {/* 응답 안내 */}
          <div className="bg-gray-100 rounded-2xl p-5 text-sm text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-2">응답 안내</p>
            <p>
              문의 이메일을 확인 후 최대한 빠르게 답변 드립니다. 다만 운영자가 개인이기 때문에
              답변이 늦어질 수 있는 점 양해 부탁드립니다. 긴급한 사항(서비스 오류 등)은 제목에
              <strong> [긴급]</strong>을 표기해주시면 우선 처리합니다.
            </p>
          </div>

        </div>

      </div>
    </>
  );
}
