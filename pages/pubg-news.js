import React, { useState } from 'react'
import Layout from '../components/layout/Layout'
import PubgNewsCard from '../components/PubgNewsCard'
import Head from 'next/head'

export default function PubgNewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [refreshKey,        setRefreshKey]        = useState(0)
  const [loading,           setLoading]           = useState(false)

  const categories = [
    { value: 'all',      label: '전체',   icon: '🌍' },
    { value: '공지',     label: '공지',   icon: '📢' },
    { value: '패치노트', label: '패치노트', icon: '🔄' },
    { value: '개발일지', label: '개발일지', icon: '📝' },
  ]

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await fetch(`/api/pubg-news?category=${encodeURIComponent(selectedCategory)}&refresh=true`)
      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error('뉴스 새로고침 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>PUBG 공지사항 - PKGG</title>
        <meta name="description" content="최신 PUBG 공지사항과 업데이트 소식을 확인하세요" />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
          <div className="max-w-6xl mx-auto px-4 py-8">

            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  PUBG 공지사항
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  pubg.com 공식 뉴스를 실시간으로 확인하세요
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🔄 새로고침
              </button>
            </div>

            {/* 카테고리 탭 */}
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* 뉴스 카드 */}
            <PubgNewsCard
              key={`${selectedCategory}-${refreshKey}`}
              category={selectedCategory}
              maxItems={12}
            />

          </div>
        </div>
      </Layout>
    </>
  )
}
