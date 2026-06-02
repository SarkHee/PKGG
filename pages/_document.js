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

        {/* 기본 OG / SNS 공유 메타태그 (각 페이지 <Head>에서 덮어쓸 수 있음) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PKGG" />
        <meta property="og:url" content="https://pkgg.vercel.app" />
        <meta property="og:title" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta property="og:description" content="클랜 순위, PKGG 점수, AI 코치 무료 제공" />
        <meta property="og:image" content="https://pkgg.vercel.app/og-image.png" />
        <meta property="og:image:secure_url" content="https://pkgg.vercel.app/og-image.png" />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="400" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@pkgg" />
        <meta name="twitter:title" content="PKGG - PUBG 전적 분석 & 클랜 분석" />
        <meta name="twitter:description" content="클랜 순위, PKGG 점수, AI 코치 무료 제공" />
        <meta name="twitter:image" content="https://pkgg.vercel.app/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
