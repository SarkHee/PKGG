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
      </Head>

      <Header />

      <main className="main-content">
        <h1 className="title">
          PK.GG
        </h1>

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

        <div style={{ marginTop: '30px' }}>
          <Link href="/clans" passHref>
            <span style={{ cursor: 'pointer', fontWeight: 'bold', color: '#007bff', textDecoration: 'none', fontSize: '1.1em' }}>클랜보기</span>
          </Link>
        </div>

      </main>

      <Footer />

      <style jsx global>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .main-content {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .title a {
          color: #0070f3;
          text-decoration: none;
        }

        .title a:hover,
        .title a:focus,
        .title a:active {
          text-decoration: underline;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
        }

        .title,
        .description {
          text-align: center;
        }

        .description {
          line-height: 1.5;
          font-size: 1.5rem;
        }

        .server-selection {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        .server-button {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1em;
          transition: background-color 0.3s ease;
        }

        .server-button:hover {
          background-color: #e0e0e0;
        }

        .server-button.active {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }

        .search-form {
          display: flex;
          margin-top: 20px;
        }

        .search-input {
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 5px 0 0 5px;
          font-size: 1em;
          outline: none;
          flex-grow: 1;
          max-width: 300px;
        }

        .search-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 0 5px 5px 0;
          cursor: pointer;
          font-size: 1em;
          transition: background-color 0.3s ease;
        }

        .search-button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
}