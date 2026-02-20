// pages/api/weapon-test/save.js
// POST  → 결과 저장, { sessionId, nickname, platform, pubgPlayerId, resultType, resultName, similarityScore, surveyVector }
// GET   → ?id=<sessionId> 로 결과 조회

import { PrismaClient } from '@prisma/client';

let prisma;
if (!globalThis.__prisma) globalThis.__prisma = new PrismaClient();
prisma = globalThis.__prisma;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      const row = await prisma.weaponTestResult.findUnique({ where: { sessionId: id } });
      if (!row) return res.status(404).json({ error: 'not found' });
      return res.status(200).json(row);
    } catch (e) {
      console.error('weapon-test GET error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const {
      sessionId,
      nickname,
      platform,
      pubgPlayerId,
      resultType,
      resultName,
      similarityScore,
      surveyVector,
    } = req.body || {};

    if (!sessionId || !resultType) {
      return res.status(400).json({ error: 'sessionId and resultType are required' });
    }

    try {
      const row = await prisma.weaponTestResult.upsert({
        where: { sessionId },
        update: { nickname, platform, pubgPlayerId, resultType, resultName, similarityScore, surveyVector },
        create: { sessionId, nickname, platform, pubgPlayerId, resultType, resultName, similarityScore, surveyVector },
      });
      return res.status(200).json({ id: row.id, sessionId: row.sessionId });
    } catch (e) {
      console.error('weapon-test POST error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
