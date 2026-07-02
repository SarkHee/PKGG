import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* Google AdSense */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7884456727026548" crossOrigin="anonymous" />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-1QZEW9N4S3" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-1QZEW9N4S3');
        `}} />
        {/* 구글 서치콘솔 인증 */}
        <meta name="google-site-verification" content="QaNQmdHD828G0WSKpwzQwod9meUv6ng67cq0D0aBb9o" />
        {/* 모바일 뷰포트 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* 파비콘 */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* 사이트 공통 OG 값만 유지 — og:title/description/url/type, twitter:title/description/card는
            _document.js Head와 각 페이지 next/head가 dedup되지 않아 중복 출력되므로 각 페이지에서 개별 지정 */}
        <meta property="og:site_name" content="PKGG" />
        <meta property="og:image" content="https://pkgg.vercel.app/og-image.png" />
        <meta property="og:image:secure_url" content="https://pkgg.vercel.app/og-image.png" />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="400" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta name="twitter:site" content="@pkgg" />
        <meta name="twitter:image" content="https://pkgg.vercel.app/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
