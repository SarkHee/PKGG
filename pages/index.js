// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/layout/Header';
import AdUnit from '../components/AdUnit';
import { useT } from '../utils/i18n';
import { MAJOR, TYPES } from '../utils/playstyleClassifier';
import { getMMRTier } from '../utils/mmrCalculator';

const FAV_KEY      = 'pkgg_favorites';
const SEARCH_KEY   = 'pkgg_recent_searches';
const FORTUNE_KEY  = 'pkgg_fortune_date';

const FORTUNES = [
  '오늘은 에란겔에서 치킨이 올 날입니다',
  '팀원을 믿으세요. 오늘만큼은요.',
  '저격 대신 돌진을 선택하는 날입니다',
  '오늘 봇킬이 유독 많아도 기죽지 마세요',
  '블루존이 유독 빨리 좁혀오는 날입니다. 준비하세요',
  '오늘 밀리샥에서 드랍하면 치킨이 기다립니다',
  '팀원이 먼저 쓰러져도 포기하지 마세요',
  '오늘은 스나이퍼의 날입니다. 고지를 점령하세요',
  '수류탄을 아끼지 마세요. 오늘은 터뜨리는 날',
  '오늘 차량 운전은 팀원에게 맡기세요',
  '엎드리면 살고 일어서면 죽는 날입니다',
  '오늘은 북산사가 부릅니다. 드랍해보세요',
  '조용히 생존하는 것이 오늘의 전략입니다',
  '오늘 당신의 에임은 평소보다 10% 향상됩니다',
  '섬 맵에서 보트를 타면 행운이 옵니다',
  '오늘은 클랜원과 함께할 때 시너지가 폭발합니다',
  '첫 번째 교전에서 살아남으면 치킨이 보입니다',
  '오늘 그 자리에 있으면 안 됩니다. 이동하세요',
  '판단보다 직감을 믿으세요. 오늘만큼은요',
  '오늘은 UMP45가 당신을 치킨으로 이끕니다',
  '드랍존을 바꾸면 새로운 운이 열립니다',
  '오늘 당신의 팀원은 최고의 동료가 될 것입니다',
  '인내심을 가지세요. 치킨은 기다리는 자에게 옵니다',
  '오늘 블루존 끝에 서있으면 안 됩니다',
  '지금 당장 배그를 켜세요. 오늘이 바로 그 날입니다',
]

const TIPS = [
  '블루존 3페이즈 이후엔 차량보다 도보가 유리해요',
  '수류탄은 문 앞에서 쿡킹 후 던지면 효과적이에요',
  '에란겔 밀타는 저격 포인트가 많아요. 스모크 활용하세요',
  '차량 탑승 시 조수석이 사격하기 더 유리해요',
  '블루존 피해는 레벨3 장갑이 있어도 무시할 수 없어요',
  '건물 진입 전 수류탄 먼저 던지는 습관을 들이세요',
  '배낭 레벨이 높을수록 탄약을 더 많이 챙길 수 있어요',
  '헤드샷 피해량은 일반 피해량의 2배예요',
  '엎드린 상태에서 사격하면 반동이 줄어들어요',
  '소음기는 총소리뿐만 아니라 총구 화염도 줄여줘요',
]

const AR_SMG = [
  { name: 'M416',        type: 'AR',  desc: '부착물 5종 지원, 최고의 범용 AR' },
  { name: 'AKM',         type: 'AR',  desc: '강력한 7.62mm 단발 데미지' },
  { name: 'SCAR-L',      type: 'AR',  desc: '안정적인 반동의 밸런스형 AR' },
  { name: 'Beryl M762',  type: 'AR',  desc: '높은 DPS의 근거리 최강 AR' },
  { name: 'AUG A3',      type: 'AR',  desc: '낮은 수직 반동, 장거리까지 커버' },
  { name: 'G36C',        type: 'AR',  desc: '다재다능한 5.56mm AR' },
  { name: 'ACE32',       type: 'AR',  desc: '안정적인 5.56mm 완전자동 AR' },
  { name: 'FAMAS',       type: 'AR',  desc: '900RPM 3점사로 폭발적인 근거리 딜' },
  { name: 'Mk47 Mutant', type: 'AR',  desc: '반자동·2점사 전환 가능한 7.62mm AR' },
  { name: 'UMP45',       type: 'SMG', desc: '부착물 풍부, 중거리까지 안정적인 SMG' },
  { name: 'Vector',      type: 'SMG', desc: '1100RPM 근접전 최강의 SMG' },
  { name: 'Tommy Gun',   type: 'SMG', desc: '50발 대용량 .45 ACP SMG' },
  { name: 'MP5K',        type: 'SMG', desc: '빠른 핸들링의 9mm SMG' },
  { name: 'JS9',         type: 'SMG', desc: '신형 9mm SMG, 빠른 연사력' },
  { name: 'P90',         type: 'SMG', desc: '40발 탄창의 5.7mm 고연사 SMG' },
]

const SR_DMR_SGN = [
  { name: 'Kar98k',    type: 'SR',    desc: '헬멧 미착용 적 1발 처치, 가장 대중적인 SR' },
  { name: 'M24',       type: 'SR',    desc: '빠른 볼트 속도와 안정적인 7.62mm SR' },
  { name: 'Win94',     type: 'SR',    desc: '레버액션 .45 ACP, 빠른 연사의 SR' },
  { name: 'AWM',       type: 'SR',    desc: '레벨3 헬멧 관통, 에어드롭 최강의 SR' },
  { name: 'Mini14',    type: 'DMR',   desc: '낮은 반동, 장거리 교전에 강한 DMR' },
  { name: 'SKS',       type: 'DMR',   desc: '넉넉한 탄창과 안정적인 7.62mm DMR' },
  { name: 'SLR',       type: 'DMR',   desc: '높은 단발 데미지의 7.62mm DMR' },
  { name: 'Mk12',      type: 'DMR',   desc: '20발 탄창의 5.56mm DMR' },
  { name: 'VSS',       type: 'DMR',   desc: '소음장치 내장, 은밀한 중거리 제압' },
  { name: 'Dragunov',  type: 'DMR',   desc: '반동 개선된 7.62mm 반자동 DMR' },
  { name: 'Mk14 EBR',  type: 'DMR',   desc: '에어드롭 전용, 자동 전환 가능 최강 DMR' },
  { name: 'S686',      type: '샷건',  desc: '이중 총신 2발 순간 딜, 근접전 특화' },
  { name: 'S12K',      type: '샷건',  desc: '반자동 샷건, 건물 진입 제압에 최적' },
  { name: 'O12',       type: '샷건',  desc: '단일 피해량 100, 반자동 고데미지 샷건' },
  { name: 'DBS',       type: '샷건',  desc: '14발 탄창, 에어드롭 전용 최강 샷건' },
]

