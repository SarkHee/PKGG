import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';
import prisma from '../utils/prisma.js';

const POSITIONS = [
  {
    key: 'main_header',
    title: '메인 헤더 배너',
    desc: '메인 페이지 최상단, PKGG 로고가 있던 자리에 노출됩니다. 사이트 진입 시 가장 먼저 보이는 위치입니다.',
    sizeDesktop: '728 × 90px',
    sizeMobile: '320 × 50px (모바일 별도 등록 가능)',
    mock: (
      <div className="w-full rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
        <div className="h-3 bg-gray-800 flex items-center gap-1 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        </div>
        <div className="p-4 flex flex-col items-center gap-2">
          <div className="w-full max-w-[280px] h-8 rounded bg-blue-600/70 flex items-center justify-center text-[10px] font-bold text-white">
            728×90 배너 위치
          </div>
          <div className="w-24 h-2 rounded bg-gray-700" />
          <div className="w-16 h-2 rounded bg-gray-800" />
        </div>
      </div>
    ),
  },
  {
    key: 'player_card_top',
    title: '플레이어 카드 상단 배너',
    desc: '플레이어 전적 상세 페이지에서, 유저 정보 카드(닉네임·티어·스탯) 바로 위에 노출됩니다. 전적 조회는 PKGG에서 가장 많이 방문되는 페이지입니다.',
    sizeDesktop: '300 × 250px (미디엄 렉탱글)',
    sizeMobile: '동일 이미지가 반응형으로 축소 표시',
    mock: (
      <div className="w-full rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
        <div className="h-3 bg-gray-800 flex items-center gap-1 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        </div>
        <div className="p-4 flex flex-col items-center gap-2">
          <div className="w-32 h-24 rounded bg-blue-600/70 flex items-center justify-center text-[10px] font-bold text-white text-center px-2">
            300×250 배너 위치
          </div>
          <div className="w-full h-10 rounded bg-gray-700 flex items-center px-2 gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-600 flex-shrink-0" />
            <span className="w-20 h-2 rounded bg-gray-600" />
          </div>
        </div>
      </div>
    ),
  },
];

export async function getServerSideProps() {
  try {
    const [totalPlayers, totalClans] = await Promise.all([
      prisma.playerCache.count(),
      prisma.clan.count(),
    ]);
    return { props: { totalPlayers, totalClans } };
  } catch {
    return { props: { totalPlayers: null, totalClans: null } };
  }
}

export default function AdInquiryPage({ totalPlayers, totalClans }) {
  return (
    <>
      <Head>
        <title>광고 문의 | PKGG</title>
        <meta name="description" content="PKGG 배너 광고 위치, 권장 사이즈, 트래픽 지표를 안내합니다." />
      </Head>
      <Header />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* 히어로 */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-black tracking-tight mb-4">📢 광고 문의</h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              PUBG 플레이어·클랜을 대상으로 한 배너 광고를 안내드립니다.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

          {/* 트래픽 지표 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">트래픽 지표</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">과장 없이 서비스 DB 기준 실측 수치만 제공합니다.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {totalPlayers != null ? totalPlayers.toLocaleString() : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">누적 조회된 플레이어 수</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {totalClans != null ? totalClans.toLocaleString() : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">등록된 클랜 수</div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-3">
              월간 방문자·페이지뷰 등 추가 트래픽 지표가 필요하시면 문의 시 요청해주세요 — 확인 후 안내드립니다.
            </p>
          </div>

          {/* 배너 위치 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">배너 위치 안내</h2>
            <div className="space-y-5">
              {POSITIONS.map((p) => (
                <div key={p.key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{p.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{p.desc}</p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <div><span className="font-semibold text-gray-700 dark:text-gray-300">데스크톱:</span> {p.sizeDesktop}</div>
                        <div><span className="font-semibold text-gray-700 dark:text-gray-300">모바일:</span> {p.sizeMobile}</div>
                      </div>
                    </div>
                    <div>{p.mock}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 진행 방식 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">진행 방식</h2>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
              <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">1.</span>아래 버튼으로 광고 문의를 보내주세요 (원하는 위치·게재 기간·예산을 함께 적어주시면 빠르게 안내드립니다)</li>
              <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">2.</span>확인 후 이메일 또는 남겨주신 연락처로 답변드립니다</li>
              <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">3.</span>협의된 이미지·링크로 지정한 기간 동안 배너가 노출됩니다</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">광고 문의하기</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">희망 위치·기간·예산을 남겨주시면 빠르게 안내해드립니다.</p>
            </div>
            <Link
              href="/contact?topic=ad"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              📢 광고 문의하기
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
