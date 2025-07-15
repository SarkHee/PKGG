// pages/api/clans/index.js (모든 클랜 목록을 반환하는 API)

import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const clanFilePath = path.join(process.cwd(), 'data', 'clans.json');

  if (req.method === 'GET') {
    let allClans = {};
    try {
      const clanRaw = await fs.readFile(clanFilePath, 'utf-8');
      allClans = JSON.parse(clanRaw);
      return res.status(200).json({ clans: allClans });
    } catch (error) {
      console.error('[API Handler] 클랜 파일 읽기 실패:', error);
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: '클랜 데이터 파일을 찾을 수 없습니다. 경로를 확인해주세요.' });
      }
      return res.status(500).json({ error: '클랜 데이터 파일을 불러올 수 없습니다. 파일 형식 또는 서버 로그를 확인해주세요.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}