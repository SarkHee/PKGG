// pages/api/bulk-search.js
// 여러 닉네임을 한 번에 검색하는 API

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nicknames } = req.body;

  if (!nicknames || !Array.isArray(nicknames)) {
    return res.status(400).json({ error: 'nicknames 배열이 필요합니다' });
  }

  const results = [];
  
  try {
    for (const nickname of nicknames.slice(0, 20)) { // 최대 20명까지
      try {
        // 내부 API 호출
        const response = await axios.get(`http://localhost:3000/api/pubg/player?nickname=${nickname}`);
        
        if (response.data.player) {
          results.push({
            nickname,
            status: 'found',
            clan: response.data.clan ? {
              name: response.data.clan.attributes.clanName,
              tag: response.data.clan.attributes.clanTag,
              level: response.data.clan.attributes.clanLevel,
              memberCount: response.data.clan.attributes.clanMemberCount
            } : null
          });
        }
        
        // API 제한 방지
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          nickname,
          status: 'not_found',
          error: error.response?.status === 404 ? 'Player not found' : 'API Error'
        });
      }
    }

    return res.status(200).json({ 
      success: true,
      results,
      total: results.length,
      found: results.filter(r => r.status === 'found').length
    });

  } catch (error) {
    console.error('일괄 검색 오류:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
