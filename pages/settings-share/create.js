// pages/settings-share/create.js — 인게임 세팅 공유 글 작성
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';

const TYPE_OPTIONS = [
  { value: 'full',     label: '🔧 풀세팅 (전체)',     desc: '그래픽+마우스+키바인딩 모두' },
  { value: 'graphics', label: '🖥️ 그래픽 세팅',       desc: '해상도, 그래픽 품질 등' },
  { value: 'mouse',    label: '🖱️ 마우스/감도 세팅',   desc: 'DPI, 인게임 감도 등' },
  { value: 'keybind',  label: '⌨️ 키바인딩 세팅',      desc: '단축키, 특수 키 설정' },
];

const PRESET_OPTIONS = [
  { value: 'very_low', label: '매우 낮음' },
  { value: 'low',      label: '낮음' },
  { value: 'medium',   label: '중간' },
  { value: 'high',     label: '높음' },
  { value: 'ultra',    label: '울트라' },
];

const RESOLUTION_OPTIONS = [
  '1920x1080', '2560x1440', '3840x2160',
  '1680x1050', '1600x900', '1366x768', '1280x720',
  '직접 입력',
];

const AA_OPTIONS = [
  { value: 'none', label: '없음' },
  { value: 'fxaa', label: 'FXAA' },
  { value: 'taa',  label: 'TAA' },
];

