// GET /api/og/report?nickname=xxx&shard=steam
// 리포트 카드 OG 이미지 생성 (Edge Runtime + @vercel/og)

import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

const TIER_COLOR = {
  Bronze:   '#CD7F32',
  Silver:   '#9CA3AF',
  Gold:     '#F59E0B',
  Platinum: '#22D3EE',
  Diamond:  '#818CF8',
  Master:   '#C084FC',
  Legend:   '#F472B6',
}
const BAR_COLORS = ['#7F77DD', '#A5A0F0', '#6B7280']

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const nickname = searchParams.get('nickname') || ''
  const shard    = searchParams.get('shard') || 'steam'
  if (!nickname) return new Response('nickname 필요', { status: 400 })

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  let d = null
  try {
    const res = await fetch(`${base}/api/report/${encodeURIComponent(nickname)}?shard=${shard}`)
    if (res.ok) d = await res.json()
  } catch {}

  const tierLabel   = d?.tier?.label || ''
  const tierEmoji   = d?.tier?.emoji || ''
  const tierColor   = TIER_COLOR[tierLabel] || '#A5A0F0'
  const kills       = d?.avgRealKills  != null ? d.avgRealKills.toFixed(2)          : (d?.avgKills?.toFixed(2) ?? '-')
  const damage      = d?.avgRealDamage != null ? d.avgRealDamage.toLocaleString()   : (d?.avgDamage?.toLocaleString() ?? '-')
  const winRate     = d?.winRate != null ? `${d.winRate}%` : '-'
  const mmr         = d?.mmr ? d.mmr.toLocaleString() : '-'
  const season      = d?.currentSeason?.label || ''
  const topWeapons  = d?.topWeapons || []
  const maxKills    = topWeapons[0]?.kills || 1
  const isCorrected = d?.avgRealKills != null
  const totalGames  = d?.totalGames || '-'
  const bm          = d?.bestMatch || null

  return new ImageResponse(
    (
      <div style={{ width: 800, height: 420, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg,#0D0B1A 0%,#140D2E 50%,#0D1B2A 100%)' }}>

        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(127,119,221,0.15)', borderBottom: '1px solid rgba(127,119,221,0.3)' }}>
          <div style={{ color: '#A5A0F0', fontSize: 11, fontWeight: 700, letterSpacing: 3, display: 'flex' }}>PK.GG  SEASON REPORT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {season
              ? <div style={{ display: 'flex', background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.4)', color: '#63B3ED', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{season}</div>
              : null}
          </div>
        </div>

        {/* ── 바디 ── */}
        <div style={{ display: 'flex', flex: 1, padding: '18px 24px', gap: 24 }}>

          {/* 왼쪽 */}
          <div style={{ width: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 닉네임 */}
            <div style={{ display: 'flex', color: 'white', fontSize: 22, fontWeight: 900 }}>{nickname}</div>

            {/* 티어 + MMR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: 'rgba(127,119,221,0.25)', border: `1px solid ${tierColor}80`, color: tierColor, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{`${tierEmoji} ${tierLabel}`}</div>
              <div style={{ display: 'flex', color: '#F59E0B', fontSize: 13, fontWeight: 800 }}>{`${mmr} pts`}</div>
            </div>

            {/* 플레이스타일 */}
            {d?.playstyle
              ? <div style={{ display: 'flex', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#C084FC', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, alignSelf: 'flex-start' }}>{d.playstyle}</div>
              : null}

            {/* 총 경기 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>총 경기</div>
              <div style={{ display: 'flex', color: 'white', fontSize: 18, fontWeight: 800 }}>{String(totalGames)}</div>
            </div>

            {/* 최고 경기 */}
            {bm
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', color: '#F59E0B', fontSize: 10, fontWeight: 700 }}>🏆 최고 경기</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <div style={{ display: 'flex', color: 'white', fontSize: 20, fontWeight: 900 }}>{String(bm.realKills)}</div>
                      <div style={{ display: 'flex', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>킬</div>
                      <div style={{ display: 'flex', color: 'rgba(255,255,255,0.6)', fontSize: 11, marginLeft: 4 }}>{`${bm.damage.toLocaleString()} 딜`}</div>
                    </div>
                    <div style={{ display: 'flex', color: bm.placement === 1 ? '#F59E0B' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>{bm.placement === 1 ? '🍗 치킨' : `${bm.placement}위`}</div>
                  </div>
                  <div style={{ display: 'flex', color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{bm.mapName}</div>
                </div>
              )
              : null}
          </div>

          {/* 오른쪽 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 스탯 3개 */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: isCorrected ? '실킬 평균' : '평균 킬', value: kills,   sub: isCorrected ? '봇킬 제외' : '',  color: '#A5A0F0' },
                { label: isCorrected ? '실딜 평균' : '평균 딜', value: damage,  sub: isCorrected ? '봇딜 제외' : '',  color: '#A5A0F0' },
                { label: '승률',                                  value: winRate, sub: '',                             color: '#34D399' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 8px' }}>
                  <div style={{ display: 'flex', color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 4 }}>{label}</div>
                  <div style={{ display: 'flex', color: 'white', fontSize: 20, fontWeight: 900 }}>{value}</div>
                  {sub ? <div style={{ display: 'flex', color, fontSize: 9, marginTop: 2 }}>{sub}</div> : null}
                </div>
              ))}
            </div>

            {/* 무기 TOP3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>🔫 주요 무기 TOP 3</div>
              {topWeapons.length > 0
                ? topWeapons.map((w, i) => {
                    const pct = Math.round((w.kills / maxKills) * 100)
                    return (
                      <div key={w.weaponId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', width: 80, color: 'white', fontSize: 11, fontWeight: 700 }}>{w.name}</div>
                        <div style={{ flex: 1, display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 6 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: BAR_COLORS[i], borderRadius: 3, display: 'flex' }} />
                        </div>
                        <div style={{ display: 'flex', color: BAR_COLORS[i], fontSize: 11, fontWeight: 800, width: 40, justifyContent: 'flex-end' }}>{`${w.kills}킬`}</div>
                      </div>
                    )
                  })
                : <div style={{ display: 'flex', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>경기 분석 데이터가 없습니다</div>
              }
            </div>
          </div>
        </div>

        {/* ── 워터마크 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 24px', borderTop: '1px solid rgba(127,119,221,0.15)' }}>
          <div style={{ display: 'flex', color: 'rgba(127,119,221,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>pkgg.vercel.app</div>
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>PUBG Player Statistics</div>
        </div>
      </div>
    ),
    { width: 800, height: 420 }
  )
}
