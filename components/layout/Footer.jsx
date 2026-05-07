import Link from 'next/link';
import { useT } from '../../utils/i18n';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function Footer() {
  const { t } = useT();
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <footer className="main-footer bg-white border-t border-gray-200 py-7 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2 px-4">
        <Link href="/about" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.about')}</Link>
        <Link href="/privacy" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.privacy')}</Link>
        <Link href="/terms" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.terms')}</Link>
        <Link href="/contact" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.contact')}</Link>
        {session?.user?.isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all border border-blue-500 whitespace-nowrap"
          >
            관리자 모드 보기
          </button>
        )}
      </div>
      <p className="text-xs mt-3 text-gray-400">
        &copy; 2026 PKGG. All rights reserved.
      </p>
      <p className="text-[11px] mt-1.5 text-gray-400 px-4 max-w-xl mx-auto leading-relaxed">
        Steam 및 Steam 로고는 Valve Corporation의 상표입니다. 본 사이트는 Valve와 공식적으로 연계되어 있지 않습니다.
        PUBG® 및 BATTLEGROUNDS®는 KRAFTON, Inc.의 등록 상표입니다.
      </p>
    </footer>
  );
}
