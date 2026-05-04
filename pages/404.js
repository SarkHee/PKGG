export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>404</h1>
      <p style={{ marginTop: '1rem', color: '#6b7280' }}>페이지를 찾을 수 없습니다.</p>
      <a href="/" style={{ marginTop: '1.5rem', display: 'inline-block', color: '#3b82f6' }}>
        홈으로 돌아가기
      </a>
    </div>
  )
}
