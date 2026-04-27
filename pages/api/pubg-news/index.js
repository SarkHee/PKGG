// pages/api/pubg-news/index.js
// 뉴스 기능 비활성화 — 메인 페이지에서 제거됨

export default function handler(req, res) {
  return res.status(200).json({ success: true, data: [], count: 0 })
}
