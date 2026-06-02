import { redisGet } from '../../../utils/redis.js'

const HISTORY_KEY = 'pubg:server-status:history'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const history = (await redisGet(HISTORY_KEY)) || []
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ history })
}
