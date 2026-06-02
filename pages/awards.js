import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/layout/Header'

const ANIMATIONS = `
  @keyframes shimmer-sweep {
    0%        { left: -80px; opacity: 0; }
    10%       { opacity: 1; }
    80%       { opacity: 1; }
    100%      { left: calc(100% + 80px); opacity: 0; }
  }
  @keyframes twinkle {
    0%, 100%  { opacity: 0.1; transform: scale(0.6) rotate(0deg); }
    50%       { opacity: 1;   transform: scale(1.4) rotate(20deg); }
  }
  @keyframes float-crown {
    0%, 100%  { transform: translateY(0px);  }
    50%       { transform: translateY(-5px); }
  }
  @keyframes glow-pulse {
    0%, 100%  { opacity: 0.35; }
    50%       { opacity: 0.75; }
  }
  @keyframes border-shine {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  .crown-float  { animation: float-crown   2.4s ease-in-out infinite; }
  .glow-pulse   { animation: glow-pulse    2.8s ease-in-out infinite; }
  .shimmer-gold { animation: shimmer-sweep 3.2s ease-in-out infinite; }
  .sparkle      { position: absolute; color: #fde68a; pointer-events: none; }
  .sp-0  { top:-6px;  left:-6px;  font-size:10px; animation: twinkle 2s   ease-in-out infinite 0.0s; }
  .sp-1  { top:-8px;  right:-4px; font-size:8px;  animation: twinkle 2s   ease-in-out infinite 0.6s; }
  .sp-2  { bottom:0px; left:-10px; font-size:7px;  animation: twinkle 2s   ease-in-out infinite 1.2s; }
  .sp-3  { bottom:-4px;right:-6px; font-size:9px;  animation: twinkle 2s   ease-in-out infinite 1.8s; }
  .sp-4  { top:50%;   left:-12px; font-size:6px;  animation: twinkle 2.5s ease-in-out infinite 0.9s; }
`

function cleanWeaponId(id) {
  if (!id) return '알 수 없음'
  return id.replace(/^Weap/i, '').replace(/_C$/i, '').replace(/_/g, ' ')
}

const PODIUM = {
  1: {
    medal: '🥇',
    circleGrad: 'linear-gradient(160deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
    blockGrad:  'linear-gradient(180deg, #fbbf24 0%, #d97706 55%, #92400e 100%)',
    textOnBlock: '#7c2d12',
    ringColor:  'rgba(251,191,36,0.7)',
    glowColor:  'rgba(251,191,36,0.35)',
    nameColor:  '#fde68a',
    valColor:   '#fef3c7',
    h: 165,
    shimmer: true,
  },
  2: {
    medal: '🥈',
    circleGrad: 'linear-gradient(160deg, #f1f5f9 0%, #94a3b8 50%, #475569 100%)',
    blockGrad:  'linear-gradient(180deg, #94a3b8 0%, #64748b 55%, #334155 100%)',
    textOnBlock: '#0f172a',
    ringColor:  'rgba(148,163,184,0.5)',
    glowColor:  'rgba(148,163,184,0.15)',
    nameColor:  '#cbd5e1',
    valColor:   '#e2e8f0',
    h: 112,
    shimmer: false,
  },
  3: {
    medal: '🥉',
    circleGrad: 'linear-gradient(160deg, #fcd34d 0%, #b45309 50%, #78350f 100%)',
    blockGrad:  'linear-gradient(180deg, #b45309 0%, #92400e 55%, #451a03 100%)',
    textOnBlock: '#fef3c7',
    ringColor:  'rgba(180,83,9,0.6)',
    glowColor:  'rgba(180,83,9,0.18)',
    nameColor:  '#fcd34d',
    valColor:   '#fde68a',
    h: 78,
    shimmer: false,
  },
}

