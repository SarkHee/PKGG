import Head from 'next/head'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const TYPES  = ['전체', 'AR', 'DMR', 'SR', 'SMG', 'LMG', 'SG', 'Pistol']
const SHARDS = [
  { value: 'all',   label: '전체' },
  { value: 'steam', label: 'Steam' },
  { value: 'kakao', label: '카카오' },
]
const SORTS = [
  { key: 'kills',     label: '총 킬' },
  { key: 'avgKills',  label: '평균 킬' },
  { key: 'avgDamage', label: '평균 딜' },
  { key: 'hsRate',    label: '헤드샷률' },
  { key: 'userCount', label: '사용자 수' },
]

const TIER_STYLE = {
  S: { badge: 'bg-yellow-400 text-yellow-900',  border: 'border-yellow-400/30', glow: 'shadow-yellow-400/10' },
  A: { badge: 'bg-green-400 text-green-900',    border: 'border-green-400/30',  glow: 'shadow-green-400/10' },
  B: { badge: 'bg-blue-400 text-blue-900',      border: 'border-blue-400/30',   glow: 'shadow-blue-400/10' },
  C: { badge: 'bg-gray-500 text-gray-100',      border: 'border-gray-600/30',   glow: '' },
}

const CAT_BADGE = {
  AR:     'bg-blue-900/50 text-blue-300',
  DMR:    'bg-violet-900/50 text-violet-300',
  SR:     'bg-indigo-900/50 text-indigo-300',
  SMG:    'bg-emerald-900/50 text-emerald-300',
  LMG:    'bg-orange-900/50 text-orange-300',
  SG:     'bg-red-900/50 text-red-300',
  Pistol: 'bg-amber-900/50 text-amber-300',
  Other:  'bg-gray-800 text-gray-400',
}

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function WeaponImage({ weaponId, name }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="text-3xl">🔫</span>
  return (
    <Image
      src={`/weapons/${weaponId}.png`}
      alt={name}
      width={96}
      height={64}
      className="object-contain w-full h-full p-1.5"
      unoptimized
      onError={() => setFailed(true)}
    />
  )
}

function WeaponCard({ w }) {
  const ts = TIER_STYLE[w.tier] || TIER_STYLE.C
  const cb = CAT_BADGE[w.category] || CAT_BADGE.Other

  return (
    <div className={`relative bg-gray-900 border ${ts.border} rounded-2xl p-4 shadow-lg ${ts.glow} flex flex-col gap-3 hover:bg-gray-800/80 transition-colors`}>
      {/* 티어 뱃지 */}
      <span className={`absolute top-3 right-3 text-[11px] font-black px-2 py-0.5 rounded-md ${ts.badge}`}>
        {w.tier}
      </span>

      {/* 이미지 + 이름 */}
      <div className="flex items-center gap-3">
        <div className="w-20 h-14 flex-shrink-0 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
          <WeaponImage weaponId={w.weaponId} name={w.name} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate pr-8">{w.name}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cb}`}>
            {w.category}
          </span>
        </div>
      </div>

      {/* 스탯 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Stat label="평균 킬"   value={w.avgKills}            unit="" />
        <Stat label="평균 딜"   value={fmt(w.avgDamage)}      unit="" />
        <Stat label="헤드샷률"  value={`${w.hsRate}%`}        unit="" />
        <Stat label="사용자"    value={fmt(w.userCount)}      unit="명" />
      </div>

      {/* 총 킬 바 */}
      <div className="mt-0.5">
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>총 킬</span>
          <span className="text-gray-400 font-semibold">{fmt(w.kills)}</span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${w._barPct || 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-xs font-bold text-gray-200">{value}{unit}</p>
    </div>
  )
}

export default function WeaponMetaPage() {
  const [typeFilter, setTypeFilter] = useState('전체')
  const [shard, setShard]           = useState('all')
  const [sortKey, setSortKey]       = useState('kills')
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/weapon-meta?shard=${shard}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error)
        setData(json)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [shard])

  const weapons = data?.weapons || []
  const maxKills = Math.max(...weapons.map(w => w.kills), 1)

  const filtered = weapons
    .filter(w => typeFilter === '전체' || w.category === typeFilter)
    .map(w => ({ ...w, _barPct: Math.round((w.kills / maxKills) * 100) }))
    .sort((a, b) => b[sortKey] - a[sortKey])

  const dateMin = data?.dateRange?.min ? new Date(data.dateRange.min).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''
  const dateMax = data?.dateRange?.max ? new Date(data.dateRange.max).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''

  return (
    <>
      <Head>
        <title>무기 메타 — PK.GG</title>
        <meta name="description" content="PKGG 실제 유저 데이터 기반 PUBG 무기 메타 분석. 킬, 딜량, 헤드샷률 통계." />
      </Head>

      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← 홈</a>
            <div className="mt-3 flex items-end gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-black text-white">📊 무기 메타</h1>
                <p className="text-sm text-gray-400 mt-0.5">PKGG 실제 유저 데이터 기반</p>
              </div>
              {dateMin && dateMax && (
                <span className="text-xs text-gray-600 bg-gray-800 px-2.5 py-1 rounded-full mb-0.5">
                  {dateMin} ~ {dateMax} 기준
                </span>
              )}
            </div>
          </div>

          {/* 플랫폼 탭 */}
          <div className="flex gap-1.5 mb-4">
            {SHARDS.map(s => (
              <button
                key={s.value}
                onClick={() => setShard(s.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  shard === s.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* 카테고리 필터 + 정렬 */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 정렬 */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500">정렬</span>
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
              >
                {SORTS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="flex items-center justify-center py-24 gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">데이터 불러오는 중...</span>
            </div>
          )}

          {/* 에러 */}
          {!loading && error && (
            <div className="text-center py-20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 무기 카드 그리드 */}
          {!loading && !error && (
            <>
              <p className="text-xs text-gray-600 mb-3">총 {filtered.length}종 무기</p>
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-600">해당 카테고리 데이터 없음</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filtered.map(w => <WeaponCard key={w.weaponId} w={w} />)}
                </div>
              )}

              {/* 티어 기준 안내 */}
              <div className="mt-8 p-4 bg-gray-900 rounded-xl border border-gray-800 text-xs text-gray-500 leading-relaxed">
                <p className="font-semibold text-gray-400 mb-1">📌 티어 산정 기준</p>
                <p>PKGG에 기록된 실제 유저 데이터 기반 · 총 킬 수 기준 상대 순위 산정</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[
                    ['S', '상위 10%', 'text-yellow-400'],
                    ['A', '상위 25%', 'text-green-400'],
                    ['B', '상위 50%', 'text-blue-400'],
                    ['C', '나머지',   'text-gray-400'],
                  ].map(([tier, desc, cls]) => (
                    <span key={tier} className={`font-bold ${cls}`}>{tier} <span className="text-gray-500 font-normal">{desc}</span></span>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
