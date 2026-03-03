import Head from 'next/head';
import Link from 'next/link';

const sections = [
  {
    id: 1,
    title: '서비스 개요',
    content: (
      <p className="text-gray-600 leading-relaxed">
        PK.GG(이하 "사이트")는 PUBG 플레이어 전적 조회, 클랜 분석, 무기 성향 테스트, 커뮤니티 포럼 등을
        제공하는 무료 비공식 팬 서비스입니다. 본 약관은 사이트 이용 시 적용되는 조건을 규정합니다.
      </p>
    ),
  },
  {
    id: 2,
    title: 'Steam 계정 기반 인증',
    content: (
      <>
        <p className="text-gray-600 mb-3">
          PK.GG는 Steam OpenID 2.0을 통한 로그인 기능을 제공합니다. 이와 관련하여 아래 사항을 준수해야 합니다.
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-gray-600 mb-3">
          <li>로그인은 이용자 본인 소유의 Steam 계정을 사용해야 합니다.</li>
          <li>타인의 Steam 계정을 이용하거나 계정을 도용하는 행위를 엄격히 금지합니다.</li>
          <li>PUBG 닉네임 연동 시 실제 본인이 사용하는 인게임 계정을 등록해야 합니다.</li>
          <li>계정 삭제(탈퇴)를 원하는 경우 문의 이메일로 요청할 수 있습니다.</li>
        </ul>
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
          ※ PK.GG는 Steam 비밀번호를 저장하지 않습니다. 인증은 Valve Corporation의 Steam OpenID 서버를 통해 처리됩니다.
          PK.GG는 Valve Corporation 또는 KRAFTON, Inc.와 공식 제휴 관계가 없습니다.
        </p>
      </>
    ),
  },
  {
    id: 3,
    title: '서비스 이용',
    content: (
      <>
        <ul className="list-disc list-inside space-y-1.5 text-gray-600 mb-3">
          <li>본 서비스는 개인의 비상업적 이용 목적으로만 사용 가능합니다.</li>
          <li>자동화 스크립트, 크롤러, 봇 등을 이용한 대량 요청을 금지합니다.</li>
          <li>서비스를 통해 획득한 데이터를 재배포하거나 상업적으로 이용하는 것을 금지합니다.</li>
          <li>사이트 시스템에 대한 해킹, 침해 시도를 금지합니다.</li>
        </ul>
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
          ※ 사이트에 표시되는 PUBG 전적·통계 데이터는 KRAFTON 공식 API 기반의 참고 정보로, 공식 수치와 차이가 있을 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: 4,
    title: '커뮤니티 포럼 이용 규칙',
    content: (
      <>
        <p className="text-gray-600 mb-3">포럼에 게시글 및 댓글 작성 시 아래 규칙을 준수해야 합니다.</p>
        <ul className="list-disc list-inside space-y-1.5 text-gray-600">
          <li>욕설, 비방, 혐오 표현을 포함한 게시물을 금지합니다.</li>
          <li>타인의 개인정보를 포함한 게시물을 금지합니다.</li>
          <li>허위 사실 유포, 스팸성 게시물을 금지합니다.</li>
          <li>저작권을 침해하는 이미지·텍스트를 게시하는 것을 금지합니다.</li>
          <li>광고, 홍보, 불법 정보를 포함한 게시물을 금지합니다.</li>
        </ul>
        <p className="text-sm text-gray-500 mt-3 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
          ※ 규칙 위반 게시물은 예고 없이 삭제될 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: 5,
    title: '지식재산권',
    content: (
      <p className="text-gray-600 leading-relaxed">
        PUBG® 및 BATTLEGROUNDS®는 KRAFTON, Inc.의 등록 상표이며, 게임 관련 모든 이미지·데이터의 저작권은
        해당 권리자에게 있습니다. PK.GG는 공개된 공식 API를 통해 데이터를 표시할 뿐이며,
        Krafton 또는 PUBG Corp와 공식 제휴 관계가 없습니다.
        사이트 자체 콘텐츠(디자인, 코드, 분석 로직 등)의 저작권은 PK.GG에 귀속됩니다.
      </p>
    ),
  },
  {
    id: 6,
    title: '면책 조항',
    content: (
      <ul className="list-disc list-inside space-y-1.5 text-gray-600">
        <li>본 서비스는 "있는 그대로(AS-IS)" 제공되며, 데이터의 정확성·완전성을 보증하지 않습니다.</li>
        <li>PUBG API 변경, 서버 점검 등으로 서비스가 일시 중단될 수 있습니다.</li>
        <li>서비스 이용으로 인한 손해에 대해 PK.GG는 책임을 지지 않습니다.</li>
        <li>포럼 사용자가 작성한 게시물의 내용에 대해 PK.GG는 책임을 지지 않습니다.</li>
      </ul>
    ),
  },
  {
    id: 7,
    title: '약관 변경',
    content: (
      <p className="text-gray-600 leading-relaxed">
        본 약관은 사전 공지 없이 변경될 수 있습니다. 변경된 약관은 사이트 게시 즉시 효력이 발생하며,
        사이트를 계속 이용하면 변경된 약관에 동의하는 것으로 간주합니다.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>이용약관 | PK.GG</title>
        <meta name="description" content="PK.GG 이용약관 — 서비스 이용 조건, 커뮤니티 규칙, 면책 조항" />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <Link href="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
              ← PK.GG 홈으로
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">이용약관</h1>
            <p className="text-sm text-gray-500 mt-1">시행일: 2026년 3월 3일</p>
          </div>
        </div>

        {/* 본문 */}
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* 소개 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-600 leading-relaxed">
              PK.GG 서비스를 이용하시기 전에 아래 이용약관을 주의 깊게 읽어주시기 바랍니다.
              사이트를 이용함으로써 본 약관에 동의한 것으로 간주됩니다.
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
            <h2 className="text-base font-bold text-gray-900 mb-3">문의</h2>
            <p className="text-gray-600 mb-2">약관 관련 문의는 아래 이메일로 연락 바랍니다.</p>
            <a
              href="mailto:sssyck123@gmail.com"
              className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
            >
              📧 sssyck123@gmail.com
            </a>
          </div>
        </div>

      </div>
    </>
  );
}