function getTodayIndex(arr) {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return seed % arr.length
}

function FortuneModal({ onClose }) {
  const fortune = FORTUNES[getTodayIndex(FORTUNES)]
  const tip     = TIPS[getTodayIndex(TIPS)]
  const weapon1 = AR_SMG[getTodayIndex(AR_SMG)]
  const weapon2 = SR_DMR_SGN[getTodayIndex(SR_DMR_SGN)]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #12082a 0%, #0f172a 60%, #0a1628 100%)',
          border: '1px solid rgba(127,119,221,0.4)',
          boxShadow: '0 0 60px rgba(127,119,221,0.25), 0 25px 50px rgba(0,0,0,0.7)',
          animation: 'fortuneIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* 상단 헤더 */}
        <div style={{ background: 'linear-gradient(90deg, rgba(127,119,221,0.2) 0%, rgba(168,85,247,0.15) 100%)', borderBottom: '1px solid rgba(127,119,221,0.25)', padding: '18px 20px 14px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 28, lineHeight: 1 }}>🥠</span>
              <div>
                <div style={{ color: '#A5A0F0', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Fortune Cookie</div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>오늘의 배그 운세</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
            >✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 운세 */}
          <div style={{ background: 'rgba(127,119,221,0.1)', border: '1px solid rgba(127,119,221,0.3)', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ color: '#A5A0F0', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>🥠 오늘의 운세</div>
            <div style={{ color: 'white', fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>"{fortune}"</div>
          </div>

          {/* 팁 */}
          <div style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ color: '#67E8F9', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 7, textTransform: 'uppercase' }}>💡 오늘의 팁</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.55 }}>{tip}</div>
          </div>

          {/* 추천 무기 */}
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ color: '#FCD34D', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>🎯 오늘의 추천 무기</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'rgba(147,197,253,0.08)', border: '1px solid rgba(147,197,253,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ color: '#93C5FD', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' }}>🔫 1번 무기 · {weapon1.type}</div>
                <div style={{ color: 'white', fontSize: 17, fontWeight: 900, marginBottom: 3 }}>{weapon1.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.4 }}>{weapon1.desc}</div>
              </div>
              <div style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ color: '#86EFAC', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' }}>🎯 2번 무기 · {weapon2.type}</div>
                <div style={{ color: 'white', fontSize: 17, fontWeight: 900, marginBottom: 3 }}>{weapon2.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.4 }}>{weapon2.desc}</div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ width: '100%', padding: '12px', background: 'rgba(127,119,221,0.2)', border: '1px solid rgba(127,119,221,0.4)', borderRadius: 14, color: '#A5A0F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(127,119,221,0.35)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(127,119,221,0.2)'; e.currentTarget.style.color = '#A5A0F0' }}
          >닫기</button>
        </div>
      </div>
    </div>
  )
}

const STYLE_LABEL = {
  HYPER_CARRY: '하이퍼 캐리', ASSAULT: '공격형', SNIPER: '스나이퍼', SUPPORT: '서포터',
  LURKER: '잠복형', RUSHER: '러셔', DEFENSIVE: '수비형', BALANCED: '밸런스형',
  SCOUT: '스카우트', TACTICAL: '전술형', PRECISION_SNIPER: '정밀 사수', EARLY_RUSHER: '초반 러셔',
  TACTICAL_LEADER: '전술 리더', UNKNOWN: '분석 중',
}

