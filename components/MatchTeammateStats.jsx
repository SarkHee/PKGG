
export default function MatchTeammateStats({ teammatesDetail }) {
  if (!Array.isArray(teammatesDetail) || teammatesDetail.length === 0) {
    return <div style={{ color: '#888', fontSize: 14, padding: '8px 0' }}>팀원 데이터 없음</div>;
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#2563eb' }}>팀원별 상세</div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: 6 }}>닉네임</th>
              <th style={{ padding: 6 }}>킬</th>
              <th style={{ padding: 6 }}>어시</th>
              <th style={{ padding: 6 }}>딜량</th>
              <th style={{ padding: 6 }}>DBNO</th>
              <th style={{ padding: 6 }}>생존</th>
              <th style={{ padding: 6 }}>랭크</th>
            </tr>
          </thead>
          <tbody>
            {teammatesDetail.map((t) => (
              <tr key={t.name} style={{ fontWeight: t.isSelf ? 700 : 400, color: t.isSelf ? '#2563eb' : '#222', background: t.isSelf ? '#e0e7ff' : 'none' }}>
                <td style={{ padding: 6 }}>{t.name}</td>
                <td style={{ padding: 6 }}>{t.kills}</td>
                <td style={{ padding: 6 }}>{t.assists}</td>
                <td style={{ padding: 6 }}>{t.damage}</td>
                <td style={{ padding: 6 }}>{t.dbnos}</td>
                <td style={{ padding: 6 }}>{Math.round(t.survivalTime)}s</td>
                <td style={{ padding: 6 }}>{t.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
