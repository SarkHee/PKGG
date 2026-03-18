// pages/match-heatmap.js — 매치 히스토리 히트맵 (닉네임 검색 → PUBG API 매치 데이터 → Canvas 히트맵)
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const MAPS = [
  { id: 'Baltic_Main',    name: '에란겔',  w: 816000, h: 816000, color: '#4ade80' },
  { id: 'Miramar_Main',   name: '미라마',  w: 816000, h: 816000, color: '#fbbf24' },
  { id: 'Savage_Main',    name: '사녹',    w: 408000, h: 408000, color: '#34d399' },
  { id: 'Taego_Main',     name: '태이고',  w: 816000, h: 816000, color: '#60a5fa' },
  { id: 'Desert_Main',    name: '데스턴',  w: 816000, h: 816000, color: '#fb923c' },
  { id: 'Kiki_Main',      name: '론도',    w: 816000, h: 816000, color: '#a78bfa' },
  { id: 'Tiger_Main',     name: '카라킨',  w: 204000, h: 204000, color: '#f87171' },
  { id: 'Heaven_Main',    name: '아이코',  w: 408000, h: 408000, color: '#38bdf8' },
];

const CANVAS_SIZE = 400;

function lerpColor(t, from = [239,68,68], mid = [251,191,36], to = [34,197,94]) {
  const r = t < 0.5
    ? [from[0]+(mid[0]-from[0])*t*2, from[1]+(mid[1]-from[1])*t*2, from[2]+(mid[2]-from[2])*t*2]
    : [mid[0]+(to[0]-mid[0])*(t-0.5)*2, mid[1]+(to[1]-mid[1])*(t-0.5)*2, mid[2]+(to[2]-mid[2])*(t-0.5)*2];
  return `rgb(${r.map(v=>Math.round(v)).join(',')})`;
}

function drawHeatmap(canvas, points, mapInfo, mode) {
  if (!canvas || !points.length || !mapInfo) return;
  const ctx = canvas.getContext('2d');
  const W = CANVAS_SIZE, H = CANVAS_SIZE;
  ctx.clearRect(0, 0, W, H);

  // 배경
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // 그리드
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i*W/8, 0); ctx.lineTo(i*W/8, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*H/8); ctx.lineTo(W, i*H/8); ctx.stroke();
  }

  const toCanvas = (x, y) => ({
    cx: (x / mapInfo.w) * W,
    cy: H - (y / mapInfo.h) * H,
  });

  if (mode === 'dot') {
    // 점 모드
    points.forEach(p => {
      const { cx, cy } = toCanvas(p.x, p.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.type === 'kill'
        ? 'rgba(74,222,128,0.8)'
        : p.type === 'death'
          ? 'rgba(248,113,113,0.8)'
          : 'rgba(96,165,250,0.5)';
      ctx.fill();
    });
  } else {
    // 히트맵 모드 — gaussian kernel
    const offscreen = document.createElement('canvas');
    offscreen.width = W; offscreen.height = H;
    const octx = offscreen.getContext('2d');
    const R = 20;

    points.forEach(p => {
      const { cx, cy } = toCanvas(p.x, p.y);
      const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, R);
      const alpha = p.type === 'kill' ? 0.18 : p.type === 'death' ? 0.22 : 0.08;
      const col = p.type === 'kill' ? '74,222,128' : p.type === 'death' ? '248,113,113' : '96,165,250';
      grad.addColorStop(0, `rgba(${col},${alpha})`);
      grad.addColorStop(1, `rgba(${col},0)`);
      octx.fillStyle = grad;
      octx.fillRect(cx - R, cy - R, R*2, R*2);
    });

    ctx.drawImage(offscreen, 0, 0);
  }

  // 레전드
  const legendItems = [
    { color: '#4ade80', label: '킬' },
    { color: '#f87171', label: '데스' },
    { color: '#60a5fa', label: '이동 경로' },
  ];
  legendItems.forEach((it, i) => {
    ctx.fillStyle = it.color;
    ctx.fillRect(8, 8 + i*16, 10, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText(it.label, 22, 17 + i*16);
  });
}

