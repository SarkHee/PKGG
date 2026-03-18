// pages/sens-preset.js — 감도 프리셋 저장/공유
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const STORAGE_KEY = 'pkgg_sens_presets';

const DEFAULT_PRESET = {
  name: '',
  dpi: 800,
  hip: 50,
  vert: 1.0,
  red: 45,
  x2: 40,
  x3: 35,
  x4: 30,
  x6: 20,
  note: '',
};

function encode(p) {
  return btoa(JSON.stringify({ dpi: p.dpi, hip: p.hip, vert: p.vert, red: p.red, x2: p.x2, x3: p.x3, x4: p.x4, x6: p.x6 }));
}

function decode(str) {
  try { return JSON.parse(atob(str)); } catch { return null; }
}

function loadPresets() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function savePresets(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function edpi(p) { return Math.round(p.dpi * (p.hip / 100)); }

function SensSlider({ label, min, max, step, value, onChange, color = '#2563eb', unit = '' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#9ca3af' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{typeof value === 'number' && step < 1 ? value.toFixed(2) : value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={{ width: '100%', accentColor: color }} />
    </div>
  );
}

export default function SensPreset() {
  const router = useRouter();
  const [presets, setPresets] = useState([]);
  const [form, setForm] = useState({ ...DEFAULT_PRESET });
  const [tab, setTab] = useState('edit'); // edit | list | shared
  const [sharedData, setSharedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setPresets(loadPresets());
    const { share } = router.query;
    if (share) {
      const d = decode(share);
      if (d) { setSharedData(d); setTab('shared'); }
    }
  }, [router.query]);

  const f = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) { setSaveMsg('이름을 입력하세요'); return; }
    const newList = [{ ...form, id: Date.now() }, ...presets].slice(0, 20);
    setPresets(newList);
    savePresets(newList);
    setSaveMsg('저장됐습니다!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleDelete = (id) => {
    const newList = presets.filter(p => p.id !== id);
    setPresets(newList);
    savePresets(newList);
  };

  const handleLoad = (p) => {
    setForm({ ...p });
    setTab('edit');
  };

  const handleShare = () => {
    const url = `${window.location.origin}/sens-preset?share=${encode(form)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const importShared = () => {
    if (!sharedData) return;
    setForm(prev => ({ ...prev, ...sharedData, name: '공유받은 감도', note: '공유 링크로 가져옴' }));
    setTab('edit');
  };

  return (
    <>
      <Head><title>감도 프리셋 — PK.GG</title></Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          <div style={{ marginBottom: 20 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>⚙️ 감도 프리셋</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>감도 설정을 저장하고 URL로 공유하세요</p>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 10, padding: 4, marginBottom: 16 }}>
            {[['edit', '✏️ 편집'], ['list', `📋 저장됨 (${presets.length})`], ...(sharedData ? [['shared', '🔗 공유받음']] : [])].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', background: tab === key ? '#1e293b' : 'transparent', color: tab === key ? '#fff' : '#6b7280', fontSize: 12, fontWeight: tab === key ? 700 : 400, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* 편집 탭 */}
          {tab === 'edit' && (
            <div>
              {/* eDPI 미리보기 */}
              <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f172a)', border: '1px solid #1e40af44', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>현재 eDPI</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#60a5fa', margin: 0 }}>{edpi(form)}</p>
                <p style={{ fontSize: 11, color: '#475569', margin: '4px 0 0' }}>DPI {form.dpi} × 일반감도 {form.hip}% ÷ 100</p>
              </div>

              {/* 이름 */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>프리셋 이름</p>
                <input value={form.name} onChange={e => f('name')(e.target.value)} placeholder="예: 메인 감도, 연습용 고감도..."
                  style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>

              {/* 슬라이더 */}
              <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>기본 설정</p>
                <SensSlider label="DPI" min={100} max={16000} step={100} value={form.dpi} onChange={f('dpi')} color="#60a5fa" />
                <SensSlider label="일반 감도" min={1} max={100} step={1} value={form.hip} onChange={f('hip')} color="#34d399" unit="%" />
                <SensSlider label="수직 감도 배율" min={0.5} max={2.0} step={0.05} value={form.vert} onChange={f('vert')} color="#a78bfa" unit="×" />
              </div>

              <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>스코프 감도</p>
                {[['홀로/레드닷', 'red'], ['2배율', 'x2'], ['3배율', 'x3'], ['4배율', 'x4'], ['6배율', 'x6']].map(([label, key]) => (
                  <SensSlider key={key} label={label} min={1} max={100} step={1} value={form[key]} onChange={f(key)} color="#fb923c" />
                ))}
              </div>

              {/* 메모 */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>메모 (선택)</p>
                <textarea value={form.note} onChange={e => f('note')(e.target.value)} placeholder="무기, 마우스 정보, 참고사항..."
                  rows={2} style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave}
                  style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {saveMsg || '💾 저장'}
                </button>
                <button onClick={handleShare}
                  style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#1e40af', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {copied ? '✓ 복사됨!' : '🔗 URL 공유'}
                </button>
              </div>
            </div>
          )}

          {/* 목록 탭 */}
          {tab === 'list' && (
            <div>
              {presets.length === 0 ? (
                <div style={{ background: '#111827', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>📋</p>
                  <p style={{ color: '#6b7280' }}>저장된 프리셋이 없습니다</p>
                  <button onClick={() => setTab('edit')} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
                    프리셋 만들기
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {presets.map(p => (
                    <div key={p.id} style={{ background: '#111827', borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{p.name || '이름 없음'}</p>
                          {p.note && <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{p.note}</p>}
                        </div>
                        <button onClick={() => handleDelete(p.id)}
                          style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                        {[['eDPI', edpi(p), '#60a5fa'], ['DPI', p.dpi, '#94a3b8'], ['일반', `${p.hip}%`, '#34d399'], ['수직', `${p.vert?.toFixed?.(2) ?? p.vert}×`, '#a78bfa']].map(([lb, val, col]) => (
                          <div key={lb} style={{ background: '#0f172a', borderRadius: 7, padding: '5px 7px' }}>
                            <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 2px' }}>{lb}</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: col, margin: 0 }}>{val}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleLoad(p)}
                          style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #374151', background: '#1e293b', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                          불러오기
                        </button>
                        <button onClick={() => {
                          const url = `${window.location.origin}/sens-preset?share=${encode(p)}`;
                          navigator.clipboard.writeText(url);
                        }}
                          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #1e40af', background: 'transparent', color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}>
                          공유
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 공유받음 탭 */}
          {tab === 'shared' && sharedData && (
            <div style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', marginBottom: 16 }}>🔗 공유받은 감도 설정</p>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>eDPI</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#60a5fa', margin: 0 }}>{Math.round(sharedData.dpi * (sharedData.hip / 100))}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[['DPI', sharedData.dpi], ['일반 감도', `${sharedData.hip}%`], ['수직 배율', `${sharedData.vert}×`],
                  ['홀로/레드닷', sharedData.red], ['2배율', sharedData.x2], ['3배율', sharedData.x3],
                  ['4배율', sharedData.x4], ['6배율', sharedData.x6]].map(([lb, val]) => (
                  <div key={lb} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 2px' }}>{lb}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
              <button onClick={importShared}
                style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                내 프리셋으로 가져오기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