function PodiumSlot({ data, rank, formatValue, unit, linkable }) {
  const p = PODIUM[rank]
  const isFirst = rank === 1
  const slotW  = isFirst ? 136 : 100   // px — inline으로 고정해 흔들림 방지
  const circleD = isFirst ? 76 : 56    // px

  const nameNode = !data ? (
    <span className="text-xs text-gray-700 block text-center">—</span>
  ) : linkable && data.href ? (
    <Link href={data.href}>
      <span style={{ color: p.nameColor }} className="font-bold text-xs sm:text-sm hover:underline cursor-pointer block truncate text-center leading-tight">
        {data.name}
      </span>
    </Link>
  ) : (
    <span style={{ color: p.nameColor }} className="font-bold text-xs sm:text-sm block truncate text-center leading-tight">
      {data.name}
    </span>
  )

  return (
    <div style={{ width: slotW }} className="flex flex-col items-center flex-shrink-0">

      {/* 1위 왕관 — 부유 애니메이션 */}
      {isFirst ? (
        <div className="relative mb-1">
          {/* 왕관 아래 황금빛 후광 */}
          <div className="glow-pulse absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.7) 0%, transparent 70%)', filter: 'blur(4px)' }} />
          <span className="crown-float text-2xl block relative z-10">👑</span>
        </div>
      ) : (
        <div className="mb-1 h-7" /> /* 높이 맞춤 스페이서 */
      )}

      {/* 메달 서클 */}
      <div className="relative mb-2" style={{ width: circleD, height: circleD }}>
        {/* 아우터 글로우 링 */}
        <div className={`absolute inset-0 rounded-full ${isFirst ? 'glow-pulse' : ''}`}
          style={{ boxShadow: `0 0 ${isFirst ? 24 : 12}px ${p.glowColor}`, borderRadius: '50%' }} />
        {/* 스파클 (1위만) */}
        {isFirst && data && (
          <>
            <span className="sparkle sp-0">✦</span>
            <span className="sparkle sp-1">✦</span>
            <span className="sparkle sp-2">✧</span>
            <span className="sparkle sp-3">✦</span>
            <span className="sparkle sp-4">✧</span>
          </>
        )}
        {/* 메달 원 */}
        <div className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: p.circleGrad,
            boxShadow: `0 4px 16px ${p.glowColor}, inset 0 1px 2px rgba(255,255,255,0.4), 0 0 0 2px ${p.ringColor}`,
          }}>
          {/* 내부 상단 하이라이트 */}
          <div className="absolute top-1 left-2 right-2 h-1/3 rounded-full"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)' }} />
          <span className="relative z-10 leading-none" style={{ fontSize: isFirst ? 30 : 22 }}>{p.medal}</span>
        </div>
      </div>

      {/* 이름 */}
      <div className="w-full px-1 mb-0.5">{nameNode}</div>
      {data?.sub && (
        <div className="text-[10px] text-center px-1 truncate w-full mb-1" style={{ color: '#4b5563' }}>{data.sub}</div>
      )}

      {/* 값 */}
      <div className="text-center font-black leading-none mb-2" style={{ color: p.valColor, fontSize: isFirst ? 20 : 15 }}>
        {data ? (formatValue ? formatValue(data.value) : data.value) : '—'}
        {unit && data && <span className="ml-1 font-normal" style={{ fontSize: 10, color: '#6b7280' }}>{unit}</span>}
      </div>

      {/* 단상 블록 */}
      <div className="w-full rounded-t-xl relative overflow-hidden flex items-center justify-center"
        style={{
          height: p.h,
          background: p.blockGrad,
          boxShadow: `0 -4px 24px ${p.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}>
        {/* 상단 유리 하이라이트 */}
        <div className="absolute top-0 left-0 right-0 h-8"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)' }} />
        {/* 좌측 입체감 */}
        <div className="absolute top-0 left-0 bottom-0 w-1/4"
          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, transparent 100%)' }} />
        {/* 하단 깊이 */}
        <div className="absolute bottom-0 left-0 right-0 h-10"
          style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />
        {/* 수평 엔그레이빙 라인 */}
        <div className="absolute top-1/3 left-4 right-4 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute top-2/3 left-4 right-4 h-px" style={{ background: 'rgba(0,0,0,0.15)' }} />
        {/* 1위 골드 shimmer */}
        {p.shimmer && (
          <div className="shimmer-gold absolute top-0 bottom-0 w-14"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transform: 'skewX(-18deg)',
            }} />
        )}
        {/* 순위 숫자 */}
        <span className="relative z-10 font-black select-none"
          style={{ fontSize: isFirst ? 52 : 40, color: p.textOnBlock, textShadow: '0 2px 4px rgba(0,0,0,0.25)' }}>
          {rank}
        </span>
      </div>
    </div>
  )
}

function Podium({ entries, formatValue, unit, loading, linkable }) {
  if (loading) {
    return (
      <div className="flex items-end justify-center gap-4 sm:gap-8 py-12 px-6">
        {[112, 165, 78].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-2" style={{ width: i === 1 ? 136 : 100 }}>
            <div className="rounded-full bg-gray-800 animate-pulse" style={{ width: i===1?76:56, height: i===1?76:56 }} />
            <div className="w-20 h-3 bg-gray-800 rounded-full animate-pulse" />
            <div className="w-14 h-5 bg-gray-800 rounded animate-pulse" />
            <div className="w-full rounded-t-xl bg-gray-800 animate-pulse" style={{ height: h }} />
          </div>
        ))}
      </div>
    )
  }

  const p = entries || []
  if (!p[0]) {
    return <div className="py-24 text-center text-sm" style={{ color: '#374151' }}>데이터 집계 중이에요</div>
  }

  const slots = [
    { data: p[1], rank: 2 },
    { data: p[0], rank: 1 },
    { data: p[2], rank: 3 },
  ]

  return (
    <div className="flex items-end justify-center gap-4 sm:gap-8 py-10 px-4">
      {slots.map((s, i) => (
        <PodiumSlot key={i} data={s.data} rank={s.rank} formatValue={formatValue} unit={unit} linkable={linkable} />
      ))}
    </div>
  )
}

const CLAN_CATS = [
  { id: 'avgDamage',  icon: '🏆', label: '평균 딜량',   desc: '경기당 실딜 우선 · 30경기↑',      formatValue: (v) => v?.toFixed(1),      unit: '딜'  },
  { id: 'avgKills',   icon: '💀', label: '평균 실킬',   desc: '경기당 봇킬 제외 · 30경기↑',      formatValue: (v) => v?.toFixed(2),      unit: '킬'  },
  { id: 'winRate',    icon: '🛡️', label: '승률',        desc: '30경기↑ · 멤버 3명↑',            formatValue: (v) => v?.toFixed(1),      unit: '%'   },
  { id: 'totalKills', icon: '🔥', label: '총 실킬',     desc: '시즌 전체 · 봇킬 제외',           formatValue: (v) => v?.toLocaleString(), unit: '킬'  },
  { id: 'totalWins',  icon: '👑', label: '총 승리',     desc: '시즌 전체 1위 횟수',             formatValue: (v) => v?.toLocaleString(), unit: '회'  },
  { id: 'growth',     icon: '📈', label: '성장왕',      desc: '시즌 초반 vs 최근 MMR 상승폭',    formatValue: (v) => v > 0 ? `+${v.toLocaleString()}` : v?.toLocaleString(), unit: 'MMR' },
]

const PLAYER_CATS = [
  { id: 'avgKills',     icon: '💀', label: '평균 실킬',   desc: '경기당 봇킬 제외 · 20경기↑',   formatValue: (v) => v?.toFixed(2),      unit: '킬'  },
  { id: 'avgDamage',   icon: '🏆', label: '평균 딜량',   desc: '경기당 봇킬 제외 · 20경기↑',   formatValue: (v) => v?.toFixed(1),      unit: '딜'  },
  { id: 'winRate',      icon: '🛡️', label: '승률',        desc: '20경기 이상',                  formatValue: (v) => v?.toFixed(1),      unit: '%'   },
  { id: 'totalKills',   icon: '🎯', label: '총 실킬',     desc: '시즌 전체 봇킬 제외',           formatValue: (v) => v?.toLocaleString(), unit: '킬'  },
  { id: 'totalWins',    icon: '👑', label: '총 승리',     desc: '시즌 전체 1위 횟수',           formatValue: (v) => v?.toLocaleString(), unit: '회'  },
  { id: 'weaponMaster', icon: '🔫', label: '무기 마스터', desc: '특정 무기 최다 킬',             formatValue: (v) => v?.toLocaleString(), unit: '킬'  },
]

export default function AwardsPage() {
  const [tab,      setTab]      = useState('clan')
  const [clanCat,  setClanCat]  = useState('avgDamage')
  const [plrCat,   setPlrCat]   = useState('avgKills')
  const [clanData,   setClanData]   = useState(null)
  const [playerData, setPlayerData] = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const fetch2 = async () => {
      setLoading(true)
      try {
        const [cR, pR] = await Promise.all([fetch('/api/awards/clans'), fetch('/api/awards/players')])
        if (cR.ok) setClanData(await cR.json())
        if (pR.ok) setPlayerData(await pR.json())
      } catch {}
      finally { setLoading(false) }
    }
    fetch2()
  }, [])

  const seasonLabel = clanData?.seasonStart
    ? new Date(clanData.seasonStart).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '2026년 3월 12일'
  const generatedAt = clanData?.generatedAt
    ? new Date(clanData.generatedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const clanAwards = clanData ? {
    avgDamage:  (clanData.avgDamage  || []).map((r) => ({ name: r.tag ? `[${r.tag}] ${r.name}` : r.name, value: r.value, sub: `${r.matches?.toLocaleString()}경기 · ${r.members}명` })),
    avgKills:   (clanData.avgKills   || []).map((r) => ({ name: r.tag ? `[${r.tag}] ${r.name}` : r.name, value: r.value, sub: `${r.matches?.toLocaleString()}경기 · ${r.members}명` })),
    winRate:    (clanData.winRate    || []).map((r) => ({ name: r.tag ? `[${r.tag}] ${r.name}` : r.name, value: r.value, sub: `${r.matches?.toLocaleString()}경기 · ${r.members}명` })),
    totalKills: (clanData.totalKills || []).map((r) => ({ name: r.tag ? `[${r.tag}] ${r.name}` : r.name, value: r.value, sub: `${r.matches?.toLocaleString()}경기 분석` })),
    totalWins:  (clanData.totalWins  || []).map((r) => ({ name: r.tag ? `[${r.tag}] ${r.name}` : r.name, value: r.value, sub: `${r.matches?.toLocaleString()}경기 중` })),
    growth:     (clanData.growth     || []).map((r) => ({ name: r.tag ? `[${r.tag}] ${r.name}` : r.name, value: r.value, sub: `멤버 ${r.members}명 기준` })),
  } : {}

  const playerAwards = playerData ? {
    avgKills:     (playerData.avgKills     || []).map((r) => ({ name: r.nickname||'—', value: r.value, sub: `${r.matches?.toLocaleString()}경기`, href: r.nickname ? `/player/${r.shard||'steam'}/${encodeURIComponent(r.nickname)}` : null })),
    avgDamage:    (playerData.avgDamage    || []).map((r) => ({ name: r.nickname||'—', value: r.value, sub: `${r.matches?.toLocaleString()}경기`, href: r.nickname ? `/player/${r.shard||'steam'}/${encodeURIComponent(r.nickname)}` : null })),
    winRate:      (playerData.winRate      || []).map((r) => ({ name: r.nickname||'—', value: r.value, sub: `${r.matches?.toLocaleString()}경기`, href: r.nickname ? `/player/${r.shard||'steam'}/${encodeURIComponent(r.nickname)}` : null })),
    totalKills:   (playerData.totalKills   || []).map((r) => ({ name: r.nickname||'—', value: r.value, sub: `${r.matches?.toLocaleString()}경기`, href: r.nickname ? `/player/${r.shard||'steam'}/${encodeURIComponent(r.nickname)}` : null })),
    totalWins:    (playerData.totalWins    || []).map((r) => ({ name: r.nickname||'—', value: r.value, sub: `${r.matches?.toLocaleString()}경기`, href: r.nickname ? `/player/${r.shard||'steam'}/${encodeURIComponent(r.nickname)}` : null })),
    weaponMaster: (playerData.weaponMaster || []).map((r) => ({ name: r.nickname||'—', value: r.value, sub: cleanWeaponId(r.weaponName), href: r.nickname ? `/player/${r.shard||'steam'}/${encodeURIComponent(r.nickname)}` : null })),
  } : {}

  const isClan = tab === 'clan'
  const cats   = isClan ? CLAN_CATS : PLAYER_CATS
  const selCat = isClan ? clanCat : plrCat
  const setCat = isClan ? setClanCat : setPlrCat
  const activeCat     = cats.find((c) => c.id === selCat) || cats[0]
  const activeEntries = isClan ? (clanAwards[selCat] || []) : (playerAwards[selCat] || [])

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Head>
        <title>배그 시즌 어워드 | PKGG</title>
        <meta name="description" content="이번 시즌 최고의 클랜과 플레이어를 확인하세요. PKGG 시즌 어워드." />
      </Head>

      <Header />

      <main className="min-h-screen" style={{ background: '#030712' }}>

        {/* ── 히어로 ── */}
        <div className="relative overflow-hidden">
          {/* 배경 레이어들 */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(180,130,10,0.18) 0%, transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 30% at 30% 90%, rgba(30,58,138,0.12) 0%, transparent 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 40% 20% at 75% 80%, rgba(120,53,15,0.1) 0%, transparent 60%)' }} />
          {/* 도트 패턴 */}
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,220,100,0.9) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          {/* 가로 황금 구분선 */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />

          <div className="relative max-w-4xl mx-auto px-4 pt-14 pb-10 text-center">
            {/* 뱃지 */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', color: '#fde68a', letterSpacing: '0.08em' }}>
              <span>🎖️</span> PKGG SEASON AWARDS
            </div>

            <h1 className="font-black text-white leading-tight mb-3" style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              textShadow: '0 0 60px rgba(251,191,36,0.2)',
            }}>
              이번 시즌{' '}
              <span style={{
                background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 40%, #fef3c7 70%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                최고의 영웅들
              </span>
            </h1>
            <p style={{ color: '#4b5563', fontSize: 12 }}>
              시즌 시작: <span style={{ color: '#6b7280' }}>{seasonLabel}</span>
              {generatedAt && <span style={{ color: '#374151' }}> · 집계: {generatedAt}</span>}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-24">

          {/* ── 메인 탭 ── */}
          <div className="flex gap-1.5 mb-7 p-1.5 w-fit mx-auto rounded-2xl"
            style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(55,65,81,0.6)', backdropFilter: 'blur(8px)' }}>
            <button onClick={() => setTab('clan')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={tab === 'clan' ? {
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
              } : { color: '#6b7280' }}>
              🛡️ 클랜 어워드
            </button>
            <button onClick={() => setTab('player')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={tab === 'player' ? {
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                color: '#1c1917',
                boxShadow: '0 4px 16px rgba(217,119,6,0.35)',
              } : { color: '#6b7280' }}>
              🎯 플레이어 어워드
            </button>
          </div>

          {/* ── 카테고리 탭 ── */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: 'none' }}>
            {cats.map((cat) => {
              const active = selCat === cat.id
              return (
                <button key={cat.id} onClick={() => setCat(cat.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all"
                  style={active ? {
                    background: 'rgba(255,255,255,0.09)',
                    border: '1px solid rgba(251,191,36,0.35)',
                    color: '#fde68a',
                    boxShadow: '0 0 12px rgba(251,191,36,0.1)',
                  } : {
                    border: '1px solid transparent',
                    color: '#4b5563',
                  }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── 카테고리 타이틀 ── */}
          <div className="text-center mb-1">
            <p className="font-black text-white" style={{ fontSize: 18 }}>{activeCat.icon} {activeCat.label}</p>
            <p style={{ color: '#374151', fontSize: 11, marginTop: 2 }}>{activeCat.desc}</p>
          </div>

          {/* ── 단상 무대 ── */}
          <div className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(17,24,39,0.7) 0%, rgba(3,7,18,0.9) 100%)',
              border: '1px solid rgba(55,65,81,0.5)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 60px rgba(0,0,0,0.5)',
            }}>
            {/* 무대 천장 조명 */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 65%)',
            }} />
            {/* 사이드 라이트 */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 20% 60% at 0% 50%, rgba(251,191,36,0.04) 0%, transparent 80%)',
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 20% 60% at 100% 50%, rgba(251,191,36,0.04) 0%, transparent 80%)',
            }} />
            {/* 바닥 반사 */}
            <div className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent)' }} />

            <Podium
              entries={activeEntries}
              formatValue={activeCat.formatValue}
              unit={activeCat.unit}
              loading={loading}
              linkable={!isClan}
            />
          </div>

          {/* ── 집계 기준 ── */}
          <div className="mt-10 p-4 rounded-2xl" style={{ background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(31,41,55,0.8)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#4b5563' }}>📌 집계 기준</p>
            <ul className="space-y-1" style={{ fontSize: 11, color: '#374151' }}>
              <li>• 이벤트 / 훈련 / 연습장 경기 제외</li>
              <li>• 클랜: 멤버 3명↑ + 시즌 30경기↑ 클랜만 집계 · 클랜 이름 클릭 비활성화</li>
              <li>• 플레이어: 시즌 20경기↑ 분석 완료만 집계 · 닉네임 클릭 시 전적 이동</li>
              <li>• 킬: 봇킬 분석 완료 경기는 실킬 사용, 미완료 경기는 총킬 사용</li>
              <li>• 성장왕: 시즌 초반 1달 vs 최근 30일 PKGG 스냅샷 평균 비교</li>
            </ul>
          </div>
        </div>
      </main>

    </>
  )
}
