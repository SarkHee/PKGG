import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';

const CATEGORY_OPTIONS = [
  { id: 'strategy', name: '전략 & 팁', icon: '🧠' },
  { id: 'general', name: '자유 게시판', icon: '💬' },
  { id: 'questions', name: '질문 & 답변', icon: '❓' },
  { id: 'recruitment', name: '클랜 모집', icon: '👥' },
  { id: 'party', name: '파티 찾기', icon: '🎮' },
];

export default function CreatePost() {
  const router = useRouter();
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
  const contentRef = useRef(null);

  useEffect(() => {
    if (urlCategory && CATEGORY_OPTIONS.find((c) => c.id === urlCategory)) {
      setFormData((prev) => ({ ...prev, categoryId: urlCategory }));
    }
  }, [urlCategory]);

  const validate = () => {
    const e = {};
    if (!formData.title.trim()) e.title = '제목을 입력해주세요';
    else if (formData.title.length > 100) e.title = '제목은 100글자를 초과할 수 없습니다';
    if (!formData.content.trim()) e.content = '내용을 입력해주세요';
    else if (formData.content.length < 5) e.content = '내용은 최소 5글자 이상 입력해주세요';
    if (!formData.categoryId) e.categoryId = '카테고리를 선택해주세요';
    if (!formData.author.trim()) e.author = '닉네임을 입력해주세요';
    else if (formData.author.length > 20) e.author = '닉네임은 20글자를 초과할 수 없습니다';
    if (!formData.password.trim()) e.password = '삭제 비밀번호를 입력해주세요';
    else if (formData.password.length < 4) e.password = '비밀번호는 4자 이상 입력해주세요';
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
        setErrors({ general: result.error || '게시글 작성에 실패했습니다' });
      }
    } catch {
      setErrors({ general: '네트워크 오류가 발생했습니다.' });
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
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
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
          const imgMd = `![이미지](${data.url})`;
          const newContent =
            formData.content.substring(0, start) +
            (start > 0 && formData.content[start - 1] !== '\n' ? '\n' : '') +
            imgMd +
            '\n' +
            formData.content.substring(end);
          handleChange('content', newContent);
        } else {
          alert(`이미지 업로드 실패: ${data.error || '알 수 없는 오류'}`);
        }
      } catch (err) {
        alert(`이미지 업로드 오류: ${err.message || '네트워크 오류'}`);
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
        <title>새 글 작성 | PKGG 커뮤니티</title>
      </Head>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 브레드크럼 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/forum" className="hover:text-blue-600">포럼</Link>
            <span>›</span>
            <span className="text-gray-800 font-medium">새 글 작성</span>
          </nav>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h1 className="text-xl font-bold text-gray-900">✏️ 새 글 작성</h1>
              <p className="text-sm text-gray-500 mt-1">PUBG 커뮤니티에 글을 공유해보세요</p>
            </div>

            {errors.general && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleChange('categoryId', cat.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        formData.categoryId === cat.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>}
              </div>

              {/* 닉네임 & 비밀번호 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    닉네임 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => handleChange('author', e.target.value)}
                    placeholder="작성자 닉네임"
                    maxLength={20}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                      errors.author ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {errors.author && <p className="mt-1 text-xs text-red-600">{errors.author}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    삭제 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="글 삭제 시 필요합니다"
                    maxLength={30}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                      errors.password ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">({formData.title.length}/100)</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  maxLength={100}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                    errors.title ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              {/* 내용 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    내용 <span className="text-red-500">*</span>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {uploadingImage ? (
                        <><div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />업로드 중...</>
                      ) : (
                        <>📷 이미지 첨부</>
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
                    placeholder="게시글 내용을 작성하세요...&#10;이미지는 버튼 클릭 또는 여기에 드래그해서 추가하세요."
                    maxLength={5000}
                    rows={12}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y font-mono transition-colors ${
                      errors.content ? 'border-red-400' : isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/80 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-sm font-semibold text-blue-600">여기에 놓으면 업로드됩니다</p>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 rounded-lg bg-white/80 flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-sm text-blue-600 font-medium">업로드 중...</p>
                    </div>
                  )}
                </div>
                {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
                <p className="mt-1.5 text-xs text-gray-400">
                  JPG, PNG, GIF, WEBP · 최대 5MB · 버튼 클릭 또는 드래그 앤 드롭으로 업로드
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImage}
                  className="flex-1 px-8 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />작성 중...</>
                  ) : (
                    '게시글 작성'
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
