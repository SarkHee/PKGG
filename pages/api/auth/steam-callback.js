// pages/api/auth/steam-callback.js — Steam OpenID callback + back-channel verify
import { setSession } from '../../../utils/session';
import prisma from '../../../utils/prisma.js';

// Steam ID 추출: openid.claimed_id = https://steamcommunity.com/openid/id/76561198XXXXXXXXX
function extractSteamId(claimedId) {
  const match = claimedId?.match(/\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

// Steam으로 back-channel 검증 요청
async function verifyWithSteam(query) {
  const params = new URLSearchParams({ ...query, 'openid.mode': 'check_authentication' });
  const res = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const text = await res.text();
  return text.includes('is_valid:true');
}

export default async function handler(req, res) {
  const query = req.query;

  // 1. 기본 파라미터 확인
  if (query['openid.mode'] !== 'id_res') {
    return res.redirect('/?steam_error=cancelled');
  }

  // 2. Steam 백채널 검증
  let valid = false;
  try {
    valid = await verifyWithSteam(query);
  } catch {
    return res.redirect('/?steam_error=verify_failed');
  }
  if (!valid) return res.redirect('/?steam_error=invalid');

  // 3. Steam ID 추출
  const steamId = extractSteamId(query['openid.claimed_id']);
  if (!steamId) return res.redirect('/?steam_error=no_steamid');

  // 4. DB에서 유저 찾거나 생성
  let user;
  try {
    user = await prisma.user.upsert({
      where: { steamId },
      update: {},
      create: { steamId },
    });
  } catch (err) {
    console.error('[steam-callback] DB upsert 실패:', err.message, err.code);
    return res.redirect('/?steam_error=db_error');
  }

  // 5. 세션 쿠키 발행
  setSession(res, { userId: user.id, steamId, role: user.role });

  // 6. PUBG 계정 연결이 안 된 경우 → 연결 페이지로
  if (!user.pubgAccountId) {
    return res.redirect('/link-pubg');
  }

  res.redirect('/');
}
