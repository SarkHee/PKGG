// pages/clans/index.js

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../../components/Header.jsx'; // .jsx 확장자 명시
import Footer from '../../components/Footer.jsx'; // .jsx 확장자 명시

export default function ClansListPage() {
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllClans = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/clans');
        const data = await res.json();

        if (res.ok) {
          setClans(Object.keys(data.clans || {}));
        } else {
          setError(data.error || '클랜 목록을 불러오는 데 실패했습니다.');
          setClans([]);
        }
      } catch (err) {
        console.error('모든 클랜 목록 fetch 중 오류:', err);
        setError('네트워크 오류 또는 서버에 접속할 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllClans();
  }, []);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <Header />
      <main style={{ padding: '20px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5em', color: '#007bff', marginBottom: '30px' }}>전체 클랜 목록</h1>

        {loading && <p style={{ color: 'blue', fontSize: '1.2em' }}>클랜 목록을 불러오는 중입니다...</p>}
        {error && <p style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2em' }}>오류: {error}</p>}

        {!loading && !error && clans.length === 0 && <p>등록된 클랜이 없습니다.</p>}

        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {clans.map((clanName) => (
            <li key={clanName} style={{
              border: '1px solid #e0e0e0',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              textAlign: 'left'
            }}>
              <Link href={`/clan/${encodeURIComponent(clanName)}`} passHref>
                <span style={{
                  fontSize: '1.5em',
                  fontWeight: 'bold',
                  color: '#333',
                  cursor: 'pointer',
                  display: 'block'
                }}>
                  {clanName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}