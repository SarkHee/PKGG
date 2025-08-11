// pages/api/pubg/clan.js - 클랜 정보 조회 API
import axios from 'axios';

export default async function handler(req, res) {
  const { clanId, shard = 'steam' } = req.query;
  
  if (!clanId) {
    return res.status(400).json({ error: 'clanId is required' });
  }

  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

  try {
    const response = await axios.get(`https://api.pubg.com/shards/${shard}/clans/${clanId}`, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
    });

    return res.status(200).json({
      clan: response.data.data,
      shard: shard,
    });
  } catch (error) {
    console.error('Clan fetch error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    return res.status(500).json({ error: 'Failed to fetch clan information' });
  }
}
