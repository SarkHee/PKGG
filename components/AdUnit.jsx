import { useEffect, useRef } from 'react';

/**
 * Google AdSense 광고 단위
 * @param {string} slot - AdSense 광고 단위 ID (AdSense 콘솔 > 광고 단위에서 복사)
 * @param {'horizontal'|'rectangle'|'auto'} format - 광고 형식
 * @param {string} className - 추가 스타일
 */
export default function AdUnit({ slot, format = 'auto', className = '' }) {
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
