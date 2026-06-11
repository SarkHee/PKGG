/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'wstatic-prod.pubg.com', 'wstatic-prod-boc.krafton.com'],
  },
  async rewrites() {
    return [
      { source: '/ads.txt', destination: '/api/ads-txt' },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://*.googletagmanager.com https://*.google-analytics.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://adservice.google.com https://www.googletagservices.com https://*.adtrafficquality.google https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googletagmanager.com https://*.google-analytics.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.gstatic.com https://lh3.googleusercontent.com https://wstatic-prod.pubg.com https://wstatic-prod-boc.krafton.com https://*.pstatic.net https://livecloud-thumb.akamaized.net https://static-cdn.jtvnw.net https://*.twitch.tv https://nng-phinf.pstatic.net",
              "media-src 'self' blob:",
              "connect-src 'self' https://*.googletagmanager.com https://*.google-analytics.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://*.adtrafficquality.google https://va.vercel-scripts.com",
              "frame-src https://*.googletagmanager.com https://*.googlesyndication.com https://*.doubleclick.net https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
