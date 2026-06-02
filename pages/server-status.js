import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/layout/Header'

const STATUS_META = {
  online:      { dot: 'bg-green-400',  glow: 'shadow-green-400/50', text: 'text-green-400',  label: '정상 운영',    desc: '서버가 정상적으로 운영되고 있습니다.',       icon: '🟢' },
  maintenance: { dot: 'bg-red-400',    glow: 'shadow-red-400/50',   text: 'text-red-400',    label: '점검 중',      desc: '현재 서버 점검이 진행 중입니다.',           icon: '🔴' },
  offline:     { dot: 'bg-red-500',    glow: 'shadow-red-500/50',   text: 'text-red-400',    label: '접속 불가',    desc: '서버에 접속할 수 없습니다.',               icon: '⚫' },
  degraded:    { dot: 'bg-yellow-400', glow: 'shadow-yellow-400/50',text: 'text-yellow-400', label: '일부 불안정',  desc: '일부 서비스가 불안정한 상태입니다.',         icon: '🟡' },
  unknown:     { dot: 'bg-gray-500',   glow: '',                    text: 'text-gray-400',   label: '확인 중',      desc: '서버 상태를 확인하고 있습니다.',            icon: '⚪' },
}

const REGION_META = {
  as: { name: '아시아',  flag: '🌏', shard: 'Steam' },
  na: { name: '북미',    flag: '🌎', shard: 'PC-NA' },
  eu: { name: '유럽',    flag: '🌍', shard: 'PC-EU' },
}

const REFRESH_INTERVAL = 30 // 초

function StatusDot({ status, size = 'md', animate = true }) {
  const m = STATUS_META[status] || STATUS_META.unknown
  const sizeClass = size === 'lg' ? 'w-4 h-4' : size === 'xl' ? 'w-5 h-5' : 'w-3 h-3'
  return (
    <span className={`inline-block rounded-full flex-shrink-0 ${sizeClass} ${m.dot} shadow-lg ${m.glow} ${animate && status === 'online' ? 'animate-pulse' : ''}`} />
  )
}

function RegionCard({ regionKey, status }) {
  const rm = REGION_META[regionKey]
  const sm = STATUS_META[status] || STATUS_META.unknown
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center gap-3">
      <span className="text-3xl">{rm.flag}</span>
      <div className="text-center">
        <div className="font-bold text-white text-sm">{rm.name}</div>
        <div className="text-[11px] text-gray-600 mt-0.5">{rm.shard}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusDot status={status} size="md" />
        <span className={`text-sm font-bold ${sm.text}`}>{sm.label}</span>
      </div>
    </div>
  )
}

function HistoryRow({ entry, index }) {
  const fromMeta = STATUS_META[entry.from] || STATUS_META.unknown
  const toMeta   = STATUS_META[entry.to]   || STATUS_META.unknown
  const time = new Date(entry.timestamp).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const isDown = entry.to === 'maintenance' || entry.to === 'offline'
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-800/60 last:border-0 ${index === 0 ? 'opacity-100' : 'opacity-80'}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDown ? 'bg-red-400' : 'bg-green-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold ${fromMeta.text}`}>{fromMeta.label}</span>
          <span className="text-gray-600 text-xs">→</span>
          <span className={`text-xs font-bold ${toMeta.text}`}>{toMeta.label}</span>
        </div>
        {entry.regions && (
          <div className="text-[10px] text-gray-600 mt-0.5">
            아시아: {STATUS_META[entry.regions.as]?.icon} · 북미: {STATUS_META[entry.regions.na]?.icon} · 유럽: {STATUS_META[entry.regions.eu]?.icon}
          </div>
        )}
      </div>
      <span className="text-[11px] text-gray-600 flex-shrink-0">{time}</span>
    </div>
  )
}

