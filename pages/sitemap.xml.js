// pages/sitemap.xml.js — 동적 sitemap 생성
const BASE_URL = 'https://pkgg.vercel.app';

function generateSiteMap(clans, forumCategories) {
  const now = new Date().toISOString().split('T')[0];

  const staticPages = [
    // 핵심
    { url: '/',                       changefreq: 'daily',   priority: '1.0' },
    { url: '/clans',                  changefreq: 'daily',   priority: '0.9' },
    { url: '/clan-analytics',         changefreq: 'daily',   priority: '0.9' },
    { url: '/compare',                changefreq: 'weekly',  priority: '0.8' },
    // 커뮤니티
    { url: '/forum',                  changefreq: 'daily',   priority: '0.8' },
    { url: '/forum/create',           changefreq: 'monthly', priority: '0.5' },
    { url: '/party',                  changefreq: 'daily',   priority: '0.8' },
    { url: '/party/create',           changefreq: 'monthly', priority: '0.5' },
    { url: '/settings-share',         changefreq: 'daily',   priority: '0.7' },
    { url: '/settings-share/create',  changefreq: 'monthly', priority: '0.5' },
    { url: '/notices',                changefreq: 'weekly',  priority: '0.6' },
    // 무기/게임 정보
    { url: '/weapon-test',            changefreq: 'weekly',  priority: '0.8' },
    { url: '/weapon-damage',          changefreq: 'monthly', priority: '0.7' },
    { url: '/weapon-meta',            changefreq: 'monthly', priority: '0.7' },
    { url: '/pubg-news',              changefreq: 'daily',   priority: '0.7' },
    // 분석/훈련 도구
    { url: '/sensitivity',            changefreq: 'monthly', priority: '0.7' },
    { url: '/sensitivity-analyzer',   changefreq: 'monthly', priority: '0.7' },
    { url: '/sens-preset',            changefreq: 'monthly', priority: '0.6' },
    { url: '/aim-trainer',            changefreq: 'monthly', priority: '0.7' },
    { url: '/recoil-pattern',         changefreq: 'monthly', priority: '0.7' },
    { url: '/crosshair-trainer',      changefreq: 'monthly', priority: '0.7' },
    { url: '/peek-trainer',           changefreq: 'monthly', priority: '0.7' },
    { url: '/playstyle-matchup',      changefreq: 'monthly', priority: '0.6' },
    { url: '/daily-goals',            changefreq: 'monthly', priority: '0.6' },
    { url: '/clan-war',               changefreq: 'weekly',  priority: '0.6' },
    { url: '/pubg-survivors',         changefreq: 'monthly', priority: '0.6' },
    // 정보 페이지
    { url: '/about',                  changefreq: 'monthly', priority: '0.4' },
    { url: '/terms',                  changefreq: 'monthly', priority: '0.3' },
    { url: '/privacy',                changefreq: 'monthly', priority: '0.3' },
    { url: '/contact',                changefreq: 'monthly', priority: '0.3' },
    { url: '/inquiry',                changefreq: 'monthly', priority: '0.3' },
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

  const categoryEntries = forumCategories
    .map(
      (id) => `  <url>
    <loc>${BASE_URL}/forum/category/${encodeURIComponent(id)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n');

  const clanEntries = clans
    .map(
      (name) => `  <url>
    <loc>${BASE_URL}/clan/${encodeURIComponent(name)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${categoryEntries}
${clanEntries}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  let clans = [];
  let forumCategories = [];

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const [clanRecords, categoryRecords] = await Promise.all([
        prisma.clan.findMany({
          select: { name: true },
          orderBy: { avgScore: 'desc' },
          take: 500,
        }),
        prisma.forumCategory.findMany({
          select: { id: true },
        }),
      ]);
      clans = clanRecords.map((c) => c.name);
      forumCategories = categoryRecords.map((c) => c.id);
    } finally {
      await prisma.$disconnect();
    }
  } catch (e) {
    console.error('sitemap DB 조회 실패:', e.message);
  }

  const sitemap = generateSiteMap(clans, forumCategories);

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
