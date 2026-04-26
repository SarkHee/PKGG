// pages/api/auth/kakao-login.js — 카카오 OAuth 2.0 로그인 시작
export default function handler(req, res) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pkgg.vercel.app';
  const clientId = process.env.KAKAO_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'KAKAO_CLIENT_ID 환경변수가 없습니다.' });
  }

  const redirectUri = `${baseUrl}/api/auth/kakao-callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });

  res.redirect(`https://kauth.kakao.com/oauth/authorize?${params.toString()}`);
}
