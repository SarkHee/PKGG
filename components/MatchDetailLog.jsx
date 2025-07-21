
export default function MatchDetailLog({ match }) {
  if (!match) return null;
  // 보강: 잘못된 타입/undefined/null도 안전하게 처리
  const killLog = Array.isArray(match.killLog) ? match.killLog : [];
  const movePath = typeof match.movePath === 'string' ? match.movePath : '';
  const weaponStats = (match.weaponStats && typeof match.weaponStats === 'object' && !Array.isArray(match.weaponStats)) ? match.weaponStats : {};

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#2563eb' }}>상세 로그</div>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, background: '#fff' }}>
        {/* MMR */}
        <div style={{ minWidth: 120 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>MMR</div>
          <div style={{ fontSize: 13, color: '#222' }}>
            {typeof match.mmrScore === 'number' && !isNaN(match.mmrScore) ? (
              <span style={{ fontWeight: 700, color: '#2563eb' }}>{match.mmrScore.toFixed(0)} 점</span>
            ) : (
              <span style={{ color: '#888' }}>MMR 데이터 없음</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            PK.GG MMR은 공식 랭킹 RP가 아닌, 킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다.
          </div>
        </div>
        {/* 킬로그 */}
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>킬로그</div>
          <div style={{ fontSize: 13, color: '#222' }}>
            {killLog.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {killLog.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#888' }}>데이터 없음</span>
            )}
          </div>
        </div>
        {/* 이동 경로 */}
        <div style={{ minWidth: 120 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>이동 경로</div>
          <div style={{ fontSize: 13, color: '#222' }}>
            {movePath ? (
              <span>{movePath}</span>
            ) : (
              <span style={{ color: '#888' }}>데이터 없음</span>
            )}
          </div>
        </div>
        {/* 무기별 딜량 */}
        <div style={{ minWidth: 140 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>무기별 딜량</div>
          <div style={{ fontSize: 13, color: '#222' }}>
            {weaponStats && Object.keys(weaponStats).length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {Object.entries(weaponStats).map(([weapon, dmg]) => (
                  <li key={weapon}>{weapon}: {typeof dmg === 'number' ? dmg.toFixed(1) : dmg} 데미지</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#888' }}>데이터 없음</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
