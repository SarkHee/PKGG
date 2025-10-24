// scripts/migrate-clanStats-to-db.js
// clanStats.json 데이터를 Prisma DB로 이전하는 스크립트

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../data/clanStats.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  for (const clanKey of Object.keys(data)) {
    const clan = data[clanKey];
    // upsert clan
    const dbClan = await prisma.clan.upsert({
      where: { name: clan.name },
      update: {
        leader: clan.leader,
        description: clan.description,
        announcement: clan.announcement,
        memberCount: clan.memberCount,
        avgScore: clan.avgScore,
        mainStyle: clan.mainStyle,
      },
      create: {
        name: clan.name,
        leader: clan.leader,
        description: clan.description,
        announcement: clan.announcement,
        memberCount: clan.memberCount,
        avgScore: clan.avgScore,
        mainStyle: clan.mainStyle,
        members: {
          create: clan.members.map((m) => ({
            nickname: m.nickname,
            score: m.score,
            style: m.style,
            avgDamage: m.avgDamage,
          })),
        },
      },
      include: { members: true },
    });

    // 기존 멤버 삭제 후 재삽입 (동기화)
    if (dbClan.members.length > 0) {
      await prisma.clanMember.deleteMany({ where: { clanId: dbClan.id } });
      await prisma.clanMember.createMany({
        data: clan.members.map((m) => ({
          nickname: m.nickname,
          score: m.score,
          style: m.style,
          avgDamage: m.avgDamage,
          clanId: dbClan.id,
        })),
      });
    }
    console.log(`클랜 ${clan.name} 이전 완료`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
