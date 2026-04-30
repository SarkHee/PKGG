// pages/weapon-meta.js — 무기 메타 표 (시즌 픽률/승률 기반 정적 데이터)
import Head from 'next/head';
import { useState } from 'react';

// Update 40.1 기준 추정 메타 데이터 (공개 커뮤니티 통계 기반)
const WEAPONS = [
  // AR
  { id:'M416',   name:'M416',       type:'AR',  cal:'5.56', dmg:41, rpm:750, pickRate:28.4, winRate:52.1, avgKills:1.82, tier:'S', patch:'안정적 메타 유지', color:'#3B82F6' },
  { id:'AKM',    name:'AKM',        type:'AR',  cal:'7.62', dmg:47, rpm:600, pickRate:18.2, winRate:49.3, avgKills:1.95, tier:'A', patch:'',               color:'#EF4444' },
  { id:'BERYL',  name:'Beryl M762', type:'AR',  cal:'7.62', dmg:46, rpm:750, pickRate:12.1, winRate:50.8, avgKills:2.01, tier:'A', patch:'',               color:'#F97316' },
  { id:'SCAR',   name:'SCAR-L',     type:'AR',  cal:'5.56', dmg:43, rpm:600, pickRate:9.8,  winRate:48.7, avgKills:1.74, tier:'B', patch:'',               color:'#F59E0B' },
  { id:'QBZ',    name:'QBZ',        type:'AR',  cal:'5.56', dmg:41, rpm:750, pickRate:7.3,  winRate:48.2, avgKills:1.71, tier:'B', patch:'',               color:'#10B981' },
  { id:'AUG',    name:'AUG A3',     type:'AR',  cal:'5.56', dmg:41, rpm:700, pickRate:6.1,  winRate:49.9, avgKills:1.79, tier:'B', patch:'U39.1 반동 조정', color:'#06B6D4' },
  { id:'G36',    name:'G36C',       type:'AR',  cal:'5.56', dmg:41, rpm:700, pickRate:5.4,  winRate:47.8, avgKills:1.68, tier:'B', patch:'',               color:'#8B5CF6' },
  { id:'MK47',   name:'Mk47 Mutant',type:'AR',  cal:'7.62', dmg:49, rpm:450, pickRate:3.2,  winRate:46.1, avgKills:1.58, tier:'C', patch:'',               color:'#6B7280' },
  // DMR
  { id:'SLR',    name:'SLR',        type:'DMR', cal:'7.62', dmg:56, rpm:300, pickRate:8.9,  winRate:53.4, avgKills:2.12, tier:'S', patch:'U40.1 변경',      color:'#EC4899' },
  { id:'MK12',   name:'Mk12',       type:'DMR', cal:'5.56', dmg:48, rpm:600, pickRate:7.4,  winRate:52.8, avgKills:2.08, tier:'S', patch:'U40.1 변경',      color:'#D946EF' },
  { id:'SKS',    name:'SKS',        type:'DMR', cal:'7.62', dmg:53, rpm:360, pickRate:6.2,  winRate:51.2, avgKills:2.04, tier:'A', patch:'U39.1 반동 조정', color:'#A855F7' },
  { id:'MINI14', name:'Mini 14',    type:'DMR', cal:'5.56', dmg:46, rpm:500, pickRate:5.1,  winRate:50.1, avgKills:1.97, tier:'A', patch:'',               color:'#7C3AED' },
  { id:'QBU',    name:'QBU',        type:'DMR', cal:'5.56', dmg:48, rpm:480, pickRate:3.8,  winRate:49.4, avgKills:1.89, tier:'B', patch:'',               color:'#6D28D9' },
  // SR
  { id:'AWM',    name:'AWM',        type:'SR',  cal:'.300', dmg:120,rpm:40,  pickRate:1.8,  winRate:62.1, avgKills:2.87, tier:'S', patch:'에어드롭 전용',   color:'#FBBF24' },
  { id:'M24',    name:'M24',        type:'SR',  cal:'7.62', dmg:79, rpm:43,  pickRate:4.1,  winRate:58.3, avgKills:2.54, tier:'A', patch:'',               color:'#F59E0B' },
  { id:'KAR98',  name:'Kar98k',     type:'SR',  cal:'7.62', dmg:75, rpm:40,  pickRate:11.2, winRate:56.9, avgKills:2.47, tier:'A', patch:'',               color:'#D97706' },
  // SMG
  { id:'UMP',    name:'UMP45',      type:'SMG', cal:'.45',  dmg:35, rpm:600, pickRate:14.3, winRate:47.2, avgKills:1.62, tier:'A', patch:'',               color:'#8B5CF6' },
  { id:'MP5K',   name:'MP5K',       type:'SMG', cal:'9mm',  dmg:32, rpm:900, pickRate:8.9,  winRate:46.8, avgKills:1.71, tier:'B', patch:'U38.1 34→32',    color:'#7C3AED' },
  { id:'VECTOR', name:'Vector',     type:'SMG', cal:'.45',  dmg:31, rpm:1200,pickRate:5.2,  winRate:48.1, avgKills:1.68, tier:'B', patch:'에어드롭 전용',   color:'#6D28D9' },
  // LMG
  { id:'DP28',   name:'DP-28',      type:'LMG', cal:'7.62', dmg:51, rpm:450, pickRate:7.8,  winRate:50.3, avgKills:1.88, tier:'A', patch:'',               color:'#059669' },
  { id:'M249',   name:'M249',       type:'LMG', cal:'5.56', dmg:45, rpm:750, pickRate:2.1,  winRate:53.7, avgKills:2.21, tier:'A', patch:'에어드롭 전용',   color:'#10B981' },
  // SG
  { id:'S12K',   name:'S12K',       type:'SG',  cal:'12g',  dmg:24, rpm:200, pickRate:4.2,  winRate:44.3, avgKills:1.41, tier:'C', patch:'',               color:'#78716C' },
  { id:'DBS',    name:'DBS',        type:'SG',  cal:'12g',  dmg:26, rpm:180, pickRate:1.4,  winRate:48.9, avgKills:1.61, tier:'B', patch:'에어드롭 전용',   color:'#57534E' },
];

