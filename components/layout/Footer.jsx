import Link from 'next/link';
import { useT } from '../../utils/i18n';

export default function Footer() {
  const { t } = useT();

  return (
    <footer className="main-footer bg-white border-t border-gray-200 py-7 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2 px-4">
        <Link href="/about" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.about')}</Link>
        <Link href="/privacy" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.privacy')}</Link>
        <Link href="/terms" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.terms')}</Link>
        <Link href="/contact" className="px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xs font-medium transition-all border border-gray-200 whitespace-nowrap">{t('footer.contact')}</Link>
      </div>
      <p className="text-xs mt-3 text-gray-400">
        &copy; 2026 PKGG. All rights reserved.
      </p>
      <p className="text-[11px] mt-1.5 text-gray-400 px-4 max-w-xl mx-auto leading-relaxed">
        Steam 및 Steam 로고는 Valve Corporation의 상표입니다. 본 사이트는 Valve와 공식적으로 연계되어 있지 않습니다.
        PUBG® 및 BATTLEGROUNDS®는 KRAFTON, Inc.의 등록 상표입니다.
      </p>
      {/* 숨겨진 관리자 링크 — 텍스트 드래그(선택) 시 노출 */}
      <div className="mt-2 select-all">
        <Link
          href="/admin"
          className="text-[10px] text-white hover:text-white transition-colors duration-500 cursor-default select-all"
          tabIndex={-1}
        >
          admin
        </Link>
      </div>
    </footer>
  );
}
