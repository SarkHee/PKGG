// pages/api/auth/kakao-callback.js — 카카오 OAuth 콜백 처리
import { setSession } from '../../../utils/session';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/?kakao_error=cancelled');
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pkgg.vercel.app';
  const clientId = process.env.KAKAO_CLIENT_ID;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/kakao-callback`;

  // 1. 인가 코드 → 액세스 토큰 교환
  let accessToken;
  try {
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        ...(clientSecret && { client_secret: clientSecret }),
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    console.log('[kakao-callback] 토큰 응답 전체:', JSON.stringify(tokenData));
    console.log('[kakao-callback] 사용한 redirect_uri:', redirectUri);
    console.log('[kakao-callback] 사용한 client_id:', clientId);
    if (tokenData.error) {
      console.error('[kakao-callback] 토큰 오류:', tokenData.error_description);
      return res.redirect('/?kakao_error=token_failed');
    }
    accessToken = tokenData.access_token;
  } catch (e) {
    console.error('[kakao-callback] 토큰 요청 실패:', e.message);
    return res.redirect('/?kakao_error=token_failed');
  }

  // 2. 액세스 토큰 → 카카오 사용자 정보 조회
  let kakaoId;
  try {
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    kakaoId = String(userData.id);
  } catch (e) {
    console.error('[kakao-callback] 유저 정보 조회 실패:', e.message);
    return res.redirect('/?kakao_error=userinfo_failed');
  }

  // 3. DB에서 유저 찾거나 생성
  let user;
  try {
    user = await prisma.user.upsert({
      where: { kakaoId },
      update: {},
      create: { kakaoId, platform: 'kakao' },
    });
  } catch (e) {
    console.error('[kakao-callback] DB upsert 실패:', e.message);
    return res.redirect('/?kakao_error=db_error');
  }

  // 4. 세션 쿠키 발행
  setSession(res, { userId: user.id, kakaoId, platform: 'kakao', role: user.role });

  // 5. PUBG 계정 미연결 → 연결 페이지로
  if (!user.pubgAccountId) {
    return res.redirect('/link-pubg?platform=kakao');
  }

  res.redirect('/clan-analytics');
}
