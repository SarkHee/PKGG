// pages/party/create.js — 파티 모집글 작성
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import { useT } from '../../utils/i18n';

const Field = ({ label, required, children, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const selectCls = "w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm cursor-pointer";
const inputCls  = "w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm placeholder-gray-400 dark:placeholder-gray-600";

export default function PartyCreate() {
  const router = useRouter();
  const { t } = useT();
  const MODE_OPTIONS = [
    { value: 'squad',     label: t('partycreate.mode.squad') },
    { value: 'squad-fpp', label: t('partycreate.mode.squad_fpp') },
    { value: 'duo',       label: t('partycreate.mode.duo') },
    { value: 'duo-fpp',   label: t('partycreate.mode.duo_fpp') },
    { value: 'solo',      label: t('partycreate.mode.solo') },
  ];
  const SLOTS_OPTIONS = [
    { value: 1, label: t('partycreate.slots.one') },
    { value: 2, label: t('partycreate.slots.two') },
    { value: 3, label: t('partycreate.slots.three') },
    { value: 0, label: t('partycreate.slots.negotiate') },
  ];
  const PLAYTIME_OPTIONS = [
    { value: 'morning',   label: t('partycreate.playtime.morning') },
    { value: 'afternoon', label: t('partycreate.playtime.afternoon') },
    { value: 'evening',   label: t('partycreate.playtime.evening') },
    { value: 'midnight',  label: t('partycreate.playtime.midnight') },
    { value: 'anytime',   label: t('partycreate.playtime.anytime') },
  ];
  const MIC_OPTIONS = [
    { value: 'required',     label: t('partycreate.mic.required') },
    { value: 'preferred',    label: t('partycreate.mic.preferred') },
    { value: 'not_required', label: t('partycreate.mic.not_required') },
  ];
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [linkedNickname, setLinkedNickname] = useState(null);
  const [form, setForm] = useState({
    author:      '',
    password:    '',
    title:       '',
    mode:        'squad',
    server:      'steam',
    slotsNeeded: 1,
    playtime:    'evening',
    mic:         'not_required',
    mmrMin:      '',
    mmrMax:      '',
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
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.author.trim())    e.author   = t('forum.nickname_required');
    if (!form.password.trim())  e.password = t('forum.delete_password_required');
    else if (form.password.length < 4) e.password = t('forum.password_min');
    if (!form.title.trim())     e.title    = t('forum.title_required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    const contentJson = JSON.stringify({
      __party:     true,
      mode:        form.mode,
      server:      form.server,
      slotsNeeded: Number(form.slotsNeeded),
      playtime:    form.playtime,
      mic:         form.mic,
      mmrMin:      form.mmrMin ? Number(form.mmrMin) : 0,
      mmrMax:      form.mmrMax ? Number(form.mmrMax) : 0,
      description: form.description.trim(),
    });

    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:      form.title,
          content:    contentJson,
          preview:    form.description.trim().substring(0, 100) || form.title,
          author:     form.author,
          password:   form.password,
          categoryId: 'party',
        }),
      });
      const result = await res.json();
      if (res.ok) {
        router.push('/party');
      } else {
        setErrors({ general: result.error || t('partycreate.register_failed') });
      }
    } catch {
      setErrors({ general: t('fpost.network_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Head>
        <title>{t('partycreate.title')}</title>
      </Head>
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/party" passHref>
            <span className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer text-sm">{t('partycreate.back')}</span>
          </Link>
        </div>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('partycreate.heading')}</h1>
        <p className="text-sm text-gray-500 mb-8">{t('partycreate.subheading')}</p>

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
                <input
                  type="text"
                  placeholder={t('partycreate.nickname_placeholder')}
                  maxLength={20}
                  value={form.author}
                  onChange={(e) => set('author', e.target.value)}
                  className={inputCls}
                />
              )}
            </Field>
            <Field label={t('form.delete_password_label')} required error={errors.password}>
              <input
                type="password"
                placeholder={t('partycreate.password_placeholder')}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* 제목 */}
          <Field label={t('forum.title_label')} required error={errors.title}>
            <input
              type="text"
              placeholder={t('partycreate.title_placeholder')}
              maxLength={80}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* 게임 모드 + 서버 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('partycreate.mode_label')} required>
              <select value={form.mode} onChange={(e) => set('mode', e.target.value)} className={selectCls}>
                {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label={t('partycreate.server_label')} required>
              <select value={form.server} onChange={(e) => set('server', e.target.value)} className={selectCls}>
                <option value="steam">🔵 Steam</option>
                <option value="kakao">🟡 Kakao</option>
              </select>
            </Field>
          </div>

          {/* 모집 인원 + 플레이 시간대 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('partycreate.slots_label')}>
              <select value={form.slotsNeeded} onChange={(e) => set('slotsNeeded', e.target.value)} className={selectCls}>
                {SLOTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label={t('partycreate.playtime_label')}>
              <select value={form.playtime} onChange={(e) => set('playtime', e.target.value)} className={selectCls}>
                {PLAYTIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          {/* 마이크 + MMR 범위 */}
          <div className="grid grid-cols-3 gap-4">
            <Field label={t('partycreate.mic_label')}>
              <select value={form.mic} onChange={(e) => set('mic', e.target.value)} className={selectCls}>
                {MIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label={t('partycreate.mmr_min_label')}>
              <input
                type="number"
                placeholder={`${t('form.example_prefix')} 1200`}
                min={0} max={9999}
                value={form.mmrMin}
                onChange={(e) => set('mmrMin', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t('partycreate.mmr_max_label')}>
              <input
                type="number"
                placeholder={`${t('form.example_prefix')} 2000`}
                min={0} max={9999}
                value={form.mmrMax}
                onChange={(e) => set('mmrMax', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* 자유 설명 */}
          <Field label={t('partycreate.desc_label')}>
            <textarea
              placeholder={t('partycreate.desc_placeholder')}
              rows={4}
              maxLength={500}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-700 mt-1 text-right">{form.description.length}/500</p>
          </Field>

          {errors.general && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-3">
              {errors.general}
            </p>
          )}

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-2">
            <Link href="/party" passHref>
              <span className="flex-1 py-3 text-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl cursor-pointer text-sm transition-all">
                {t('form.cancel')}
              </span>
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
            >
              {isSubmitting ? t('partycreate.submitting') : t('partycreate.submit')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
