// pages/party/create.js — 파티 모집글 작성
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';

const MODE_OPTIONS = [
  { value: 'squad',     label: '🏆 스쿼드 (4인)' },
  { value: 'squad-fpp', label: '🏆 스쿼드 FPP (4인)' },
  { value: 'duo',       label: '👥 듀오 (2인)' },
  { value: 'duo-fpp',   label: '👥 듀오 FPP (2인)' },
  { value: 'solo',      label: '🎯 솔로' },
];

const SLOTS_OPTIONS = [
  { value: 1, label: '1명' },
  { value: 2, label: '2명' },
  { value: 3, label: '3명' },
  { value: 0, label: '협의' },
];

const PLAYTIME_OPTIONS = [
  { value: 'morning',   label: '☀️ 오전 (06~12시)' },
  { value: 'afternoon', label: '🌤️ 오후 (12~18시)' },
  { value: 'evening',   label: '🌙 저녁 (18~24시)' },
  { value: 'midnight',  label: '🌃 새벽 (00~06시)' },
  { value: 'anytime',   label: '⏰ 언제든 가능' },
];

const MIC_OPTIONS = [
  { value: 'required',    label: '🎤 마이크 필수' },
  { value: 'preferred',   label: '🎤 마이크 선호' },
  { value: 'not_required',label: '🔇 마이크 불필요' },
];

const Field = ({ label, required, children, error }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-300 mb-2">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const selectCls = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm cursor-pointer";
const inputCls  = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm placeholder-gray-600";

export default function PartyCreate() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
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

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.author.trim())    e.author   = '닉네임을 입력해주세요';
    if (!form.password.trim())  e.password = '삭제 비밀번호를 입력해주세요';
    else if (form.password.length < 4) e.password = '비밀번호는 4자 이상 입력해주세요';
    if (!form.title.trim())     e.title    = '제목을 입력해주세요';
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
        setErrors({ general: result.error || '등록에 실패했습니다.' });
      }
    } catch {
      setErrors({ general: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>파티 모집글 작성 | PKGG</title>
      </Head>
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/party" passHref>
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer text-sm">← 파티 찾기</span>
          </Link>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">🎮 파티 모집글 작성</h1>
        <p className="text-sm text-gray-500 mb-8">함께 플레이할 팀원을 모집해보세요</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 작성자 + 비밀번호 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="닉네임" required error={errors.author}>
              <input
                type="text"
                placeholder="게임 닉네임"
                maxLength={20}
                value={form.author}
                onChange={(e) => set('author', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="삭제 비밀번호" required error={errors.password}>
              <input
                type="password"
                placeholder="4자 이상"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* 제목 */}
          <Field label="제목" required error={errors.title}>
            <input
              type="text"
              placeholder="예) 스쿼드 1명 구해요! 저녁 즐겜"
              maxLength={80}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* 게임 모드 + 서버 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="게임 모드" required>
              <select value={form.mode} onChange={(e) => set('mode', e.target.value)} className={selectCls}>
                {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="서버" required>
              <select value={form.server} onChange={(e) => set('server', e.target.value)} className={selectCls}>
                <option value="steam">🔵 Steam</option>
                <option value="kakao">🟡 Kakao</option>
              </select>
            </Field>
          </div>

          {/* 모집 인원 + 플레이 시간대 */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="모집 인원">
              <select value={form.slotsNeeded} onChange={(e) => set('slotsNeeded', e.target.value)} className={selectCls}>
                {SLOTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="주요 플레이 시간대">
              <select value={form.playtime} onChange={(e) => set('playtime', e.target.value)} className={selectCls}>
                {PLAYTIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          {/* 마이크 + MMR 범위 */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="마이크">
              <select value={form.mic} onChange={(e) => set('mic', e.target.value)} className={selectCls}>
                {MIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="MMR 최소 (선택)">
              <input
                type="number"
                placeholder="예) 1200"
                min={0} max={9999}
                value={form.mmrMin}
                onChange={(e) => set('mmrMin', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="MMR 최대 (선택)">
              <input
                type="number"
                placeholder="예) 2000"
                min={0} max={9999}
                value={form.mmrMax}
                onChange={(e) => set('mmrMax', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* 자유 설명 */}
          <Field label="추가 설명 (선택)">
            <textarea
              placeholder="원하는 플레이 스타일, 연령대, 디스코드 여부 등 자유롭게 적어주세요"
              rows={4}
              maxLength={500}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-700 mt-1 text-right">{form.description.length}/500</p>
          </Field>

          {errors.general && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/30 rounded-xl px-4 py-3">
              {errors.general}
            </p>
          )}

          {/* 제출 버튼 */}
          <div className="flex gap-3 pt-2">
            <Link href="/party" passHref>
              <span className="flex-1 py-3 text-center bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl cursor-pointer text-sm transition-all">
                취소
              </span>
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
            >
              {isSubmitting ? '등록 중...' : '🎮 모집글 등록'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
