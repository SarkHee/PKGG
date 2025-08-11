// pages/api/pubg/clan-members.js - 클랜 멤버 찾기 API
import axios from 'axios';

export default async function handler(req, res) {
  const { playerNames, shard = 'steam' } = req.query;
  
  if (!playerNames) {
    return res.status(400).json({ error: 'playerNames is required (comma-separated)' });
  }

  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIToicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  try {
    const names = playerNames.split(',').map(name => name.trim()).slice(0, 6); // PUBG API 한번에 최대 6명
    const nameParams = names.join(',');
    
    const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nameParams}`, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
    });

    const players = response.data.data;
    const clanGroups = {};
    const playersWithClans = [];

    // 플레이어들을 클랜별로 그룹화
    for (const player of players) {
      const clanId = player.attributes.clanId;
      
      if (clanId) {
        if (!clanGroups[clanId]) {
          clanGroups[clanId] = {
            clanId,
            members: [],
            clanInfo: null
          };
        }
        clanGroups[clanId].members.push(player);
        playersWithClans.push(player);
      }
    }

    // 각 클랜의 정보 가져오기
    for (const clanId of Object.keys(clanGroups)) {
      try {
        const clanResponse = await axios.get(`https://api.pubg.com/shards/${shard}/clans/${clanId}`, {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
        });
        clanGroups[clanId].clanInfo = clanResponse.data.data;
      } catch (clanError) {
        console.warn(`Failed to fetch clan info for ${clanId}`);
      }
    }

    return res.status(200).json({
      requestedPlayers: names,
      foundPlayers: players.length,
      playersWithClans: playersWithClans.length,
      clans: Object.values(clanGroups),
      playersWithoutClans: players.filter(p => !p.attributes.clanId),
      shard: shard,
    });

  } catch (error) {
    console.error('Clan members fetch error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch clan members information' });
  }
}