const Field = ({ label, sub, required, children, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-300 mb-1">
      {label} {required && <span className="text-red-400">*</span>}
      {sub && <span className="ml-1 text-xs text-gray-600 font-normal">{sub}</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const inputCls  = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm placeholder-gray-600";
const selectCls = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm cursor-pointer";

const SECTION = ({ title, children }) => (
  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{title}</p>
    {children}
  </div>
);

export default function SettingsCreate() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customRes, setCustomRes] = useState(false);

  const [form, setForm] = useState({
    author:   '',
    password: '',
    title:    '',
    type:     'full',
    // 그래픽
    resolution:     '1920x1080',
    customResolution: '',
    hz:             '',
    graphicsPreset: 'low',
    antialiasing:   'none',
    // 마우스
    dpi:         '',
    sensitivity: '',
    vertSens:    '',
    scope2x: '', scope3x: '', scope4x: '', scope6x: '', scope8x: '',
    // 키바인딩 (자유 텍스트)
    keybindText: '',
    // 이미지
    imageUrl:    '',
    // 설명
    description: '',
  });

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.author.trim())   e.author   = '닉네임을 입력해주세요';
    if (!form.password.trim()) e.password = '삭제 비밀번호를 입력해주세요';
    else if (form.password.length < 4) e.password = '비밀번호는 4자 이상 입력해주세요';
    if (!form.title.trim())    e.title    = '제목을 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    const finalRes = customRes ? form.customResolution : form.resolution;

    const contentJson = JSON.stringify({
      __settings:  true,
      type:        form.type,
      resolution:  finalRes || undefined,
      hz:          form.hz ? Number(form.hz) : undefined,
      graphicsPreset: (form.type === 'graphics' || form.type === 'full') ? form.graphicsPreset : undefined,
      antialiasing:   (form.type === 'graphics' || form.type === 'full') ? form.antialiasing : undefined,
      dpi:         form.dpi         ? Number(form.dpi)         : undefined,
      sensitivity: form.sensitivity ? Number(form.sensitivity) : undefined,
      vertSens:    form.vertSens    ? Number(form.vertSens)    : undefined,
      scope2x:     form.scope2x     ? Number(form.scope2x)     : undefined,
      scope3x:     form.scope3x     ? Number(form.scope3x)     : undefined,
      scope4x:     form.scope4x     ? Number(form.scope4x)     : undefined,
      scope6x:     form.scope6x     ? Number(form.scope6x)     : undefined,
      scope8x:     form.scope8x     ? Number(form.scope8x)     : undefined,
      keybindText: form.keybindText.trim() || undefined,
      imageUrl:    form.imageUrl.trim()    || undefined,
      description: form.description.trim() || undefined,
    });

    try {
      const res = await fetch('/api/forum/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:      form.title,
          content:    contentJson,
          preview:    form.description.trim().substring(0, 100) || form.title,
          author:     form.author,
          password:   form.password,
          categoryId: 'settings',
        }),
      });
      const result = await res.json();
      if (res.ok) {
        router.push('/settings-share');
      } else {
        setErrors({ general: result.error || '등록에 실패했습니다.' });
      }
    } catch {
      setErrors({ general: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showGraphics = form.type === 'graphics' || form.type === 'full';
  const showMouse    = form.type === 'mouse'    || form.type === 'full';
  const showKeybind  = form.type === 'keybind'  || form.type === 'full';

  return (
    <div className="min-h-screen bg-gray-950">
      <Head><title>세팅 공유 작성 | PKGG</title></Head>
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/settings-share" passHref>
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer text-sm">← 세팅 공유</span>
          </Link>
        </div>

        <h1 className="text-2xl font-black text-white mb-1">⚙️ 세팅 공유 작성</h1>
        <p className="text-sm text-gray-500 mb-8">내 인게임 세팅을 공유해보세요</p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 작성자 + 비밀번호 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="닉네임" required error={errors.author}>
              <input type="text" placeholder="게임 닉네임" maxLength={20}
                value={form.author} onChange={e => set('author', e.target.value)}
                className={inputCls} />
            </Field>
            <Field label="삭제 비밀번호" required error={errors.password}>
              <input type="password" placeholder="4자 이상"
                value={form.password} onChange={e => set('password', e.target.value)}
                className={inputCls} />
            </Field>
          </div>

          {/* 제목 */}
          <Field label="제목" required error={errors.title}>
            <input type="text" placeholder="예) 저사양 최적화 세팅 공유합니다" maxLength={80}
              value={form.title} onChange={e => set('title', e.target.value)}
              className={inputCls} />
          </Field>

          {/* 세팅 유형 */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">세팅 유형 <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => set('type', o.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.type === o.value
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}>
                  <div className="text-sm font-bold">{o.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 그래픽 섹션 */}
          {showGraphics && (
            <SECTION title="🖥️ 그래픽 설정">
              <div className="grid grid-cols-2 gap-4">
                <Field label="해상도">
                  <select value={customRes ? '직접 입력' : form.resolution}
                    onChange={e => {
                      if (e.target.value === '직접 입력') { setCustomRes(true); }
                      else { setCustomRes(false); set('resolution', e.target.value); }
                    }}
                    className={selectCls}>
                    {RESOLUTION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {customRes && (
                    <input type="text" placeholder="예) 1440x900" value={form.customResolution}
                      onChange={e => set('customResolution', e.target.value)}
                      className={`${inputCls} mt-2`} />
                  )}
                </Field>
                <Field label="모니터 주사율 (Hz)">
                  <input type="number" placeholder="예) 144" min={60} max={360}
                    value={form.hz} onChange={e => set('hz', e.target.value)}
                    className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="그래픽 프리셋">
                  <select value={form.graphicsPreset} onChange={e => set('graphicsPreset', e.target.value)} className={selectCls}>
                    {PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="안티앨리어싱">
                  <select value={form.antialiasing} onChange={e => set('antialiasing', e.target.value)} className={selectCls}>
                    {AA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
            </SECTION>
          )}

          {/* 마우스/감도 섹션 */}
          {showMouse && (
            <SECTION title="🖱️ 마우스 / 감도 설정">
              <div className="grid grid-cols-3 gap-3">
                <Field label="DPI">
                  <input type="number" placeholder="800" min={100} max={25600}
                    value={form.dpi} onChange={e => set('dpi', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label="일반 감도">
                  <input type="number" placeholder="45" min={1} max={100} step={0.1}
                    value={form.sensitivity} onChange={e => set('sensitivity', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label="수직 감도 배율">
                  <input type="number" placeholder="1.0" min={0.1} max={2.0} step={0.05}
                    value={form.vertSens} onChange={e => set('vertSens', e.target.value)}
                    className={inputCls} />
                </Field>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2">스코프 감도 <span className="text-gray-600 font-normal text-xs">(선택)</span></p>
                <div className="grid grid-cols-5 gap-2">
                  {[['scope2x','2배'],['scope3x','3배'],['scope4x','4배'],['scope6x','6배'],['scope8x','8배']].map(([k,lbl]) => (
                    <div key={k}>
                      <p className="text-xs text-gray-600 mb-1 text-center">{lbl}</p>
                      <input type="number" placeholder="-" min={1} max={100} step={0.1}
                        value={form[k]} onChange={e => set(k, e.target.value)}
                        className={`${inputCls} text-center px-2`} />
                    </div>
                  ))}
                </div>
              </div>
            </SECTION>
          )}

          {/* 키바인딩 섹션 */}
          {showKeybind && (
            <SECTION title="⌨️ 키바인딩 설정">
              <Field label="키바인딩 내용" sub="(자유 형식으로 작성)">
                <textarea placeholder={`예)\n앉기: 좌Ctrl\n엎드리기: Z\n지도: M\n핑: 마우스 중앙버튼`}
                  rows={5} maxLength={1000}
                  value={form.keybindText} onChange={e => set('keybindText', e.target.value)}
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-700 mt-1 text-right">{form.keybindText.length}/1000</p>
              </Field>
            </SECTION>
          )}

          {/* 이미지 URL */}
          <Field label="이미지 URL" sub="(선택 — 세팅 스크린샷 등)">
            <input type="url" placeholder="https://..." value={form.imageUrl}
              onChange={e => set('imageUrl', e.target.value)}
              className={inputCls} />
          </Field>

          {/* 추가 설명 */}
          <Field label="추가 설명" sub="(선택)">
            <textarea
              placeholder="PC 사양, 세팅 의도, 주의사항 등 자유롭게 적어주세요"
              rows={4} maxLength={500}
              value={form.description} onChange={e => set('description', e.target.value)}
              className={`${inputCls} resize-none`} />
            <p className="text-xs text-gray-700 mt-1 text-right">{form.description.length}/500</p>
          </Field>

          {errors.general && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-4 py-3">
              {errors.general}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/settings-share" passHref>
              <span className="flex-1 py-3 text-center bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl cursor-pointer text-sm transition-all">
                취소
              </span>
            </Link>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
              {isSubmitting ? '등록 중...' : '⚙️ 세팅 공유하기'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
