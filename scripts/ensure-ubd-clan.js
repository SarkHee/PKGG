// scripts/ensure-ubd-clan.js
// DB에 UBD 클랜이 없으면 자동으로 추가

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clanName = 'UBD';
  const exists = await prisma.clan.findUnique({ where: { name: clanName } });
  if (exists) {
    console.log('UBD 클랜이 이미 DB에 존재합니다.');
    return;
  }
  await prisma.clan.create({
    data: {
      name: clanName,
      leader: 'parksrk',
      description: '우리는 UBD입니다.',
      announcement: '이번 주 훈련은 금요일!',
      memberCount: 0,
      avgScore: 0,
      mainStyle: '-',
    },
  });
  console.log('UBD 클랜을 DB에 추가했습니다.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
