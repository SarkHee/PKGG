import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* 모바일 뷰포트 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* 파비콘 */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* 기본 OG / SNS 공유 메타태그 (각 페이지 <Head>에서 덮어쓸 수 있음) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PKGG" />
        <meta property="og:url" content="https://pk.gg/" />
        <meta property="og:title" content="PKGG — PUBG 전적 검색 & 클랜 분석" />
        <meta property="og:description" content="PUBG 플레이어 전적, 무기 숙련도, 클랜 분석을 한 곳에서 확인하세요." />
        <meta property="og:image" content="https://pk.gg/og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PKGG — PUBG 전적 검색" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pkgg" />
        <meta name="twitter:title" content="PKGG — PUBG 전적 검색 & 클랜 분석" />
        <meta name="twitter:description" content="PUBG 플레이어 전적, 무기 숙련도, 클랜 분석을 한 곳에서 확인하세요." />
        <meta name="twitter:image" content="https://pk.gg/og.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
