
export default function MatchDetailLog({ match }) {
  if (!match) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#2563eb' }}>상세 로그</div>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, background: '#fff' }}>
        {/* 킬로그 */}
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>킬로그</div>
          <div style={{ fontSize: 13, color: '#222' }}>
            {Array.isArray(match.killLog) && match.killLog.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {match.killLog.map((log, i) => (
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
            {match.movePath ? (
              <span>{match.movePath}</span>
            ) : (
              <span style={{ color: '#888' }}>데이터 없음</span>
            )}
          </div>
        </div>
        {/* 무기별 딜량 */}
        <div style={{ minWidth: 140 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>무기별 딜량</div>
          <div style={{ fontSize: 13, color: '#222' }}>
            {match.weaponStats && Object.keys(match.weaponStats).length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {Object.entries(match.weaponStats).map(([weapon, dmg]) => (
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
