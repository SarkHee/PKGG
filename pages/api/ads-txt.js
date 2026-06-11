export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.send('google.com, pub-7884456727026548, DIRECT, f08c47fec0942fa0')
}
