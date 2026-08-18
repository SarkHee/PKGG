import { useState, useEffect } from 'react'
import { getMMRTier } from '../../utils/mmrCalculator'

export const CARD_W = 800
export const CARD_H = 420

export const WEAP_IMG = {
  // AR
  WeapAK47_C: 'Item_Weapon_AK47_C.png', WeapLunchmeats_AK47_C: 'Item_Weapon_AK47_C.png',
  WeapHK416_C: 'Item_Weapon_HK416_C.png', WeapDuncans_M416_C: 'Item_Weapon_HK416_C.png', WeapHK416_HR_C: 'Item_Weapon_HK416_C.png',
  WeapM16A4_C: 'Item_Weapon_M16A4_C.png',
  'WeapSCAR-L_C': 'Item_Weapon_SCAR-L_C.png', WeapSCAR_L_C: 'Item_Weapon_SCAR-L_C.png',
  WeapAUG_C: 'Item_Weapon_AUG_C.png', WeapAUG_HR_C: 'Item_Weapon_AUG_C.png', WeapAUG_A3_C: 'Item_Weapon_AUG_C.png',
  WeapG36C_C: 'Item_Weapon_G36C_C.png',
  WeapGroza_C: 'Item_Weapon_Groza_C.png', WeapGroza_HR_C: 'Item_Weapon_Groza_C.png',
  WeapQBZ95_C: 'Item_Weapon_QBZ95_C.png', WeapQBZ_C: 'Item_Weapon_QBZ95_C.png',
  WeapBerylM762_C: 'Item_Weapon_BerylM762_C.png', WeapBerylM762_HR_C: 'Item_Weapon_BerylM762_C.png',
  WeapMk47Mutant_C: 'Item_Weapon_Mk47Mutant_C.png',
  WeapACE32_C: 'Item_Weapon_ACE32_C.png', WeapACE32_HR_C: 'Item_Weapon_ACE32_C.png',
  WeapK2_C: 'Item_Weapon_K2_C.png',
  WeapFamasG2_C: 'Item_Weapon_FAMASG2_C.png', WeapFAMASG2_C: 'Item_Weapon_FAMASG2_C.png',
  // DMR
  WeapFNFal_C: 'Item_Weapon_FNFal_C.png', WeapFNFal_HR_C: 'Item_Weapon_FNFal_C.png',
  WeapSKS_C: 'Item_Weapon_SKS_C.png', WeapSKS_HR_C: 'Item_Weapon_SKS_C.png',
  WeapMini14_C: 'Item_Weapon_Mini14_C.png', WeapMini14_HR_C: 'Item_Weapon_Mini14_C.png',
  WeapMk12_C: 'Item_Weapon_Mk12_C.png', WeapMk12_HR_C: 'Item_Weapon_Mk12_C.png',
  WeapMk14_C: 'Item_Weapon_Mk14_C.png', WeapMk14_HR_C: 'Item_Weapon_Mk14_C.png',
  WeapDragunov_C: 'Item_Weapon_Dragunov_C.png',
  WeapVSS_C: 'Item_Weapon_VSS_C.png',
  WeapQBU88_C: 'Item_Weapon_QBU88_C.png', WeapMadsQBU88_C: 'Item_Weapon_QBU88_C.png', WeapMads_QBU88_C: 'Item_Weapon_QBU88_C.png',
  // SR
  WeapKar98k_C: 'Item_Weapon_Kar98k_C.png', WeapJuliesKar98k_C: 'Item_Weapon_Kar98k_C.png', WeapJulies_Kar98k_C: 'Item_Weapon_Kar98k_C.png',
  WeapM24_C: 'Item_Weapon_M24_C.png',
  WeapAWM_C: 'Item_Weapon_AWM_C.png',
  WeapMosinNagant_C: 'Item_Weapon_Mosin_C.png', WeapMosin_C: 'Item_Weapon_Mosin_C.png',
  WeapL6_C: 'Item_Weapon_L6_C.png',
  WeapWin94_C: 'Item_Weapon_Win1894_C.png', WeapWin1894_C: 'Item_Weapon_Win1894_C.png',
  // SMG
  WeapUMP_C: 'Item_Weapon_UMP_C.png', WeapUMP_HR_C: 'Item_Weapon_UMP_C.png',
  WeapVector_C: 'Item_Weapon_Vector_C.png', WeapVector_HR_C: 'Item_Weapon_Vector_C.png',
  WeapMP5K_C: 'Item_Weapon_MP5K_C.png', WeapMP5K_HR_C: 'Item_Weapon_MP5K_C.png',
  WeapBizonPP19_C: 'Item_Weapon_BizonPP19_C.png', WeapBizonPP19_HR_C: 'Item_Weapon_BizonPP19_C.png', WeapPP19_C: 'Item_Weapon_BizonPP19_C.png',
  WeapMP9_C: 'Item_Weapon_MP9_C.png', WeapMP9_HR_C: 'Item_Weapon_MP9_C.png',
  WeapP90_C: 'Item_Weapon_P90_C.png', WeapP90_HR_C: 'Item_Weapon_P90_C.png',
  WeapUZI_C: 'Item_Weapon_UZI_C.png', WeapUZI_HR_C: 'Item_Weapon_UZI_C.png',
  Weapvz61Skorpion_C: 'Item_Weapon_Skorpion_C.png', WeapSkorpion_C: 'Item_Weapon_Skorpion_C.png',
  WeapThompson_C: 'Item_Weapon_Thompson_C.png', WeapTommyGun_C: 'Item_Weapon_Thompson_C.png',
  WeapJS9_C: 'Item_Weapon_JS9_C.png', WeapJS9_HR_C: 'Item_Weapon_JS9_C.png',
  // LMG
  WeapDP28_C: 'Item_Weapon_DP28_C.png',
  WeapM249_C: 'Item_Weapon_M249_C.png',
  WeapMG3_C: 'Item_Weapon_MG3_C.png',
  WeapRPD_C: 'Item_Weapon_RPD_C.png',
  // SG
  WeapSaiga12_C: 'Item_Weapon_Saiga12_C.png', WeapSaiga12_HR_C: 'Item_Weapon_Saiga12_C.png',
  WeapWinchester_C: 'Item_Weapon_Winchester_C.png', WeapWinchester_HR_C: 'Item_Weapon_Winchester_C.png',
  WeapBerreta686_C: 'Item_Weapon_Berreta686_C.png', WeapBerreta686_HR_C: 'Item_Weapon_Berreta686_C.png',
  WeapDP12_C: 'Item_Weapon_DP12_C.png', WeapDP12_HR_C: 'Item_Weapon_DP12_C.png',
  WeapOriginS12_C: 'Item_Weapon_OriginS12_C.png', WeapOriginS12_HR_C: 'Item_Weapon_OriginS12_C.png',
  WeapSawnoff_C: 'Item_Weapon_Sawnoff_C.png',
  // 권총
  WeapDesertEagle_C: 'Item_Weapon_DesertEagle_C.png',
  WeapM1911_C: 'Item_Weapon_M1911_C.png', WeapP1911_C: 'Item_Weapon_M1911_C.png',
  WeapM9_C: 'Item_Weapon_M9_C.png', WeapP92_C: 'Item_Weapon_M9_C.png',
  WeapG18_C: 'Item_Weapon_G18_C.png', WeapG18C_C: 'Item_Weapon_G18_C.png', WeapG18_HR_C: 'Item_Weapon_G18_C.png',
  WeapNagantM1895_C: 'Item_Weapon_NagantM1895_C.png', WeapR1895_C: 'Item_Weapon_NagantM1895_C.png',
  WeapRhino_C: 'Item_Weapon_Rhino_C.png',
}