function PlayerResultCard({ result, onClose }) {
  const { shard, nickname, clanName, clanTag, stats } = result
  const tier = stats?.mmr ? getMMRTier(stats.mmr) : null
  const styleLabel = stats?.style ? (STYLE_LABEL[stats.style] || stats.style) : null
  const lastUpdated = stats?.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : null
  const playerUrl = `/player/${shard}/${encodeURIComponent(nickname)}`

  return (
    <div className="mt-3 bg-[#0b1120] border border-blue-500/25 rounded-2xl p-4 animate-in fade-in">
      <div className="flex items-start gap-3 mb-3">
        {/* 아바타 */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
          {nickname.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-base leading-tight">{nickname}</span>
            {clanTag && <span className="text-xs text-gray-500">[{clanTag}]</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${SHARD_COLOR[shard] || 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
              {SHARD_LABEL[shard] || shard}
            </span>
          </div>
          {tier && stats?.mmr ? (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold mt-1 ${tier.bgColor} ${tier.borderColor}`}>
              <span>{tier.emoji}</span>
              <span className={tier.textColor}>{stats.mmr.toLocaleString()} PK · {tier.label}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-600 mt-1">스탯 정보 없음</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-lg flex-shrink-0">×</button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: '평균딜', value: Math.round(stats.avgDamage || 0).toLocaleString(), color: 'text-blue-300' },
            { label: 'K/D',   value: (stats.avgKills || 0).toFixed(2),                   color: 'text-cyan-300' },
            { label: '승률',  value: (stats.winRate || 0).toFixed(1) + '%',               color: 'text-yellow-300' },
            { label: 'Top10', value: (stats.top10Rate || 0).toFixed(1) + '%',             color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl px-2 py-2 text-center">
              <p className="text-[9px] text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {styleLabel && <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">🧠 {styleLabel}</span>}
          {clanName && <span className="text-[10px] text-purple-400">👥 {clanName}</span>}
          {lastUpdated && <span className="text-[10px] text-gray-600">{lastUpdated} 기준</span>}
        </div>
        <Link href={playerUrl} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
          전적 보기 →
        </Link>
      </div>
    </div>
  )
}
const MAX_RECENT = 8;


function FaqItem({ q, a }) {
  return (
    <div className="bg-white/5 border border-blue-500/10 rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">{q}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function loadFavs() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SEARCH_KEY) || '[]'); } catch { return []; }
}

function saveRecentSearch(nickname, shard) {
  const list = loadRecentSearches().filter(
    (s) => !(s.nickname.toLowerCase() === nickname.toLowerCase() && s.shard === shard)
  );
  list.unshift({ nickname, shard, ts: Date.now() });
  localStorage.setItem(SEARCH_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

const SHARD_LABEL = { steam: '🎮 Steam', kakao: '🟡 카카오', psn: '🎯 PS', xbox: '🎯 Xbox', console: '🎯 Console' }
const SHARD_COLOR = {
  steam: 'bg-[#1b2838] text-[#4a9eff] border border-[#4a9eff]/40',
  kakao: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  psn: 'bg-blue-800/40 text-blue-300 border border-blue-500/40',
  xbox: 'bg-green-800/40 text-green-300 border border-green-500/40',
  console: 'bg-blue-800/40 text-blue-300 border border-blue-500/40',
}

const WEAPON_DESC = {
  'M416':       '부착물 5종을 모두 지원하는 5.56mm 올라운더 AR. 안정적인 반동과 범용성으로 가장 많이 선택되는 주력 소총.',
  'AKM':        '높은 단발 데미지(48)를 자랑하는 7.62mm AR. 근거리 제압력이 뛰어나지만 반동 제어가 까다롭다.',
  'SCAR-L':     '안정적인 반동 패턴을 가진 5.56mm AR. 초보자부터 상급자까지 고르게 사용하는 밸런스형 소총.',
  'AUG A3':     '높은 안정성과 정확도를 자랑하는 에어드롭 전용 5.56mm AR. 수직 반동이 낮아 장거리 교전에도 강하다.',
  'Beryl M762': '강력한 근거리 제압력을 가진 7.62mm AR. 높은 DPS(484)로 근접전에서 압도적이나 반동이 크다.',
  'Kar98k':     '헬맷 미착용 적을 1발로 처치하는 볼트액션 7.62mm SR. 공중 보급 없이도 쓸 수 있는 최강의 SR.',
  'UMP':        '넓은 부착물 지원과 뛰어난 기동성을 갖춘 .45 ACP SMG. 중근거리에서도 안정적으로 운용 가능.',
  'Mini14':     '빠른 연사(330RPM)와 낮은 반동을 가진 5.56mm DMR. 장거리 교전에서 탄 소비 효율이 우수하다.',
  'AWM':        'PUBG 최고 데미지(105)를 자랑하는 .300 Mag 볼트액션 SR. 에어드롭 전용으로 레벨3 헬맷도 관통한다.',
  'M24':        'K98k보다 연사가 빠른 7.62mm 볼트액션 SR. 실력자들이 선호하는 오픈 필드 원거리 주력 저격총.',
  'Groza':      '에어드롭 전용 7.62mm AR. 높은 DPS(564)와 빠른 연사력(750RPM)으로 근거리 교전 시 압도적.',
  'VSS':        '소음장치 내장의 9mm DMR. 적에게 위치를 노출하지 않고 중거리를 제압하는 독특한 운용 스타일.',
  'DP-28':      '47발 대용량 탄창을 가진 7.62mm LMG. 오버히팅 없이 지속 사격이 가능해 건물 진입 제압에 강하다.',
  'Vector':     '가장 빠른 연사력(1100RPM)을 가진 .45 ACP SMG. 근거리 CQC에서 극강의 순간 딜을 선보인다.',
  'Mk14 EBR':   '완전자동 전환이 가능한 7.62mm DMR. 단발로는 장거리, 자동으로는 근거리까지 커버하는 에어드롭 최강 무기.',
};

export default function Home({ weaponMeta = [], topClans = [], patchNotes = [], mapRotation = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMajor, setActiveMajor] = useState('OFFENSIVE');
  const [activeType, setActiveType]   = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [favorites, setFavorites]           = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown]     = useState(false);
  const [isSearching, setIsSearching]       = useState(false);
  const [navigating, setNavigating]         = useState(false);
  const [searchCard, setSearchCard]         = useState(null);
  const [mounted, setMounted]               = useState(false);

  // 포춘쿠키 상태
  const [cookieAnim, setCookieAnim] = useState('idle'); // idle | shaking | cracking
  const [showFortune, setShowFortune] = useState(false);

  const searchBoxRef = useRef(null);
  const router = useRouter();
  const { t } = useT();

  // 즐겨찾기 + 최근 검색 로드 (클라이언트 전용)
  useEffect(() => {
    setFavorites(loadFavs());
    setRecentSearches(loadRecentSearches());
    setMounted(true);

    // 오늘 처음 방문 시 자동 팝업
    const today = new Date().toISOString().slice(0, 10);
    const last  = localStorage.getItem(FORTUNE_KEY);
    if (last !== today) {
      const timer = setTimeout(() => {
        setCookieAnim('shaking');
        setTimeout(() => {
          setCookieAnim('cracking');
          setTimeout(() => {
            setCookieAnim('idle');
            setShowFortune(true);
            localStorage.setItem(FORTUNE_KEY, today);
          }, 500);
        }, 600);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCookieClick = () => {
    if (cookieAnim !== 'idle') return;
    if (showFortune) return;
    setCookieAnim('shaking');
    setTimeout(() => {
      setCookieAnim('cracking');
      setTimeout(() => {
        setCookieAnim('idle');
        setShowFortune(true);
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(FORTUNE_KEY, today);
      }, 500);
    }, 600);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const removeFavorite = (nickname, shard) => {
    const next = loadFavs().filter(f => !(f.nickname === nickname && f.shard === shard));
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    setFavorites(next);
  };

  // URL 파라미터에서 검색 실패 메시지 확인
  useEffect(() => {
    if (router.query.searchFailed) {
      setSearchMessage(t('search.not_found'));
      setTimeout(() => setSearchMessage(''), 5000);
    }
  }, [router.query, t]);

  // 검색 → 플랫폼 지정 1회 호출 → 확인 카드 표시
  useEffect(() => {
    const handleDone = () => setNavigating(false);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);

  const handleSearch = async (nick = searchTerm) => {
    const name = nick.trim();
    if (!name) return;
    setSearchMessage('');
    setSearchCard(null);
    setShowDropdown(false);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/pubg/search?nickname=${encodeURIComponent(name)}`);
      const data = await res.json();
      const r = data?.results?.[0];
      if (data?.retry) {
        setSearchMessage('서버 연결 중입니다. 잠시 후 다시 시도해주세요.');
      } else if (!r) {
        setSearchMessage(`"${name}" 플레이어를 찾을 수 없습니다.`);
      } else {
        saveRecentSearch(r.nickname, r.shard);
        setNavigating(true);
        router.push(`/player/${r.shard}/${encodeURIComponent(r.nickname)}`);
      }
    } catch {
      setSearchMessage('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDirectNavigate = (nickname, shard) => {
    setShowDropdown(false);
    setSearchCard(null);
    saveRecentSearch(nickname, shard);
    setRecentSearches(loadRecentSearches());
    router.push(`/player/${shard}/${encodeURIComponent(nickname)}`);
  };

  const removeRecentSearch = (nickname, shard, e) => {
    e.stopPropagation();
    const list = loadRecentSearches().filter(
      (s) => !(s.nickname.toLowerCase() === nickname.toLowerCase() && s.shard === shard)
    );
    localStorage.setItem(SEARCH_KEY, JSON.stringify(list));
    setRecentSearches(list);
  };

  const clearAllRecent = (e) => {
    e.stopPropagation();
    localStorage.setItem(SEARCH_KEY, '[]');
    setRecentSearches([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') { setShowDropdown(false); }
  };

  return (
    <>
      {/* 포춘쿠키 CSS 애니메이션 */}
      <style>{`
        @keyframes cookieShake {
          0%   { transform: rotate(0deg) scale(1); }
          10%  { transform: rotate(-8deg) scale(1.05); }
          20%  { transform: rotate(8deg) scale(1.08); }
          30%  { transform: rotate(-10deg) scale(1.1); }
          40%  { transform: rotate(10deg) scale(1.08); }
          50%  { transform: rotate(-6deg) scale(1.05); }
          60%  { transform: rotate(6deg) scale(1.03); }
          80%  { transform: rotate(-3deg) scale(1.01); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes cookieCrack {
          0%   { transform: scale(1); }
          20%  { transform: scale(1.3); filter: drop-shadow(0 0 30px rgba(245,158,11,1)); }
          50%  { transform: scale(1.45) rotate(6deg); filter: drop-shadow(0 0 40px rgba(245,158,11,0.9)); }
          80%  { transform: scale(0.9) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
        }
        @keyframes fortuneIn {
          0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tabPulse {
          0%, 100% { box-shadow: -4px 0 18px rgba(127,119,221,0.25); }
          50%       { box-shadow: -4px 0 28px rgba(127,119,221,0.5); }
        }
        @keyframes tabBounce {
          0%, 100% { transform: translateY(-50%) translateX(0); }
          50%       { transform: translateY(-50%) translateX(-4px); }
        }
      `}</style>

      {/* ── 오른쪽 고정 포춘쿠키 탭 ── */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 9990,
          animation: cookieAnim === 'idle' ? 'tabBounce 3s ease-in-out infinite' : 'none',
        }}
      >
        <button
          onClick={handleCookieClick}
          disabled={cookieAnim !== 'idle'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'linear-gradient(160deg, #2d1b6e 0%, #1a0d4e 100%)',
            border: '1px solid rgba(127,119,221,0.55)',
            borderRight: 'none',
            borderRadius: '14px 0 0 14px',
            padding: '14px 11px',
            cursor: cookieAnim !== 'idle' ? 'default' : 'pointer',
            boxShadow: '-4px 0 18px rgba(127,119,221,0.25), inset 1px 0 0 rgba(255,255,255,0.05)',
            animation: cookieAnim === 'idle' ? 'tabPulse 3s ease-in-out infinite' : 'none',
            transition: 'background 0.2s',
            minWidth: 42,
          }}
          onMouseEnter={(e) => { if (cookieAnim === 'idle') e.currentTarget.style.background = 'linear-gradient(160deg, #3d2b8e 0%, #2a1d6e 100%)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(160deg, #2d1b6e 0%, #1a0d4e 100%)'; }}
        >
          {/* 쿠키 이모지 (애니메이션 적용) */}
          <span
            style={{
              fontSize: 22,
              lineHeight: 1,
              display: 'block',
              animation: cookieAnim === 'shaking'
                ? 'cookieShake 0.6s ease-in-out'
                : cookieAnim === 'cracking'
                ? 'cookieCrack 0.5s ease-out forwards'
                : 'none',
              transformOrigin: 'center',
            }}
          >🥠</span>

          {/* 세로 텍스트 */}
          <span
            style={{
              writingMode: 'vertical-lr',
              color: 'rgba(165,160,240,0.85)',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1.5,
              userSelect: 'none',
            }}
          >운세</span>
        </button>
      </div>

      {/* 포춘쿠키 모달 */}
      {showFortune && <FortuneModal onClose={() => setShowFortune(false)} />}

      {navigating && (
        <div className="fixed inset-0 z-[9999] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-gray-900 border border-gray-700 rounded-2xl px-10 py-8 shadow-2xl">
            <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">플레이어 데이터 로딩 중...</span>
          </div>
        </div>
      )}
      <Head>
        <title>{t('home.meta_title')}</title>
        <meta name="description" content={t('home.meta_desc')} />
        <meta name="keywords" content="PUBG 전적조회, 배틀그라운드 전적, 배그 통계, PUBG 클랜 분석, PUBG MMR, 배그 랭크, 배그 킬뎀, 배그 시즌 통계, 배그 무기, 배그 플레이스타일, 배그 에임 트레이너, PKGG, pk.gg, pubg stats, pubg tracker" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PKGG" />

        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="PKGG" />
        <meta property="og:url" content="https://pkgg.vercel.app/" />
        <meta property="og:title" content={t('home.meta_title')} />
        <meta property="og:description" content={t('home.meta_desc')} />
        <meta property="og:image" content="https://pkgg.vercel.app/og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PKGG - PUBG 전적조회 & 클랜 분석 플랫폼" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('home.meta_title')} />
        <meta name="twitter:description" content={t('home.meta_desc')} />
        <meta name="twitter:image" content="https://pkgg.vercel.app/og.png" />
        <meta name="twitter:image:alt" content="PKGG - PUBG 전적조회 & 클랜 분석 플랫폼" />

        <link rel="canonical" href="https://pkgg.vercel.app/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "PKGG",
            "alternateName": "PK.GG",
            "url": "https://pkgg.vercel.app",
            "description": "PUBG(배틀그라운드) 플레이어 전적 조회, 클랜 분석, 무기 성향 테스트, 에임 트레이너 무료 제공",
            "inLanguage": "ko-KR",
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": "https://pkgg.vercel.app/player/steam/{search_term_string}" },
              "query-input": "required name=search_term_string"
            }
          })}}
        />
      </Head>

      <div className="min-h-screen text-white relative overflow-hidden" style={{ background: '#060614' }}>
        {/* 오로라 그라디언트 배경 */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* 파랑 오로라 */}
          <div
            className="absolute rounded-full"
            style={{
              width: '70vw',
              height: '70vw',
              top: '-15%',
              left: '-10%',
              background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'aurora1 18s ease-in-out infinite alternate',
            }}
          />
          {/* 보라 오로라 */}
          <div
            className="absolute rounded-full"
            style={{
              width: '60vw',
              height: '60vw',
              top: '10%',
              right: '-10%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
              filter: 'blur(70px)',
              animation: 'aurora2 22s ease-in-out infinite alternate',
            }}
          />
          {/* 청록 오로라 */}
          <div
            className="absolute rounded-full"
            style={{
              width: '55vw',
              height: '55vw',
              bottom: '-10%',
              left: '20%',
              background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, transparent 70%)',
              filter: 'blur(65px)',
              animation: 'aurora3 26s ease-in-out infinite alternate',
            }}
          />
        </div>

        {/* 헤더 */}
        <Header />

        {/* 메인 콘텐츠 */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-3 pt-20 pb-10 sm:pt-24 sm:pb-16 sm:py-20">
          <div className="text-center w-full max-w-4xl mx-auto mb-6 sm:mb-16">

            {/* 배경 글로우 */}
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: '12%', zIndex: -1 }}>
              <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }} />
            </div>

            {/* 배지 */}
            <div className="mb-4 sm:mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] sm:text-xs font-bold tracking-widest text-blue-400 uppercase">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                PUBG Stats &amp; Analytics
              </span>
            </div>
            {/* 로고 */}
            <h1 className="mb-4 sm:mb-6">
              <Image
                src="/logo.png"
                alt="PKGG"
                width={518}
                height={295}
                className="w-44 sm:w-80 md:w-[460px] h-auto mx-auto"
                style={{ filter: 'drop-shadow(0 0 36px rgba(59,130,246,0.55)) drop-shadow(0 6px 18px rgba(0,0,0,0.6))' }}
                priority
              />
            </h1>

            {/* 서브타이틀 */}
            <p className="text-base sm:text-xl font-semibold text-white/75 mb-1 max-w-xl mx-auto leading-relaxed px-2">
              {t('home.subtitle')}
            </p>
            <p className="text-xs text-yellow-400/70 mb-4 sm:mb-6">
              다음 시즌부터 봇 킬 제외 순수 실력 데이터 제공
            </p>

