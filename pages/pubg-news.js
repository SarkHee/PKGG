import React, { useState } from 'react';
import Layout from "../components/layout/Layout"';
import PubgNewsCard from '../components/PubgNewsCard';
import Head from 'next/head';

export default function PubgNewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'all', label: '전체', icon: '🌍' },
    { value: '공지사항', label: '공지사항', icon: '📢' },
    { value: '업데이트', label: '업데이트', icon: '🔄' },
    { value: '이벤트', label: '이벤트', icon: '🎉' },
    { value: '점검', label: '점검', icon: '🔧' },
  ];

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch(`/api/pubg-news?category=${selectedCategory}&refresh=true`);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('뉴스 새로고침 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>PUBG 공지사항 - PKGG</title>
        <meta
          name="description"
          content="최신 PUBG 공지사항과 업데이트 소식을 확인하세요"
        />
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    PUBG 공지사항
                  </h1>
                  <p className="text-gray-700">
                    최신 PUBG 소식과 업데이트 정보를 확인하세요
                  </p>
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '🔄' : '🔄'}
                  새로고침
                </button>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === category.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {category.icon}
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <PubgNewsCard
                key={`main-${refreshKey}`}
                category={selectedCategory}
                maxItems={10}
                theme="light"
              />
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-100 p-6 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  🌍 공식 PUBG 사이트
                </h3>
                <p className="text-blue-800 text-sm mb-3">
                  공식 사이트에서 최신 소식을 확인하세요
                </p>
                <a
                  href="https://pubg.com/ko/news"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium"
                >
                  공식 사이트 방문
                  <span className="text-xs">↗</span>
                </a>
              </div>

              <div className="bg-gray-100 p-6 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  🎮 Steam 뉴스
                </h3>
                <p className="text-gray-800 text-sm mb-3">
                  Steam에서 PUBG 관련 소식을 확인하세요
                </p>
                <a
                  href="https://store.steampowered.com/news/app/578080"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  Steam 뉴스 보기
                  <span className="text-xs">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
