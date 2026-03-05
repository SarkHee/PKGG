import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import Header from '../../components/layout/Header';
import { useT } from '../../utils/i18n';
import {
  SURVEY_QUESTIONS,
  PERSONALITY_TYPES,
  VECTOR_LABELS,
  computeVector,
  findBestType,
  findTopTypes,
  generateSessionId,
} from '../../utils/weaponTestData';

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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// ─── Intro 화면 ──────────────────────────────────────────────
function IntroScreen({ onStart }) {
  const { t } = useT();
  const [nickname, setNickname] = useState('');
  const [platform, setPlatform] = useState('steam');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* 타이틀 */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🔫</div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            {t('wt.title')}
          </h1>
          <p className="text-blue-300 text-lg font-semibold">PUBG Weapon Personality Test</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-900/50 border border-blue-700/50 rounded-full">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            <span className="text-blue-300 text-sm font-medium">{t('wt.badge')}</span>
          </div>
        </div>

        {/* 설명 카드 */}
        <div className="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-6 mb-6 backdrop-blur-sm">
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            {t('wt.desc_pre')}<span className="text-blue-400 font-semibold">{t('wt.types')}</span>{t('wt.desc_post')}
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { emoji: '🎯', labelKey: 'wt.combat_style' },
              { emoji: '🔫', labelKey: 'wt.preferred_weapon' },
              { emoji: '📊', labelKey: 'wt.tendency_vector' },
            ].map((item) => (
              <div key={item.labelKey} className="bg-gray-800/60 rounded-xl p-3">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-xs text-gray-400 font-medium">{t(item.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 닉네임 입력 (선택) */}
        <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-300">{t('wt.nickname_label')}</span>
            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{t('wt.nickname_optional')}</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">{t('wt.nickname_desc')}</p>
          <div className="flex gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 flex-shrink-0"
            >
              <option value="steam">Steam</option>
              <option value="kakao">Kakao</option>
            </select>
            <input
              type="text"
              placeholder={t('wt.nickname_placeholder')}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={() => onStart(nickname.trim(), platform)}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-lg rounded-2xl transition-all duration-200 shadow-lg shadow-blue-900/40 hover:shadow-blue-800/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          {t('wt.start_btn')}
        </button>

        <p className="text-center text-gray-600 text-xs mt-4">
          {t('wt.no_login')}
        </p>
      </div>
    </div>
  );
}

