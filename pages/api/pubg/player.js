import axios from 'axios';

export default async function handler(req, res) {
  const { nickname } = req.query;
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  for (const shard of shards) {
    try {
      const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      });

      if (response.data.data.length > 0) {
        return res.status(200).json({
          player: response.data.data[0],
          shardId: shard,
        });
      }
    } catch (error) {
      console.warn(`Failed for shard ${shard}`);
    }
  }

  return res.status(404).json({ error: 'Player not found' });
}
