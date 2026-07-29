// pages/weapon-meta-live.js
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import Header from '../components/layout/Header'
import { useT } from '../utils/i18n'

// 정규화된 무기 key → { name, type, img }
// img: /weapons/Item_Weapon_{img}_C.png 경로에 쓰이는 파일명 부분
const WEAPON_INFO = {
  // AR
  AK47:        { name: 'AKM',          type: 'AR',     img: 'AK47' },
  HK416:       { name: 'M416',         type: 'AR',     img: 'HK416' },
  BerylM762:   { name: 'Beryl M762',   type: 'AR',     img: 'BerylM762' },
  AUG:         { name: 'AUG A3',       type: 'AR',     img: 'AUG' },
  SCAR_L:      { name: 'SCAR-L',       type: 'AR',     img: 'SCAR-L' },
  M16A4:       { name: 'M16A4',        type: 'AR',     img: 'M16A4' },
  G36C:        { name: 'G36C',         type: 'AR',     img: 'G36C' },
  Groza:       { name: 'Groza',        type: 'AR',     img: 'Groza' },
  QBZ95:       { name: 'QBZ-95',       type: 'AR',     img: 'QBZ95' },
  ACE32:       { name: 'ACE32',        type: 'AR',     img: 'ACE32' },
  K2:          { name: 'K2',           type: 'AR',     img: 'K2' },
  Mk47Mutant:  { name: 'Mk47 Mutant',  type: 'AR',     img: 'Mk47Mutant' },
  FAMASG2:     { name: 'FAMAS G2',     type: 'AR',     img: 'FAMASG2' },
  // DMR
  SKS:         { name: 'SKS',          type: 'DMR',    img: 'SKS' },
  Mini14:      { name: 'Mini 14',      type: 'DMR',    img: 'Mini14' },
  FNFal:       { name: 'SLR',          type: 'DMR',    img: 'FNFal' },
  Mk12:        { name: 'Mk12',         type: 'DMR',    img: 'Mk12' },
  QBU88:       { name: 'QBU88',        type: 'DMR',    img: 'QBU88' },
  Mk14:        { name: 'Mk14 EBR',     type: 'DMR',    img: 'Mk14' },
  VSS:         { name: 'VSS',          type: 'DMR',    img: 'VSS' },
  Dragunov:    { name: 'Dragunov',     type: 'DMR',    img: 'Dragunov' },
  // SR
  Kar98k:      { name: 'Kar98k',       type: 'SR',     img: 'Kar98k' },
  M24:         { name: 'M24',          type: 'SR',     img: 'M24' },
  AWM:         { name: 'AWM',          type: 'SR',     img: 'AWM' },
  Mosin:       { name: 'Mosin-Nagant', type: 'SR',     img: 'Mosin' },
  Win94:       { name: 'Win94',        type: 'SR',     img: 'Win1894' },
  L6:          { name: 'Lynx AMR',     type: 'SR',     img: 'L6' },
  // SMG
  UMP:         { name: 'UMP45',        type: 'SMG',    img: 'UMP' },
  Vector:      { name: 'Vector',       type: 'SMG',    img: 'Vector' },
  MP5K:        { name: 'MP5K',         type: 'SMG',    img: 'MP5K' },
  BizonPP19:   { name: 'PP-19 Bizon',  type: 'SMG',    img: 'BizonPP19' },
  MP9:         { name: 'MP9',          type: 'SMG',    img: 'MP9' },
  P90:         { name: 'P90',          type: 'SMG',    img: 'P90' },
  UZI:         { name: 'Micro Uzi',    type: 'SMG',    img: 'UZI' },
  Thompson:    { name: 'Tommy Gun',    type: 'SMG',    img: 'Thompson' },
  JS9:         { name: 'JS9',          type: 'SMG',    img: 'JS9' },
  // SG
  Berreta686:  { name: 'S686',         type: 'SG',     img: 'Berreta686' },
  DP12:        { name: 'DBS',          type: 'SG',     img: 'DP12' },
  Saiga12:     { name: 'S12K',         type: 'SG',     img: 'Saiga12' },
  OriginS12:   { name: 'O12',          type: 'SG',     img: 'OriginS12' },
  S1897:       { name: 'S1897',        type: 'SG',     img: 'Winchester' },
  Sawnoff:     { name: 'Sawed-off',    type: 'SG',     img: 'Sawnoff' },
  // LMG
  DP28:        { name: 'DP-28',        type: 'LMG',    img: 'DP28' },
  M249:        { name: 'M249',         type: 'LMG',    img: 'M249' },
  MG3:         { name: 'MG3',          type: 'LMG',    img: 'MG3' },
  // Pistol — Skorpion(.32 ACP 완전자동 권총)은 SMG가 아닌 Pistol 분류
  DesertEagle: { name: 'Deagle',       type: 'Pistol', img: 'DesertEagle' },
  M1911:       { name: 'P1911',        type: 'Pistol', img: 'M1911' },
  G18:         { name: 'P18C',         type: 'Pistol', img: 'G18' },
  M9:          { name: 'P92',          type: 'Pistol', img: 'M9' },
  Rhino:       { name: 'R45',          type: 'Pistol', img: 'Rhino' },
  NagantM1895: { name: 'R1895',        type: 'Pistol', img: 'NagantM1895' },
  Skorpion:    { name: 'Skorpion',     type: 'Pistol', img: 'Skorpion' },
}