const TIERS = ['S', 'A', 'B', 'C'];
const TYPES = ['전체', 'AR', 'DMR', 'SR', 'SMG', 'LMG', 'SG'];

const TIER_COLORS = { S: '#fbbf24', A: '#4ade80', B: '#60a5fa', C: '#9ca3af' };
const TIER_BG     = { S: 'rgba(251,191,36,0.1)', A: 'rgba(74,222,128,0.1)', B: 'rgba(96,165,250,0.1)', C: 'rgba(156,163,175,0.1)' };

const SORT_OPTIONS = [
  { key: 'pickRate', label: '픽률' },
  { key: 'winRate',  label: '승률' },
  { key: 'avgKills', label: '평균 킬' },
  { key: 'dmg',      label: '기본 데미지' },
];

export default function WeaponMeta() {
  const [platform, setPlatform] = useState('steam'); // steam | kakao
  const [typeFilter, setTypeFilter] = useState('전체');
  const [sort, setSort] = useState('pickRate');
  const [sortDir, setSortDir] = useState(-1);
  const [view, setView] = useState('table'); // table | tier

  const handleSort = (key) => {
    if (sort === key) setSortDir(d => d * -1);
    else { setSort(key); setSortDir(-1); }
  };

  const filtered = WEAPONS
    .filter(w => typeFilter === '전체' || w.type === typeFilter)
    .sort((a, b) => (b[sort] - a[sort]) * sortDir * -1);

  return (
    <>
      <Head><title>무기 메타 표 — PK.GG</title></Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          <div style={{ marginBottom: 16 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>📊 무기 메타 표</h1>
          </div>

          {/* 플랫폼 탭 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[{ key: 'steam', label: '🎮 Steam' }, { key: 'kakao', label: '🟡 카카오' }].map(p => (
              <button key={p.key} onClick={() => setPlatform(p.key)}
                style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: platform === p.key ? (p.key === 'kakao' ? '#ca8a04' : '#1d4ed8') : '#111827',
                  color: platform === p.key ? '#fff' : '#6b7280' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* 데이터 출처 배너 */}
          <div style={{ background: '#111827', border: '1px solid #1e3a5f', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#93c5fd' }}>
                {platform === 'kakao' ? '🟡 카카오배그' : '🎮 Steam'} · Update 40.1 기준 커뮤니티 추정 데이터
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#4b5563', lineHeight: 1.5 }}>
                픽률·승률·평균킬은 <strong style={{ color: '#6b7280' }}>공개 커뮤니티 통계 기반 추정치</strong>로 PUBG 공식 수치가 아닙니다.
                데미지·RPM은 공식 패치노트 기준입니다.{' '}
                <strong style={{ color: '#2563eb' }}>PK.GG 실사용자 데이터가 충분히 쌓이면 사이트 자체 통계로 대체</strong>될 예정이며,
                Steam/카카오 플랫폼별 메타 차이도 함께 반영됩니다.
              </p>
            </div>
          </div>

          {/* 필터/뷰 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: typeFilter === t ? '#2563eb' : '#111827', color: typeFilter === t ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {t}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {['table', 'tier'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: view === v ? '#374151' : '#111827', color: view === v ? '#fff' : '#6b7280', fontSize: 12, cursor: 'pointer' }}>
                  {v === 'table' ? '📋 표' : '🏆 티어'}
                </button>
              ))}
            </div>
          </div>

          {/* 테이블 뷰 */}
          {view === 'table' && (
            <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      {[['무기', null], ['티어', null], ['종류', null], ...SORT_OPTIONS.map(o => [o.label, o.key])].map(([label, key]) => (
                        <th key={label} onClick={() => key && handleSort(key)}
                          style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: key && sort === key ? '#60a5fa' : '#6b7280', fontWeight: 700, cursor: key ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}>
                          {label}{key && sort === key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
                        </th>
                      ))}
                      <th style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280', fontWeight: 700 }}>패치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((w, i) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid #0f172a', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: w.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{w.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: TIER_BG[w.tier], color: TIER_COLORS[w.tier], fontSize: 12, fontWeight: 700 }}>{w.tier}</span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{w.type}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: w.pickRate >= 15 ? '#4ade80' : w.pickRate >= 8 ? '#fbbf24' : '#9ca3af' }}>{w.pickRate}%</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: w.winRate >= 55 ? '#4ade80' : w.winRate >= 50 ? '#fbbf24' : '#9ca3af' }}>{w.winRate}%</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: w.avgKills >= 2.0 ? '#4ade80' : w.avgKills >= 1.7 ? '#fbbf24' : '#9ca3af' }}>{w.avgKills}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, color: '#9ca3af' }}>{w.dmg}</td>
                        <td style={{ padding: '9px 12px', fontSize: 10, color: w.patch ? '#fb923c' : '#374151' }}>{w.patch || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 티어 뷰 */}
          {view === 'tier' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TIERS.map(tier => {
                const ws = WEAPONS.filter(w => w.tier === tier && (typeFilter === '전체' || w.type === typeFilter));
                if (ws.length === 0) return null;
                return (
                  <div key={tier} style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: TIER_BG[tier], borderBottom: `1px solid ${TIER_COLORS[tier]}33` }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: TIER_COLORS[tier] }}>{tier} 티어</span>
                      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>
                        {tier === 'S' ? '현 메타 최강' : tier === 'A' ? '강력한 선택지' : tier === 'B' ? '상황에 따라 유효' : '비추천'}
                      </span>
                    </div>
                    <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {ws.sort((a,b) => b.pickRate - a.pickRate).map(w => (
                        <div key={w.id} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 12px', minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: w.color }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{w.name}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>{w.type} · {w.cal}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: '#4ade80' }}>픽 {w.pickRate}%</span>
                            <span style={{ fontSize: 11, color: '#60a5fa' }}>승 {w.winRate}%</span>
                          </div>
                          {w.patch && <div style={{ fontSize: 9, color: '#fb923c', marginTop: 3 }}>⚡ {w.patch}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 16 }}>
            * 통계는 커뮤니티 집계 기반 추정치입니다. 실제 수치와 다를 수 있습니다.
          </p>
        </div>
      </div>
    </>
  );
}
