// pages/api/cron/clan-update.js
// Vercel Cron 전용 엔드포인트 - 클랜 랭킹 자동 업데이트 (12:00, 18:00 KST)

import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  // Vercel Cron 인증 확인
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    console.log('⏰ [Cron] 클랜 랭킹 자동 업데이트 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

    const clans = await prisma.clan.findMany({ include: { members: true } });
    const updatedClans = [];

    for (const clan of clans) {
      if (clan.members.length === 0) {
        // 마지막 멤버가 탈퇴/재소속되어 클랜이 비면 이전 스냅샷이 박제되지 않도록 0으로 리셋
        // (memberCount 0일 때 avgScore도 0으로 두는 것은 telemetry-batch.js 등 기존 컨벤션과 동일)
        if (clan.avgScore !== 0 || clan.memberCount !== 0) {
          await prisma.clan.update({
            where: { id: clan.id },
            data: { avgScore: 0, memberCount: 0 },
          });
          updatedClans.push({ name: clan.name, avgScore: 0, memberCount: 0 });
        }
        continue;
      }

      const activeMembers = clan.members.filter((m) => (m.score || 0) > 0);
      const source = activeMembers.length > 0 ? activeMembers : clan.members;

      const avgScore = Math.round(
        source.reduce((s, m) => s + (m.score || 0), 0) / source.length
      );

      await prisma.clan.update({
        where: { id: clan.id },
        data: { avgScore, memberCount: clan.members.length },
      });

      updatedClans.push({ name: clan.name, avgScore, memberCount: clan.members.length });
    }

    // 실행 로그 저장
    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType: 'cron_clan_ranking',
          updatedCount: updatedClans.length,
          updateTime: new Date(),
          status: 'success',
          details: JSON.stringify({
            durationMs: Date.now() - startTime,
            totalProcessed: clans.length,
            topClans: updatedClans.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5),
          }),
        },
      });
    } catch (logErr) {
      console.warn('[Cron] 로그 저장 실패:', logErr.message);
    }

    console.log(`✅ [Cron] 완료: ${updatedClans.length}개 클랜 (${Date.now() - startTime}ms)`);

    return res.status(200).json({
      success: true,
      updatedCount: updatedClans.length,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('❌ [Cron] 클랜 랭킹 업데이트 실패:', error.message);

    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType: 'cron_clan_ranking',
          updatedCount: 0,
          updateTime: new Date(),
          status: 'error',
          errorMessage: error.message,
          details: JSON.stringify({ error: error.stack }),
        },
      });
    } catch {}

    return res.status(500).json({ success: false, error: error.message });
  }
}
