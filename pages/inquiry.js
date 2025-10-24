import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from "../../components/layout/Header";

export default function InquiryPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDirectEmail = () => {
    const { name, email, subject, message } = formData;
    const emailSubject = subject || '사이트 문의';
    const emailBody = `이름: ${name}\n이메일: ${email}\n\n문의내용:\n${message}`;

    const mailtoLink = `mailto:sssyck123@naver.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // API를 통한 메일 전송 (향후 구현 가능)
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      // 현재는 직접 메일 클라이언트 열기
      handleDirectEmail();
    } catch (error) {
      console.error('메일 전송 오류:', error);
      alert(
        '메일 전송 중 오류가 발생했습니다. 직접 sssyck123@naver.com으로 문의해주세요.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>문의하기 | PK.GG</title>
        <meta name="description" content="사이트 관련 문의 및 건의사항" />
      </Head>

      <Header />

      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        {/* 브레드크럼 */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              홈
            </Link>
            <span>›</span>
            <span className="text-gray-800 dark:text-gray-200">문의하기</span>
          </nav>
        </div>

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 text-amber-800 border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-lg flex items-center justify-center text-2xl">
              📧
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-900">문의하기</h1>
              <p className="text-amber-700">
                사이트 관련 문의 및 건의사항을 보내주세요
              </p>
            </div>
          </div>

          <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600">📮</span>
              <strong className="text-amber-900">직접 메일 보내기:</strong>
            </div>
            <p className="text-amber-800 mb-2">
              <a
                href="mailto:sssyck123@naver.com"
                className="underline hover:text-amber-600 font-mono"
              >
                sssyck123@naver.com
              </a>
            </p>
            <p className="text-sm text-amber-700">
              아래 양식을 작성하거나 직접 위 메일 주소로 문의하실 수 있습니다.
            </p>
          </div>
        </div>

        {/* 문의 양식 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              문의 양식
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              양식을 작성하면 메일 클라이언트가 자동으로 열립니다.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  이름 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  이메일 *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                제목 *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="문의 제목을 입력해주세요"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                문의내용 *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows="6"
                value={formData.message}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="문의하실 내용을 자세히 작성해주세요..."
              ></textarea>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    처리 중...
                  </>
                ) : (
                  <>📧 메일 클라이언트로 보내기</>
                )}
              </button>

              <button
                type="button"
                onClick={handleDirectEmail}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                직접 메일 보내기
              </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">💡</span>
                <div>
                  <p className="font-medium mb-1">
                    문의 시 포함해주시면 좋은 정보:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>발생한 문제의 구체적인 상황</li>
                    <li>사용 중인 브라우저 및 기기 정보</li>
                    <li>스크린샷 (필요시)</li>
                    <li>연락 가능한 시간대</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* 추가 정보 섹션 */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              🚀 기능 개선 및 버그 신고
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              사이트 기능 개선 제안이나 버그를 발견하셨다면 언제든지 알려주세요.
              더 나은 서비스를 위해 모든 피드백을 소중히 검토합니다.
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
              💬 일반 문의
            </h3>
            <p className="text-green-800 dark:text-green-200 text-sm">
              PUBG 통계, 클랜 정보, 사이트 이용법 등 궁금한 사항이 있으시면 부담
              없이 문의해주세요. 신속하게 답변드리겠습니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