{/* 검색 메시지 알림 */}
            {searchMessage && (
              <div className="mb-6 max-w-xl mx-auto px-4">
                <div className="bg-orange-500/20 border border-orange-500/50 text-orange-300 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-2 justify-center">
                    <span>⚠️</span>
                    <p className="text-sm font-medium">{searchMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 검색 섹션 */}
            <div className="w-full max-w-xl mx-auto px-0 sm:px-4 mb-4" ref={searchBoxRef}>
              <div className="bg-white/5 backdrop-blur-md border border-blue-500/20 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-blue-900/30">

                {/* 닉네임 입력 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="닉네임 입력 (최초 검색 유저는 대소문자 구분 필요)"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setSearchCard(null); if (!e.target.value) setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    autoComplete="off"
                  />
                  <button
                    onClick={() => handleSearch()}
                    disabled={isSearching || !searchTerm.trim()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-600/30 flex items-center gap-2 text-sm"
                  >
                    {isSearching
                      ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    }
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>


                {/* 최근 검색 드롭다운 */}
                {showDropdown && recentSearches.length > 0 && (
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">🕐 최근 검색</span>
                      <button onClick={clearAllRecent} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">전체 삭제</button>
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches
                        .filter((s) => !searchTerm || s.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((s) => (
                          <div
                            key={`${s.shard}-${s.nickname}`}
                            onClick={() => handleDirectNavigate(s.nickname, s.shard)}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer group transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-500 text-xs flex-shrink-0">🔍</span>
                              <span className="text-sm text-gray-300 truncate">{s.nickname}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${SHARD_COLOR[s.shard] || ''}`}>{SHARD_LABEL[s.shard] || s.shard}</span>
                            </div>
                            <button onClick={(e) => removeRecentSearch(s.nickname, s.shard, e)} className="text-gray-700 hover:text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-2">×</button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {/* 뱃지 */}
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {[t('home.badge1'), t('home.badge2'), t('home.badge3')].map((badge, bi) => (
                  <span key={bi} className="text-[11px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">{badge}</span>
                ))}
              </div>
            </div>

            {/* 즐겨찾기 섹션 */}
            {favorites.length > 0 && (
              <div className="max-w-xl mx-auto px-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 font-semibold tracking-wide">★ 즐겨찾기</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((fav) => (
                    <div key={`${fav.shard}-${fav.nickname}`} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1 group">
                      <button
                        onClick={() => handleDirectNavigate(fav.nickname, fav.shard)}
                        className="text-xs text-gray-300 hover:text-white transition-colors font-medium"
                      >
                        {fav.nickname}
                        <span className="ml-1 text-gray-600 text-[10px]">{fav.shard}</span>
                      </button>
                      <button
                        onClick={() => removeFavorite(fav.nickname, fav.shard)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-xs ml-0.5 opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 특징 카드 섹션 */}
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">{t('home.features')}</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* 디스코드 봇 배너 카드 */}
              <a
                href="https://discord.com/api/oauth2/authorize?client_id=1498570099689521172&permissions=274877991936&scope=bot%20applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-1 sm:col-span-2 md:col-span-3 flex items-center justify-between gap-3 px-5 py-4 rounded-xl border transition-all duration-200 hover:brightness-110 group"
                style={{ background: 'rgba(88,101,242,0.12)', borderColor: 'rgba(88,101,242,0.35)' }}
              >
                <div className="flex items-center gap-3">
                  <svg width="24" height="18" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.292408 45.3914C0.29801 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#7289da"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white leading-tight">디스코드 봇 추가하기</p>
                    <p className="text-[11px] text-[#7289da] mt-0.5">/전적 /클랜 명령어로 디스코드에서 바로 전적 조회</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-[#7289da] group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              {[
                { icon: '🤖', titleKey: 'feat.bot_title', descKey: 'feat.bot_desc', highlight: true },
                { icon: '🔥', titleKey: 'feat.live_meta_title', descKey: 'feat.live_meta_desc', highlight: true },
                { icon: '📊', titleKey: 'feat.stats_title', descKey: 'feat.stats_desc' },
                { icon: '👥', titleKey: 'feat.clan_title', descKey: 'feat.clan_desc' },
                { icon: '🏆', titleKey: 'feat.score_title', descKey: 'feat.score_desc' },
                { icon: '🎯', titleKey: 'feat.match_title', descKey: 'feat.match_desc' },
                { icon: '📈', titleKey: 'feat.rank_title', descKey: 'feat.rank_desc' },
                { icon: '⚡', titleKey: 'feat.search_title', descKey: 'feat.search_desc' },
              ].map((item) => (
                <div
                  key={item.titleKey || item.title}
                  className={`border rounded-xl p-4 hover:brightness-110 transition-all duration-200 group ${
                    item.highlight
                      ? 'bg-blue-500/8 border-blue-500/30 hover:border-blue-400/50'
                      : 'bg-white/5 border-blue-500/10 hover:border-blue-500/30 hover:bg-blue-500/5'
                  }`}
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200 inline-block">{item.icon}</div>
                  <h3 className="text-sm font-bold text-gray-200 mb-1">{item.title || t(item.titleKey)}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc || t(item.descKey)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 광고: 특징 카드 아래 — 콘텐츠 로드 후에만 노출 */}
          <AdUnit slot="1234567890" format="horizontal" className="w-full max-w-6xl mx-auto px-4 mt-6" show={mounted && !navigating} />

          {/* PKGG 플레이 분석 카드 */}
          <div className="w-full max-w-6xl mx-auto px-4 mt-8 sm:mt-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">PKGG 플레이 분석</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="bg-white/5 border border-blue-500/10 rounded-2xl p-4 sm:p-6">
              <p className="text-xs text-gray-500 text-center mb-4">
                실제 전적 데이터를 기반으로 <strong className="text-gray-300">25가지 세부 유형</strong>으로 플레이스타일을 분석합니다
              </p>
              {/* 대카테고리 탭 */}
              <div className="flex gap-2 mb-5 flex-wrap justify-center">
                {Object.entries(MAJOR).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => { setActiveMajor(key); setActiveType(null); }}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                      activeMajor === key
                        ? `${info.bg} ${info.border} ${info.color}`
                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                    }`}
                  >
                    {info.icon} {info.label}
                  </button>
                ))}
              </div>
              {/* 세부 유형 목록 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {Object.values(TYPES)
                  .filter(tp => tp.major === activeMajor && tp.label !== '❓ 분류 불가')
                  .map(tp => {
                    const isActive = activeType?.label === tp.label
                    return (
                      <button
                        key={tp.label}
                        onClick={() => setActiveType(isActive ? null : tp)}
                        className={`px-3 py-2.5 rounded-xl border text-center transition-all ${tp.bg} ${tp.border} ${
                          isActive ? 'ring-2 ring-offset-1 ring-offset-transparent opacity-100 scale-[1.03]' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={isActive ? { '--tw-ring-color': 'currentColor' } : {}}
                      >
                        <span className={`text-xs font-semibold ${tp.color}`}>{tp.label}</span>
                      </button>
                    )
                  })}
              </div>
              {/* 선택된 유형 설명 */}
              {activeType && (
                <div className={`mt-2 px-4 py-3 rounded-xl border ${activeType.bg} ${activeType.border} transition-all`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-sm font-bold ${activeType.color} flex-shrink-0`}>{activeType.label}</span>
                    <span className="text-xs text-gray-400 leading-relaxed">{activeType.desc}</span>
                  </div>
                  <div className={`mt-1.5 text-[11px] ${activeType.color} opacity-70`}>💡 {activeType.tip}</div>
                </div>
              )}
            </div>
          </div>

          {/* ─── 서버 렌더링 정적 콘텐츠 (SEO / AdSense) ─── */}
          <div className="w-full max-w-6xl mx-auto px-4 mt-10">

            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">실시간 PUBG 데이터</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* 1. 무기 메타 TOP 5 */}
              {weaponMeta.length > 0 && (
                <div className="bg-white/5 border border-blue-500/10 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-1">🔥 실시간 무기 메타 TOP 5</h2>
                  <p className="text-xs text-gray-500 mb-4">PKGG 수집 데이터 기반 킬 비중 순위</p>
                  <ol className="space-y-3">
                    {weaponMeta.map((w, i) => (
                      <li key={w.id} className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                          i === 0 ? 'bg-yellow-500 text-black' :
                          i === 1 ? 'bg-gray-400 text-black' :
                          i === 2 ? 'bg-amber-700 text-white' :
                          'bg-white/10 text-gray-400'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-200">{w.name}</span>
                            <span className="text-xs text-blue-400 font-bold">{w.pickRate}%</span>
                          </div>
                          {WEAPON_DESC[w.name] && (
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{WEAPON_DESC[w.name]}</p>
                          )}
                          <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
                            <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(100, parseFloat(w.pickRate) * 4)}%` }} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="text-[10px] text-gray-600 mt-3">※ 픽률은 전체 킬 기준 상대 비율 · 봇킬 제외</p>
                </div>
              )}

              {/* 3. 클랜 랭킹 TOP 5 */}
              {topClans.length > 0 && (
                <div className="bg-white/5 border border-blue-500/10 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-1">
                    👥 클랜 랭킹 TOP 5
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">
                    PKGG 점수(MMR) 기준 상위 클랜
                  </p>
                  <ol className="space-y-3">
                    {topClans.map((clan, i) => {
                      const masked = clan.name.length <= 2
                        ? clan.name
                        : clan.name.slice(0, 2) + '*'.repeat(clan.name.length - 2)
                      return (
                        <li key={clan.name} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            i === 0 ? 'bg-yellow-500 text-black' :
                            i === 1 ? 'bg-gray-400 text-black' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-white/10 text-gray-400'
                          }`}>{i + 1}</span>
                          <span className="flex-1 text-sm font-semibold text-gray-200 truncate">
                            {clan.pubgClanTag ? `[${clan.pubgClanTag}] ` : ''}{masked}
                          </span>
                          <span className="text-xs text-blue-400/70 flex-shrink-0">
                            {clan.shard === 'kakao' ? '카카오' : 'Steam'}
                          </span>
                          <span className="text-xs text-yellow-400 font-bold flex-shrink-0">{clan.avgScore?.toLocaleString()} PK</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )}

              {/* 4. 최신 PUBG 패치노트 */}
              {patchNotes.length > 0 && (
                <div className="md:col-span-2 bg-white/5 border border-blue-500/10 rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-1">📋 최신 PUBG 패치노트</h2>
                  <p className="text-xs text-gray-500 mb-4">주요 무기·밸런스 업데이트 요약</p>
                  <ul className="space-y-3">
                    {patchNotes.map((note, i) => (
                      <li key={i} className="border-l-2 border-blue-500/30 pl-3">
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-300 hover:text-white transition-colors leading-snug block"
                        >
                          {note.title}
                        </a>
                        <span className="text-xs text-gray-600">{note.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 5. 맵 로테이션 */}
            {mapRotation.length > 0 && (
              <div className="bg-white/5 border border-blue-500/10 rounded-2xl p-5 mt-5">
                <h2 className="text-sm font-bold text-white mb-1">🗺️ 현재 맵 로테이션</h2>
                <p className="text-xs text-gray-500 mb-4">일반 매치 기준 활성 맵 목록</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {mapRotation.map((map) => (
                    <div key={map.nameEn} className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-gray-200">{map.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{map.nameEn}</p>
                      <p className="text-[10px] text-blue-400 mt-0.5">{map.size}</p>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight text-left">{map.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* ─── 정적 콘텐츠 끝 ─── */}

          {/* PKGG란? */}
          <div className="w-full max-w-6xl mx-auto px-4 mt-8 sm:mt-14 mb-6 sm:mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">{t('about.section_title')}</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="bg-white/5 border border-blue-500/10 rounded-xl px-6 py-5 space-y-3 text-sm text-gray-400 leading-relaxed">
              <p>{t('about.p1')}</p>
              <p>{t('about.p2')}</p>
              <p>{t('about.p3')}</p>
              <p>{t('about.p4')}</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="w-full max-w-6xl mx-auto px-4 mt-4 mb-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">FAQ</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="space-y-3">
              {[1,2,3,4,5,6,7,8].map(n => (
                <FaqItem key={n} q={t(`faq.q${n}`)} a={t(`faq.a${n}`)} />
              ))}
            </div>
          </div>

          {/* 광고: FAQ 아래 — 콘텐츠 로드 후에만 노출 */}
          <AdUnit slot="0987654321" format="horizontal" className="w-full max-w-6xl mx-auto px-4 mt-6" show={mounted && !navigating} />

        </main>

      </div>
    </>
  );
}

// ── 서버사이드 렌더링 (구글 봇 크롤링용 정적 데이터) ──────────────────────
const EXCLUDE_PATTERNS = [
  /^Player(Female|Male)/i, /^UltAIPawn/i, /^TslGameMode/i, /^BP_/i,
  /^Buggy_/i, /^Dacia_/i, /^Uaz_/i, /^Boat_/i,
  /^RedZone/i, /^Bluezonebomb/i, /^Buff_/i,
  /^HR_Proj/i, /^ProjGrenade/i, /^ProjMolotov/i, /^ProjC4/i, /^ProjSticky/i,
  /^WeapGrenade/i, /^WeapMolotov/i, /^WeapFlareGun/i, /^WeapFlash/i,
  /^WeapSmoke/i, /^WeapDecoy/i, /^WeapBlue/i, /^WeapStickyGrenade/i,
  /^WeapC4/i, /^WeapMortar/i, /^WeapPanzer/i, /^WeapPan_/i,
  /^WeapMachete/i, /^WeapPickaxe/i, /^WeapSickle/i, /^WeapCow/i,
  /^WeapRock/i, /^WeapPackageFlare/i, /^WeapCoverStruct/i,
  /^WeapIntegrated/i, /^WeapTrauma/i, /^WeapTacPack/i,
  /^WeapZipline/i, /^WeapCamoNet/i, /^WeapStunGun/i, /^WeapM79/i,
  /^None$/, /^Jerrycan/, /^TslDestructible/, /^Mortar_/, /^PanzerFaust/,
]

const WEAPON_NORMALIZE = {
  vz61Skorpion: 'Skorpion', 'Mads_QBU88': 'QBU88', MadsQBU88: 'QBU88',
  Win1894: 'Win94', MosinNagant: 'Mosin', FamasG2: 'FAMASG2',
  'SCAR-L': 'SCAR_L', Crossbow_1: 'Crossbow', CowBar: 'Cowbar',
}

const WEAPON_DISPLAY = {
  M416: 'M416', AKM: 'AKM', SCAR_L: 'SCAR-L', M762: 'Beryl M762', HK416: 'HK416',
  G36C: 'G36C', QBZ: 'QBZ95', Aug: 'AUG A3', M16A4: 'M16A4', K2: 'K2',
  MG3: 'MG3', DP28: 'DP-28', M249: 'M249', Mini14: 'Mini 14', QBU88: 'QBU88',
  SLR: 'SLR', VSS: 'VSS', Mk12: 'Mk12', Mk14: 'Mk14', Dragunov: 'Dragunov',
  AWM: 'AWM', KAR98K: 'Kar98k', M24: 'M24', Mosin: 'Mosin-Nagant',
  UMP45: 'UMP45', UZI: 'Micro UZI', Vector: 'Vector', MP5K: 'MP5K',
  Bizon: 'PP-19 Bizon', Tommy: 'Tommy Gun', P90: 'P90', JS9: 'JS9',
  S12K: 'S12K', S1897: 'S1897', S686: 'S686', DBS: 'DBS',
  Skorpion: 'Skorpion', R1895: 'R1895', Win94: 'Win94',
}

function normalizeWeaponId(raw) {
  const id = raw
    .replace(/^Item_Weapon_/, '').replace(/^Weap/, '')
    .replace(/(_HR)?_C$/, '').replace(/_HR$/, '')
  return WEAPON_NORMALIZE[id] ?? id
}

export async function getServerSideProps() {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

    const [weaponRows, topClans] = await Promise.all([
      // 1. 무기 메타: 최근 30일 groupBy weaponId
      prisma.player_weapon_stats.groupBy({
        by: ['weaponId'],
        _sum: { kills: true, pickup_count: true },
        where: { match_id: { not: '' }, savedAt: { gte: thirtyDaysAgo } },
        orderBy: { _sum: { kills: 'desc' } },
        take: 120,
      }),

      // 2. 클랜 랭킹 TOP 5
      prisma.clan.findMany({
        where: { avgScore: { gt: 0 }, memberCount: { gt: 0 } },
        orderBy: { avgScore: 'desc' },
        take: 5,
        select: { name: true, avgScore: true, memberCount: true, pubgClanTag: true, region: true, shard: true },
      }),
    ])

    // 무기 집계 (제외·정규화 적용)
    const weaponMap = {}
    let totalKills = 0
    for (const r of weaponRows) {
      if (EXCLUDE_PATTERNS.some((p) => p.test(r.weaponId))) continue
      const id = normalizeWeaponId(r.weaponId)
      if (!weaponMap[id]) weaponMap[id] = { kills: 0 }
      weaponMap[id].kills += Number(r._sum.kills) || 0
      totalKills += Number(r._sum.kills) || 0
    }
    const weaponMeta = Object.entries(weaponMap)
      .sort(([, a], [, b]) => b.kills - a.kills)
      .slice(0, 5)
      .map(([id, v]) => ({
        id,
        name: WEAPON_DISPLAY[id] || id,
        kills: v.kills,
        pickRate: totalKills > 0 ? ((v.kills / totalKills) * 100).toFixed(1) : '0',
      }))

    // 패치노트 (정적)
    const patchNotes = [
      { title: 'PUBG Update 41.1 — 신규 SMG JS9 추가, 틸티드 그립 추가, 하이브리드 스코프 신규', date: '2026년 4월', url: 'https://www.pubg.com/ko/news/' },
      { title: 'PUBG Update 40.2 — Dragunov(SVD) 반동 감소, 앵글 손잡이 삭제, 하프 그립 버프', date: '2026년 2월', url: 'https://www.pubg.com/ko/news/' },
      { title: 'PUBG Update 40.1 — Mk12·SLR 조정, 경쟁전 보상 변경, 봇 매칭 개선', date: '2025년 12월', url: 'https://www.pubg.com/ko/news/' },
    ]

    // 맵 로테이션 (정적)
    const mapRotation = [
      { name: '에란겔', nameEn: 'Erangel', size: '8×8km', desc: '최초의 PUBG 클래식 맵. 넓은 초원과 군사기지·학교 등 다양한 지형이 공존해 전략적 선택지가 풍부하다.' },
      { name: '미라마', nameEn: 'Miramar', size: '8×8km', desc: '광활한 사막과 험준한 절벽이 특징인 맵. 장거리 저격전과 차량 전투가 빈번하게 발생한다.' },
      { name: '산혹', nameEn: 'Sanhok', size: '4×4km', desc: '열대 밀림의 소형 맵으로 교전 빈도가 매우 높다. 빠른 루팅과 근거리 전투 능력이 승패를 가른다.' },
      { name: '태고', nameEn: 'Taego', size: '8×8km', desc: '한국을 배경으로 한 대형 맵. 자기소생 아이템이 적용되며 중거리 교전이 많은 전략적 맵이다.' },
      { name: '데스턴', nameEn: 'Deston', size: '8×8km', desc: '미래 도시를 배경으로 한 맵. 고층 빌딩과 개방 지형이 공존해 입체적인 전투가 펼쳐진다.' },
      { name: '론도', nameEn: 'Rondo', size: '8×8km', desc: '동아시아 산악 지형의 대형 맵. 고저차 큰 지형과 다양한 실내 전투 공간이 특징이다.' },
    ]

    return {
      props: {
        weaponMeta,
        topClans: JSON.parse(JSON.stringify(topClans)),
        patchNotes,
        mapRotation,
      },
    }
  } catch (e) {
    console.error('[index SSR] 데이터 로드 실패:', e.message)
    return {
      props: { weaponMeta: [], topClans: [], patchNotes: [], mapRotation: [] },
    }
  } finally {
    await prisma.$disconnect()
  }
}
