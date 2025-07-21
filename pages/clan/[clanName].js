// pages/clan/[clanName].js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header.jsx'; // .jsx 확장자 명시
import Footer from '../../components/Footer.jsx'; // .jsx 확장자 명시

export default function ClanDetailsPage() {
  const router = useRouter();
  const { clanName } = router.query;

  const [clanMembers, setClanMembers] = useState([]);
  const [memberStats, setMemberStats] = useState({});
  const [loadingClan, setLoadingClan] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // 클랜 멤버 정보 가져오기
  useEffect(() => {
    if (!clanName) {
      setLoadingClan(false);
      return;
    }

    const fetchClanMembers = async () => {
      setLoadingClan(true);
      setError(null);
      try {
        const res = await fetch(`/api/clan/${encodeURIComponent(clanName)}`);
        const data = await res.json();

        if (res.ok) {
          // DB 기반 API는 data.clan.members 배열을 반환
          setClanMembers((data.clan && data.clan.members) ? data.clan.members.map(m => m.nickname) : []);
          console.log('클랜 멤버스 API 응답:', data.clan?.members);
        } else {
          setError(data.error || '클랜 정보를 불러오는 데 실패했습니다.');
          setClanMembers([]);
        }
      } catch (err) {
        console.error('클랜 멤버 fetch 중 오류:', err);
        setError('네트워크 오류 또는 서버에 접속할 수 없습니다.');
        setClanMembers([]);
      } finally {
        setLoadingClan(false);
      }
    };

    fetchClanMembers();
  }, [clanName]); // clanName이 변경될 때마다 재실행

  // 각 클랜 멤버의 PUBG 통계 정보 가져오기
  useEffect(() => {
    if (clanMembers.length === 0 || loadingClan) {
      setMemberStats({}); // 클랜 멤버가 없거나 로딩 중이면 통계 초기화
      setLoadingStats(false);
      return;
    }

    const fetchMemberStats = async () => {
      setLoadingStats(true);
      setStatsError(null);
      const newMemberStats = {};
      let hasError = false;

      for (const member of clanMembers) {
        try {
          const res = await fetch(`/api/pubg/${encodeURIComponent(member)}`);
          const data = await res.json();

          if (res.ok) {
            newMemberStats[member] = {
              avgScore: data.avgScore,
              playStyle: data.playStyle,
            };
          } else {
            console.warn(`플레이어 ${member} 통계 불러오기 실패:`, data.error || '알 수 없는 오류');
            newMemberStats[member] = { avgScore: 'N/A', playStyle: 'N/A', error: data.error || '데이터 없음' };
            hasError = true;
          }
        } catch (err) {
          console.error(`플레이어 ${member} 통계 fetch 중 오류:`, err);
          newMemberStats[member] = { avgScore: 'N/A', playStyle: 'N/A', error: '네트워크 오류' };
          hasError = true;
        }
      }
      setMemberStats(newMemberStats);
      if (hasError) {
        setStatsError('일부 플레이어의 통계를 불러오는 데 실패했습니다.');
      }
      setLoadingStats(false);
    };

    fetchMemberStats();
  }, [clanMembers, loadingClan]); // clanMembers 또는 loadingClan이 변경될 때 재실행

  if (loadingClan) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
        <Header />
        <main style={{ padding: '20px 0' }}>
          <p style={{ color: 'blue', fontSize: '1.2em' }}>클랜 정보를 불러오는 중입니다...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
        <Header />
        <main style={{ padding: '20px 0' }}>
          <h1 style={{ color: 'red' }}>클랜 정보 오류</h1>
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            데이터 다시 불러오기
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <Header />
      <main style={{ padding: '20px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5em', color: '#007bff', marginBottom: '30px' }}>{clanName} 클랜 분석</h1>

        <div style={{ border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '30px' }}>
          <p style={{ fontSize: '1.2em', margin: '5px 0' }}>클랜원 수: {clanMembers.length}명</p>
          {/* TODO: 평균 점수, 주요 스타일 등 클랜 전체 통계는 나중에 추가 */}
          <p style={{ fontSize: '1.2em', margin: '5px 0' }}>평균 점수: (추후 구현)</p>
          <p style={{ fontSize: '1.2em', margin: '5px 0' }}>주요 스타일: (추후 구현)</p>
        </div>

        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}>
          데이터 다시 불러오기
        </button>

        {statsError && <p style={{ color: 'orange', fontWeight: 'bold' }}>{statsError}</p>}

        <h2 style={{ fontSize: '2em', color: '#333', marginBottom: '20px' }}>클랜원 리스트</h2>
        {loadingStats ? (
          <p style={{ color: 'blue', fontSize: '1.1em' }}>클랜원 통계 데이터를 불러오는 중입니다...</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {clanMembers.length === 0 ? (
              <p>클랜원 데이터가 없습니다.</p>
            ) : (
              clanMembers.map(member => (
                <li key={member} style={{
                  border: '1px solid #e0e0e0',
                  padding: '15px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  textAlign: 'left'
                }}>
                  <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#333' }}>{member}</span>
                  {memberStats[member] && (
                    <div style={{ fontSize: '0.9em', color: '#555', marginTop: '5px' }}>
                      점수: {memberStats[member]?.avgScore || 'N/A'} /
                      스타일: {memberStats[member]?.playStyle || 'N/A'}
                    </div>
                  )}
                  <button
                    style={{ marginLeft: 10, padding: '4px 10px', fontSize: '0.9em', background: '#eee', border: '1px solid #bbb', borderRadius: 4, cursor: 'pointer' }}
                    onClick={async () => {
                      const res = await fetch('/api/clan/update-member', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clanName, nickname: member })
                      });
                      if (res.ok) {
                        alert('DB에 최신 통계 저장 완료!');
                      } else {
                        const data = await res.json();
                        alert('DB 저장 실패: ' + (data.error || '오류'));
                      }
                    }}
                  >DB에 최신 통계 저장</button>
                </li>
              ))
            )}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}