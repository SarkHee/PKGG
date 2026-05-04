function Error({ statusCode }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        {statusCode ? `${statusCode} 오류가 발생했습니다` : '오류가 발생했습니다'}
      </h1>
      <p style={{ marginTop: '1rem', color: '#6b7280' }}>
        잠시 후 다시 시도해 주세요.
      </p>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
