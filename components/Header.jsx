// components/Header.jsx

import Link from 'next/link';

export default function Header() {
  return (
    // header 태그에 className 추가
    <header className="main-header">
      {/* PK.GG 로고 */}
      <Link href="/" passHref>
        <span className="logo">PK.GG</span> {/* span에 className 추가 */}
      </Link>
      {/* 여기에 다른 헤더 요소 (예: 로그인 버튼, 프로필 등)가 올 수 있습니다. */}
    </header>
  );
}