import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';

const TOPICS = [
  { id: 'bug',     label: '버그 / 오류 제보', icon: '🐛' },
  { id: 'feature', label: '기능 제안',         icon: '💡' },
  { id: 'data',    label: '데이터 오류',       icon: '📊' },
  { id: 'forum',   label: '포럼 신고',         icon: '🚨' },
  { id: 'other',   label: '기타 문의',         icon: '📬' },
];

const TOPIC_HINTS = {
  bug: '어떤 페이지에서, 어떤 동작 시 발생했는지 / 브라우저 정보를 함께 적어주시면 빠른 처리에 도움이 됩니다.',
  data: '오류가 발생한 플레이어 닉네임 또는 클랜명, 실제값 vs 표시값을 알려주세요.',
  forum: '신고할 게시글 URL 또는 번호, 신고 사유를 적어주세요.',
  feature: '원하는 기능과 어떤 상황에서 필요한지 구체적으로 알려주시면 좋습니다.',
  other: '자유롭게 작성해주세요.',
};

export default function ContactPage() {
  const [topic,    setTopic]    = useState('');
  const [message,  setMessage]  = useState('');
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic)              return setError('문의 유형을 선택해주세요.');
    if (message.trim().length < 5) return setError('내용을 5자 이상 입력해주세요.');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message, email }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.error || '전송 실패. 다시 시도해주세요.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>문의 | PKGG</title>
        <meta name="description" content="PKGG에 버그 제보, 기능 제안, 기타 문의를 보내주세요." />
        <meta name="robots" content="noindex" />
      </Head>
      <Header />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">

          <div>
            <Link href="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
              ← PKGG 홈으로
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">문의하기</h1>
            <p className="text-gray-500 text-sm mt-1">버그 제보, 기능 제안, 기타 문의는 언제든지 환영합니다.</p>
          </div>

          {done ? (
            <div className="bg-white rounded-2xl border border-green-200 p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-lg font-bold text-gray-900 mb-1">문의가 접수되었습니다</div>
              <div className="text-sm text-gray-500">확인 후 최대한 빠르게 처리하겠습니다.</div>
              <button
                onClick={() => { setDone(false); setTopic(''); setMessage(''); setEmail(''); }}
                className="mt-5 px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                추가 문의하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              {/* 문의 유형 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">문의 유형 *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOPICS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTopic(t.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        topic === t.id
                          ? 'border-blue-400 bg-blue-50 text-blue-800 font-semibold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                {topic && TOPIC_HINTS[topic] && (
                  <p className="mt-2 text-xs text-gray-400">{TOPIC_HINTS[topic]}</p>
                )}
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">문의 내용 *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="내용을 입력해주세요..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              {/* 이메일 (선택) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  답변받을 이메일 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? '전송 중...' : '문의 보내기'}
              </button>
            </form>
          )}

          <div className="bg-gray-100 rounded-2xl p-5 text-sm text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-1">응답 안내</p>
            <p>
              문의 확인 후 최대한 빠르게 답변 드립니다. 운영자가 개인이기 때문에 답변이 늦어질 수 있는 점 양해 부탁드립니다.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
