import { useState, useEffect } from 'react';

// 관리자가 등록한 배너 광고 표시. 활성 배너가 없으면 children(폴백 콘텐츠)을 그대로 보여준다.
// position: 'main_header' | 'player_card_top'
export default function AdBanner({ position, className = '', children = null }) {
  const [banner, setBanner] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/banners/active?position=${position}`)
      .then((r) => (r.ok ? r.json() : { banner: null }))
      .then((d) => { if (!cancelled) setBanner(d.banner || null); })
      .catch(() => { if (!cancelled) setBanner(null); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [position]);

  // 로딩 중이거나 활성 배너가 없으면 폴백(로고 등) 그대로 노출 — 깜빡임/빈 공간 방지
  if (!loaded || !banner) return children;

  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer sponsored" className={`block ${className}`}>
      <img src={banner.imageUrlMobile || banner.imageUrl} alt="광고" className="sm:hidden w-full h-auto" />
      <img src={banner.imageUrl} alt="광고" className="hidden sm:block w-full h-auto" />
    </a>
  );
}
