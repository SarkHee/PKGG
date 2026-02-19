// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [server, setServer] = useState('steam');
  const [searchMessage, setSearchMessage] = useState('');
  const [recentNews, setRecentNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const router = useRouter();
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  // URL 파라미터에서 검색 실패 메시지 확인
  useEffect(() => {
    if (router.query.searchFailed) {
      setSearchMessage(
        '플레이어를 찾을 수 없습니다. 닉네임을 다시 확인해주세요.'
      );
      setTimeout(() => setSearchMessage(''), 5000);
    }
  }, [router.query]);

  // PUBG 뉴스 가져오기
  const loadRecentNews = async () => {
    try {
      setNewsLoading(true);
      const response = await fetch('/api/pubg-news?limit=3');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setRecentNews(data.data.slice(0, 3)); // 최대 3개만 가져오기
        } else {
          setRecentNews([]); // 실패 시 빈 배열
        }
      } else {
        setRecentNews([]); // 응답 실패 시 빈 배열
      }
    } catch (error) {
      console.error('뉴스 로드 실패:', error);
      setRecentNews([]); // 오류 시 빈 배열
    } finally {
      setNewsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 뉴스 로드
  useEffect(() => {
    loadRecentNews();
  }, []);

  // Canvas 기반 파티클 시스템
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 파티클 생성 (모바일 최적화)
    const createParticles = () => {
      const particles = [];
      const particleCount = window.innerWidth < 768 ? 100 : 200;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          vz: Math.random() * 0.3 + 0.05,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.8 + 0.2,
        });
      }
      return particles;
    };

    // 캔버스 크기 설정
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      if (window.innerWidth < 768) {
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        canvas.width = window.innerWidth * Math.min(dpr, 2);
        canvas.height = window.innerHeight * Math.min(dpr, 2);
        ctx.scale(Math.min(dpr, 2), Math.min(dpr, 2));
      }

      particlesRef.current = createParticles();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    particlesRef.current = createParticles();

    // 애니메이션 루프
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 배경 그라디언트
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );
      gradient.addColorStop(0, 'rgba(20, 30, 48, 0.9)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 파티클 그리기
      particlesRef.current.forEach((particle) => {
        const scale = 1000 / (1000 + particle.z);
        const x2d = (particle.x - canvas.width / 2) * scale + canvas.width / 2;
        const y2d =
          (particle.y - canvas.height / 2) * scale + canvas.height / 2;

        if (
          x2d > -50 &&
          x2d < canvas.width + 50 &&
          y2d > -50 &&
          y2d < canvas.height + 50
        ) {
          ctx.save();
          ctx.globalAlpha = particle.opacity * scale;

          const blue = Math.floor(100 + scale * 155);
          const white = Math.floor(scale * 100);
          ctx.fillStyle = `rgb(${white}, ${white + 50}, ${blue})`;

          ctx.beginPath();
          ctx.arc(x2d, y2d, particle.size * scale, 0, Math.PI * 2);
          ctx.fill();

          if (window.innerWidth >= 768) {
            particlesRef.current.forEach((otherParticle) => {
              const distance = Math.sqrt(
                Math.pow(particle.x - otherParticle.x, 2) +
                  Math.pow(particle.y - otherParticle.y, 2) +
                  Math.pow(particle.z - otherParticle.z, 2)
              );

              if (distance < 120) {
                const otherScale = 1000 / (1000 + otherParticle.z);
                const otherX2d =
                  (otherParticle.x - canvas.width / 2) * otherScale +
                  canvas.width / 2;
                const otherY2d =
                  (otherParticle.y - canvas.height / 2) * otherScale +
                  canvas.height / 2;

                ctx.globalAlpha =
                  (1 - distance / 120) * 0.2 * scale * otherScale;
                ctx.strokeStyle = `rgb(100, 150, 255)`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x2d, y2d);
                ctx.lineTo(otherX2d, otherY2d);
                ctx.stroke();
              }
            });
          }

          ctx.restore();
        }

        // 파티클 이동
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z -= particle.vz;

        if (particle.life !== undefined) {
          particle.life--;
          if (particle.life <= 0) {
            const index = particlesRef.current.indexOf(particle);
            particlesRef.current.splice(index, 1);
            return;
          }
          particle.opacity = particle.life / 60;
        }

        if (particle.z <= 0) {
          particle.z = 1000;
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 터치 이벤트
    const handleTouch = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 50,
          y: y + (Math.random() - 0.5) * 50,
          z: Math.random() * 200,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          vz: Math.random() * 0.5 + 0.1,
          size: Math.random() * 3 + 2,
          opacity: 1.0,
          life: 60,
        });
      }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', handleTouch);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      router.push(`/player/${server}/${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <Head>
        <title>PK.GG - PUBG 플레이어 검색 및 통계</title>
        <meta
          name="description"
          content="PUBG 플레이어 통계를 확인하고 클랜 정보를 검색해보세요."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
        {/* Canvas 배경 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          }}
        />

        {/* 헤더 */}
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          server={server}
          setServer={setServer}
          handleSearch={handleSearch}
          handleKeyPress={handleKeyPress}
        />

        {/* 메인 콘텐츠 */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
          <div className="text-center max-w-4xl mx-auto mb-16">
            {/* 로고 */}
            <div className="mb-3">
              <span className="inline-block text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3 opacity-80">
                PUBG Stats & Analytics
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black mb-4 md:mb-6 tracking-tighter bg-gradient-to-b from-white to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
              PK.GG
            </h1>

            {/* 서브타이틀 */}
            <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed px-4">
              PUBG 플레이어 통계와 클랜 정보를 한눈에 확인하세요
            </p>

            {/* 검색 메시지 알림 */}
            {searchMessage && (
              <div className="mb-6 max-w-xl mx-auto px-4">
                <div className="bg-orange-500/20 border border-orange-500/50 text-orange-300 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-2 justify-center">
                    <span>⚠️</span>
                    <p className="text-sm font-medium">{searchMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 검색 섹션 - 카드 형태 */}
            <div className="max-w-xl mx-auto px-4 mb-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                {/* 서버 선택 탭 */}
                <div className="flex gap-2 mb-3">
                  {['steam', 'kakao', 'console'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setServer(s)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        server === s
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                      }`}
                    >
                      {s === 'steam' ? '🎮 Steam' : s === 'kakao' ? '🟡 Kakao' : '🎯 Console'}
                    </button>
                  ))}
                </div>
                {/* 검색 입력 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="플레이어 닉네임을 입력하세요..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    검색
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-xs mt-2.5">정확한 게임 내 닉네임을 입력해주세요</p>
            </div>
          </div>

          {/* PUBG 뉴스 섹션 */}
          {Array.isArray(recentNews) && recentNews.length > 0 && (
            <div className="w-full max-w-6xl mx-auto mb-14 px-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-500 rounded-full inline-block"></span>
                  PUBG 이벤트 & 뉴스
                </h2>
                <Link href="/pubg-news" passHref>
                  <span className="text-blue-400 hover:text-blue-300 text-sm font-medium cursor-pointer transition-colors">
                    전체보기 →
                  </span>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentNews.map((news, index) => (
                  <div
                    key={news?.id || index}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/40 hover:bg-white/8 transition-all duration-300 group"
                  >
                    {news?.imageUrl ? (
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={news.imageUrl}
                          alt={news.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-28 bg-gradient-to-br from-blue-800/50 to-blue-900/50 flex items-center justify-center">
                        <span className="text-3xl opacity-50">📢</span>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {news?.category && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            news.category === '이벤트' ? 'bg-purple-500/20 text-purple-300' :
                            news.category === '업데이트' ? 'bg-green-500/20 text-green-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {news.category}
                          </span>
                        )}
                        {(news?.publishedAt || news?.publishDate) && (
                          <span className="text-xs text-gray-500">
                            {(() => {
                              try {
                                return new Date(news.publishedAt || news.publishDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                              } catch { return ''; }
                            })()}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-100 text-sm mb-3 group-hover:text-blue-300 transition-colors line-clamp-2">
                        {news?.title || '제목 없음'}
                      </h3>

                      <a
                        href={news?.link || news?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        자세히 보기
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 특징 카드 섹션 */}
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-base font-semibold text-gray-500 uppercase tracking-widest">Features</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: '📊', title: '실시간 통계', desc: 'PUBG API 연동으로 정확한 플레이어 통계', color: 'blue' },
                { icon: '👥', title: '클랜 분석', desc: '팀 시너지와 클랜 성과를 한눈에', color: 'green' },
                { icon: '🏆', title: 'PK.GG 점수', desc: '독자 알고리즘의 실력 평가 지수', color: 'purple' },
                { icon: '🎯', title: '매치 분석', desc: '경기별 상세 통계와 히트맵', color: 'yellow' },
                { icon: '📈', title: '랭크 트래킹', desc: '경쟁전 랭크 변화 추적', color: 'red' },
                { icon: '⚡', title: '빠른 검색', desc: 'Steam·Kakao·Console 전 플랫폼 지원', color: 'cyan' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white/5 border border-white/8 rounded-xl p-4 hover:border-white/20 hover:bg-white/8 transition-all duration-200"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="text-sm font-bold text-gray-200 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
