// components/weapon-test/WeaponSlider.jsx - 무기 동반자 슬라이더 공용 컴포넌트
import { useState } from 'react'
import Image from 'next/image'
import { useT } from '../../utils/i18n'

export const WEAPON_IMG = {
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
}

export const RANK_META_STYLE = [
  { rankKey: 'wt.rank1', numCls: 'text-yellow-400', borderCls: 'border-yellow-500/50 bg-yellow-500/10', shadow: 'rgba(234,179,8,0.25)' },
  { rankKey: 'wt.rank2', numCls: 'text-slate-300',  borderCls: 'border-slate-500/50 bg-slate-500/10',  shadow: 'rgba(148,163,184,0.18)' },
  { rankKey: 'wt.rank3', numCls: 'text-amber-600',  borderCls: 'border-amber-700/50 bg-amber-700/10',  shadow: 'rgba(180,83,9,0.2)' },
]

export default function WeaponSlider({ weapons, type }) {
  const { t } = useT()
  const [active, setActive] = useState(0)
  const wName = weapons[active] || ''
  const img   = WEAPON_IMG[wName]
  const meta  = RANK_META_STYLE[active] || RANK_META_STYLE[0]

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
          const m = RANK_META_STYLE[i]
          const isActive = i === active
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
          )
        })}
      </div>
    </div>
  )
}