const TYPE_COLOR = {
  AR:     { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300' },
  DMR:    { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  SR:     { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300' },
  SMG:    { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-700 dark:text-green-300' },
  SG:     { bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-700 dark:text-red-300' },
  LMG:    { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  Pistol: { bg: 'bg-gray-100 dark:bg-gray-700',        text: 'text-gray-600 dark:text-gray-300' },
}

const TYPE_KEYS = ['all', 'AR', 'DMR', 'SR', 'SMG', 'SG', 'LMG', 'Pistol']

const RANK_STYLE = {
  1: { card: 'from-yellow-400/20 to-amber-500/10 border-yellow-400/50', badge: 'bg-yellow-400 text-yellow-900', label: '🥇' },
  2: { card: 'from-gray-300/20 to-slate-400/10 border-gray-400/50',     badge: 'bg-gray-300 text-gray-800',    label: '🥈' },
  3: { card: 'from-orange-400/20 to-amber-600/10 border-orange-400/50', badge: 'bg-orange-400 text-orange-900', label: '🥉' },
}

function weaponImg(info) {
  return `/weapons/Item_Weapon_${info.img}_C.png`
}

function WeaponIcon({ info, size = 40 }) {
  const [err, setErr] = useState(false)
  if (!info || err) {
    return (
      <div
        className="rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs"
        style={{ width: size, height: size }}
      >🔫</div>
    )
  }
  return (
    <Image
      src={weaponImg(info)}
      alt={info.name}
      width={size}
      height={size}
      className="object-contain"
      onError={() => setErr(true)}
    />
  )
}

function TrendBadge({ trend }) {
  if (trend === null) return <span className="text-xs text-blue-500 font-bold">NEW</span>
  if (trend === 0)    return <span className="text-xs text-gray-400">—</span>
  const up = trend > 0
  return (
    <span className={`text-xs font-bold ${up ? 'text-emerald-500' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(trend)}
    </span>
  )
}

function TypeBadge({ type }) {
  const c = TYPE_COLOR[type] || TYPE_COLOR.Pistol
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
      {type}
    </span>
  )
}

// 알려진 시즌 목록 (seasonStart.js의 SEASON_STARTS와 동기화)
const KNOWN_SEASONS = [41, 42]

export default function WeaponMetaLivePage() {
  const { t } = useT()
  const [period,  setPeriod]  = useState('week')
  const [season,  setSeason]  = useState(null)   // null=기간모드, 숫자=시즌모드
  const [shard,   setShard]   = useState('all')
  const [typeTab, setTypeTab] = useState('all')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const PERIODS = [
    { key: 'week',   label: t('wml.period.week') },
    { key: 'month',  label: t('wml.period.month') },
    { key: 'season', label: t('wml.period.season') },
  ]
  const SHARDS = [
    { key: 'all',   label: t('wml.shard.all') },
    { key: 'steam', label: 'Steam' },
    { key: 'kakao', label: t('wml.shard.kakao') },
    { key: 'psn',   label: 'PS' },
  ]
  const TYPES = TYPE_KEYS.map(k => ({ key: k, label: k === 'all' ? t('wml.type.all') : k }))

  function selectPeriod(key) {
    setSeason(null)
    setPeriod(key)
  }

  function selectSeason(num) {
    setSeason(num)
  }

  useEffect(() => {
    setLoading(true)
    const url = season
      ? `/api/weapon-meta-live?season=${season}&shard=${shard}`
      : `/api/weapon-meta-live?period=${period}&shard=${shard}`
    fetch(url)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period, season, shard])

  const weapons = (data?.weapons || []).map(w => ({
    ...w,
    info: WEAPON_INFO[w.key] || { name: w.key, type: '?', img: null },
  }))

  const filtered = typeTab === 'all'
    ? weapons
    : weapons.filter(w => w.info.type === typeTab)

  const top3 = weapons.filter(w => WEAPON_INFO[w.key]).slice(0, 3)
  const meta  = data?.meta || {}

  return (
    <>
      <Head>
        <title>{t('wml.meta_title')}</title>
        <meta name="description" content={t('wml.meta_desc')} />
        <meta property="og:title" content={t('wml.meta_title')} />
        <meta property="og:description" content={t('wml.meta_desc')} />
      </Head>

      <Header />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {t('wml.title')}
                  </h1>
                  <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">LIVE</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('wml.subtitle')}
                  {!loading && meta.totalKills > 0 && (
                    <span className="text-blue-500 font-semibold ml-1">
                      · 총 {meta.totalKills.toLocaleString()}{t('wml.kills_suffix')}
                    </span>
                  )}
                  {!loading && season && (
                    <span className="ml-1 text-indigo-500 font-semibold">
                      · 시즌 {season} 기준
                    </span>
                  )}
                </p>
              </div>

              {/* 기간 + 시즌 + 플랫폼 탭 */}
              <div className="flex flex-col gap-2 self-start sm:self-auto">
                <div className="flex flex-wrap gap-2">
                  {/* 기간 탭 */}
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    {PERIODS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => selectPeriod(p.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          !season && period === p.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                      >{p.label}</button>
                    ))}
                  </div>

                  {/* 시즌별 탭 */}
                  <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700/40 rounded-lg p-0.5">
                    <span className="text-[10px] font-bold text-indigo-400 px-1.5">시즌</span>
                    {KNOWN_SEASONS.map(num => (
                      <button
                        key={num}
                        onClick={() => selectSeason(num)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          season === num
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200'
                        }`}
                      >S{num}</button>
                    ))}
                  </div>

                  {/* 플랫폼 탭 */}
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    {SHARDS.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setShard(s.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          shard === s.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                {/* 활성 필터 표시 */}
                {season && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    시즌 {season} 데이터 조회 중
                    <button
                      onClick={() => selectPeriod('week')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                    >기간으로 전환</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-6">

          {/* 로딩 */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {/* TOP 3 카드 */}
              {top3.length >= 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {top3.map((w, i) => {
                    const st = RANK_STYLE[i + 1]
                    return (
                      <div
                        key={w.key}
                        className={`relative bg-gradient-to-br ${st.card} border rounded-2xl p-5 overflow-hidden`}
                      >
                        <div className="absolute top-3 right-3">
                          <span className="text-2xl">{st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/20 dark:bg-black/20 rounded-xl flex items-center justify-center">
                            <WeaponIcon info={w.info} size={40} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                              {w.info.name}
                            </div>
                            <TypeBadge type={w.info.type} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-black text-gray-800 dark:text-gray-100">
                              {w.kills.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('wml.col_kills')}</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-gray-800 dark:text-gray-100">
                              {w.killRate}%
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('wml.col_killrate')}</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-gray-800 dark:text-gray-100">
                              {w.avgDmg}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{t('wml.col_avgdmg')}</div>
                          </div>
                        </div>
                        {w.trend !== null && (
                          <div className="absolute bottom-3 left-5">
                            <TrendBadge trend={w.trend} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 무기 종류 필터 */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {TYPES.map(tp => (
                  <button
                    key={tp.key}
                    onClick={() => setTypeTab(tp.key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      typeTab === tp.key
                        ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >{tp.label}</button>
                ))}
              </div>

              {/* 순위 테이블 */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-[40px_1fr_60px_80px_80px_80px_60px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 dark:text-gray-500">
                  <div className="text-center">#</div>
                  <div>{t('wml.col_weapon')}</div>
                  <div className="text-center hidden sm:block">{t('wml.col_type')}</div>
                  <div className="text-right">{t('wml.col_kills')}</div>
                  <div className="text-right">{t('wml.col_killrate')}</div>
                  <div className="text-right">{t('wml.col_avgdmg')}</div>
                  <div className="text-center">{t('wml.col_trend')}</div>
                </div>

                {filtered.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm">{t('wml.no_data')}</div>
                )}

                {filtered.map((w, idx) => {
                  const isTop = w.rank <= 3
                  return (
                    <div
                      key={w.key}
                      className={`grid grid-cols-[40px_1fr_60px_80px_80px_80px_60px] gap-2 px-4 py-3 items-center border-b border-gray-50 dark:border-gray-800/50 last:border-0 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${isTop ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''}`}
                    >
                      {/* 순위 */}
                      <div className="text-center">
                        {w.rank <= 3 ? (
                          <span className="text-base">{RANK_STYLE[w.rank].label}</span>
                        ) : (
                          <span className="text-sm text-gray-400 font-semibold">{w.rank}</span>
                        )}
                      </div>

                      {/* 무기명 + 이미지 */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                          <WeaponIcon info={w.info} size={32} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {w.info.name}
                          </div>
                          <div className="sm:hidden">
                            <TypeBadge type={w.info.type} />
                          </div>
                        </div>
                      </div>

                      {/* 타입 */}
                      <div className="text-center hidden sm:block">
                        <TypeBadge type={w.info.type} />
                      </div>

                      {/* 킬 */}
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                          {w.kills.toLocaleString()}
                        </span>
                      </div>

                      {/* 킬률 */}
                      <div className="text-right">
                        <span className={`text-sm font-bold ${w.rank <= 3 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                          {w.killRate}%
                        </span>
                      </div>

                      {/* 평균딜 */}
                      <div className="text-right">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {w.avgDmg > 0 ? w.avgDmg : '—'}
                        </span>
                      </div>

                      {/* 추세 */}
                      <div className="text-center">
                        <TrendBadge trend={w.trend} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 하단 안내 */}
              <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                {t('wml.footer_note')}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
