// /pages/clans.js
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import Layout from '../components/Layout';

export async function getServerSideProps() {
  const prisma = new PrismaClient();
  const clans = await prisma.clan.findMany({ include: { members: true } });
  return {
    props: { clans: clans.map(clan => ({
      name: clan.name,
      memberCount: clan.memberCount,
      members: clan.members
    })) },
  };
}

export default function ClanList({ clans }) {
  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold mb-4">클랜 목록</h1>
        <ul className="list-disc ml-5 space-y-2">
          {clans.map(clan => (
            <li key={clan.name}>
              <Link href={`/clan/${clan.name}`}>
                <span className="text-blue-600 hover:underline cursor-pointer">
                  {clan.name} ({clan.members?.length ?? 0}명)
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
