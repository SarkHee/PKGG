import { useEffect, useRef } from 'react';

/**
 * Google AdSense 광고 단위
 * 노출 여부: .env.local의 NEXT_PUBLIC_ADS_ENABLED=true 시 활성화
 * @param {string} slot - AdSense 광고 단위 ID
 * @param {'horizontal'|'rectangle'|'auto'} format - 광고 형식
 * @param {string} className - 추가 스타일
 */
export default function AdUnit({ slot, format = 'auto', className = '', show = true }) {
  // AdSense 승인 전까지 렌더링 안 함 (빈 공간도 없음)
  if (process.env.NEXT_PUBLIC_ADS_ENABLED !== 'true') return null;
  // 콘텐츠가 없는 빈 화면에서는 노출 안 함
  if (!show) return null;
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    if (!adRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      // AdSense 미로드 시 무시
    }
  }, []);

  const formatStyle =
    format === 'horizontal'
      ? { display: 'inline-block', width: '100%', height: '90px' }
      : format === 'rectangle'
      ? { display: 'inline-block', width: '300px', height: '250px' }
      : { display: 'block' }; // auto

  return (
    <div className={`overflow-hidden text-center ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={formatStyle}
        data-ad-client="ca-pub-7884456727026548"
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'auto' : undefined}
        data-full-width-responsive={format === 'auto' ? 'true' : undefined}
      />
    </div>
  );
}

/**
 * 배너 광고 구역 — 벤토 그리드 안에서 광고 자리를 분명히 구분하는 띠
 * 광고 비활성(NEXT_PUBLIC_ADS_ENABLED !== 'true') 시: 개발 환경에서만 자리 표시, 운영에서는 렌더링 안 함
 * @param {string} slot - AdSense 광고 단위 ID
 * @param {boolean} show - 콘텐츠 로드 전에는 숨김 (AdUnit과 동일)
 * @param {string} className - 그리드 배치용 추가 클래스 (예: lg:col-span-12)
 */
export function AdBand({ slot = '1234567890', show = true, className = '' }) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
  if (!enabled && process.env.NODE_ENV === 'production') return null;
  if (!show) return null;
  return (
    <aside className={`crate-ad ${className}`} aria-label="광고">
      <span className="crate-ad-label">광고</span>
      {enabled ? (
        <AdUnit slot={slot} format="horizontal" />
      ) : (
        <div className="crate-ad-empty">배너 광고 영역 (AdSense 활성화 시 노출 · 728×90 / 반응형)</div>
      )}
    </aside>
  );
}