// ─── 설문 화면 ────────────────────────────────────────────────
function SurveyScreen({ onComplete }) {
  const { t } = useT();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);

  const question = SURVEY_QUESTIONS[currentQ];
  const progress = ((currentQ) / SURVEY_QUESTIONS.length) * 100;

  const handleSelect = (optIdx) => {
    if (selected !== null || animating) return;
    setSelected(optIdx);

    setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        const newAnswers = [...answers, optIdx];
        if (currentQ + 1 >= SURVEY_QUESTIONS.length) {
          onComplete(newAnswers);
        } else {
          setAnswers(newAnswers);
          setCurrentQ(currentQ + 1);
          setSelected(null);
          setVisible(true);
        }
      }, 250);
    }, 350);
  };

  const optionColors = [
    { normal: 'border-gray-700 bg-gray-800/60 hover:border-blue-500 hover:bg-blue-900/30', selected: 'border-blue-500 bg-blue-900/40 ring-2 ring-blue-500/50' },
    { normal: 'border-gray-700 bg-gray-800/60 hover:border-purple-500 hover:bg-purple-900/30', selected: 'border-purple-500 bg-purple-900/40 ring-2 ring-purple-500/50' },
    { normal: 'border-gray-700 bg-gray-800/60 hover:border-emerald-500 hover:bg-emerald-900/30', selected: 'border-emerald-500 bg-emerald-900/40 ring-2 ring-emerald-500/50' },
    { normal: 'border-gray-700 bg-gray-800/60 hover:border-amber-500 hover:bg-amber-900/30', selected: 'border-amber-500 bg-amber-900/40 ring-2 ring-amber-500/50' },
  ];
  const optionLetters = ['A', 'B', 'C', 'D'];
  const letterColors = ['text-blue-400', 'text-purple-400', 'text-emerald-400', 'text-amber-400'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex flex-col">
      {/* 상단 프로그레스 */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/50 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400">
              {t('wt.q_prefix')} <span className="text-white">{currentQ + 1}</span> / {SURVEY_QUESTIONS.length}
            </span>
            <span className="text-xs text-blue-400 font-medium">{question.category}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 질문 카드 */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div
          className="max-w-lg w-full"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {/* 아이콘 + 질문 */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">{question.icon}</div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
              {question.question}
            </h2>
          </div>

          {/* 선택지 */}
          <div className="grid grid-cols-1 gap-3">
            {question.options.map((opt, idx) => {
              const isSelected = selected === idx;
              const colorSet = optionColors[idx];
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                    isSelected ? colorSet.selected : colorSet.normal
                  } ${selected !== null && !isSelected ? 'opacity-40' : ''}`}
                >
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 border border-gray-600 flex items-center justify-center text-sm font-black ${letterColors[idx]}`}>
                    {optionLetters[idx]}
                  </span>
                  <div>
                    <p className="text-white font-semibold text-sm leading-snug">{opt.text}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="ml-auto flex-shrink-0 text-white text-lg">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 로딩 화면 ───────────────────────────────────────────────
function LoadingScreen() {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const steps = [
    t('wt.step1'),
    t('wt.step2'),
    t('wt.step3'),
    t('wt.step4'),
  ];
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % steps.length), 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-900 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-3 flex items-center justify-center text-2xl">🔫</div>
        </div>
        <p className="text-white font-bold text-lg mb-2">{t('wt.analyzing')}</p>
        <p className="text-blue-400 text-sm font-medium transition-all duration-300">{steps[step]}</p>
      </div>
    </div>
  );
}

// ─── 무기 동반자 슬라이더 ────────────────────────────────────
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
      {/* 상단 컬러 라인 */}
      <div className={`h-0.5 bg-gradient-to-r ${type.bgClass}`} />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">{t('wt.weapon_header')}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${meta.borderCls} ${meta.numCls}`}>
          {t(meta.rankKey)}
        </span>
      </div>

      {/* 무기 이미지 */}
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

      {/* 무기 이름 */}
      <p className="text-center text-2xl font-black text-white pb-5 tracking-tight">{wName}</p>

      {/* 하단 탭 네비게이터 */}
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

// ─── 레이더 차트 ─────────────────────────────────────────────
function VectorRadarChart({ vector, color }) {
  const { t } = useT();
  const keys = Object.keys(VECTOR_LABELS);
  const data = {
    labels: keys.map((k) => VECTOR_LABELS[k]),
    datasets: [
      {
        label: t('wt.my_tendency'),
        data: keys.map((k) => Math.round((vector[k] || 0) * 100)),
        backgroundColor: `${color}22`,
        borderColor: color,
        borderWidth: 2.5,
        pointBackgroundColor: color,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        min: 0,
        max: 100,
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

// ─── 결과 화면 ────────────────────────────────────────────────
function ResultScreen({ result, nickname, sessionId, onRestart }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const { type, score, vector } = result;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/weapon-test/result/${sessionId}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 상위 3개 특성
  const topTraits = Object.entries(vector)
    .map(([k, v]) => ({ key: k, label: VECTOR_LABELS[k], value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // 유사 타입 상위 3개 (1위 = 현재 결과)
  const topTypes = findTopTypes(vector, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* 결과 헤더 카드 */}
        <div className={`rounded-3xl bg-gradient-to-br ${type.bgClass} p-0.5 mb-6 shadow-2xl`}>
          <div className="bg-gray-950 rounded-[22px] p-6 md:p-8">
            {/* 배지 */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 border ${type.borderClass} rounded-full text-xs font-bold`}
                style={{ color: type.color, borderColor: type.color + '60', background: type.color + '15' }}>
                {type.primaryWeapon} TYPE
              </span>
              <span className="text-xs text-gray-500">{t('wt.similarity')} {Math.round(score * 100)}%</span>
            </div>

            {/* 타입 이름 */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-6xl leading-none">{type.emoji}</span>
              <div>
                <div className="text-sm text-gray-400 font-medium mb-1">{type.nameEn}</div>
                <h1 className="text-3xl md:text-4xl font-black text-white">{type.name}</h1>
                {nickname && (
                  <p className="text-sm text-gray-400 mt-1">{nickname}{t('wt.your_type_suffix')}</p>
                )}
              </div>
            </div>

            {/* 설명 */}
            <p className="text-gray-300 leading-relaxed mb-6">{type.description}</p>

            {/* 강점 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {type.strengths.map((s) => (
                <span key={s} className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                  ✓ {s}
                </span>
              ))}
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-800 pt-5">
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

        {/* 레이더 차트 + 상위 특성 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📊 {t('wt.tendency_vector')}</h3>
            <div className="max-w-xs mx-auto">
              <VectorRadarChart vector={vector} color={type.color} />
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">⚡ {t('wt.top_traits')}</h3>
            <div className="space-y-3">
              {topTraits.map((t, i) => (
                <div key={t.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-300 font-medium">{t.label}</span>
                    <span className="text-xs font-bold" style={{ color: type.color }}>{Math.round(t.value * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${t.value * 100}%`, background: type.color }}
                    />
                  </div>
                </div>
              ))}
              {/* 전체 특성 */}
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
              {topTypes.slice(1).map((item, i) => (
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

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            {copied ? t('wt.link_copied') : t('wt.share_result')}
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all text-sm border border-gray-700"
          >
            {t('wt.restart')}
          </button>
        </div>

        {/* 다른 타입 미리보기 */}
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">{t('wt.other_types')}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {PERSONALITY_TYPES.filter((t) => t.id !== type.id).map((t) => (
              <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center opacity-60 hover:opacity-100 transition-opacity cursor-default">
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="text-xs text-gray-400 font-semibold leading-tight">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function WeaponTestPage() {
  const { t } = useT();
  const [phase, setPhase] = useState('intro'); // 'intro' | 'survey' | 'loading' | 'result'
  const [nickname, setNickname] = useState('');
  const [result, setResult] = useState(null);
  const [sessionId, setSessionId] = useState('');

  const handleStart = (nick, platform) => {
    setNickname(nick);
    setPhase('survey');
  };

  const handleSurveyComplete = async (answers) => {
    setPhase('loading');
    const vector = computeVector(answers);
    const { type, score } = findBestType(vector);
    const sid = generateSessionId();
    setSessionId(sid);
    setResult({ type, score, vector });

    // DB 저장 (비동기, 실패해도 결과는 보여줌)
    try {
      await fetch('/api/weapon-test/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          nickname: nickname || null,
          platform: 'steam',
          resultType: type.id,
          resultName: type.name,
          similarityScore: score,
          surveyVector: vector,
        }),
      });
    } catch (e) {
      console.warn('결과 저장 실패:', e.message);
    }

    // 로딩 최소 1.5초
    setTimeout(() => setPhase('result'), 1500);
  };

  const handleRestart = () => {
    setPhase('intro');
    setResult(null);
    setNickname('');
    setSessionId('');
  };

  return (
    <>
      <Head>
        <title>{t('wt.title')} | PKGG</title>
        <meta name="description" content="12문항으로 알아보는 나의 PUBG 무기 성향! 12가지 타입 중 나는 어떤 타입일까?" />
        <meta property="og:title" content="PUBG 무기 성향 테스트 | PKGG" />
        <meta property="og:description" content="12문항으로 알아보는 나의 PUBG 무기 성향! 12가지 타입 중 나는 어떤 타입일까?" />
      </Head>

      {phase !== 'survey' && <Header />}

      {phase === 'intro' && <IntroScreen onStart={handleStart} />}
      {phase === 'survey' && <SurveyScreen onComplete={handleSurveyComplete} />}
      {phase === 'loading' && <LoadingScreen />}
      {phase === 'result' && result && (
        <ResultScreen
          result={result}
          nickname={nickname}
          sessionId={sessionId}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
