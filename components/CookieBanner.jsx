import Link from 'next/link';

export default function CookieBanner({ onAccept, onReject }) {
  return (
    <div className="crate-bar fixed bottom-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--c-bone)' }}>
          PKGG는 서비스 개선 및 맞춤형 광고(Google AdSense) 제공을 위해 쿠키를 사용합니다.{' '}
          <Link href="/privacy" className="underline font-semibold" style={{ color: 'var(--c-flare)' }}>
            개인정보처리방침
          </Link>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onReject}
            className="crate-chip px-4 py-2 text-sm font-medium"
          >
            거부
          </button>
          <button
            onClick={onAccept}
            className="crate-btn px-4 py-2 text-sm"
          >
            동의하기
          </button>
        </div>
      </div>
    </div>
  );
}
