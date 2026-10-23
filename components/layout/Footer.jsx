import Link from 'next/link';
import { useT } from '../../utils/i18n';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function Footer() {
  const { t } = useT();
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <footer className="crate-footer py-8 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2 px-4">
        <Link href="/about" className="crate-chip px-4 py-2 text-sm font-medium whitespace-nowrap">{t('footer.about')}</Link>
        <Link href="/privacy" className="crate-chip px-4 py-2 text-sm font-medium whitespace-nowrap">{t('footer.privacy')}</Link>
        <Link href="/terms" className="crate-chip px-4 py-2 text-sm font-medium whitespace-nowrap">{t('footer.terms')}</Link>
        <Link href="/contact" className="crate-chip px-4 py-2 text-sm font-medium whitespace-nowrap">{t('footer.contact')}</Link>
        <Link href="/ad-inquiry" className="crate-chip px-4 py-2 text-sm font-medium whitespace-nowrap">{t('footer.ad_inquiry')}</Link>
        {session?.user?.isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="crate-btn px-4 py-2 text-sm whitespace-nowrap"
          >
            관리자 모드 보기
          </button>
        )}
      </div>
      <p className="text-sm mt-4" style={{ color: 'var(--c-mute)' }}>
        &copy; 2026 PKGG. All rights reserved.
      </p>
      <p className="text-xs mt-2 px-4 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--c-mute)' }}>
        Steam 및 Steam 로고는 Valve Corporation의 상표입니다. 본 사이트는 Valve와 공식적으로 연계되어 있지 않습니다.
        PUBG® 및 BATTLEGROUNDS®는 KRAFTON, Inc.의 등록 상표입니다.
      </p>
    </footer>
  );
}
