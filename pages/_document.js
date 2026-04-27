import { Html, Head, Main, NextScript } from 'next/document';

const GTM_ID = 'GTM-WD2DT98V';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}} />
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
        <meta property="og:title" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta property="og:description" content="클랜 순위, PKGG 점수, AI 코치 무료 제공" />
        <meta property="og:image" content="https://pk.gg/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pkgg" />
        <meta name="twitter:title" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta name="twitter:description" content="클랜 순위, PKGG 점수, AI 코치 무료 제공" />
        <meta name="twitter:image" content="https://pk.gg/og-image.png" />
      </Head>
      <body>
        {/* GTM noscript 폴백 */}
        <noscript dangerouslySetInnerHTML={{ __html: `
          <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
          height="0" width="0" style="display:none;visibility:hidden"></iframe>
        `}} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
