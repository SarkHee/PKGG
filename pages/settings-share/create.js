// pages/settings-share/create.js — 인게임 세팅 공유 글 작성
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import { useT } from '../../utils/i18n';

const RESOLUTION_OPTIONS = [
  '1920x1080', '2560x1440', '3840x2160',
  '1680x1050', '1600x900', '1366x768', '1280x720',
];

const Field = ({ label, sub, required, children, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
      {label} {required && <span className="text-red-400">*</span>}
      {sub && <span className="ml-1 text-xs text-gray-600 font-normal">{sub}</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const inputCls  = "w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm placeholder-gray-400 dark:placeholder-gray-600";
const selectCls = "w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm cursor-pointer";

const SECTION = ({ title, children }) => (
  <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
    {children}
  </div>
);

export default function SettingsCreate() {
  const router = useRouter();
  const { t } = useT();
  const TYPE_OPTIONS = [
    { value: 'full',     label: t('settingscreate.type_full'),     desc: t('settingscreate.type_full_desc') },
    { value: 'graphics', label: t('settingscreate.type_graphics'), desc: t('settingscreate.type_graphics_desc') },
    { value: 'mouse',    label: t('settingscreate.type_mouse'),    desc: t('settingscreate.type_mouse_desc') },
    { value: 'keybind',  label: t('settingscreate.type_keybind'),  desc: t('settingscreate.type_keybind_desc') },
  ];
  const PRESET_OPTIONS = [
    { value: 'very_low', label: t('settings.preset.very_low') },
    { value: 'low',      label: t('settings.preset.low') },
    { value: 'medium',   label: t('settings.preset.medium') },
    { value: 'high',     label: t('settings.preset.high') },
    { value: 'ultra',    label: t('settings.preset.ultra') },
  ];
  const AA_OPTIONS = [
    { value: 'none', label: t('settingscreate.aa_none') },
    { value: 'fxaa', label: 'FXAA' },
    { value: 'taa',  label: 'TAA' },
  ];
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customRes, setCustomRes] = useState(false);
  const [linkedNickname, setLinkedNickname] = useState(null);

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

  useEffect(() => {
    if (!session?.user?.googleId) return;
    fetch('/api/user/me').then((r) => r.json()).then((d) => {
      const user = d.user;
      const mainAcc = user?.pubgAccounts?.find((a) => a.id === user.mainAccountId);
      const nick = mainAcc?.nickname;
      if (nick) { setLinkedNickname(nick); setForm((prev) => ({ ...prev, author: nick })); }
    }).catch(() => {});
  }, [session]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.author.trim())   e.author   = t('forum.nickname_required');
    if (!form.password.trim()) e.password = t('forum.delete_password_required');
    else if (form.password.length < 4) e.password = t('forum.password_min');
    if (!form.title.trim())    e.title    = t('forum.title_required');
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
        setErrors({ general: result.error || t('settingscreate.register_failed') });
      }
    } catch {
      setErrors({ general: t('fpost.network_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showGraphics = form.type === 'graphics' || form.type === 'full';
  const showMouse    = form.type === 'mouse'    || form.type === 'full';
  const showKeybind  = form.type === 'keybind'  || form.type === 'full';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Head><title>{t('settingscreate.title')}</title></Head>
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/settings-share" passHref>
            <span className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer text-sm">{t('settingscreate.back')}</span>
          </Link>
        </div>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{t('settingscreate.heading')}</h1>
        <p className="text-sm text-gray-500 mb-8">{t('settingscreate.subheading')}</p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 작성자 + 비밀번호 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('form.nickname_label')} required error={errors.author}>
              {linkedNickname ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500/50 rounded-xl">
                  <span className="text-sm font-medium text-blue-800 dark:text-gray-200">{linkedNickname}</span>
                  <span className="text-[11px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{t('form.linked')}</span>
                </div>
              ) : (
                <input type="text" placeholder={t('settingscreate.nickname_placeholder')} maxLength={20}
                  value={form.author} onChange={e => set('author', e.target.value)}
                  className={inputCls} />
              )}
            </Field>
            <Field label={t('form.delete_password_label')} required error={errors.password}>
              <input type="password" placeholder={t('settingscreate.password_placeholder')}
                value={form.password} onChange={e => set('password', e.target.value)}
                className={inputCls} />
            </Field>
          </div>

          {/* 제목 */}
          <Field label={t('forum.title_label')} required error={errors.title}>
            <input type="text" placeholder={t('settingscreate.title_placeholder')} maxLength={80}
              value={form.title} onChange={e => set('title', e.target.value)}
              className={inputCls} />
          </Field>

          {/* 세팅 유형 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('settingscreate.type_label')} <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => set('type', o.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.type === o.value
                      ? 'bg-purple-600/20 border-purple-500 text-purple-800 dark:text-white'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}>
                  <div className="text-sm font-bold">{o.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 그래픽 섹션 */}
          {showGraphics && (
            <SECTION title={t('settingscreate.graphics_section')}>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('settingscreate.resolution_label')}>
                  <select value={customRes ? t('settingscreate.custom_input') : form.resolution}
                    onChange={e => {
                      if (e.target.value === t('settingscreate.custom_input')) { setCustomRes(true); }
                      else { setCustomRes(false); set('resolution', e.target.value); }
                    }}
                    className={selectCls}>
                    {RESOLUTION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value={t('settingscreate.custom_input')}>{t('settingscreate.custom_input')}</option>
                  </select>
                  {customRes && (
                    <input type="text" placeholder={`${t('form.example_prefix')} 1440x900`} value={form.customResolution}
                      onChange={e => set('customResolution', e.target.value)}
                      className={`${inputCls} mt-2`} />
                  )}
                </Field>
                <Field label={t('settingscreate.hz_label')}>
                  <input type="number" placeholder={`${t('form.example_prefix')} 144`} min={60} max={360}
                    value={form.hz} onChange={e => set('hz', e.target.value)}
                    className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('settingscreate.preset_label')}>
                  <select value={form.graphicsPreset} onChange={e => set('graphicsPreset', e.target.value)} className={selectCls}>
                    {PRESET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label={t('settingscreate.aa_label')}>
                  <select value={form.antialiasing} onChange={e => set('antialiasing', e.target.value)} className={selectCls}>
                    {AA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
            </SECTION>
          )}

          {/* 마우스/감도 섹션 */}
          {showMouse && (
            <SECTION title={t('settingscreate.mouse_section')}>
              <div className="grid grid-cols-3 gap-3">
                <Field label="DPI">
                  <input type="number" placeholder="800" min={100} max={25600}
                    value={form.dpi} onChange={e => set('dpi', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label={t('settingscreate.sens_label')}>
                  <input type="number" placeholder="45" min={1} max={100} step={0.1}
                    value={form.sensitivity} onChange={e => set('sensitivity', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label={t('settingscreate.vert_sens_label')}>
                  <input type="number" placeholder="1.0" min={0.1} max={2.0} step={0.05}
                    value={form.vertSens} onChange={e => set('vertSens', e.target.value)}
                    className={inputCls} />
                </Field>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('settingscreate.scope_sens_label')} <span className="text-gray-600 font-normal text-xs">{t('settingscreate.optional')}</span></p>
                <div className="grid grid-cols-5 gap-2">
                  {[['scope2x','×2'],['scope3x','×3'],['scope4x','×4'],['scope6x','×6'],['scope8x','×8']].map(([k,lbl]) => (
                    <div key={k}>
                      <p className="text-xs text-gray-500 dark:text-gray-600 mb-1 text-center">{lbl}</p>
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
            <SECTION title={t('settingscreate.keybind_section')}>
              <Field label={t('settingscreate.keybind_label')} sub={t('settingscreate.keybind_sub')}>
                <textarea placeholder={t('settingscreate.keybind_placeholder')}
                  rows={5} maxLength={1000}
                  value={form.keybindText} onChange={e => set('keybindText', e.target.value)}
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-500 dark:text-gray-700 mt-1 text-right">{form.keybindText.length}/1000</p>
              </Field>
            </SECTION>
          )}

          {/* 이미지 URL */}
          <Field label={t('settingscreate.image_url_label')} sub={t('settingscreate.image_url_sub')}>
            <input type="url" placeholder="https://..." value={form.imageUrl}
              onChange={e => set('imageUrl', e.target.value)}
              className={inputCls} />
          </Field>

          {/* 추가 설명 */}
          <Field label={t('settingscreate.desc_label')} sub={t('settingscreate.optional')}>
            <textarea
              placeholder={t('settingscreate.desc_placeholder')}
              rows={4} maxLength={500}
              value={form.description} onChange={e => set('description', e.target.value)}
              className={`${inputCls} resize-none`} />
            <p className="text-xs text-gray-500 dark:text-gray-700 mt-1 text-right">{form.description.length}/500</p>
          </Field>

          {errors.general && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-3">
              {errors.general}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/settings-share" passHref>
              <span className="flex-1 py-3 text-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl cursor-pointer text-sm transition-all">
                {t('form.cancel')}
              </span>
            </Link>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
              {isSubmitting ? t('settingscreate.submitting') : t('settingscreate.submit')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
