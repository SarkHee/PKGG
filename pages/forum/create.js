import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import { useT } from '../../utils/i18n';

const CATEGORY_OPTIONS = [
  { id: 'strategy', icon: '🧠' },
  { id: 'general', icon: '💬' },
  { id: 'questions', icon: '❓' },
  { id: 'recruitment', icon: '👥' },
];

export default function CreatePost() {
  const router = useRouter();
  const { t } = useT();
  const { data: session } = useSession();
  const { category: urlCategory } = router.query;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    author: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [linkedNickname, setLinkedNickname] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (urlCategory && CATEGORY_OPTIONS.find((c) => c.id === urlCategory)) {
      setFormData((prev) => ({ ...prev, categoryId: urlCategory }));
    }
  }, [urlCategory]);

  // 로그인 사용자: 대표 계정 닉네임 자동입력
  useEffect(() => {
    if (!session?.user?.googleId) return;
    fetch('/api/user/me')
      .then((r) => r.json())
      .then((d) => {
        const user = d.user;
        const mainAcc = user?.pubgAccounts?.find((a) => a.id === user.mainAccountId);
        const nick = mainAcc?.nickname;
        if (nick) {
          setLinkedNickname(nick);
          setFormData((prev) => ({ ...prev, author: nick }));
        }
      })
      .catch(() => {});
  }, [session]);

  const validate = () => {
    const e = {};
    if (!formData.title.trim()) e.title = t('forum.title_required');
    else if (formData.title.length > 100) e.title = t('forum.title_too_long');
    if (!formData.content.trim()) e.content = t('forum.content_required');
    else if (formData.content.length < 5) e.content = t('forum.content_too_short');
    if (!formData.categoryId) e.categoryId = t('forum.category_required');
    if (!formData.author.trim()) e.author = t('forum.nickname_required');
    else if (formData.author.length > 20) e.author = t('forum.author_too_long');
    if (!formData.password.trim()) e.password = t('forum.delete_password_required');
    else if (formData.password.length < 4) e.password = t('forum.password_min');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          preview: formData.content.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\n/g, ' ').trim().substring(0, 200),
          author: formData.author,
          categoryId: formData.categoryId,
          password: formData.password,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        router.push(`/forum/post/${result.id}`);
      } else {
        setErrors({ general: result.error || t('forum.post_failed') });
      }
    } catch {
      setErrors({ general: t('fpost.network_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert(t('forum.image_only'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t('forum.image_too_large'));
      return;
    }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await fetch('/api/forum/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64: ev.target.result,
            filename: file.name,
            mimeType: file.type,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          const textarea = contentRef.current;
          const start = textarea?.selectionStart ?? formData.content.length;
          const end = textarea?.selectionEnd ?? formData.content.length;
          const imgMd = `![${t('fpost.image_alt')}](${data.url})`;
          const newContent =
            formData.content.substring(0, start) +
            (start > 0 && formData.content[start - 1] !== '\n' ? '\n' : '') +
            imgMd +
            '\n' +
            formData.content.substring(end);
          handleChange('content', newContent);
        } else {
          alert(t('forum.image_upload_failed').replace('{n}', data.error || t('forum.unknown_error')));
        }
      } catch (err) {
        alert(t('forum.image_upload_error').replace('{n}', err.message || t('fpost.network_error')));
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <>
      <Head>
        <title>{t('forum.create_title')}</title>
      </Head>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 브레드크럼 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <Link href="/forum" className="hover:text-blue-600">{t('forum.breadcrumb_forum')}</Link>
            <span>›</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">{t('forum.breadcrumb_create')}</span>
          </nav>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('forum.create_heading')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('forum.create_subheading')}</p>
            </div>

            {errors.general && (
              <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                ⚠️ {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('forum.category_label')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleChange('categoryId', cat.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        formData.categoryId === cat.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{t(`forum.cat.${cat.id}.name`)}</span>
                    </button>
                  ))}
                </div>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>}
              </div>

              {/* 닉네임 & 비밀번호 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.nickname_label')} <span className="text-red-500">*</span>
                  </label>
                  {linkedNickname ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{linkedNickname}</span>
                      <span className="text-[11px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{t('form.linked')}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => handleChange('author', e.target.value)}
                      placeholder={t('forum.author_placeholder')}
                      maxLength={20}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                        errors.author ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  )}
                  {errors.author && <p className="mt-1 text-xs text-red-600">{errors.author}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.delete_password_label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder={t('forum.delete_password_placeholder')}
                    maxLength={30}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                      errors.password ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('forum.title_label')} <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">({formData.title.length}/100)</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder={t('forum.title_placeholder')}
                  maxLength={100}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors.title ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              {/* 내용 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('forum.content_label')} <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">({formData.content.length}/5000)</span>
                  </label>
                  {/* 이미지 첨부 버튼 */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {uploadingImage ? (
                        <><div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{t('forum.uploading')}</>
                      ) : (
                        <>{t('forum.image_attach')}</>
                      )}
                    </button>
                  </div>
                </div>
                <div
                  className="relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <textarea
                    ref={contentRef}
                    value={formData.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                    placeholder={t('forum.content_placeholder2')}
                    maxLength={5000}
                    rows={12}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y font-mono transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                      errors.content ? 'border-red-400' : isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/80 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-sm font-semibold text-blue-600">{t('forum.drop_hint')}</p>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 rounded-lg bg-white/80 dark:bg-gray-900/80 flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-sm text-blue-600 font-medium">{t('forum.uploading')}</p>
                    </div>
                  )}
                </div>
                {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
                <p className="mt-1.5 text-xs text-gray-400">
                  {t('forum.upload_hint')}
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  {t('form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImage}
                  className="flex-1 px-8 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('forum.submitting_post')}</>
                  ) : (
                    t('forum.submit_post')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
