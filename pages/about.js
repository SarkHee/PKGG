import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';

const FEATURES = [
  {
    icon: '🔍',
    title: '플레이어 전적 조회',
    desc: 'Steam / Kakao 서버 플레이어의 시즌 통계, 랭크, 무기 숙련도, 생존 분석을 한눈에 확인합니다.',
  },
  {
    icon: '👥',
    title: '클랜 분석',
    desc: '클랜 멤버 전체 통계를 집계하고 MMR·K/D·Top10 등 주요 지표로 클랜 역량을 분석합니다.',
  },
  {
    icon: '🎯',
    title: '무기 성향 테스트',
    desc: '12가지 플레이스타일 중 나만의 무기 성향을 진단하고 결과를 친구들과 공유해보세요.',
  },
  {
    icon: '⚔️',
    title: '무기 데미지 표',
    desc: '57종 무기의 공식 데미지·RPM·DPS를 비교하고, 방어구/헬멧 시뮬레이터로 킬샷 조건을 확인합니다.',
  },
  {
    icon: '💬',
    title: '커뮤니티 포럼',
    desc: '전략, 팁, 클랜 모집, 자유 토크 등 다양한 주제로 배그 플레이어들과 소통합니다.',
  },
  {
    icon: '📰',
    title: '배그 뉴스',
    desc: 'PUBG 공식 업데이트와 패치 노트를 빠르게 확인합니다.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About PKGG | PUBG 전적 분석 플랫폼</title>
        <meta name="description" content="PKGG는 PUBG 플레이어 전적 조회, 클랜 분석, 무기 성향 테스트를 제공하는 무료 커뮤니티 플랫폼입니다." />
      </Head>
      <Header />

      <div className="min-h-screen bg-gray-50">
        {/* 히어로 */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-black tracking-tight mb-4">PKGG</h1>
            <p className="text-lg text-gray-300 leading-relaxed">
              PUBG 플레이어를 위한 무료 전적 분석 & 커뮤니티 플랫폼
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

          {/* 소개 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">PKGG란?</h2>
            <p className="text-gray-600 leading-relaxed">
              PKGG는 PUBG(배틀그라운드) 플레이어들을 위해 만들어진 무료 분석 플랫폼입니다.
              PUBG 공식 API를 활용해 실시간 전적 데이터를 제공하며, 클랜 분석·무기 성향 테스트·데미지 표 등
              게임 실력 향상에 도움이 되는 다양한 도구를 제공합니다.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              별도 회원가입 없이 누구나 자유롭게 이용할 수 있습니다.
            </p>
          </div>

          {/* 주요 기능 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">주요 기능</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 데이터 출처 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">데이터 출처</h2>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span>전적 데이터: PUBG 공식 API (api.pubg.com)</li>
              <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span>무기 데이터: PUBG 공식 패치노트 (pubg.com/ko)</li>
              <li className="flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span>뉴스: PUBG 공식 공지사항 RSS</li>
            </ul>
          </div>

          {/* 면책 고지 */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <h2 className="text-sm font-bold text-amber-800 mb-2">면책 고지</h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              PKGG는 Krafton(크래프톤) 또는 PUBG Corp와 공식적으로 제휴된 서비스가 아닙니다.
              PUBG® 및 BATTLEGROUNDS®는 KRAFTON, Inc.의 등록 상표입니다.
              본 사이트는 팬 제작 비공식 서비스이며, 게임 데이터는 공개 API를 통해 제공됩니다.
            </p>
          </div>

          {/* 연락처 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">문의 & 피드백</h2>
              <p className="text-sm text-gray-500">버그 제보, 기능 제안, 기타 문의는 언제든지 연락해주세요.</p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              📧 문의하기
            </Link>
          </div>

        </div>

      </div>
    </>
  );
}
