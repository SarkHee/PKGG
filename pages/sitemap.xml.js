// pages/sitemap.xml.js — 동적 sitemap 생성
// 빌드/요청 시 XML로 렌더링되어 /sitemap.xml 경로로 접근 가능

const BASE_URL = 'https://pk.gg';

function generateSiteMap(clans) {
  const now = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/clan-analytics', changefreq: 'daily', priority: '0.9' },
    { url: '/weapon-test', changefreq: 'weekly', priority: '0.7' },
    { url: '/forum', changefreq: 'daily', priority: '0.8' },
    { url: '/privacy', changefreq: 'monthly', priority: '0.3' },
  ];

  const staticEntries = staticPages
    .map(
      ({ url, changefreq, priority }) => `
  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('');

  const clanEntries = clans
    .map(
      (name) => `
  <url>
    <loc>${BASE_URL}/clan/${encodeURIComponent(name)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${clanEntries}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  let clans = [];

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const clanRecords = await prisma.clan.findMany({
        select: { name: true },
        orderBy: { avgScore: 'desc' },
        take: 500,
      });
      clans = clanRecords.map((c) => c.name);
    } finally {
      await prisma.$disconnect();
    }
  } catch (e) {
    console.error('sitemap 클랜 조회 실패:', e.message);
  }

  const sitemap = generateSiteMap(clans);

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
