// pages/_app.js

import '../styles/globals.css'; // globals.css 파일을 임포트합니다.
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  // 앱 시작 시 포럼 카테고리 초기화
  useEffect(() => {
    const initializeForum = async () => {
      try {
        // 포럼 카테고리 초기화 API 호출
        await fetch('/api/forum/init', { method: 'POST' });
      } catch (error) {
        console.log('포럼 초기화 요청 실패:', error.message);
      }
    };

    initializeForum();

    // 다크 모드 관련 초기화 제거: 라이트 고정 유지
  }, []);

  // Component는 현재 페이지 컴포넌트 (예: Home, ClanDetailsPage 등)
  // pageProps는 getServerSideProps 또는 getStaticProps를 통해 페이지에 전달되는 props
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
