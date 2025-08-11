// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header.jsx'; // .jsx 확장자 명시 (컴포넌트 파일이 .jsx인 경우)
import Footer from '../components/Footer.jsx'; // .jsx 확장자 명시 (컴포넌트 파일이 .jsx인 경우)

export default function Home() {
  const [selectedServer, setSelectedServer] = useState('steam');
  const [nickname, setNickname] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      router.push(`/player/${selectedServer}/${encodeURIComponent(nickname)}`);
    } else {
      alert('검색할 닉네임을 입력해주세요!');
    }
  };

  return (
    <div className="container">
      <Head>
        <title>PK.GG - PUBG 전적 검색</title>
        <meta name="description" content="PUBG 전적을 검색하고 클랜 정보를 확인하세요." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <Header />

      <main className="main-content">
        <h1 className="title">PK.GG</h1>

        <p className="description">
          PK.GG에 오신 것을 환영합니다.
        </p>

        <div className="server-selection">
          <button
            className={`server-button ${selectedServer === 'steam' ? 'active' : ''}`}
            onClick={() => setSelectedServer('steam')}
          >
            Steam
          </button>
          <button
            className={`server-button ${selectedServer === 'kakao' ? 'active' : ''}`}
            onClick={() => setSelectedServer('kakao')}
          >
            Kakao
          </button>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="닉네임을 입력하세요"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            검색
          </button>
        </form>

      </main>

      <Footer />

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 4rem 2rem;
          width: 100%;
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
          position: relative;
          z-index: 1;
        }

        .title {
          margin: 0 0 1rem 0;
          line-height: 1.15;
          font-size: clamp(3rem, 12vw, 6rem);
          font-weight: 900;
          text-align: center;
          color: #333;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }
        .description {
          text-align: center;
        }

        .description {
          line-height: 1.5;
          font-size: clamp(1rem, 3vw, 1.5rem);
          margin-bottom: 2rem;
          color: rgba(51, 51, 51, 0.8);
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
          z-index: 2;
          position: relative;
        }

        .server-selection {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          width: 100%;
          justify-content: center;
        }

        .server-button {
          background-color: rgba(255, 255, 255, 0.7);
          border: 2px solid rgba(51, 51, 51, 0.2);
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s ease;
          min-width: 80px;
          color: #333;
          backdrop-filter: blur(10px);
        }

        .server-button:hover {
          background-color: rgba(255, 255, 255, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .server-button.active {
          background-color: rgba(102, 126, 234, 0.8);
          color: white;
          border-color: rgba(102, 126, 234, 0.8);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .search-form {
          display: flex;
          margin-top: 30px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(51, 51, 51, 0.1);
        }

        .search-input {
          padding: 15px 20px;
          border: none;
          font-size: 1rem;
          outline: none;
          flex-grow: 1;
          background: rgba(255, 255, 255, 0.9);
          color: #333;
        }

        .search-input::placeholder {
          color: #666;
        }

        .search-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 15px 25px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .search-button:hover {
          transform: translateX(-2px);
          box-shadow: -5px 0 15px rgba(102, 126, 234, 0.3);
        }

        /* 모바일 최적화 */
        @media (max-width: 768px) {
          .container {
            padding: 0 0.5rem;
          }
          
          .main-content {
            padding: 2rem 0;
          }

          .title {
            font-size: clamp(2rem, 10vw, 3.5rem);
          }

          .letter, .dot {
            text-shadow: 
              0 1px 0 rgba(204, 204, 204, 0.2),
              0 2px 0 rgba(187, 187, 187, 0.15),
              0 3px 0 rgba(170, 170, 170, 0.1),
              0 4px 5px rgba(0,0,0,.05),
              0 0 5px rgba(0,0,0,.05),
              0 1px 3px rgba(0,0,0,.08),
              0 3px 5px rgba(0,0,0,.06);
          }

          .server-selection {
            flex-direction: row;
            width: 100%;
            max-width: 300px;
          }

          .server-button {
            flex: 1;
            padding: 10px 16px;
            font-size: 0.9rem;
          }

          .search-form {
            flex-direction: column;
            max-width: 100%;
            border-radius: 8px;
          }

          .search-input {
            border-radius: 8px 8px 0 0;
            padding: 12px 16px;
          }

          .search-button {
            border-radius: 0 0 8px 8px;
            padding: 12px 16px;
          }

          .pixel-logo {
            max-width: 90vw;
          }
        }

        /* 태블릿 최적화 */
        @media (max-width: 1024px) and (min-width: 769px) {
          .main-content {
            padding: 4rem 0;
          }
        }

        /* 작은 모바일 화면 */
        @media (max-width: 480px) {
          .title {
            font-size: 2.5rem;
          }
          
          .description {
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }
          
          .server-button {
            padding: 8px 12px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}