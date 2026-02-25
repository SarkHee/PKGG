import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="main-footer bg-gray-900/60 backdrop-blur-md border-t border-gray-700/30 text-gray-300 py-6 text-center relative z-10">
      <p className="mb-2">&copy; 2026 PK.GG. All rights reserved.</p>
      <p className="text-xs text-gray-500">
        <Link href="/privacy" className="hover:text-gray-300 underline underline-offset-2 transition-colors">
          개인정보처리방침
        </Link>
      </p>
    </footer>
  );
}
