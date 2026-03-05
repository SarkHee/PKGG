// components/player/PlayerShareCard.jsx
// PNG 저장용 공유 카드 (html-to-image로 캡처)
// 핵심: outer wrapper에 오프스크린 처리, ref는 inner 카드 div에 연결

import { getMMRTier } from '../../utils/mmrCalculator';

export default function PlayerShareCard({ nickname, shard, mmr, seasonStat, playstyle, clanInfo, cardRef }) {
  const tier = getMMRTier(mmr || 1000);

  const fmt = (v, digits = 0) =>
    v == null || isNaN(v) ? '-' : Number(v).toFixed(digits);

  const shardLabel = shard === 'kakao' ? 'Kakao' : shard === 'console' ? 'Console' : 'Steam';

  return (
    <div style={{ position: 'absolute', top: 0, left: '-9999px', overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        ref={cardRef}
        style={{
          width: '480px',
          fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d4a 50%, #0f1f35 100%)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        {/* 상단 헤더 */}
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: '900', color: '#fff',
              }}>
                {(nickname || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>
                  {nickname}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  {clanInfo && (
                    <span style={{
                      fontSize: '11px', fontWeight: '600', color: '#93c5fd',
                      background: 'rgba(59,130,246,0.2)', borderRadius: '20px',
                      padding: '2px 10px',
                    }}>
                      [{clanInfo.tag}] {clanInfo.name}
                    </span>
                  )}
                  <span style={{
                    fontSize: '11px', fontWeight: '600', color: '#94a3b8',
                    background: 'rgba(255,255,255,0.08)', borderRadius: '20px',
                    padding: '2px 10px',
                  }}>
                    {shardLabel}
                  </span>
                  {playstyle && (
                    <span style={{
                      fontSize: '11px', fontWeight: '600', color: '#fcd34d',
                      background: 'rgba(251,191,36,0.15)', borderRadius: '20px',
                      padding: '2px 10px',
                    }}>
                      {playstyle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* MMR 배지 */}
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px', padding: '10px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '22px', marginBottom: '2px' }}>{tier.emoji}</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: tier.color, lineHeight: 1 }}>
                {(mmr || 1000).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: tier.color, opacity: 0.8 }}>
                {tier.label}
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>PKGG MMR</div>
            </div>
          </div>
        </div>

        {/* 스탯 그리드 */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: '평균 딜량', value: fmt(seasonStat?.avgDamage), unit: '' },
              { label: '평균 킬', value: fmt(seasonStat?.avgKills, 2), unit: '' },
              { label: '승률', value: fmt(seasonStat?.winRate, 1), unit: '%' },
              { label: 'Top10율', value: fmt(seasonStat?.top10Rate, 1), unit: '%' },
              { label: '평균 생존', value: seasonStat?.avgSurvival ? `${Math.floor(seasonStat.avgSurvival / 60)}분` : '-', unit: '' },
              { label: '게임 수', value: seasonStat?.rounds ?? '-', unit: '' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px', padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#f1f5f9', lineHeight: 1 }}>
                  {stat.value}{stat.unit && <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '1px' }}>{stat.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 푸터 */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6', letterSpacing: '-0.3px' }}>
            PK.GG
          </div>
          <div style={{ fontSize: '10px', color: '#475569' }}>
            pk-gg.vercel.app
          </div>
        </div>
      </div>
    </div>
  );
}
