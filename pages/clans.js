// /pages/clans.js
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import Layout from '../components/Layout';

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'data', 'clans.json');
  const file = fs.readFileSync(filePath, 'utf-8');
  const clans = JSON.parse(file);

  return {
    props: { clans },
  };
}

export default function ClanList({ clans }) {
  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold mb-4">클랜 목록</h1>
        <ul className="list-disc ml-5 space-y-2">
          {Object.entries(clans).map(([clanName, clanInfo]) => (
            <li key={clanName}>
              <Link href={`/clan/${clanName}`}>
                <span className="text-blue-600 hover:underline cursor-pointer">
                  {clanName} ({clanInfo.members?.length ?? 0}명)
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
