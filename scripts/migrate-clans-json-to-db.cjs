// scripts/migrate-clans-json-to-db.cjs
// clans.json의 모든 클랜/멤버를 DB에 누락 없이 추가 (CommonJS)

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../data/clans.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  for (const clanKey of Object.keys(data)) {
    const clan = data[clanKey];
    // 클랜 upsert
    let dbClan = await prisma.clan.upsert({
      where: { name: clanKey },
      update: {
        leader: clan.leader,
        description: clan.description,
        announcement: clan.announcement,
      },
      create: {
        name: clanKey,
        leader: clan.leader,
        description: clan.description,
        announcement: clan.announcement,
        memberCount: clan.members.length,
      },
    });

    // 멤버 동기화: 이미 있으면 skip, 없으면 추가
    for (const nickname of clan.members) {
      const exists = await prisma.clanMember.findFirst({
        where: { nickname, clanId: dbClan.id }
      });
      if (!exists) {
        await prisma.clanMember.create({
          data: {
            nickname,
            score: 0,
            style: '-',
            avgDamage: 0,
            clanId: dbClan.id
          }
        });
      }
    }
    // 멤버 카운트 갱신
    const memberCount = await prisma.clanMember.count({ where: { clanId: dbClan.id } });
    await prisma.clan.update({ where: { id: dbClan.id }, data: { memberCount } });
    console.log(`클랜 ${clanKey} 동기화 완료 (${memberCount}명)`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
