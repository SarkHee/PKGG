import Link from 'next/link';

export default function CookieBanner({ onAccept, onReject }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-700 px-4 py-4 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 text-sm text-gray-300 leading-relaxed">
          PK.GG는 서비스 개선 및 맞춤형 광고(Google AdSense) 제공을 위해 쿠키를 사용합니다.{' '}
          <Link href="/privacy" className="text-blue-400 underline hover:text-blue-300">
            개인정보처리방침
          </Link>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
          >
            거부
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            동의하기
          </button>
        </div>
      </div>
    </div>
  );
}
