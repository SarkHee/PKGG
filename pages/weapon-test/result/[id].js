import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import Header from '../../../components/layout/Header';
import { useT } from '../../../utils/i18n';
import { PERSONALITY_TYPES, VECTOR_LABELS, findTopTypes, cosineSimilarity } from '../../../utils/weaponTestData';

const WEAPON_IMG = {
  'M416':         'Item_Weapon_HK416_C.png',
  'AKM':          'Item_Weapon_AK47_C.png',
  'SCAR-L':       'Item_Weapon_SCAR-L_C.png',
  'Beryl M762':   'Item_Weapon_BerylM762_C.png',
  'Groza':        'Item_Weapon_Groza_C.png',
  'G36C':         'Item_Weapon_G36C_C.png',
  'QBZ':          'Item_Weapon_QBZ95_C.png',
  'AUG A3':       'Item_Weapon_AUG_C.png',
  'SKS':          'Item_Weapon_SKS_C.png',
  'Mini14':       'Item_Weapon_Mini14_C.png',
  'SLR':          'Item_Weapon_FNFal_C.png',
  'QBU':          'Item_Weapon_QBU88_C.png',
  'MK14 EBR':     'Item_Weapon_Mk14_C.png',
  'Kar98k':       'Item_Weapon_Kar98k_C.png',
  'M24':          'Item_Weapon_M24_C.png',
  'AWM':          'Item_Weapon_AWM_C.png',
  'Mosin-Nagant': 'Item_Weapon_Mosin_C.png',
  'WIN94':        'Item_Weapon_Win1894_C.png',
  'UMP45':        'Item_Weapon_UMP_C.png',
  'Vector':       'Item_Weapon_Vector_C.png',
  'Micro UZI':    'Item_Weapon_UZI_C.png',
  'PP-19 Bizon':  'Item_Weapon_BizonPP19_C.png',
  'DP-28':        'Item_Weapon_DP28_C.png',
  'S12K':         'Item_Weapon_OriginS12_C.png',
  'S686':         'Item_Weapon_Berreta686_C.png',
  'DBS':          'Item_Weapon_DP12_C.png',
};

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const RANK_META_STYLE = [
  { rankKey: 'wt.rank1', numCls: 'text-yellow-400', borderCls: 'border-yellow-500/50 bg-yellow-500/10', shadow: 'rgba(234,179,8,0.25)' },
  { rankKey: 'wt.rank2', numCls: 'text-slate-300',  borderCls: 'border-slate-500/50 bg-slate-500/10',  shadow: 'rgba(148,163,184,0.18)' },
  { rankKey: 'wt.rank3', numCls: 'text-amber-600',  borderCls: 'border-amber-700/50 bg-amber-700/10',  shadow: 'rgba(180,83,9,0.2)'  },
];

