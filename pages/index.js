// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [server, setServer] = useState('steam');
  const [searchMessage, setSearchMessage] = useState('');
  const router = useRouter();
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  // URL 파라미터에서 검색 실패 메시지 확인
  useEffect(() => {
    if (router.query.searchFailed) {
      setSearchMessage('플레이어를 찾을 수 없습니다. 닉네임을 다시 확인해주세요.');
      setTimeout(() => setSearchMessage(''), 5000);
    }
  }, [router.query]);

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
          opacity: Math.random() * 0.8 + 0.2
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
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      gradient.addColorStop(0, 'rgba(20, 30, 48, 0.9)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 파티클 그리기
      particlesRef.current.forEach(particle => {
        const scale = 1000 / (1000 + particle.z);
        const x2d = (particle.x - canvas.width / 2) * scale + canvas.width / 2;
        const y2d = (particle.y - canvas.height / 2) * scale + canvas.height / 2;
        
        if (x2d > -50 && x2d < canvas.width + 50 && y2d > -50 && y2d < canvas.height + 50) {
          ctx.save();
          ctx.globalAlpha = particle.opacity * scale;
          
          const blue = Math.floor(100 + scale * 155);
          const white = Math.floor(scale * 100);
          ctx.fillStyle = `rgb(${white}, ${white + 50}, ${blue})`;
          
          ctx.beginPath();
          ctx.arc(x2d, y2d, particle.size * scale, 0, Math.PI * 2);
          ctx.fill();
          
          if (window.innerWidth >= 768) {
            particlesRef.current.forEach(otherParticle => {
              const distance = Math.sqrt(
                Math.pow(particle.x - otherParticle.x, 2) + 
                Math.pow(particle.y - otherParticle.y, 2) +
                Math.pow(particle.z - otherParticle.z, 2)
              );
              
              if (distance < 120) {
                const otherScale = 1000 / (1000 + otherParticle.z);
                const otherX2d = (otherParticle.x - canvas.width / 2) * otherScale + canvas.width / 2;
                const otherY2d = (otherParticle.y - canvas.height / 2) * otherScale + canvas.height / 2;
                
                ctx.globalAlpha = (1 - distance / 120) * 0.2 * scale * otherScale;
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
          life: 60
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
        <meta name="description" content="PUBG 플레이어 통계를 확인하고 클랜 정보를 검색해보세요." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
        {/* Canvas 배경 */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 z-0"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
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
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-wider">
              PK.GG
            </h1>
            
            {/* 서브타이틀 */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              PUBG 플레이어 통계와 클랜 정보를 확인해보세요
            </p>

            {/* 검색 메시지 알림 */}
            {searchMessage && (
              <div className="mb-4 max-w-2xl mx-auto px-4">
                <div className="bg-orange-500/90 border border-orange-400 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm font-medium">{searchMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 검색 섹션 */}
            <div className="flex flex-col gap-4 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center sm:text-left"
              >
                <option value="steam">Steam</option>
                <option value="kakao">Kakao</option>
                <option value="console">Console</option>
              </select>

              <div className="flex w-full">
                <input
                  type="text"
                  placeholder="플레이어 이름을 입력하세요..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-l-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-r-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-sm sm:text-base"
                >
                  검색
                </button>
              </div>
            </div>

            <div className="text-gray-400 text-xs sm:text-sm px-4">
              <p>정확한 게임 내 닉네임을 입력해주세요</p>
            </div>
          </div>

          {/* 특징 카드 섹션 */}
          <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="text-blue-400 text-3xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-white mb-3">실시간 통계</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  PUBG API와 연동하여 실시간으로 업데이트되는 정확한 플레이어 통계를 제공합니다.
                </p>
              </div>

              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="text-green-400 text-3xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-white mb-3">클랜 분석</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  클랜 멤버들의 상세한 통계와 팀 시너지를 분석하여 클랜 성과를 한눈에 파악할 수 있습니다.
                </p>
              </div>

              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="text-purple-400 text-3xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-white mb-3">PK.GG 점수</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  독자적인 알고리즘으로 계산된 PK.GG 점수로 플레이어의 실력을 객관적으로 평가합니다.
                </p>
              </div>

              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="text-yellow-400 text-3xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-white mb-3">상세 매치 분석</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  각 경기별 상세 통계와 헤드샷률, 생존 시간 등 깊이 있는 분석 데이터를 제공합니다.
                </p>
              </div>

              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="text-red-400 text-3xl mb-4">📈</div>
                <h3 className="text-xl font-bold text-white mb-3">랭크 트래킹</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  경쟁전 랭크 변화를 추적하고 시즌별 성장 곡선을 시각적으로 확인할 수 있습니다.
                </p>
              </div>

              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="text-cyan-400 text-3xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-white mb-3">빠른 검색</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Steam, Kakao, Console 모든 플랫폼을 지원하며 빠르고 정확한 플레이어 검색을 제공합니다.
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
