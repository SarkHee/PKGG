import React, { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'

const CATEGORY_COLOR = {
  '공지':     'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50',
  '패치노트': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700/50',
  '개발일지': 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50',
}
const DEFAULT_CAT_COLOR = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'

const PubgNewsCard = ({ category = 'all', maxItems = 5 }) => {
  const [news,       setNews]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetchNews = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/pubg-news?category=${encodeURIComponent(category)}&limit=${maxItems}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setNews(data.success ? data.data : [])
      setError(null)
    } catch (err) {
      console.error('PUBG 뉴스 로딩 실패:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNews() }, [category, maxItems])

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch { return dateString }
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-gray-700" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-8 text-center rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">뉴스를 불러올 수 없습니다: {error}</p>
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <div className="w-full p-12 text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">등록된 뉴스가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, index) => (
          <a
            key={item.id || index}
            href={item.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* 썸네일 */}
            {item.imageUrl ? (
              <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.parentElement.style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MessageCircle className="w-12 h-12 text-white opacity-70" />
              </div>
            )}

            {/* 본문 */}
            <div className="flex flex-col flex-1 p-5">
              {/* 카테고리 태그 */}
              {item.category && (
                <span className={`self-start px-2.5 py-0.5 text-xs font-medium rounded-full mb-3 ${CATEGORY_COLOR[item.category] || DEFAULT_CAT_COLOR}`}>
                  {item.category}
                </span>
              )}

              {/* 제목 */}
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                {item.title}
              </h3>

              {/* 플랫폼 태그 */}
              {item.platforms?.length > 0 && (
                <div className="flex gap-1 mb-3">
                  {item.platforms.map((p) => (
                    <span key={p} className="px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* 날짜 */}
              {item.publishedAt && (
                <p className="mt-auto pt-3 text-xs text-gray-400 dark:text-gray-500">
                  📅 {formatDate(item.publishedAt)}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* 공식 사이트 링크 */}
      <div className="mt-8 text-center">
        <a
          href="https://www.pubg.com/ko/news"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
        >
          pubg.com에서 더 보기 ↗
        </a>
      </div>
    </div>
  )
}

export default PubgNewsCard
