// pages/clan-war.js — 클랜 내전 기록
import Head from 'next/head';
import { useState, useEffect } from 'react';

const MAPS = ['에란겔','미라마','사녹','태이고','데스턴','론도','카라킨'];
const MODES = [
  { id:'squad-fpp', label:'스쿼드 FPP' }, { id:'squad', label:'스쿼드 TPP' },
  { id:'duo-fpp', label:'듀오 FPP' },     { id:'duo', label:'듀오 TPP' },
];

function StarRating({ val }) {
  return <span style={{ color: '#fbbf24' }}>{'★'.repeat(val)}{'☆'.repeat(5-val)}</span>;
}

export default function ClanWar() {
  const [tab, setTab] = useState('list'); // list | create
  const [wars, setWars] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [clanFilter, setClanFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // 폼 상태
  const [form, setForm] = useState({
    clanA: '', clanB: '', scoreA: 0, scoreB: 0,
    map: '에란겔', mode: 'squad-fpp', note: '', password: '',
    playedAt: new Date().toISOString().slice(0,16),
    players: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchWars = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 15, ...(clanFilter ? { clan: clanFilter } : {}) });
      const r = await fetch(`/api/clan-war?${q}`);
      const d = await r.json();
      setWars(d.wars || []);
      setTotal(d.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'list') fetchWars(); }, [tab, page, clanFilter]);

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target ? e.target.value : e }));

  const addPlayer = (team) => {
    setForm(p => ({ ...p, players: [...p.players, { nickname: '', team, kills: 0, damage: 0, survived: false }] }));
  };
  const updatePlayer = (i, field, val) => {
    setForm(p => {
      const players = [...p.players];
      players[i] = { ...players[i], [field]: val };
      return { ...p, players };
    });
  };
  const removePlayer = (i) => setForm(p => ({ ...p, players: p.players.filter((_,idx) => idx !== i) }));

  const handleSubmit = async () => {
    if (!form.clanA.trim() || !form.clanB.trim()) { setMsg('클랜 이름을 입력하세요'); return; }
    if (!form.password || form.password.length < 4) { setMsg('삭제 비밀번호 4자 이상'); return; }
    setSubmitting(true);
    try {
      const r = await fetch('/api/clan-war', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); setMsg(d.error || '오류'); return; }
      setMsg('등록 완료!');
      setTimeout(() => { setTab('list'); setMsg(''); }, 1000);
    } finally { setSubmitting(false); }
  };

  const winner = (w) => {
    if (w.scoreA > w.scoreB) return w.clanA;
    if (w.scoreB > w.scoreA) return w.clanB;
    return '무승부';
  };

  return (
    <>
      <Head><title>클랜 내전 기록 — PK.GG</title></Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          <div style={{ marginBottom: 20 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>⚔️ 클랜 내전 기록</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>클랜간 내전 결과를 등록하고 전적을 누적하세요</p>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 10, padding: 4, marginBottom: 16 }}>
            {[['list','📋 전적 목록'], ['create','✏️ 내전 등록']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, padding: 9, borderRadius: 7, border: 'none', background: tab===key?'#1e293b':'transparent', color: tab===key?'#fff':'#6b7280', fontWeight: tab===key?700:400, cursor:'pointer', fontSize:13 }}>
                {label}
              </button>
            ))}
          </div>

          {/* 목록 */}
          {tab === 'list' && (
            <div>
              {/* 검색 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input value={clanFilter} onChange={e => { setClanFilter(e.target.value); setPage(1); }}
                  placeholder="클랜명 검색..."
                  style={{ flex:1, background:'#111827', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'8px 12px', fontSize:13 }} />
              </div>

              {loading && <p style={{ color:'#6b7280', textAlign:'center' }}>로딩 중...</p>}

              {!loading && wars.length === 0 && (
                <div style={{ background:'#111827', borderRadius:12, padding:32, textAlign:'center' }}>
                  <p style={{ fontSize:32, margin:'0 0 8px' }}>⚔️</p>
                  <p style={{ color:'#6b7280' }}>등록된 내전 기록이 없습니다</p>
                  <button onClick={() => setTab('create')} style={{ marginTop:12, padding:'8px 16px', borderRadius:8, border:'none', background:'#2563eb', color:'#fff', cursor:'pointer' }}>
                    첫 내전 등록하기
                  </button>
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {wars.map(w => (
                  <div key={w.id} style={{ background:'#111827', borderRadius:12, overflow:'hidden' }}>
                    {/* 요약 행 */}
                    <div onClick={() => setExpanded(expanded===w.id ? null : w.id)}
                      style={{ padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:14, fontWeight:700, color: w.scoreA >= w.scoreB ? '#4ade80' : '#e2e8f0' }}>{w.clanA}</span>
                          <span style={{ fontSize:18, fontWeight:900, color:'#fff' }}>{w.scoreA} : {w.scoreB}</span>
                          <span style={{ fontSize:14, fontWeight:700, color: w.scoreB > w.scoreA ? '#4ade80' : '#e2e8f0' }}>{w.clanB}</span>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <span style={{ fontSize:10, color:'#6b7280' }}>{w.map} · {MODES.find(m=>m.id===w.mode)?.label || w.mode}</span>
                          <span style={{ fontSize:10, color:'#4b5563' }}>{new Date(w.playedAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                      </div>
                      <div style={{ background: winner(w)==='무승부'?'#374151': w.scoreA>w.scoreB?'rgba(34,197,94,0.1)':'rgba(96,165,250,0.1)',
                        border:`1px solid ${winner(w)==='무승부'?'#4b5563':w.scoreA>w.scoreB?'#22c55e33':'#60a5fa33'}`,
                        borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:700,
                        color: winner(w)==='무승부'?'#9ca3af':w.scoreA>w.scoreB?'#4ade80':'#60a5fa' }}>
                        {winner(w) === '무승부' ? '무승부' : `${winner(w)} 승`}
                      </div>
                      <span style={{ color:'#374151', fontSize:12 }}>{expanded===w.id ? '▲' : '▼'}</span>
                    </div>

                    {/* 상세 */}
                    {expanded === w.id && (
                      <div style={{ borderTop:'1px solid #1e293b', padding:'12px 14px' }}>
                        {w.note && <p style={{ fontSize:12, color:'#9ca3af', marginBottom:10 }}>💬 {w.note}</p>}
                        {w.players.length > 0 && (
                          <div>
                            <p style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>참가 선수</p>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              {['A','B'].map(team => (
                                <div key={team}>
                                  <p style={{ fontSize:11, fontWeight:700, color: team==='A'?'#4ade80':'#60a5fa', margin:'0 0 6px' }}>
                                    {team==='A'?w.clanA:w.clanB} ({team})
                                  </p>
                                  {w.players.filter(p=>p.team===team).sort((a,b)=>b.kills-a.kills).map(p => (
                                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:'1px solid #0f172a' }}>
                                      <span style={{ color:'#e2e8f0' }}>{p.nickname}</span>
                                      <span style={{ color:'#9ca3af' }}>{p.kills}킬 {p.damage}딜 {p.survived?'생존':'사망'}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {total > 15 && (
                <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:14 }}>
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #374151', background:'#1e293b', color:'#fff', cursor:'pointer' }}>◀</button>
                  <span style={{ padding:'6px 12px', color:'#9ca3af', fontSize:13 }}>{page} / {Math.ceil(total/15)}</span>
                  <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/15)}
                    style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #374151', background:'#1e293b', color:'#fff', cursor:'pointer' }}>▶</button>
                </div>
              )}
            </div>
          )}

          {/* 등록 폼 */}
          {tab === 'create' && (
            <div>
              {/* 클랜 & 스코어 */}
              <div style={{ background:'#111827', borderRadius:12, padding:16, marginBottom:12 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:10 }}>내전 정보</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginBottom:12 }}>
                  <input value={form.clanA} onChange={f('clanA')} placeholder="클랜 A"
                    style={{ background:'#1e293b', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'8px 10px', fontSize:13 }} />
                  <span style={{ textAlign:'center', fontWeight:900, color:'#9ca3af' }}>vs</span>
                  <input value={form.clanB} onChange={f('clanB')} placeholder="클랜 B"
                    style={{ background:'#1e293b', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'8px 10px', fontSize:13 }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginBottom:12 }}>
                  <input type="number" value={form.scoreA} onChange={f('scoreA')} min={0} max={99}
                    style={{ background:'#1e293b', border:'1px solid #22c55e55', borderRadius:8, color:'#4ade80', padding:'8px 10px', fontSize:18, fontWeight:900, textAlign:'center' }} />
                  <span style={{ textAlign:'center', color:'#374151', fontWeight:900 }}>:</span>
                  <input type="number" value={form.scoreB} onChange={f('scoreB')} min={0} max={99}
                    style={{ background:'#1e293b', border:'1px solid #60a5fa55', borderRadius:8, color:'#60a5fa', padding:'8px 10px', fontSize:18, fontWeight:900, textAlign:'center' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#6b7280' }}>맵</label>
                    <select value={form.map} onChange={f('map')}
                      style={{ width:'100%', background:'#1e293b', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'7px 10px', fontSize:13, marginTop:3 }}>
                      {MAPS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#6b7280' }}>모드</label>
                    <select value={form.mode} onChange={f('mode')}
                      style={{ width:'100%', background:'#1e293b', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'7px 10px', fontSize:13, marginTop:3 }}>
                      {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:11, color:'#6b7280' }}>날짜/시간</label>
                  <input type="datetime-local" value={form.playedAt} onChange={f('playedAt')}
                    style={{ width:'100%', background:'#1e293b', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'7px 10px', fontSize:13, marginTop:3, boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#6b7280' }}>메모 (선택)</label>
                  <textarea value={form.note} onChange={f('note')} rows={2} placeholder="내전 특이사항, 룰 등..."
                    style={{ width:'100%', background:'#1e293b', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'7px 10px', fontSize:12, resize:'vertical', boxSizing:'border-box', marginTop:3 }} />
                </div>
              </div>

              {/* 선수 입력 */}
              <div style={{ background:'#111827', borderRadius:12, padding:16, marginBottom:12 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:10 }}>참가 선수 (선택)</p>
                {['A','B'].map(team => (
                  <div key={team} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <p style={{ fontSize:12, fontWeight:700, color: team==='A'?'#4ade80':'#60a5fa', margin:0 }}>
                        팀 {team} — {team==='A'?form.clanA||'클랜 A':form.clanB||'클랜 B'}
                      </p>
                      <button onClick={() => addPlayer(team)}
                        style={{ padding:'4px 10px', borderRadius:6, border:'none', background:team==='A'?'#14532d':'#1e3a5f', color:team==='A'?'#4ade80':'#60a5fa', fontSize:12, cursor:'pointer' }}>
                        + 선수 추가
                      </button>
                    </div>
                    {form.players.filter(p=>p.team===team).map((p, idx) => {
                      const realIdx = form.players.indexOf(p);
                      return (
                        <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 50px 60px 60px auto', gap:5, marginBottom:5, alignItems:'center' }}>
                          <input value={p.nickname} onChange={e=>updatePlayer(realIdx,'nickname',e.target.value)} placeholder="닉네임"
                            style={{ background:'#1e293b', border:'1px solid #374151', borderRadius:6, color:'#fff', padding:'5px 8px', fontSize:12 }} />
                          <input type="number" value={p.kills} onChange={e=>updatePlayer(realIdx,'kills',parseInt(e.target.value)||0)} min={0} placeholder="킬"
                            style={{ background:'#1e293b', border:'1px solid #374151', borderRadius:6, color:'#fff', padding:'5px 6px', fontSize:12, textAlign:'center' }} />
                          <input type="number" value={p.damage} onChange={e=>updatePlayer(realIdx,'damage',parseInt(e.target.value)||0)} min={0} placeholder="딜"
                            style={{ background:'#1e293b', border:'1px solid #374151', borderRadius:6, color:'#fff', padding:'5px 6px', fontSize:12, textAlign:'center' }} />
                          <button onClick={()=>updatePlayer(realIdx,'survived',!p.survived)}
                            style={{ padding:'5px 6px', borderRadius:6, border:'none', background:p.survived?'rgba(34,197,94,0.2)':'#1e293b', color:p.survived?'#4ade80':'#6b7280', fontSize:11, cursor:'pointer' }}>
                            {p.survived?'생존':'사망'}
                          </button>
                          <button onClick={()=>removePlayer(realIdx)}
                            style={{ background:'transparent', border:'none', color:'#6b7280', cursor:'pointer', fontSize:16, padding:2 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* 비밀번호 */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#9ca3af' }}>삭제 비밀번호 (4자 이상)</label>
                <input type="password" value={form.password} onChange={f('password')} placeholder="나중에 삭제 시 필요"
                  style={{ width:'100%', background:'#111827', border:'1px solid #374151', borderRadius:8, color:'#fff', padding:'9px 12px', fontSize:13, marginTop:4, boxSizing:'border-box' }} />
              </div>

              {msg && <p style={{ color: msg.includes('완료')?'#4ade80':'#f87171', fontSize:13, marginBottom:10 }}>{msg}</p>}

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width:'100%', padding:14, borderRadius:10, border:'none', background: submitting?'#374151':'#16a34a', color:'#fff', fontSize:15, fontWeight:700, cursor: submitting?'not-allowed':'pointer' }}>
                {submitting ? '등록 중...' : '내전 기록 등록'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