export function translateMode(mode) {
  if (!mode) return ''
  const m = mode.toLowerCase()
  if (m.includes('squad')) return '스쿼드'
  if (m.includes('duo'))   return '듀오'
  if (m.includes('solo'))  return '솔로'
  return mode
}

export default function ReportCard({ data, mobile: mobileProp }) {
  const [isMobile, setIsMobile] = useState(mobileProp ?? false)
  useEffect(() => {
    if (mobileProp !== undefined) { setIsMobile(mobileProp); return }
    const check = () => setIsMobile(window.innerWidth < 600)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [mobileProp])

  const tier = getMMRTier(data.mmr)
  const killsLabel  = data.avgRealKills  !== null ? data.avgRealKills.toFixed(2)  : data.avgKills.toFixed(2)
  const damageLabel = data.avgRealDamage !== null ? data.avgRealDamage.toLocaleString() : data.avgDamage.toLocaleString()
  const isBotCorrected = data.avgRealKills !== null
  const maxKills = data.topWeapons.length > 0 ? data.topWeapons[0].kills : 1

  const barColors = ['#7F77DD', '#A5A0F0', '#6B7280']

  if (isMobile) {
    return (
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'linear-gradient(135deg, #0D0B1A 0%, #140D2E 50%, #0D1B2A 100%)',
        fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
        borderRadius: 16, overflow: 'hidden', boxSizing: 'border-box',
      }}>
        {/* 헤더 바 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(127,119,221,0.15)', borderBottom: '1px solid rgba(127,119,221,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="PKGG" style={{ height: 18, objectFit: 'contain' }} />
            <span style={{ color: '#A5A0F0', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>SEASON REPORT</span>
          </div>
          {data.currentSeason?.label && (
            <span style={{ background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.4)', color: '#63B3ED', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              {data.currentSeason.label}
            </span>
          )}
        </div>

        {/* 프로필 */}
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 900, letterSpacing: -0.5, wordBreak: 'break-all' }}>{data.nickname}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(127,119,221,0.25)', border: '1px solid rgba(127,119,221,0.5)', color: '#A5A0F0', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              {tier.emoji} {tier.label}
            </span>
            <span style={{ color: '#F59E0B', fontSize: 13, fontWeight: 800 }}>{data.mmr.toLocaleString()} pts</span>
            {data.playstyle && (
              <span style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#C084FC', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                {data.playstyle}
              </span>
            )}
          </div>
        </div>

        {/* 스탯 3개 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 16px 10px' }}>
          {[
            { label: isBotCorrected ? '실킬 평균' : '평균 킬', value: killsLabel, sub: isBotCorrected ? '봇킬 제외' : null, color: '#A5A0F0' },
            { label: isBotCorrected ? '실딜 평균' : '평균 딜', value: damageLabel, sub: isBotCorrected ? '봇딜 제외' : null, color: '#A5A0F0' },
            { label: '승률', value: `${data.winRate}%`, sub: null, color: '#34D399' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 3 }}>{label}</div>
              <div style={{ color: 'white', fontSize: 17, fontWeight: 900 }}>{value}</div>
              {sub && <div style={{ color, fontSize: 9, marginTop: 1 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* 총 경기 + 최고 경기 */}
        <div style={{ display: 'grid', gridTemplateColumns: data.bestMatch ? '1fr 1fr' : '1fr', gap: 8, padding: '0 16px 10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>총 경기</span>
            <span style={{ color: 'white', fontSize: 17, fontWeight: 800 }}>{data.totalGames || '-'}</span>
          </div>
          {data.bestMatch && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ color: '#F59E0B', fontSize: 9, fontWeight: 700, marginBottom: 4 }}>🏆 최고 경기</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 900 }}>{data.bestMatch.realKills}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>킬</span>
                <span style={{ color: data.bestMatch.placement === 1 ? '#F59E0B' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, marginLeft: 2 }}>
                  {data.bestMatch.placement === 1 ? '🍗 치킨' : `${data.bestMatch.placement}위`}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 2 }}>{data.bestMatch.damage.toLocaleString()} 딜 · {data.bestMatch.mapName}</div>
            </div>
          )}
        </div>

        {/* 주요 무기 TOP 3 */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🔫 주요 무기 TOP 3</div>
          {data.topWeapons.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.topWeapons.map((w, i) => {
                const pct = Math.round((w.kills / maxKills) * 100)
                return (
                  <div key={w.weaponId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {WEAP_IMG[w.weaponId]
                      ? <img src={`/weapons/${WEAP_IMG[w.weaponId]}`} alt={w.name} style={{ width: 32, height: 18, objectFit: 'contain', filter: 'brightness(0.9)', flexShrink: 0 }} />
                      : <span style={{ width: 32, fontSize: 13, textAlign: 'center' }}>🔫</span>
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{w.name}</span>
                        <span style={{ color: barColors[i], fontSize: 11, fontWeight: 800 }}>{w.kills}킬</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColors[i], borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>경기 분석 데이터가 없습니다</div>
          )}
        </div>

        {/* 워터마크 */}
        <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(127,119,221,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(127,119,221,0.5)', fontSize: 9, fontWeight: 600, letterSpacing: 1 }}>pkgg.vercel.app</span>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 8 }}>PUBG Player Statistics</span>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        background: 'linear-gradient(135deg, #0D0B1A 0%, #140D2E 50%, #0D1B2A 100%)',
        fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* 배경 장식 원 */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── 헤더 바 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'rgba(127,119,221,0.15)', borderBottom: '1px solid rgba(127,119,221,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="PKGG" style={{ height: 24, objectFit: 'contain' }} />
          <span style={{ color: '#A5A0F0', fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Season Report</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data.currentSeason?.label && (
            <span style={{ background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.4)', color: '#63B3ED', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
              {data.currentSeason.label}
            </span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            {data.currentSeason?.startDate
              ? new Date(data.currentSeason.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }) + '~'
              : '2026'}
          </span>
        </div>
      </div>

      {/* ── 바디 ── */}
      <div style={{ display: 'flex', height: 'calc(100% - 53px - 32px)', padding: '20px 24px 0', gap: 24 }}>

        {/* 왼쪽 패널 */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1, wordBreak: 'break-all' }}>
              {data.nickname}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ background: 'rgba(127,119,221,0.25)', border: '1px solid rgba(127,119,221,0.5)', color: '#A5A0F0', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                {tier.emoji} {tier.label}
              </span>
              <span style={{ color: '#F59E0B', fontSize: 13, fontWeight: 800 }}>
                {data.mmr.toLocaleString()} pts
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#C084FC', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                {data.playstyle}
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>총 경기</span>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>{data.totalGames || '-'}</span>
            </div>
            {isBotCorrected && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'rgba(99,179,237,0.7)', fontSize: 10 }}>봇킬 분석</span>
                <span style={{ color: '#63B3ED', fontSize: 11, fontWeight: 700 }}>{data.analyzedCount}경기</span>
              </div>
            )}
          </div>

          {data.bestMatch && (
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ color: '#F59E0B', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>🏆 최고 경기</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>{data.bestMatch.realKills}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: 3 }}>킬</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginLeft: 8 }}>{data.bestMatch.damage.toLocaleString()} 딜</span>
                </div>
                <span style={{ color: data.bestMatch.placement === 1 ? '#F59E0B' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>
                  {data.bestMatch.placement === 1 ? '🍗 치킨' : `${data.bestMatch.placement}위`}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                {data.bestMatch.mapName} · {translateMode(data.bestMatch.mode)}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 패널 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: isBotCorrected ? '실킬 평균' : '평균 킬', value: killsLabel, sub: isBotCorrected ? '봇킬 제외' : null, color: '#A5A0F0' },
              { label: isBotCorrected ? '실딜 평균' : '평균 딜', value: damageLabel, sub: isBotCorrected ? '봇딜 제외' : null, color: '#A5A0F0' },
              { label: '승률', value: `${data.winRate}%`, sub: null, color: '#34D399' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 900 }}>{value}</div>
                {sub && <div style={{ color: color, fontSize: 9, marginTop: 2 }}>{sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🔫 주요 무기 TOP 3</div>
            {data.topWeapons.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {data.topWeapons.map((w, i) => {
                  const pct = Math.round((w.kills / maxKills) * 100)
                  return (
                    <div key={w.weaponId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {WEAP_IMG[w.weaponId] ? (
                        <img src={`/weapons/${WEAP_IMG[w.weaponId]}`} alt={w.name} style={{ width: 36, height: 20, objectFit: 'contain', filter: 'brightness(0.9)' }} />
                      ) : (
                        <div style={{ width: 36, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 14 }}>🔫</span>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{w.name}</span>
                          <span style={{ color: barColors[i], fontSize: 11, fontWeight: 800 }}>{w.kills}킬</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColors[i], borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>경기 분석 데이터가 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 워터마크 ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(127,119,221,0.15)' }}>
        <span style={{ color: 'rgba(127,119,221,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>pkgg.vercel.app</span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>PUBG Player Statistics</span>
      </div>
    </div>
  )
}
