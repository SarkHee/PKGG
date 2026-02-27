import Link from 'next/link';
import { useT } from '../../utils/i18n';

export default function Footer() {
  const { t } = useT();
  return (
    <footer className="main-footer bg-gray-900/60 backdrop-blur-md border-t border-gray-700/30 text-gray-300 py-6 text-center relative z-10">
      <p className="mb-2">&copy; 2026 PK.GG. All rights reserved.</p>
      <p className="text-xs text-gray-500">
        <Link href="/privacy" className="hover:text-gray-300 underline underline-offset-2 transition-colors">
          {t('footer.privacy')}
        </Link>
      </p>
      {/* 숨겨진 관리자 링크 — 텍스트 드래그(선택) 시 노출 */}
      <div className="mt-3 select-all">
        <Link
          href="/admin"
          className="text-[10px] text-gray-950 hover:text-gray-800 transition-colors duration-500 cursor-default select-all"
          tabIndex={-1}
        >
          admin
        </Link>
      </div>
    </footer>
  );
}
