// pages/api/clan/[clanName].js

import { PrismaClient } from '@prisma/client';

// PUBG API 키를 환경 변수에서 가져옵니다.
// NOTE: `Bearer` 접두사는 Authorization 헤더를 보낼 때만 추가해야 합니다.
// 환경 변수 자체에는 순수한 API 키만 있어야 합니다.
const PUBG_API_KEY_RAW = process.env.PUBG_API_KEY; // <--- 이 부분 중요!
const PUBG_BASE_URL = 'https://api.pubg.com/shards';
const PUBG_SHARD = 'steam'; // 또는 'kakao' 등 사용하시는 샤드

// 플레이어 닉네임으로 PUBG ID를 조회하는 헬퍼 함수
async function getPubgIdByNickname(nickname) {
  if (!PUBG_API_KEY_RAW) {
    console.error('PUBG_API_KEY 환경 변수가 설정되지 않았습니다.');
    return null;
  }
  try {
    const response = await fetch(`${PUBG_BASE_URL}/${PUBG_SHARD}/players?filter[playerNames]=${encodeURIComponent(nickname)}`, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY_RAW}`, // <--- 여기에서 Bearer 추가!
        Accept: 'application/vnd.api+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`PUBG API: 플레이어 '${nickname}'를 찾을 수 없습니다 (404).`);
        return null;
      }
      const errorText = await response.text(); // 오류 메시지 로깅
      throw new Error(`PUBG API 에러: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0]?.id || null;
  } catch (error) {
    console.error(`[getPubgIdByNickname] PUBG ID 조회 중 오류 발생 (${nickname}):`, error);
    return null;
  }
}

// Next.js API Route의 기본 핸들러 함수
export default async function handler(req, res) {
  const { clanName } = req.query;

  if (!clanName) {
    return res.status(400).json({ error: '클랜 이름이 필요합니다.' });
  }
  const prisma = new PrismaClient();
  let targetClan;
  try {
    targetClan = await prisma.clan.findUnique({
      where: { name: clanName },
      include: { members: true }
    });
  } catch (error) {
    console.error('[API Handler] DB 읽기 실패:', error);
    return res.status(500).json({ error: 'DB에서 클랜 정보를 불러올 수 없습니다.' });
  }
  if (!targetClan) {
    return res.status(404).json({ error: `클랜 '${clanName}'을(를) 찾을 수 없습니다. 클랜 이름을 확인해주세요.` });
  }

  if (req.method === 'GET') {
    // DB에서 멤버 정보 반환
    return res.status(200).json({
      clan: {
        name: targetClan.name,
        leader: targetClan.leader,
        description: targetClan.description,
        announcement: targetClan.announcement,
        memberCount: targetClan.memberCount,
        avgScore: targetClan.avgScore,
        mainStyle: targetClan.mainStyle,
        members: targetClan.members.map(m => ({
          nickname: m.nickname,
          score: m.score,
          style: m.style,
          avgDamage: m.avgDamage
        }))
      }
    });
  } else if (req.method === 'POST') {
    const { nickname, score = 0, style = '-', avgDamage = 0 } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: '추가할 클랜원 닉네임이 필요합니다.' });
    }
    // 이미 존재하는지 확인
    const exists = targetClan.members.some(m => m.nickname === nickname);
    if (exists) {
      return res.status(409).json({ error: `'${nickname}'은(는) 이미 클랜에 등록되어 있습니다. 다른 닉네임을 시도해주세요.` });
    }
    // PUBG ID 확인 (옵션)
    // const pubgId = await getPubgIdByNickname(nickname);
    // if (!pubgId) {
    //   return res.status(400).json({ error: `'${nickname}'은(는) 유효한 PUBG 플레이어 닉네임이 아닙니다.` });
    // }
    try {
      await prisma.clanMember.create({
        data: {
          nickname,
          score,
          style,
          avgDamage,
          clanId: targetClan.id
        }
      });
      // 멤버 카운트 갱신
      await prisma.clan.update({
        where: { id: targetClan.id },
        data: { memberCount: targetClan.memberCount + 1 }
      });
      return res.status(201).json({ message: `'${nickname}' 클랜에 성공적으로 추가되었습니다.` });
    } catch (error) {
      console.error('[API Handler] DB 쓰기 실패 (POST):', error);
      return res.status(500).json({ error: 'DB 업데이트에 실패했습니다.' });
    }
  } else if (req.method === 'DELETE') {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: '삭제할 클랜원 닉네임이 필요합니다.' });
    }
    const member = targetClan.members.find(m => m.nickname === nickname);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    try {
      await prisma.clanMember.delete({ where: { id: member.id } });
      await prisma.clan.update({
        where: { id: targetClan.id },
        data: { memberCount: targetClan.memberCount - 1 }
      });
      return res.status(200).json({ message: `'${nickname}' 클랜에서 성공적으로 삭제되었습니다.` });
    } catch (error) {
      console.error('[API Handler] DB 쓰기 실패 (DELETE):', error);
      return res.status(500).json({ error: 'DB 업데이트에 실패했습니다.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}