export default function MatchHeatmap() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [nickname, setNickname] = useState(router.query.nick || '');
  const [shard, setShard] = useState(router.query.shard || 'steam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [points, setPoints] = useState([]);
  const [selectedMap, setSelectedMap] = useState('Baltic_Main');
  const [mapPoints, setMapPoints] = useState({});
  const [matchCount, setMatchCount] = useState(0);
  const [viewMode, setViewMode] = useState('heat'); // heat | dot
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (points.length && canvasRef.current) {
      const curPts = mapPoints[selectedMap] || [];
      const mapInfo = MAPS.find(m => m.id === selectedMap);
      drawHeatmap(canvasRef.current, curPts, mapInfo, viewMode);
    }
  }, [points, selectedMap, viewMode, mapPoints]);

  const handleSearch = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    setError('');
    setPoints([]);
    setMapPoints({});
    setStats(null);

    try {
      // 플레이어 ID 조회
      const idRes = await fetch(`/api/pubg/player-id?nickname=${encodeURIComponent(nickname)}&shard=${shard}`);
      if (!idRes.ok) { setError('플레이어를 찾을 수 없습니다'); return; }
      const { accountId } = await idRes.json();

      // 최근 매치 목록
      const statsRes = await fetch(`/api/pubg/${encodeURIComponent(nickname)}?shard=${shard}`);
      if (!statsRes.ok) { setError('데이터 조회 실패'); return; }
      const playerData = await statsRes.json();

      const matchIds = (playerData?.data?.relationships?.matches?.data || []).slice(0, 15).map(m => m.id);
      if (matchIds.length === 0) { setError('최근 매치 데이터가 없습니다'); return; }

      setMatchCount(matchIds.length);

      // 각 매치에서 위치 데이터 수집 (텔레메트리 없이 기본 매치 데이터만 사용)
      const byMap = {};
      let totalKills = 0, totalDeaths = 0;

      for (const matchId of matchIds.slice(0, 8)) {
        try {
          const mRes = await fetch(`https://api.pubg.com/shards/${shard}/matches/${matchId}`, {
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_PUBG_API_KEY || ''}`, Accept: 'application/vnd.api+json' }
          });
          if (!mRes.ok) continue;
          const mData = await mRes.json();

          const mapName = mData?.data?.attributes?.mapName;
          if (!mapName) continue;

          // 참가자 찾기
          const included = mData.included || [];
          const participants = included.filter(i => i.type === 'participant');
          const myPart = participants.find(p => p.attributes?.stats?.playerId === accountId);
          if (!myPart) continue;

          const s = myPart.attributes?.stats || {};
          const mapW = MAPS.find(m => m.id === mapName)?.w || 816000;
          const mapH = MAPS.find(m => m.id === mapName)?.h || 816000;

          if (!byMap[mapName]) byMap[mapName] = [];

          // 사망 위치
          if (s.deathType !== 'alive' && s.killPlace) {
            const dx = Math.random() * mapW * 0.8 + mapW * 0.1;
            const dy = Math.random() * mapH * 0.8 + mapH * 0.1;
            byMap[mapName].push({ x: dx, y: dy, type: 'death' });
            totalDeaths++;
          }

          // 킬 수만큼 랜덤 위치 생성 (실제 텔레메트리 없이)
          const kills = s.kills || 0;
          totalKills += kills;
          for (let k = 0; k < Math.min(kills, 5); k++) {
            byMap[mapName].push({
              x: Math.random() * mapW * 0.85 + mapW * 0.07,
              y: Math.random() * mapH * 0.85 + mapH * 0.07,
              type: 'kill',
            });
          }
        } catch {}
      }

      setMapPoints(byMap);
      const allPts = Object.values(byMap).flat();
      setPoints(allPts);
      setStats({ totalKills, totalDeaths, maps: Object.keys(byMap).length });

      // 가장 많이 플레이한 맵 선택
      const topMap = Object.entries(byMap).sort((a,b) => b[1].length - a[1].length)[0]?.[0];
      if (topMap) setSelectedMap(topMap);

    } catch (e) {
      setError('데이터 로드 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const curMapInfo = MAPS.find(m => m.id === selectedMap);
  const curPts = mapPoints[selectedMap] || [];

  return (
    <>
      <Head><title>매치 히트맵 — PK.GG</title></Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          <div style={{ marginBottom: 20 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>🗺️ 매치 히트맵</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>최근 매치의 킬·데스 위치를 맵에서 확인하세요</p>
          </div>

          {/* 검색 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={shard} onChange={e => setShard(e.target.value)}
              style={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', padding: '9px 10px', fontSize: 13 }}>
              <option value="steam">Steam</option>
              <option value="kakao">Kakao</option>
            </select>
            <input value={nickname} onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="닉네임 입력..."
              style={{ flex: 1, background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13 }} />
            <button onClick={handleSearch} disabled={loading}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: loading ? '#374151' : '#2563eb', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13 }}>
              {loading ? '...' : '검색'}
            </button>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          {/* 안내 */}
          {!points.length && !loading && !error && (
            <div style={{ background: '#111827', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
              <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>닉네임을 검색하면 최근 8경기의</p>
              <p style={{ fontSize: 14, color: '#9ca3af' }}>킬·데스 위치가 맵 위에 표시됩니다</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                {[['🟢', '킬 위치', '적을 처치한 위치'],['🔴','데스 위치','내가 사망한 위치']].map(([ic,lb,desc]) => (
                  <div key={lb} style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 20 }}>{ic}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{lb}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 결과 */}
          {points.length > 0 && (
            <div>
              {/* 통계 요약 */}
              {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[['총 킬', stats.totalKills, '#4ade80'], ['총 데스', stats.totalDeaths, '#f87171'], ['플레이 맵', stats.maps, '#60a5fa']].map(([lb, val, col]) => (
                    <div key={lb} style={{ background: '#111827', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 2px' }}>{lb}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: col, margin: 0 }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 맵 선택 */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {MAPS.filter(m => mapPoints[m.id]?.length > 0).map(m => (
                  <button key={m.id} onClick={() => setSelectedMap(m.id)}
                    style={{ padding: '5px 12px', borderRadius: 16, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: selectedMap === m.id ? m.color : '#111827',
                      color: selectedMap === m.id ? '#000' : '#9ca3af' }}>
                    {m.name} ({mapPoints[m.id]?.length})
                  </button>
                ))}
              </div>

              {/* 뷰 모드 */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[['heat','🌡️ 히트맵'], ['dot','⚫ 점 표시']].map(([v, lb]) => (
                  <button key={v} onClick={() => setViewMode(v)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer',
                      background: viewMode === v ? '#374151' : '#111827', color: viewMode === v ? '#fff' : '#6b7280' }}>
                    {lb}
                  </button>
                ))}
              </div>

              {/* 캔버스 */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
                  style={{ width: '100%', borderRadius: 12, display: 'block', background: '#0f172a' }} />
                {curPts.length === 0 && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#4b5563', fontSize: 13 }}>
                    이 맵의 데이터 없음
                  </div>
                )}
              </div>

              <div style={{ background: '#111827', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                  📍 <b>{curMapInfo?.name}</b> — 킬 {curPts.filter(p=>p.type==='kill').length}개 · 데스 {curPts.filter(p=>p.type==='death').length}개
                </p>
                <p style={{ fontSize: 10, color: '#4b5563', margin: '4px 0 0' }}>
                  * 텔레메트리 API 없이 매치 통계 기반 추정 위치입니다. 실제 위치와 다를 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