export default function ServerStatusPage() {
  const [data,      setData]      = useState(null)
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [lastFetch, setLastFetch] = useState(null)
  const timerRef = useRef(null)

  const fetchStatus = async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        fetch('/api/pubg/server-status'),
        fetch('/api/pubg/server-history'),
      ])
      if (sRes.ok) setData(await sRes.json())
      if (hRes.ok) setHistory((await hRes.json()).history || [])
      setLastFetch(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // 30초마다 자동 갱신
    const iv = setInterval(() => {
      fetchStatus()
      setCountdown(REFRESH_INTERVAL)
    }, REFRESH_INTERVAL * 1000)

    // 카운트다운
    const cd = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1))
    }, 1000)

    return () => { clearInterval(iv); clearInterval(cd) }
  }, [])

  const sm = STATUS_META[data?.status] || STATUS_META.unknown

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <>
      <Head>
        <title>PUBG 서버 상태 | PKGG</title>
        <meta name="description" content="배틀그라운드 실시간 서버 상태 확인. 아시아·북미·유럽 지역별 서버 운영 상태와 점검 이력을 제공합니다." />
        <meta property="og:title" content="PUBG 서버 상태 | PKGG" />
        <meta property="og:description" content="배틀그라운드 실시간 서버 상태 확인" />
      </Head>

      <Header />

      <main className="min-h-screen bg-gray-950 text-gray-100">

        {/* 히어로 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: data?.status === 'online'
              ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 60%)'
              : data?.status === 'maintenance' || data?.status === 'offline'
                ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(239,68,68,0.1) 0%, transparent 60%)'
                : 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(234,179,8,0.07) 0%, transparent 60%)',
          }} />
          <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-10 text-center">
            {/* 메인 상태 인디케이터 */}
            {loading ? (
              <div className="w-24 h-24 rounded-full bg-gray-800 animate-pulse mx-auto mb-6" />
            ) : (
              <div className="relative inline-flex items-center justify-center mb-6">
                {/* 외부 글로우 링 */}
                <div className={`absolute inset-0 rounded-full blur-2xl opacity-30 ${sm.dot}`}
                  style={{ transform: 'scale(1.8)' }} />
                <div className={`w-24 h-24 rounded-full ${sm.dot} shadow-2xl ${sm.glow} flex items-center justify-center text-4xl relative`}>
                  {data?.status === 'online' ? '✓' : data?.status === 'maintenance' ? '🔧' : data?.status === 'offline' ? '✕' : '?'}
                </div>
                {data?.status === 'online' && (
                  <div className={`absolute inset-0 rounded-full ${sm.dot} opacity-30 animate-ping`} />
                )}
              </div>
            )}

            <h1 className={`text-3xl font-black mb-2 ${loading ? 'text-gray-600' : sm.text}`}>
              {loading ? '상태 확인 중...' : sm.label}
            </h1>
            <p className="text-gray-400 text-sm mb-4">
              {loading ? '...' : sm.desc}
            </p>

            {/* 타임스탬프 & 카운트다운 */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
              {updatedAt && <span>마지막 확인: {updatedAt}</span>}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {countdown}초 후 갱신
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-20 space-y-8">

          {/* 지역별 상태 */}
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
              <span>🌐</span> 지역별 서버 상태
            </h2>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[0,1,2].map((i) => (
                  <div key={i} className="bg-gray-900 rounded-2xl h-36 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {Object.keys(REGION_META).map((key) => (
                  <RegionCard key={key} regionKey={key} status={data?.regions?.[key] || 'unknown'} />
                ))}
              </div>
            )}
          </section>

          {/* 점검 안내 (점검 중일 때) */}
          {(data?.status === 'maintenance' || data?.status === 'offline') && (
            <section className="bg-red-900/20 border border-red-700/40 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-red-300 mb-1">서버 점검 안내</div>
                  <p className="text-sm text-red-400/80">
                    현재 PUBG 서버 점검 또는 장애가 감지됐습니다. 공식 PUBG 채널에서 자세한 내용을 확인해주세요.
                  </p>
                  <a href="https://www.pubg.com/ko/news" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-red-400 hover:text-red-300 underline">
                    PUBG 공식 공지 확인 →
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* 변경 이력 */}
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
              <span>📋</span> 최근 상태 변경 이력
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              {history.length === 0 ? (
                <div className="py-8 text-center text-gray-700 text-sm">
                  {loading ? '불러오는 중...' : '최근 상태 변경 이력이 없습니다.\n서버가 안정적으로 운영 중이에요 🎉'}
                </div>
              ) : (
                history.map((entry, i) => (
                  <HistoryRow key={i} entry={entry} index={i} />
                ))
              )}
            </div>
          </section>

          {/* 안내 */}
          <section className="p-4 bg-gray-900/40 border border-gray-800 rounded-2xl text-xs text-gray-600 space-y-1">
            <p className="font-bold text-gray-500 mb-2">📌 안내</p>
            <p>• PUBG 공식 API (api.pubg.com) 응답 상태를 기반으로 체크합니다</p>
            <p>• 5분마다 자동 갱신되며 상태 변경 시 디스코드 알림을 전송합니다</p>
            <p>• 정확한 점검 정보는 <a href="https://www.pubg.com/ko/news" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">PUBG 공식 사이트</a>를 확인해주세요</p>
          </section>
        </div>
      </main>

    </>
  )
}
