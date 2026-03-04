import Head from 'next/head';
import Link from 'next/link';

const sections = [
  {
    id: 1,
    title: '수집하는 정보',
    content: (
      <>
        <p className="font-semibold text-gray-700 mb-2">① 비로그인 이용자</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
          <li>이용자가 입력한 게임 닉네임</li>
          <li>접속 로그 (IP 주소, 브라우저 정보, 접속 시간 등)</li>
          <li>쿠키 정보</li>
        </ul>
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 mb-4">
          ※ 닉네임은 공개된 게임 데이터 조회 목적으로만 사용됩니다.
        </p>
        <p className="font-semibold text-gray-700 mb-2">② Steam 로그인 이용자</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
          <li>Steam ID (Steam OpenID 인증을 통해 자동 수신)</li>
          <li>Steam 프로필 닉네임</li>
          <li>Steam 프로필 이미지 URL</li>
          <li>연동된 PUBG 닉네임 (이용자가 직접 입력·연동한 경우)</li>
          <li>세션 쿠키 (로그인 상태 유지 목적, HMAC 서명된 HTTP-only 쿠키)</li>
        </ul>
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
          ※ Steam 비밀번호, 결제 정보 등 민감 정보는 수집하지 않습니다. 인증은 Valve Corporation의 Steam OpenID 2.0을 통해 처리됩니다.
        </p>
      </>
    ),
  },
  {
    id: 2,
    title: '개인정보 수집 목적',
    content: (
      <ul className="list-disc list-inside space-y-1 text-gray-600">
        <li>플레이어 전적 검색 서비스 제공</li>
        <li>Steam 로그인을 통한 회원 식별 및 세션 관리</li>
        <li>PUBG 계정 연동 및 개인화 서비스 제공</li>
        <li>AI 플레이 분석 제공</li>
        <li>서비스 개선 및 통계 분석</li>
        <li>부정 이용 방지</li>
        <li>광고 서비스 제공 (Google AdSense)</li>
      </ul>
    ),
  },
  {
    id: 3,
    title: '개인정보 보관 기간',
    content: (
      <>
        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
          <li>닉네임 검색 기록: 최대 12개월</li>
          <li>접속 로그: 최대 6개월</li>
          <li>Steam 로그인 계정 정보: 계정 삭제(탈퇴) 요청 시 즉시 삭제</li>
          <li>세션 쿠키: 브라우저 종료 또는 로그아웃 시 만료</li>
        </ul>
        <p className="text-sm text-gray-500">
          법령에 따라 보관이 필요한 경우 해당 기간 동안 보관할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: 4,
    title: '쿠키 사용 안내',
    content: (
      <>
        <p className="text-gray-600 mb-3">본 사이트는 다음 목적을 위해 쿠키를 사용합니다.</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
          <li>사용자 환경 개선</li>
          <li>방문 통계 분석</li>
          <li>광고 맞춤화 (Google AdSense)</li>
        </ul>
        <p className="text-sm text-gray-500">
          이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 사이트 하단 배너를 통해 언제든지 동의를 철회할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: 5,
    title: '제3자 제공',
    content: (
      <>
        <p className="text-gray-600 mb-3">
          본 사이트는 원칙적으로 개인정보를 외부에 제공하지 않습니다. 단, 아래의 경우 예외로 합니다.
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
          <li>Google AdSense 광고 제공</li>
          <li>Valve Corporation — Steam OpenID 2.0 인증 처리 (Steam ID, 프로필 정보 수신)</li>
          <li>KRAFTON, Inc. — PUBG 공식 API를 통한 게임 데이터 조회</li>
          <li>법령에 의거한 요청</li>
        </ul>
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
          ※ Steam 인증은 이용자가 직접 Steam 로그인 버튼을 클릭함으로써 동의한 경우에만 처리됩니다.
        </p>
      </>
    ),
  },
  {
    id: 6,
    title: '개인정보 처리 위탁',
    content: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200">수탁자</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200">위탁 업무</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 text-gray-600">Vercel</td>
              <td className="px-4 py-2 text-gray-600">서비스 호스팅 및 서버 운영</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Supabase</td>
              <td className="px-4 py-2 text-gray-600">데이터베이스 관리</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Google AdSense</td>
              <td className="px-4 py-2 text-gray-600">광고 서비스 제공</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Valve Corporation (Steam)</td>
              <td className="px-4 py-2 text-gray-600">Steam OpenID 2.0 인증 처리</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">KRAFTON, Inc.</td>
              <td className="px-4 py-2 text-gray-600">PUBG 공식 API 게임 데이터 제공</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 7,
    title: '이용자 권리',
    content: (
      <>
        <p className="text-gray-600 mb-3">이용자는 언제든지 자신의 개인정보에 대해 아래 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
          <li>열람 요청</li>
          <li>수정 요청</li>
          <li>삭제 요청</li>
        </ul>
        <p className="text-sm text-gray-500">
          요청은 아래 문의 이메일로 접수하시면 지체 없이 처리합니다.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>개인정보처리방침 | PKGG</title>
        <meta name="description" content="PKGG 개인정보처리방침 — 수집 정보, 쿠키, 광고, 이용자 권리 안내" />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <Link href="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
              ← PKGG 홈으로
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">개인정보처리방침</h1>
            <p className="text-sm text-gray-500 mt-1">시행일: 2026년 3월 3일</p>
          </div>
        </div>

        {/* 본문 */}
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* 소개 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 leading-relaxed">
              <strong>PKGG</strong>(이하 "사이트")는 이용자의 개인정보를 중요하게 생각하며, 개인정보 보호법 및
              관련 법령을 준수합니다. 본 방침은 사이트가 어떠한 정보를 수집하고, 어떻게 이용·보관·보호하는지를
              설명합니다.
            </p>
          </div>

          {/* 각 섹션 */}
          {sections.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {s.id}
                </span>
                {s.title}
              </h2>
              {s.content}
            </div>
          ))}

          {/* 문의 */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                8
              </span>
              문의
            </h2>
            <p className="text-gray-600 mb-2">개인정보 관련 문의는 아래 이메일로 연락 바랍니다.</p>
            <a
              href="mailto:sssyck123@gmail.com"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
            >
              📧 sssyck123@gmail.com
            </a>
          </div>

          {/* GDPR/PIPA 안내 */}
          <div className="bg-gray-100 rounded-xl p-5 text-sm text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-2">GDPR / 개인정보 보호법(PIPA) 안내</p>
            <p>
              본 사이트는 한국 개인정보 보호법(PIPA) 및 EU GDPR을 준수합니다. EU 거주 이용자는 데이터 이동권,
              처리 제한권, 반대권을 행사할 수 있습니다. 개인정보 처리의 법적 근거는 정당한 이익(서비스 제공) 및
              동의(광고 쿠키)입니다.
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
