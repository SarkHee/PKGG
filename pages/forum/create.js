import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';

const CATEGORY_OPTIONS = [
  { id: 'strategy', name: '전략 & 팁', icon: '🧠' },
  { id: 'general', name: '자유 게시판', icon: '💬' },
  { id: 'questions', name: '질문 & 답변', icon: '❓' },
  { id: 'clan', name: '클랜 모집', icon: '👥' },
  { id: 'showcase', name: '플레이 영상', icon: '🎬' }
];

export default function CreatePost() {
  const router = useRouter();
  const { category: urlCategory } = router.query;
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: urlCategory || '',
    author: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (urlCategory) {
      setFormData(prev => ({ ...prev, categoryId: urlCategory }));
    }
  }, [urlCategory]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = '제목을 입력해주세요';
    } else if (formData.title.length < 5) {
      newErrors.title = '제목은 최소 5글자 이상 입력해주세요';
    } else if (formData.title.length > 100) {
      newErrors.title = '제목은 100글자를 초과할 수 없습니다';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = '내용을 입력해주세요';
    } else if (formData.content.length < 10) {
      newErrors.content = '내용은 최소 10글자 이상 입력해주세요';
    } else if (formData.content.length > 5000) {
      newErrors.content = '내용은 5000글자를 초과할 수 없습니다';
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = '카테고리를 선택해주세요';
    }
    
    if (!formData.author.trim()) {
      newErrors.author = '작성자명을 입력해주세요';
    } else if (formData.author.length < 2) {
      newErrors.author = '작성자명은 최소 2글자 이상 입력해주세요';
    } else if (formData.author.length > 20) {
      newErrors.author = '작성자명은 20글자를 초과할 수 없습니다';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('Submitting post:', {
        title: formData.title,
        contentLength: formData.content.length,
        author: formData.author,
        categoryId: formData.categoryId
      });

      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          preview: formData.content.substring(0, 200).replace(/\n/g, ' ')
        })
      });
      
      const result = await response.json();
      console.log('API Response:', { status: response.status, result });
      
      if (response.ok) {
        // 성공 시 해당 카테고리로 이동
        console.log('Post created successfully, redirecting...');
        router.push(`/forum/category/${formData.categoryId}?success=created`);
      } else {
        console.error('API Error:', result);
        if (result.error === 'PROFANITY_DETECTED') {
          setErrors({
            general: `부적절한 언어가 감지되었습니다: ${result.details?.words?.join(', ') || ''}`,
            bannedWords: result.details?.words || []
          });
        } else {
          setErrors({ general: result.error || '게시글 작성에 실패했습니다' });
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setErrors({ general: '네트워크 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const selectedCategory = CATEGORY_OPTIONS.find(cat => cat.id === formData.categoryId);

  return (
    <>
      <Head>
        <title>새 글 작성 | 커뮤니티 포럼 | PK.GG</title>
        <meta name="description" content="PUBG 커뮤니티에 새 게시글을 작성하세요" />
      </Head>

      <Header />
      
      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        {/* 브레드크럼 */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/forum" className="hover:text-blue-600">커뮤니티 포럼</Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-gray-100">새 글 작성</span>
          </nav>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✏️</span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">새 글 작성</h1>
            </div>
            
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCategory.icon}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {selectedCategory.name}에 게시글을 작성합니다
                </span>
              </div>
            )}
          </div>

          {/* 전역 에러 메시지 */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                <span className="text-red-700 dark:text-red-300">{errors.general}</span>
              </div>
              {errors.bannedWords && errors.bannedWords.length > 0 && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  감지된 단어: {errors.bannedWords.map(word => (
                    <span key={word} className="bg-red-200 dark:bg-red-800 px-2 py-1 rounded mr-2">
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 작성 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              {/* 카테고리 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  카테고리 *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.categoryId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">카테고리를 선택하세요</option>
                  {CATEGORY_OPTIONS.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.categoryId}</p>
                )}
              </div>

              {/* 작성자 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  작성자 *
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.author ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.author && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.author}</p>
                )}
              </div>

              {/* 제목 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  제목 * <span className="text-gray-500">({formData.title.length}/100)</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  maxLength={100}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                )}
              </div>

              {/* 내용 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    내용 * <span className="text-gray-500">({formData.content.length}/5000)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {showPreview ? '편집' : '미리보기'}
                    </button>
                  </div>
                </div>
                
                {showPreview ? (
                  <div className="w-full min-h-[200px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="prose dark:prose-invert max-w-none">
                      {formData.content.split('\n').map((line, index) => (
                        <p key={index} className="mb-2">{line || '\u00A0'}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="게시글 내용을 작성하세요...

✅ 도움이 되는 팁: 
• 구체적이고 자세한 설명을 해주세요
• 이미지나 동영상 링크를 포함할 수 있습니다
• 다른 사용자들에게 도움이 되는 내용을 작성해주세요"
                    maxLength={5000}
                    rows={15}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-vertical ${
                      errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                )}
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
                )}
              </div>

              {/* 작성 가이드 */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">📝 작성 가이드</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• 제목은 내용을 잘 나타내도록 작성해주세요</li>
                  <li>• 욕설, 비방, 차별적 발언은 자동으로 차단됩니다</li>
                  <li>• 도움이 되는 정보나 건설적인 의견을 공유해주세요</li>
                  <li>• 개인정보나 연락처는 공개하지 마세요</li>
                </ul>
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      작성 중...
                    </>
                  ) : (
                    <>
                      📝 게시글 작성
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