function WeaponSlider({ weapons, type }) {
  const { t } = useT();
  const [active, setActive] = useState(0);
  const wName = weapons[active] || '';
  const img   = WEAPON_IMG[wName];
  const meta  = RANK_META_STYLE[active] || RANK_META_STYLE[0];

  return (
    <div className="rounded-2xl border border-gray-700/70 bg-gray-900 mb-6 overflow-hidden shadow-xl">
      <div className={`h-0.5 bg-gradient-to-r ${type.bgClass}`} />
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">{t('wt.weapon_header')}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${meta.borderCls} ${meta.numCls}`}>
          {t(meta.rankKey)}
        </span>
      </div>
      <div className="flex justify-center items-center px-6 py-2">
        {img ? (
          <Image
            src={`/weapons/${img}`}
            alt={wName}
            width={320}
            height={180}
            className="object-contain drop-shadow-[0_2px_20px_rgba(255,255,255,0.45)]"
            style={{ maxHeight: '160px', width: 'auto' }}
            unoptimized
          />
        ) : (
          <span className="text-7xl py-6">🔫</span>
        )}
      </div>
      <p className="text-center text-2xl font-black text-white pb-5 tracking-tight">{wName}</p>
      <div className="border-t border-gray-800 flex gap-2 p-3">
        {weapons.map((w, i) => {
          const m = RANK_META_STYLE[i];
          const isActive = i === active;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-white/10 ring-1 ring-white/20'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span className={`text-[10px] font-bold ${isActive ? m.numCls : 'text-gray-400'}`}>
                {t(m.rankKey)}
              </span>
              <span className={`text-xs font-semibold truncate w-full text-center ${isActive ? 'text-white' : 'text-gray-300'}`}>
                {w}
              </span>
              {isActive && (
                <span className="block w-4 h-0.5 rounded-full" style={{ background: type.color }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VectorRadarChart({ vector, color }) {
  const { t } = useT();
  const keys = Object.keys(VECTOR_LABELS);
  const data = {
    labels: keys.map((k) => VECTOR_LABELS[k]),
    datasets: [
      {
        label: t('wt.tendency_vector'),
        data: keys.map((k) => Math.round((vector[k] || 0) * 100)),
        backgroundColor: `${color}22`,
        borderColor: color,
        borderWidth: 2.5,
        pointBackgroundColor: color,
        pointRadius: 4,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { stepSize: 25, color: '#6b7280', font: { size: 10 }, backdropColor: 'transparent' },
        grid: { color: '#374151' },
        angleLines: { color: '#374151' },
        pointLabels: { color: '#d1d5db', font: { size: 11, weight: 'bold' } },
      },
    },
    plugins: { legend: { display: false } },
  };
  return <Radar data={data} options={options} />;
}

export default function SharedResultPage({ rowData, error }) {
  const { t } = useT();

  if (error || !rowData) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
          <div>
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-xl font-bold text-white mb-2">{t('wt.not_found')}</h1>
            <p className="text-gray-400 text-sm mb-6">{t('wt.not_found_desc')}</p>
            <Link href="/weapon-test">
              <span className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm cursor-pointer transition-colors">
                {t('wt.start_test_btn')}
              </span>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const type = PERSONALITY_TYPES.find((tp) => tp.id === rowData.resultType) || PERSONALITY_TYPES[11];
  const vector = rowData.surveyVector || {};
  const score = rowData.similarityScore || 0;
  const nickname = rowData.nickname;

  const topTraits = Object.entries(vector)
    .map(([k, v]) => ({ key: k, label: VECTOR_LABELS[k], value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // 유사 타입 상위 3개 (벡터가 있을 경우)
  const topTypes = Object.keys(vector).length > 0 ? findTopTypes(vector, 3) : [];

  const createdAt = rowData.createdAt
    ? new Date(rowData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <>
      <Head>
        <title>{`${type.name} | PUBG 무기 성향 테스트 | PKGG`}</title>
        <meta name="description" content={`${nickname ? nickname + '님의 ' : ''}PUBG 무기 성향: ${type.name} — ${type.description.slice(0, 60)}...`} />
        <meta property="og:title" content={`${type.emoji} ${type.name} | PKGG 무기 성향 테스트`} />
        <meta property="og:description" content={type.description} />
      </Head>

      <Header />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* 공유 배너 */}
          <div className="mb-5 flex items-center gap-3 px-4 py-2.5 bg-blue-950/60 border border-blue-800/50 rounded-xl">
            <span className="text-blue-400 text-sm">🔗</span>
            <span className="text-blue-300 text-sm font-medium">{t('wt.shared_banner')}</span>
            <Link href="/weapon-test">
              <span className="ml-auto text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg cursor-pointer transition-colors font-semibold">
                {t('wt.try_it')}
              </span>
            </Link>
          </div>

          {/* 결과 헤더 카드 */}
          <div className={`rounded-3xl bg-gradient-to-br ${type.bgClass} p-0.5 mb-6 shadow-2xl`}>
            <div className="bg-gray-950 rounded-[22px] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-bold"
                  style={{ color: type.color, borderColor: type.color + '60', background: type.color + '15' }}
                >
                  {type.primaryWeapon} TYPE
                </span>
                <span className="text-xs text-gray-500">{t('wt.similarity')} {Math.round(score * 100)}%</span>
                {createdAt && <span className="text-xs text-gray-600 ml-auto">{createdAt}</span>}
              </div>

              <div className="flex items-start gap-4 mb-6">
                <span className="text-6xl leading-none">{type.emoji}</span>
                <div>
                  <div className="text-sm text-gray-400 font-medium mb-1">{type.nameEn}</div>
                  <h1 className="text-3xl md:text-4xl font-black text-white">{type.name}</h1>
                  {nickname && <p className="text-sm text-gray-400 mt-1">{nickname}{t('wt.your_type_suffix')}</p>}
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-5">{type.description}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {type.strengths.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                    ✓ {s}
                  </span>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">{t('wt.play_style')}</div>
                    <p className="text-gray-300 text-xs leading-relaxed">{type.playstyle}</p>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">{t('wt.tip')}</div>
                    <p className="text-gray-300 text-xs leading-relaxed">{type.tip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 추천 무기 슬라이더 */}
          <WeaponSlider weapons={type.weapons} type={type} />

          {/* 레이더 + 특성 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📊 {t('wt.tendency_vector')}</h3>
              <div className="max-w-xs mx-auto">
                <VectorRadarChart vector={vector} color={type.color} />
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">⚡ {t('wt.top_traits')}</h3>
              <div className="space-y-3">
                {topTraits.map((t) => (
                  <div key={t.key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-300 font-medium">{t.label}</span>
                      <span className="text-xs font-bold" style={{ color: type.color }}>{Math.round(t.value * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.value * 100}%`, background: type.color }} />
                    </div>
                  </div>
                ))}
                {Object.entries(vector)
                  .filter(([k]) => !topTraits.find((t) => t.key === k))
                  .sort(([,a],[,b]) => b - a)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">{VECTOR_LABELS[k]}</span>
                        <span className="text-xs text-gray-600">{Math.round(v * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gray-600" style={{ width: `${v * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 약점 & 주의사항 */}
          {type.weaknesses && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">⚠️ 약점 & 주의사항</h3>
              <div className="flex flex-wrap gap-2">
                {type.weaknesses.map((w) => (
                  <span key={w} className="px-3 py-1 rounded-full text-xs font-semibold bg-red-950/50 text-red-400 border border-red-900/50">
                    ✗ {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 상황별 플레이 가이드 */}
          {type.situationalGuide && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📋 상황별 플레이 가이드</h3>
              <div className="space-y-3">
                {type.situationalGuide.map((guide, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <span className="text-xl flex-shrink-0 mt-0.5">{guide.icon}</span>
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wide">{guide.phase}</div>
                      <p className="text-sm text-gray-300 leading-relaxed">{guide.guide}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 팀 시너지 파트너 */}
          {type.teamSynergy && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">🤝 팀 시너지 파트너</h3>
              <div className="flex gap-3">
                {type.teamSynergy.map((id) => {
                  const partner = PERSONALITY_TYPES.find((tp) => tp.id === id);
                  if (!partner) return null;
                  return (
                    <div key={id} className="flex-1 bg-gray-800/60 rounded-xl p-4 text-center border border-gray-700/50">
                      <div className="text-3xl mb-2">{partner.emoji}</div>
                      <div className="text-sm font-bold text-gray-200">{partner.name}</div>
                      <div className="text-[10px] text-gray-500 mt-1">{partner.primaryWeapon} TYPE</div>
                      <div className="text-[10px] text-gray-600 mt-1 leading-snug">{partner.strengths[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 유사 타입 (2위·3위) */}
          {topTypes.length > 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">🔍 유사 성향 타입</h3>
              <div className="space-y-2">
                {topTypes.slice(1).map((item) => (
                  <div key={item.type.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/40">
                    <span className="text-2xl">{item.type.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-300">{item.type.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.type.nameEn} · {item.type.primaryWeapon} TYPE</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black" style={{ color: item.type.color }}>{Math.round(item.score * 100)}%</div>
                      <div className="text-[10px] text-gray-600">유사도</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="text-center">
            <Link href="/weapon-test">
              <span className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-base rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-blue-900/40">
                {t('wt.try_test')}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { id } = params;
  try {
    const { PrismaClient } = require('@prisma/client');
    if (!globalThis.__prisma) globalThis.__prisma = new PrismaClient();
    const prisma = globalThis.__prisma;
    const row = await prisma.weaponTestResult.findUnique({ where: { sessionId: id } });
    if (!row) return { props: { rowData: null, error: 'not found' } };
    return {
      props: {
        rowData: {
          id: row.id,
          sessionId: row.sessionId,
          nickname: row.nickname || null,
          platform: row.platform || null,
          resultType: row.resultType,
          resultName: row.resultName,
          similarityScore: row.similarityScore,
          surveyVector: row.surveyVector,
          createdAt: row.createdAt ? row.createdAt.toISOString() : null,
        },
        error: null,
      },
    };
  } catch (e) {
    return { props: { rowData: null, error: e.message } };
  }
}
