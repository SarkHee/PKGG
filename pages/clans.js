// pages/clans.js — 공개 클랜 디렉토리 (MMR 랭킹)

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';
import { getMMRTier } from '../utils/mmrCalculator';
import { useT } from '../utils/i18n';

const REGIONS = ['all', '한국', '아시아', '북미', '유럽', '기타'];

function TierBadge({ score }) {
  if (!score) return <span className="text-xs text-gray-500">-</span>;
  const tier = getMMRTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${tier.bgColor} ${tier.textColor} ${tier.borderColor}`}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}

function ClanRow({ rank, clan }) {
  const tier = clan.avgScore ? getMMRTier(clan.avgScore) : null;

  return (
      <div className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_8rem_6rem_7rem_8rem] gap-3 items-center px-4 py-3.5 border-b border-gray-100">
        {/* 순위 */}
        <div className="text-center">
          {rank <= 3 ? (
            <span className="text-lg">{['🥇','🥈','🥉'][rank - 1]}</span>
          ) : (
            <span className="text-sm font-bold text-gray-400">{rank}</span>
          )}
        </div>

        {/* 클랜 정보 */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {clan.pubgClanTag && (
              <span className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono">
                [{clan.pubgClanTag}]
              </span>
            )}
            <span className="font-semibold text-gray-900 truncate">
              {clan.name}
            </span>
            {clan.pubgClanLevel && (
              <span className="text-xs text-gray-400">Lv.{clan.pubgClanLevel}</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            {clan.region && (
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {clan.region}
              </span>
            )}
          </div>
          {/* 모바일: 숨겨진 정보를 대신 표시 */}
          <div className="md:hidden flex gap-3 mt-1 text-xs text-gray-500">
            <span>멤버 {clan.memberCount}명</span>
            {clan.avgScore && <span>MMR {clan.avgScore.toLocaleString()}</span>}
            {clan.mainStyle && <span>{clan.mainStyle}</span>}
          </div>
        </div>

        {/* 멤버 수 — 데스크탑만 */}
        <div className="hidden md:block text-center">
          <span className="text-sm font-medium text-gray-700">{clan.memberCount}</span>
          <span className="text-xs text-gray-400 ml-0.5">명</span>
        </div>

        {/* 플레이스타일 — 데스크탑만 */}
        <div className="hidden md:block text-center">
          {clan.mainStyle ? (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {clan.mainStyle}
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>

        {/* PKGG MMR — 데스크탑만 */}
        <div className="hidden md:block text-center">
          {clan.avgScore ? (
            <span className="text-sm font-bold" style={{ color: tier?.color }}>
              {clan.avgScore.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>

        {/* 티어 뱃지 — 데스크탑만 */}
        <div className="hidden md:flex justify-center">
          <TierBadge score={clan.avgScore} />
        </div>

        {/* 모바일: 티어 뱃지만 */}
        <div className="md:hidden flex justify-end">
          <TierBadge score={clan.avgScore} />
        </div>
      </div>
  );
}

export default function ClansDirectory() {
  const { t } = useT();

  const [clans, setClans]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [region, setRegion]     = useState('all');
  const [query, setQuery]       = useState('');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const LIMIT = 20;

  const fetchClans = useCallback(async (pg = 1, reg = region, q = search) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (reg !== 'all') params.set('region', reg);
      if (q) params.set('q', q);

      const res = await fetch(`/api/clans/directory?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setClans(data.clans || []);
      setTotal(data.total || 0);
      setPage(pg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [region, search]);

  useEffect(() => {
    fetchClans(1, region, search);
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(query);
    fetchClans(1, region, query);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Head>
        <title>클랜 디렉토리 · PKGG</title>
        <meta name="description" content="PKGG에 등록된 PUBG 클랜 목록을 MMR 랭킹 순으로 확인하세요." />
        <meta property="og:image" content="https://pk.gg/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://pk.gg/og.png" />
      </Head>

      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">🏘️ {t('clans.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('clans.subtitle')}</p>
          </div>

          {/* 필터 바 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
            {/* 지역 필터 */}
            <div className="flex gap-1.5 flex-wrap">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    region === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r === 'all' ? t('clans.region_all') : r}
                </button>
              ))}
            </div>

            {/* 검색 */}
            <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
              <input
                type="text"
                placeholder={t('clans.search_placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 border border-gray-200 rounded-lg px-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
              />
              <button
                type="submit"
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm font-semibold transition-colors"
              >
                {t('search.button')}
              </button>
            </form>
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* 헤더 행 — 데스크탑 */}
            <div className="hidden md:grid grid-cols-[3rem_1fr_8rem_6rem_7rem_8rem] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="text-center">#</div>
              <div>{t('clans.col_name')}</div>
              <div className="text-center">{t('clans.col_members')}</div>
              <div className="text-center">{t('clans.col_style')}</div>
              <div className="text-center">PKGG MMR</div>
              <div className="text-center">{t('clans.col_tier')}</div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-gray-400 text-sm">{t('clans.loading')}</div>
            ) : error ? (
              <div className="py-20 text-center text-red-400 text-sm">{error}</div>
            ) : clans.length === 0 ? (
              <div className="py-20 text-center text-gray-400 text-sm">{t('clans.empty')}</div>
            ) : (
              clans.map((clan, idx) => (
                <ClanRow
                  key={clan.name}
                  rank={(page - 1) * LIMIT + idx + 1}
                  clan={clan}
                />
              ))
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                disabled={page <= 1}
                onClick={() => fetchClans(page - 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← 이전
              </button>
              <span className="text-sm text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchClans(page + 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                다음 →
              </button>
            </div>
          )}

          {/* 총 클랜 수 */}
          {!loading && total > 0 && (
            <p className="text-xs text-gray-400 text-right mt-3">
              총 {total}개 클랜
            </p>
          )}
        </div>
      </div>
    </>
  );
}
