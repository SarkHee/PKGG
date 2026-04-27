// pages/api/auth/kakao-login.js — 카카오 OAuth 2.0 로그인 시작
export default function handler(req, res) {
  const clientId = process.env.KAKAO_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'KAKAO_CLIENT_ID 환경변수가 없습니다.' });
  }

  // 요청 호스트 기반 동적 baseUrl (pk.gg / pkgg.vercel.app 등 모두 대응)
  const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

  const redirectUri = `${baseUrl}/api/auth/kakao-callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });

  res.redirect(`https://kauth.kakao.com/oauth/authorize?${params.toString()}`);
}
