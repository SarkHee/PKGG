// pages/api/admin/auth.js
// 관리자 비밀번호 검증 — ADMIN_PASSWORD 환경변수와 비교

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { password } = req.body;

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' });
  }

  if (password === process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: '비밀번호가 틀렸습니다.' });
}
