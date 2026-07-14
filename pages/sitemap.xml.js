// pages/sitemap.xml.js — 정적 sitemap 생성
// 클랜 상세 페이지(/clan/[clanName])는 noindex 처리돼 있어 여기 포함하지 않는다.
const BASE_URL = 'https://pkgg.vercel.app';

function generateSiteMap() {
  const now = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/',                     changefreq: 'daily',   priority: '1.0' },
    { url: '/clan-analytics',       changefreq: 'daily',   priority: '0.9' },
    { url: '/leaderboard',          changefreq: 'daily',   priority: '0.8' },
    { url: '/compare',              changefreq: 'weekly',  priority: '0.8' },
    { url: '/forum',                changefreq: 'daily',   priority: '0.8' },
    { url: '/party',                changefreq: 'daily',   priority: '0.8' },
    { url: '/clan-play',            changefreq: 'daily',   priority: '0.8' },
    { url: '/weapon-test',          changefreq: 'weekly',  priority: '0.8' },
    { url: '/weapon-damage',        changefreq: 'monthly', priority: '0.7' },
    { url: '/weapon-meta-live',     changefreq: 'daily',   priority: '0.7' },
    { url: '/awards',               changefreq: 'weekly',  priority: '0.7' },
    { url: '/settings-share',       changefreq: 'daily',   priority: '0.7' },
    { url: '/pubg-news',            changefreq: 'daily',   priority: '0.7' },
    { url: '/streamers',            changefreq: 'daily',   priority: '0.6' },
    { url: '/server-status',        changefreq: 'daily',   priority: '0.6' },
    { url: '/map-stats',            changefreq: 'weekly',  priority: '0.6' },
    { url: '/maps',                 changefreq: 'monthly', priority: '0.6' },
    { url: '/route-planner',        changefreq: 'monthly', priority: '0.6' },
    { url: '/aim-trainer',          changefreq: 'monthly', priority: '0.7' },
    { url: '/sensitivity-analyzer', changefreq: 'monthly', priority: '0.7' },
    { url: '/recoil-pattern',       changefreq: 'monthly', priority: '0.7' },
    { url: '/recoil-quiz',          changefreq: 'monthly', priority: '0.7' },
    { url: '/crosshair-trainer',    changefreq: 'monthly', priority: '0.7' },
    { url: '/peek-trainer',         changefreq: 'monthly', priority: '0.7' },
    { url: '/drop-calculator',      changefreq: 'monthly', priority: '0.7' },
    { url: '/daily-goals',          changefreq: 'monthly', priority: '0.6' },
    { url: '/sens-preset',          changefreq: 'monthly', priority: '0.5' },
    { url: '/pubg-survivors',       changefreq: 'monthly', priority: '0.5' },
    { url: '/about',                changefreq: 'monthly', priority: '0.4' },
    { url: '/privacy',              changefreq: 'monthly', priority: '0.3' },
    { url: '/terms',                changefreq: 'monthly', priority: '0.3' },
    { url: '/contact',              changefreq: 'monthly', priority: '0.3' },
  ];

  const staticEntries = staticPages
    .map(
      ({ url, changefreq, priority }) => `  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const sitemap = generateSiteMap();

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
