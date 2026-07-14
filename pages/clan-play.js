// pages/clan-play.js — 클랜 놀이 (클랜 킬내기 + 클랜 내전)
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, Fragment } from 'react';
import { signIn } from 'next-auth/react';
import Header from '../components/layout/Header';
import { useAuth } from '../utils/useAuth';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// 304(Not Modified) 등 바디가 없는 응답에서 res.json()이 던지는 SyntaxError를 막는다.
// 이게 없으면 "결과 없음"이 catch로 새서 "네트워크 오류"로 잘못 표시된다.
async function safeJson(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

// ─── 내전 생성 폼 ───────────────────────────────────────────────────────────
function CreateBattleForm({ type = 'battle', onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [placeRows, setPlaceRows] = useState([
    { place: 1, points: 10 }, { place: 2, points: 6 }, { place: 3, points: 3 }, { place: 4, points: 2 }, { place: 5, points: 1 },
  ]);
  const [killBasePoint, setKillBasePoint] = useState(1);
  const [useTierMultiplier, setUseTierMultiplier] = useState(true);
  const [tierMult, setTierMult] = useState({ 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0 });
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [placementPointMode, setPlacementPointMode] = useState('individual'); // 'individual' | 'squad'
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const addPlaceRow = () => setPlaceRows((r) => [...r, { place: r.length + 1, points: 0 }]);
  const removePlaceRow = (idx) => setPlaceRows((r) => r.filter((_, i) => i !== idx));
  const updatePlaceRow = (idx, field, val) => setPlaceRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));

  const handleSubmit = async () => {
    if (!title.trim()) { setErr(type === 'killmatch' ? '킬내기 이름을 입력하세요' : '내전 이름을 입력하세요'); return; }
    if (type === 'killmatch' && !startTime) { setErr('시작 시간을 입력하세요'); return; }
    setSubmitting(true);
    setErr('');
    try {
      const placePoints = Object.fromEntries(placeRows.map((r) => [String(r.place), Number(r.points) || 0]));
      const res = await fetch('/api/clan-battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, placePoints, killBasePoint: Number(killBasePoint) || 1, tierMultipliers: tierMult, useTierMultiplier,
          placementPointMode,
          type,
          ...(type === 'killmatch' ? { startTime, endTime: endTime || null, targetScore: targetScore || null } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || '생성에 실패했습니다.'); return; }
      onCreated(data.battle);
    } catch {
      setErr('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-4">
      <p className="text-sm font-bold text-white mb-3">{type === 'killmatch' ? '킬내기 생성' : '내전 생성'}</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={type === 'killmatch' ? '킬내기 이름' : '내전 이름'}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 mb-3 placeholder-gray-500"
      />

      {type === 'killmatch' && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[11px] text-gray-500">시작 시간 *</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 mt-0.5" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500">종료 시간 (선택)</label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 mt-0.5" />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-gray-500">목표 점수 (선택, 먼저 달성하면 종료)</label>
            <input type="number" value={targetScore} onChange={(e) => setTargetScore(e.target.value)} placeholder="예: 100"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 mt-0.5 placeholder-gray-500" />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-1.5">등수별 점수</p>
      <div className="flex flex-col gap-1.5 mb-3">
        {placeRows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input type="number" value={row.place} onChange={(e) => updatePlaceRow(idx, 'place', e.target.value)} min={1}
              className="w-16 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center py-1.5" />
            <span className="text-gray-600 text-xs">등 →</span>
            <input type="number" value={row.points} onChange={(e) => updatePlaceRow(idx, 'points', e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center py-1.5" />
            <span className="text-gray-600 text-xs">점</span>
            <button onClick={() => removePlaceRow(idx)} className="text-gray-500 px-1">✕</button>
          </div>
        ))}
        <button onClick={addPlaceRow} className="self-start text-xs text-blue-400 hover:text-blue-300">+ 등수 추가</button>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1.5">등수 점수 부여 방식</p>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="placementPointMode"
              checked={placementPointMode === 'individual'}
              onChange={() => setPlacementPointMode('individual')}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm text-gray-200 block">개인별</span>
              <span className="text-[11px] text-gray-500">1등 스쿼드원 4명 각각 10점씩 부여</span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="placementPointMode"
              checked={placementPointMode === 'squad'}
              onChange={() => setPlacementPointMode('squad')}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm text-gray-200 block">스쿼드 합산</span>
              <span className="text-[11px] text-gray-500">스쿼드 총점에 10점 추가, 개인 점수엔 미반영</span>
            </span>
          </label>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs text-gray-500">킬 기본 점수</label>
        <input type="number" step="0.1" value={killBasePoint} onChange={(e) => setKillBasePoint(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 mt-1" />
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-gray-500">티어별 킬 배율 사용</p>
        <button
          onClick={() => setUseTierMultiplier((v) => !v)}
          className={`relative w-9 h-5 rounded-full transition-colors ${useTierMultiplier ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${useTierMultiplier ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {useTierMultiplier && (
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((t) => (
            <div key={t} className="text-center">
              <label className="text-[10px] text-gray-500">티어{t}</label>
              <input type="number" step="0.1" value={tierMult[t]} onChange={(e) => setTierMult((m) => ({ ...m, [t]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs text-center py-1.5 mt-0.5" />
            </div>
          ))}
        </div>
      )}
      {!useTierMultiplier && (
        <p className="text-[11px] text-gray-600 mb-4">티어 배율 없이 킬 기본 점수만 적용됩니다.</p>
      )}

      {err && <p className="text-xs text-red-400 mb-2">{err}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">취소</button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? '생성 중...' : type === 'killmatch' ? '킬내기 생성' : '내전 생성'}
        </button>
      </div>
    </div>
  );
}

// 종료된 내전 결과 요약 팝업 — 상세 배틀 + 순위를 동시 조회해 개인/스쿼드 TOP3 + 경기 기록을 보여줌
function BattleSummaryModal({ battleId, onViewDetail, onClose }) {
  const [battle, setBattle] = useState(null);
  const [standings, setStandings] = useState([]);
  const [squadStandings, setSquadStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllIndividual, setShowAllIndividual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/clan-battle/${battleId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/clan-battle/${battleId}/standings`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([bd, sd]) => {
        if (cancelled) return;
        setBattle(bd?.battle ?? null);
        setStandings(sd?.standings ?? []);
        setSquadStandings(sd?.squadStandings ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [battleId]);

  const medal = (i) => ['🥇', '🥈', '🥉'][i] ?? '🏅';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center py-10">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">결과 불러오는 중...</p>
          </div>
        )}

        {!loading && !battle && (
          <p className="text-sm text-gray-500 text-center py-6">정보를 불러오지 못했습니다.</p>
        )}

        {!loading && battle && (
          <>
            <h4 className="text-base font-bold text-white mb-1">{battle.title} 결과</h4>
            <p className="text-xs text-gray-500 mb-4">
              📅 {new Date(battle.startDate).toLocaleDateString('ko-KR')}
              {battle.endDate ? ` ~ ${new Date(battle.endDate).toLocaleDateString('ko-KR')}` : ''}
              <span className="ml-2">총 {battle.matches?.length || 0}경기</span>
            </p>

            <p className="text-sm font-bold text-gray-300 mb-2">🏆 개인 순위</p>
            <div className="flex flex-col gap-1 mb-1.5">
              {(showAllIndividual ? standings : standings.slice(0, 3)).map((s, i) => (
                <div key={s.playerId} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-gray-200 truncate">
                    {medal(i)} {i + 1}위 <span className="font-semibold">{s.nickname}</span>
                    <span className="text-gray-500 text-xs ml-1.5">{s.teamName ?? '-'}{s.squadName ? `·${s.squadName}` : ''}</span>
                  </span>
                  <span className="text-yellow-400 font-bold flex-shrink-0">{s.totalScore}점</span>
                </div>
              ))}
              {standings.length === 0 && <p className="text-xs text-gray-600">등록된 결과가 없습니다</p>}
            </div>
            {standings.length > 3 && (
              <button onClick={() => setShowAllIndividual((v) => !v)} className="text-xs text-blue-400 hover:text-blue-300 mb-4">
                {showAllIndividual ? '접기 ▲' : `더보기 (${standings.length - 3}명) ▼`}
              </button>
            )}

            <p className="text-sm font-bold text-gray-300 mb-2 mt-3">🎯 스쿼드 순위</p>
            <div className="flex flex-col gap-1 mb-4">
              {squadStandings.slice(0, 3).map((s, i) => (
                <div key={s.squadId} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-gray-200 truncate">
                    {medal(i)} {i + 1}위 <span className="font-semibold text-purple-300">{s.squadName}</span>
                    <span className="text-gray-500 text-xs ml-1.5">{s.teamName ?? '-'}</span>
                  </span>
                  <span className="text-yellow-400 font-bold flex-shrink-0">{s.totalScore}점</span>
                </div>
              ))}
              {squadStandings.length === 0 && <p className="text-xs text-gray-600">등록된 스쿼드 결과가 없습니다</p>}
            </div>

            <p className="text-sm font-bold text-gray-300 mb-2">📊 경기 기록: {battle.matches?.length || 0}경기</p>
            <div className="flex flex-col gap-1 mb-5">
              {(battle.matches || []).slice().sort((a, b) => a.matchNumber - b.matchNumber).map((m) => (
                <p key={m.id} className="text-xs text-gray-400">
                  {m.matchNumber}경기 · {new Date(m.playedAt).toLocaleDateString('ko-KR')} · {m.mapName || '맵 정보 없음'}
                </p>
              ))}
              {(!battle.matches || battle.matches.length === 0) && <p className="text-xs text-gray-600">등록된 경기가 없습니다</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">닫기</button>
              <button onClick={onViewDetail} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">상세 보기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 내전 목록 ──────────────────────────────────────────────────────────────
function BattleList({ type = 'battle', onSelect }) {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [summaryBattleId, setSummaryBattleId] = useState(null);

  const fetchBattles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clan-battle?mine=1&type=${type}`);
      const d = await res.json();
      setBattles(d.battles || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBattles(); }, [type]);

  const handleDeleteBattle = async (battleId) => {
    const label = type === 'killmatch' ? '킬내기' : '내전';
    if (!window.confirm(`이 ${label}의 모든 기록이 삭제됩니다. 정말 삭제하시겠습니까?`)) return;
    setDeletingId(battleId);
    try {
      await fetch(`/api/clan-battle/${battleId}`, { method: 'DELETE' });
      await fetchBattles();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-bold text-white">{type === 'killmatch' ? '킬내기 목록' : '내전 목록'}</p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
        >
          {showCreate ? '접기 ▲' : type === 'killmatch' ? '+ 킬내기 생성' : '+ 내전 생성'}
        </button>
      </div>

      {showCreate && (
        <CreateBattleForm
          type={type}
          onCreated={(battle) => { setShowCreate(false); fetchBattles(); onSelect(battle); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading && <p className="text-gray-500 text-sm text-center py-6">로딩 중...</p>}

      <div className="flex flex-col gap-2">
        {battles.map((b) => (
          <div key={b.id} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors">
            <button
              onClick={() => (b.status === 'ended' ? setSummaryBattleId(b.id) : onSelect(b))}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{b.title}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${b.isOwner ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {b.isOwner ? (type === 'killmatch' ? '내 킬내기' : '내 내전') : '참가중'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {b.status === 'active' ? '진행중' : '종료'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                참가자 {b._count?.players ?? 0}명 · 경기 {b._count?.matches ?? 0}회
              </p>
            </button>
            {b.isOwner && (
              <button
                onClick={() => handleDeleteBattle(b.id)}
                disabled={deletingId === b.id}
                className="text-gray-500 hover:text-red-400 text-sm px-1.5 flex-shrink-0 disabled:opacity-50"
                title={type === 'killmatch' ? '킬내기 삭제' : '내전 삭제'}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        {!loading && battles.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">
            {type === 'killmatch' ? '참가하거나 생성한 킬내기가 없습니다' : '참가하거나 생성한 내전이 없습니다'}
          </p>
        )}
      </div>

      {summaryBattleId && (
        <BattleSummaryModal
          battleId={summaryBattleId}
          onClose={() => setSummaryBattleId(null)}
          onViewDetail={() => {
            const b = battles.find((x) => x.id === summaryBattleId);
            setSummaryBattleId(null);
            if (b) onSelect(b);
          }}
        />
      )}
    </div>
  );
}

// 이전 기록 입력 폼 (참가자 카드 내 토글)
function PrevRecordForm({ p, onSave, onCancel }) {
  const [form, setForm] = useState({
    prevGames: p.prevGames ?? '',
    prevAvgKills: p.prevAvgKills ?? '',
    prevAvgDamage: p.prevAvgDamage ?? '',
    prevAvgPlacement: p.prevAvgPlacement ?? '',
    prevAvgAssists: p.prevAvgAssists ?? '',
    prevMemo: p.prevMemo ?? '',
  });
  const [saving, setSaving] = useState(false);
  const f = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(p.id, form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2.5 mt-1.5">
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <div>
          <label className="text-[10px] text-gray-500">경기 수</label>
          <input type="number" value={form.prevGames} onChange={f('prevGames')} className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs px-2 py-1 mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">평균 킬</label>
          <input type="number" step="0.1" value={form.prevAvgKills} onChange={f('prevAvgKills')} className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs px-2 py-1 mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">평균 딜량</label>
          <input type="number" step="0.1" value={form.prevAvgDamage} onChange={f('prevAvgDamage')} className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs px-2 py-1 mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">평균 순위</label>
          <input type="number" step="0.1" value={form.prevAvgPlacement} onChange={f('prevAvgPlacement')} className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs px-2 py-1 mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500">평균 어시스트</label>
          <input type="number" step="0.1" value={form.prevAvgAssists} onChange={f('prevAvgAssists')} className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs px-2 py-1 mt-0.5" />
        </div>
      </div>
      <div className="mb-2">
        <label className="text-[10px] text-gray-500">메모 (어디서 진행했는지 등)</label>
        <input value={form.prevMemo} onChange={f('prevMemo')} placeholder="예: 타 클랜 정기전"
          className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs px-2 py-1 mt-0.5 placeholder-gray-500" />
      </div>
      <div className="flex gap-1.5">
        <button onClick={onCancel} className="flex-1 py-1.5 rounded border border-gray-700 text-gray-400 text-xs">취소</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

// 참가자 표시용 전적 우선순위 계산: 클랜 내전/킬내기 기록 > 이전 외부 기록 > PKGG 전적
function getPlayerRecord(p, standing, battleType = 'battle') {
  const hasPrev = p.prevGames != null || p.prevAvgKills != null || p.prevAvgDamage != null;
  const hasBattleRecord = !!standing && standing.matchCount >= 1;

  if (hasBattleRecord) {
    const kda = ((standing.totalKills + standing.totalAssists) / standing.matchCount).toFixed(2);
    const recordLabel = battleType === 'killmatch' ? '킬내기 기록' : '내전 기록';
    return {
      color: 'text-blue-400',
      text: `${recordLabel} ${standing.matchCount}경기 | 평균딜 ${standing.avgDamage?.toFixed(0) ?? 0} | KDA ${kda} | 평균점수 ${standing.avgScore ?? 0}`,
    };
  }
  if (hasPrev) {
    return {
      color: 'text-yellow-400',
      text: `이전 기록 ${p.prevGames ?? '?'}경기 | 평균딜 ${p.prevAvgDamage ?? '-'} | KDA ${p.prevAvgKills ?? '-'}`
        + (p.prevMemo ? ` · ${p.prevMemo}` : ''),
    };
  }
  if (p.pkggStats) {
    return {
      color: 'text-gray-400',
      text: `PKGG 전적 | 딜량 ${p.pkggStats.avgDamage?.toFixed(0) ?? 0} | KDA ${p.pkggStats.avgKills?.toFixed(2) ?? '0.00'}`,
    };
  }
  return null;
}

// 참가자 한 명: 드래그 핸들 + 티어 수정 + 스쿼드 배정(드롭다운 폴백) + 제거 + PKGG/내전 전적 표시 + 과거 기록 입력
function PlayerRow({ p, squads, standing, onTier, onAssign, onRemove, onSavePrev, useTierMultiplier = true, isOwner = true, battleType = 'battle' }) {
  const [showPrevForm, setShowPrevForm] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${p.id}`,
    disabled: !isOwner,
  });

  const handleSavePrev = async (playerId, form) => {
    await onSavePrev(playerId, form);
    setShowPrevForm(false);
  };

  const record = getPlayerRecord(p, standing, battleType);
  // DragOverlay가 실제로 움직이는 시각적 사본을 Portal로 렌더링하므로, 원본 카드는 굳이 transform으로
  // 따라 움직이지 않고 그 자리에 흐리게 남겨둔다. zIndex는 혹시 모를 스태킹 문제에 대한 보험.
  const style = { zIndex: isDragging ? 9999 : undefined };
  // dnd-kit(PointerSensor)은 mousedown이 아닌 pointerdown을 감지하므로, 카드 내 클릭 가능한
  // 요소들은 onPointerDown에서 stopPropagation해 드래그 시작 이벤트가 상위(카드)로 전파되지 않게 막는다.
  const stopDrag = (e) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isOwner ? { ...attributes, ...listeners } : {})}
      className={`bg-gray-950 rounded-lg px-3 py-2 touch-none ${isOwner ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragging ? 'opacity-50 ring-2 ring-blue-500 shadow-xl' : p.squadId ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-200 truncate">{p.nickname}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0" onPointerDown={stopDrag}>
          {useTierMultiplier && (
            isOwner ? (
              <select
                value={p.tier}
                onChange={(e) => onTier(p.id, e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded text-white text-xs px-1.5 py-1"
              >
                {[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>티어{t}</option>)}
              </select>
            ) : (
              <span className="text-[11px] text-gray-500">T{p.tier}</span>
            )
          )}
          {isOwner && (
            <>
              <select
                value={p.squadId ?? ''}
                onChange={(e) => onAssign(p.id, e.target.value ? parseInt(e.target.value) : null)}
                className="bg-gray-800 border border-gray-700 rounded text-white text-xs px-1.5 py-1 max-w-[110px]"
              >
                <option value="">미배정</option>
                {squads.map((sq) => <option key={sq.id} value={sq.id}>{sq.squadName}</option>)}
              </select>
              <button onClick={() => onRemove(p.id)} className="text-gray-500 hover:text-red-400 text-xs px-1">✕</button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 mt-1">
        {record && <p className={`text-[11px] ${record.color}`}>{record.text}</p>}
      </div>

      {isOwner && (
        <>
          <button
            onPointerDown={stopDrag}
            onClick={() => setShowPrevForm((v) => !v)}
            className="mt-1.5 text-[11px] text-purple-400 hover:text-purple-300"
          >
            {showPrevForm ? '접기 ▲' : p.prevGames != null ? '📋 이전 기록 수정' : '📋 이전 기록 입력'}
          </button>
          {showPrevForm && (
            <div onPointerDown={stopDrag}>
              <PrevRecordForm p={p} onSave={handleSavePrev} onCancel={() => setShowPrevForm(false)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// DragOverlay 전용 시각적 프리뷰 — Portal로 body에 렌더링되어 항상 최상단에 보임.
// useDraggable을 다시 호출하면 동일 id로 등록이 충돌하므로 순수 표시용으로만 구성.
function PlayerDragPreview({ p, standing, useTierMultiplier = true, battleType = 'battle' }) {
  const record = getPlayerRecord(p, standing, battleType);
  return (
    <div className="bg-gray-950 rounded-lg px-3 py-2 ring-2 ring-blue-500 shadow-2xl cursor-grabbing w-72">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-200 truncate">{p.nickname}</span>
        {useTierMultiplier && <span className="text-[11px] text-gray-500 ml-2 flex-shrink-0">T{p.tier}</span>}
      </div>
      {record && <p className={`text-[11px] mt-1 ${record.color}`}>{record.text}</p>}
    </div>
  );
}

// 오른쪽 패널: 스쿼드 카드 (드롭 존) — 멤버는 가로 칩 형태로 표시
function SquadDropZone({ sq, members, teamLabel, onDelete, onUnassign, isOwner }) {
  const { setNodeRef, isOver } = useDroppable({ id: `squad-${sq.id}`, disabled: !isOwner });
  const overLimit = members.length > 4;

  return (
    <div
      ref={setNodeRef}
      className={`w-full bg-gray-900 rounded-xl p-3 transition-colors ${
        isOver ? 'border-2 border-blue-400 bg-blue-500/10' : 'border border-purple-500/20'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="min-w-0">
          <span className="text-sm font-bold text-purple-300">🧩 {sq.squadName}</span>
          <span className="text-gray-600 text-[11px] font-normal ml-1.5">
            {teamLabel ? `${teamLabel} · ` : ''}{members.length}명
          </span>
          {overLimit && <span className="text-[11px] text-amber-400 ml-1.5">⚠ 4명 초과</span>}
        </div>
        {isOwner && members.length === 0 && (
          <button onClick={() => onDelete(sq.id)} className="text-gray-500 hover:text-red-400 text-xs px-1 flex-shrink-0">스쿼드 삭제</button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {members.map((p) => (
          <span
            key={p.id}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
              overLimit ? 'bg-amber-900/30 border border-amber-600/30 text-amber-200' : 'bg-gray-800 border border-gray-700 text-gray-200'
            }`}
          >
            {p.nickname}
            {isOwner && (
              <button onClick={() => onUnassign(p.id)} className="text-gray-500 hover:text-red-400">✕</button>
            )}
          </span>
        ))}
        {members.length === 0 && <span className="text-[11px] text-gray-600 py-1">여기로 참가자를 드래그하세요</span>}
      </div>
    </div>
  );
}

// ─── 내전 상세 (참가자 / 경기 결과 / 순위) ───────────────────────────────────
function BattleDetail({ battle: initialBattle, onBack }) {
  const [battle, setBattle] = useState(initialBattle);
  // 1분 자동 폴링(useEffect+setInterval)이 [battle.type, isEnded, section]에만 의존해 battle이 갱신돼도
  // 인터벌 콜백(handleAutoPollCycle → filterUnregistered)이 예전 battle을 계속 참조하는 stale closure를 막기 위한 ref.
  // ref는 렌더와 무관하게 항상 최신값을 담고 있으므로, 인터벌 안에서도 battleRef.current로 최신 battle.matches를 읽는다.
  const battleRef = useRef(battle);
  useEffect(() => { battleRef.current = battle; }, [battle]);
  const [standings, setStandings] = useState([]);
  const [squadStandings, setSquadStandings] = useState([]);
  const [standingsView, setStandingsView] = useState('individual'); // individual | squad
  const [matchFilter, setMatchFilter] = useState('all'); // 'all' | matchId(number)
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const [expandedSquadId, setExpandedSquadId] = useState(null);
  const [section, setSection] = useState('players'); // players | matches | standings
  const [newNickname, setNewNickname] = useState('');
  const [newTier, setNewTier] = useState(3);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [loadingClan, setLoadingClan] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchInputs, setMatchInputs] = useState({}); // playerId -> { placement, kills, damage, assists }
  const [squadPlacementInputs, setSquadPlacementInputs] = useState({}); // squadId -> placement
  const [savingMatch, setSavingMatch] = useState(false);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [importingMatch, setImportingMatch] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { matchedCount, unmatchedCount }
  const [importedMapName, setImportedMapName] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null); // 킬내기 자동 폴링 마지막 실행 시각
  const [showRegisteredMatches, setShowRegisteredMatches] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [squadFilterTab, setSquadFilterTab] = useState('all'); // 'all' | squadId
  const [err, setErr] = useState('');
  const [showSquadForm, setShowSquadForm] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [creatingSquad, setCreatingSquad] = useState(false);
  const [showOtherClanSearch, setShowOtherClanSearch] = useState(false);
  const [otherClanQuery, setOtherClanQuery] = useState('');
  const [otherClanResults, setOtherClanResults] = useState([]);
  const [searchingClan, setSearchingClan] = useState(false);
  const [selectedOtherClan, setSelectedOtherClan] = useState(null);
  const [addingOtherClan, setAddingOtherClan] = useState(false);
  const [activeTeamTab, setActiveTeamTab] = useState('all'); // 'all' | 'unassigned' | teamId(number)
  const [activeDragPlayerId, setActiveDragPlayerId] = useState(null);
  const [toast, setToast] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState(null);
  const [analyzingKey, setAnalyzingKey] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const { user } = useAuth() || {};
  const isOwner = !!user && user.id === battle.createdBy;
  const isEnded = battle.status === 'ended';
  // 참가자가 확정되면(confirmedAt) 소유자라도 참가자 추가/삭제/드래그/스쿼드 편집이 불가능해짐. 종료된 내전은 무조건 편집 불가
  const canEdit = isOwner && !battle.confirmedAt && !isEnded;
  // 경기 결과 입력/삭제는 확정 여부와 무관하게(확정 후에만 탭 진입 가능) 종료 여부만 체크
  const canManageMatches = isOwner && !isEnded;
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { setNodeRef: setUnassignedRef, isOver: isOverUnassigned } = useDroppable({ id: 'unassigned', disabled: !canEdit });

  const battleId = battle.id;

  const refreshBattle = async () => {
    const res = await fetch(`/api/clan-battle/${battleId}`);
    if (res.ok) { const d = await res.json(); setBattle(d.battle); }
  };
  const refreshStandings = async () => {
    const res = await fetch(`/api/clan-battle/${battleId}/standings`);
    if (res.ok) {
      const d = await res.json();
      setStandings(d.standings || []);
      setSquadStandings(d.squadStandings || []);
    }
  };

  useEffect(() => { refreshBattle(); refreshStandings(); /* eslint-disable-next-line */ }, [battleId]);

  // 킬내기 봇킬 분석이 진행 중인 결과가 있으면 10초마다 폴링해서 완료 여부 확인
  useEffect(() => {
    if (battle.type !== 'killmatch') return;
    const hasPending = (battle.matches || []).some((m) => m.results.some((r) => r.botAnalysisStatus === 'analyzing'));
    if (!hasPending) return;
    const timer = setInterval(() => { refreshBattle(); refreshStandings(); }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [battle.matches, battle.type]);

  // 킬내기 경기 결과 탭을 보고 있는 동안, 종료되지 않았다면 1분마다 대표자 1명 기준으로 새 경기를 조회해
  // 자동 등록하고 순위를 갱신한다 (handleAutoPollCycle 정의는 아래쪽에 있음 — 클로저로 참조).
  useEffect(() => {
    if (battle.type !== 'killmatch' || isEnded || section !== 'matches') return;
    handleAutoPollCycle();
    const timer = setInterval(() => { handleAutoPollCycle(); }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [battle.type, isEnded, section]);

  // 타클랜 검색 (입력 후 300ms 디바운스)
  useEffect(() => {
    if (!showOtherClanSearch || !otherClanQuery.trim()) { setOtherClanResults([]); return; }
    setSearchingClan(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clan-battle/search-clan?q=${encodeURIComponent(otherClanQuery.trim())}`);
        const d = await res.json();
        setOtherClanResults(d.clans || []);
      } finally {
        setSearchingClan(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [otherClanQuery, showOtherClanSearch]);

  const loadClanMembers = async (clanName) => {
    setErr('');
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/players`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'fromClan', clanName }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '불러오기에 실패했습니다.'); return; }
      await refreshBattle();
      setErr((d.added > 0 || d.retroAssigned > 0) ? '' : '이미 모든 클랜원이 등록되어 있습니다.');
      return d;
    } catch {
      setErr('네트워크 오류로 불러오기에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleLoadClan = async () => {
    setLoadingClan(true);
    try {
      await loadClanMembers(undefined);
    } finally {
      setLoadingClan(false);
    }
  };

  const handleAddOtherClan = async () => {
    if (!selectedOtherClan) return;
    setAddingOtherClan(true);
    try {
      const d = await loadClanMembers(selectedOtherClan.name);
      setShowOtherClanSearch(false);
      setOtherClanQuery('');
      setOtherClanResults([]);
      setSelectedOtherClan(null);
      // 타클랜 추가 시 해당 클랜명 탭으로 자동 이동
      if (d?.team?.id) setActiveTeamTab(d.team.id);
    } finally {
      setAddingOtherClan(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newNickname.trim()) return;
    setAddingPlayer(true);
    setErr('');
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: newNickname.trim(), tier: newTier }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '추가에 실패했습니다.'); return; }
      setNewNickname('');
      await refreshBattle();
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm('이 참가자를 제거할까요?')) return;
    await fetch(`/api/clan-battle/${battleId}/players`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
    });
    await refreshBattle();
    await refreshStandings();
  };

  const handleUpdateTier = async (playerId, tier) => {
    await fetch(`/api/clan-battle/${battleId}/players`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, tier }),
    });
    await refreshBattle();
  };

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) return;
    setCreatingSquad(true);
    setErr('');
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/squads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ squadName: newSquadName.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '스쿼드 생성에 실패했습니다.'); return; }
      setNewSquadName('');
      setShowSquadForm(false);
      await refreshBattle();
    } finally {
      setCreatingSquad(false);
    }
  };

  const handleDeleteSquad = async (squadId) => {
    if (!window.confirm('이 스쿼드를 삭제할까요? 소속 참가자는 미배정 상태가 됩니다.')) return;
    await fetch(`/api/clan-battle/${battleId}/squads`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ squadId }),
    });
    await refreshBattle();
  };

  const handleAssignSquad = async (playerId, squadId) => {
    await fetch(`/api/clan-battle/${battleId}/squads`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign', playerIds: [playerId], squadId: squadId || null }),
    });
    await refreshBattle();
  };

  const handleDragStart = (event) => {
    setActiveDragPlayerId(parseInt(String(event.active.id).replace('player-', '')));
  };

  const handleDragCancel = () => setActiveDragPlayerId(null);

  const handleBattleAction = async (action) => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/clan-battle/${battleId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '처리에 실패했습니다.'); return; }
      await refreshBattle();
    } finally {
      setConfirming(false);
    }
  };

  const handleDragEnd = (event) => {
    setActiveDragPlayerId(null);
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const playerId = parseInt(String(active.id).replace('player-', ''));
    let squadId = null;
    if (typeof over.id === 'string' && over.id.startsWith('squad-')) {
      squadId = parseInt(over.id.replace('squad-', ''));
    } else if (over.id !== 'unassigned') {
      return;
    }

    const player = (battle.players || []).find((p) => p.id === playerId);
    if (!player || (player.squadId ?? null) === squadId) return;
    handleAssignSquad(playerId, squadId);
  };

  const handleSavePrev = async (playerId, form) => {
    await fetch(`/api/clan-battle/${battleId}/players`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, ...form }),
    });
    await refreshBattle();
  };

  const standingsMap = new Map(standings.map((s) => [s.playerId, s]));

  const rule = battle.rule || {};
  const placePoints = rule.placePoints || {};
  const tierMultipliers = rule.tierMultipliers || {};
  const killBasePoint = rule.killBasePoint ?? 1;

  const computePreviewScore = (playerId) => {
    const input = matchInputs[playerId];
    if (!input) return 0;
    const player = (battle.players || []).find((p) => p.id === playerId);
    const squadPmt = player?.squadId != null ? squadPlacementInputs[player.squadId] : undefined;
    const effectivePlace = squadPmt !== undefined && squadPmt !== '' ? squadPmt : input.placement;
    const placeScore = Number(placePoints[String(effectivePlace)]) || 0;
    const tierMult = Number(tierMultipliers[String(player?.tier)]) || 1;
    const kills = Number(input.kills) || 0;
    return placeScore + kills * killBasePoint * tierMult;
  };

  const handleLoadRecentMatches = async () => {
    setLoadingRecentMatches(true);
    setErr('');
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/recent-matches`);
      const d = await safeJson(res);
      const emptyMsg = battle.type === 'killmatch' ? '조건에 맞는 게임을 찾지 못했습니다.' : '해당 시간대에 사용자 지정 게임이 없습니다.';
      if (!res.ok) { setErr(d.error || emptyMsg); return; }
      setRecentMatches(d.matches || []);
      // 새로고침 후에도 여전히 목록에 남아있는 선택만 유지 (사라진 항목만 정리)
      setSelectedMatchIds((prev) => prev.filter((id) => (d.matches || []).some((m) => m.matchId === id)));
      if ((d.matches || []).length === 0) {
        setErr(emptyMsg);
      }
    } catch {
      setErr('네트워크 오류가 발생했습니다.');
    } finally {
      setLoadingRecentMatches(false);
    }
  };

  const handleImportMatch = async () => {
    if (!selectedMatchId) return;
    setImportingMatch(true);
    setErr('');
    setImportSummary(null);
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/import-match`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: selectedMatchId }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '매치 불러오기에 실패했습니다.'); return; }

      const players = battle.players || [];
      const newMatchInputs = {};
      const newSquadPlacements = {};
      (d.matched || []).forEach((m) => {
        newMatchInputs[m.playerId] = {
          placement: m.placement ?? '',
          kills: m.kills ?? 0,
          damage: m.damage ?? 0,
          assists: m.assists ?? 0,
          rawKills: m.rawKills,
          realKills: m.realKills,
          botAnalysisStatus: m.botAnalysisStatus,
        };
        const player = players.find((p) => p.id === m.playerId);
        if (player?.squadId != null && m.squadPlacement != null) {
          newSquadPlacements[player.squadId] = m.squadPlacement;
        }
      });
      setMatchInputs((prev) => ({ ...prev, ...newMatchInputs }));
      setSquadPlacementInputs((prev) => ({ ...prev, ...newSquadPlacements }));
      setImportedMapName(d.matchInfo?.mapName || '');
      setShowMatchForm(true);
      setImportSummary({ matchedCount: d.matched?.length || 0, unmatchedCount: d.unmatched?.length || 0 });
    } catch {
      setErr('네트워크 오류가 발생했습니다.');
    } finally {
      setImportingMatch(false);
    }
  };

  // 킬내기 전용: 선택한 경기들을 import-match → matches 저장까지 한 번에 순차 처리
  // 후보 매치들을 import-match → matches 저장 순서로 등록. 반환값: 등록 성공 개수 (자동 폴링/수동 불러오기 공용)
  const registerCandidateMatches = async (candidates) => {
    let registeredCount = 0;
    for (const m of candidates) {
      try {
        const importRes = await fetch(`/api/clan-battle/${battleId}/import-match`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: m.matchId }),
        });
        const importData = await importRes.json();
        if (!importRes.ok || !importData.matched?.length) continue;

        const results = importData.matched.map((mm) => ({
          playerId: mm.playerId,
          placement: mm.placement ?? 0,
          squadPlacement: mm.squadPlacement ?? null,
          kills: mm.kills ?? 0,
          damage: mm.damage ?? 0,
          assists: mm.assists ?? 0,
          rawKills: mm.rawKills,
          realKills: mm.realKills,
          botAnalysisStatus: mm.botAnalysisStatus,
        }));

        const saveRes = await fetch(`/api/clan-battle/${battleId}/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results,
            mapName: importData.matchInfo?.mapName || null,
            playedAt: importData.matchInfo?.playedAt || null,
            pubgMatchId: m.matchId,
          }),
        });
        if (saveRes.ok) registeredCount += 1;
      } catch { /* 이 후보는 건너뛰고 계속 진행 */ }
    }
    return registeredCount;
  };

  // 미등록 경기만 걸러내기: battle.matches[].pubgMatchId 기준
  // battleRef.current를 사용 — 1분 자동 폴링의 stale closure 안에서 호출돼도 항상 최신 battle.matches를 봐야 하기 때문
  const filterUnregistered = (candidates) => {
    const registeredPubgIds = new Set((battleRef.current.matches || []).map((m) => m.pubgMatchId).filter(Boolean));
    return candidates.filter((m) => !registeredPubgIds.has(String(m.matchId)));
  };

  // 킬내기 자동 폴링 1사이클: 대표자 1명 기준 경량 조회 → 미등록 경기만 자동 등록 → 순위 갱신
  const handleAutoPollCycle = async () => {
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/recent-matches?representative=1`);
      const d = await safeJson(res);
      const candidates = res.ok ? filterUnregistered(d.matches || []) : [];
      const registeredCount = await registerCandidateMatches(candidates);

      await refreshBattle();
      await refreshStandings();
      if (registeredCount > 0) setToast(`✅ 새 경기 ${registeredCount}개 자동 등록됨`);
    } catch { /* 다음 폴링 주기에 재시도 */ } finally {
      setLastRefreshedAt(new Date());
    }
  };

  // "🎮 게임 불러오기" 수동 클릭: 선택 과정 없이 전체 참가자 기준으로 조회해 미등록 경기를 즉시 자동 등록
  const handleAutoRegisterKillmatch = async () => {
    setLoadingRecentMatches(true);
    setErr('');
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/recent-matches`);
      const d = await safeJson(res);
      if (!res.ok) { setErr(d.error || '게임을 불러오지 못했습니다.'); return; }

      const candidates = filterUnregistered(d.matches || []);
      const registeredCount = await registerCandidateMatches(candidates);

      await refreshBattle();
      await refreshStandings();
      setToast(registeredCount > 0 ? `✅ 새 경기 ${registeredCount}개 자동 등록됨` : '새로 등록할 경기가 없습니다');
    } catch {
      setErr('네트워크 오류가 발생했습니다.');
    } finally {
      setLoadingRecentMatches(false);
      setLastRefreshedAt(new Date());
    }
  };

  // "🔄 새로고침" 수동 클릭: PUBG 조회 없이 분석 상태/점수만 최신화
  const handleManualRefresh = async () => {
    await refreshBattle();
    await refreshStandings();
    setLastRefreshedAt(new Date());
  };

  const handleSaveMatch = async () => {
    const results = (battle.players || [])
      .filter((p) => matchInputs[p.id])
      .map((p) => {
        const squadPmt = p.squadId != null ? squadPlacementInputs[p.squadId] : undefined;
        return {
          playerId: p.id,
          placement: Number(matchInputs[p.id].placement) || 0,
          squadPlacement: squadPmt !== undefined && squadPmt !== '' ? Number(squadPmt) : null,
          kills: Number(matchInputs[p.id].kills) || 0,
          damage: Number(matchInputs[p.id].damage) || 0,
          assists: Number(matchInputs[p.id].assists) || 0,
          rawKills: matchInputs[p.id].rawKills,
          realKills: matchInputs[p.id].realKills,
          botAnalysisStatus: matchInputs[p.id].botAnalysisStatus,
        };
      });
    if (results.length === 0) { setErr('최소 1명 이상 결과를 입력하세요.'); return; }
    setSavingMatch(true);
    setErr('');
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/matches`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, mapName: importedMapName || null, pubgMatchId: selectedMatchId || null }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '저장에 실패했습니다.'); return; }
      setMatchInputs({});
      setSquadPlacementInputs({});
      setImportSummary(null);
      setSelectedMatchId('');
      setImportedMapName('');
      setShowMatchForm(false);
      await refreshBattle();
      await refreshStandings();
    } finally {
      setSavingMatch(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('이 경기 결과를 삭제할까요?')) return;
    setDeletingMatchId(matchId);
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/matches?matchId=${matchId}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '삭제에 실패했습니다.'); return; }
      await refreshBattle();
      await refreshStandings();
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleEndBattle = async () => {
    await handleBattleAction('end');
    setShowEndModal(false);
  };

  const handleAnalyzeResult = async (matchId, playerId) => {
    setAnalyzingKey(`${matchId}-${playerId}`);
    try {
      const res = await fetch(`/api/clan-battle/${battleId}/analyze-match`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, playerId }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || '분석 요청에 실패했습니다.'); return; }
      await refreshBattle();
      await refreshStandings();
    } finally {
      setAnalyzingKey(null);
    }
  };

  const battleLabel = battle.type === 'killmatch' ? '킬내기' : '내전';

  return (
    <div>
      <button onClick={onBack} className="text-gray-500 text-sm hover:text-gray-300 transition-colors mb-3">← {battleLabel} 목록으로</button>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-lg font-bold text-white">
          {battle.title}
          {isEnded && <span className="ml-2 align-middle text-[11px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 font-semibold">종료된 {battleLabel}</span>}
        </h3>
        {isOwner && (
          isEnded ? (
            <button
              onClick={() => handleBattleAction('reopen')}
              disabled={confirming}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-semibold disabled:opacity-50"
            >
              {confirming ? '처리 중...' : '↩️ 다시 열기'}
            </button>
          ) : (
            <button
              onClick={() => setShowEndModal(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold"
            >
              🏁 {battleLabel} 종료
            </button>
          )
        )}
      </div>
      {battle.memo && <p className="text-xs text-gray-500 mb-3">{battle.memo}</p>}

      {showEndModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h4 className="text-base font-bold text-white mb-1">{battleLabel} 종료 확인</h4>
            <p className="text-sm text-gray-400 mb-4">"{battle.title}" {battleLabel}을(를) 종료하시겠습니까?</p>

            <div className="bg-gray-950 rounded-lg p-3 mb-4 flex flex-col gap-1.5">
              {standings.slice(0, 3).map((s, i) => (
                <p key={s.playerId} className="text-sm text-gray-200">
                  {['🥇', '🥈', '🥉'][i]} {i + 1}위 {s.nickname} <span className="text-yellow-400 font-semibold ml-1">{s.totalScore}점</span>
                </p>
              ))}
              {standings.length === 0 && <p className="text-xs text-gray-600">등록된 경기 결과가 없습니다</p>}
              {squadStandings.length > 0 && (
                <p className="text-sm text-purple-300 mt-1.5 pt-1.5 border-t border-gray-800">
                  스쿼드 1위: {squadStandings[0].squadName} <span className="text-yellow-400 font-semibold ml-1">{squadStandings[0].totalScore}점</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowEndModal(false)} className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">취소</button>
              <button
                onClick={handleEndBattle}
                disabled={confirming}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {confirming ? '처리 중...' : '종료하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-4">
        {[['players', '참가자'], ['matches', '경기 결과'], ['standings', '순위']].map(([key, label]) => {
          const locked = key === 'matches' && !battle.confirmedAt;
          return (
            <button
              key={key}
              onClick={() => {
                if (locked) { setToast('참가자를 먼저 확정해주세요'); return; }
                setSection(key);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                locked ? 'opacity-50 cursor-not-allowed text-gray-500' : section === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 border border-gray-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      {err && <p className={`text-xs mb-3 ${err.includes('실패') || err.includes('오류') ? 'text-red-400' : 'text-gray-500'}`}>{err}</p>}

      {section === 'players' && (
        <div>
          {canEdit && (
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={handleLoadClan}
                disabled={loadingClan}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {loadingClan ? '불러오는 중...' : '👥 내 클랜원 불러오기'}
              </button>
              <button
                onClick={() => { setShowOtherClanSearch((v) => !v); setSelectedOtherClan(null); setOtherClanQuery(''); setOtherClanResults([]); }}
                className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                {showOtherClanSearch ? '접기 ▲' : '🔍 타클랜 추가'}
              </button>
            </div>
          )}

          {canEdit && showOtherClanSearch && (
            <div className="bg-gray-900 border border-teal-500/20 rounded-lg p-2.5 mb-3">
              <input
                value={otherClanQuery}
                onChange={(e) => { setOtherClanQuery(e.target.value); setSelectedOtherClan(null); }}
                placeholder="클랜명 검색..."
                className="w-full bg-gray-800 border border-teal-500/30 rounded-lg text-white text-sm px-3 py-2 mb-2 placeholder-gray-500"
              />
              {searchingClan && <p className="text-[11px] text-gray-500 px-1">검색 중...</p>}
              {!searchingClan && otherClanQuery.trim() && otherClanResults.length === 0 && (
                <p className="text-[11px] text-gray-500 px-1">검색 결과가 없습니다</p>
              )}
              {!searchingClan && otherClanResults.length > 0 && !selectedOtherClan && (
                <div className="flex flex-col gap-1 mb-2">
                  {otherClanResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedOtherClan(c)}
                      className="text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="text-sm text-gray-200 font-semibold">{c.name}</span>
                      <span className="text-[11px] text-gray-500 ml-2">멤버 {c.memberCount}명 · 평균 MMR {c.avgScore ?? '-'}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedOtherClan && (
                <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-teal-300">
                    {selectedOtherClan.name} <span className="text-gray-500 text-[11px]">멤버 {selectedOtherClan.memberCount}명 · 평균 MMR {selectedOtherClan.avgScore ?? '-'}</span>
                  </span>
                  <button
                    onClick={handleAddOtherClan}
                    disabled={addingOtherClan}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {addingOtherClan ? '추가 중...' : '이 클랜원 추가'}
                  </button>
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <div className="flex gap-2 mb-4">
              <input
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="닉네임 직접 추가"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 placeholder-gray-500"
              />
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-2 py-2"
              >
                {[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>티어{t}</option>)}
              </select>
              <button
                onClick={handleAddPlayer}
                disabled={addingPlayer}
                className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                추가
              </button>
            </div>
          )}

          {(() => {
            const players = battle.players || [];
            const squads = battle.squads || [];
            const teams = battle.teams || [];

            // 팀별 탭 구성: 전체 / 팀별 / 미배정
            const teamTabs = [
              { key: 'all', label: `전체 (${players.length})` },
              ...teams.map((t) => ({ key: t.id, label: `${t.teamName} (${players.filter((p) => p.teamId === t.id).length}명)` })),
              { key: 'unassigned', label: `미배정 (${players.filter((p) => !p.teamId).length}명)` },
            ];

            const scopedPlayers = activeTeamTab === 'all'
              ? players
              : activeTeamTab === 'unassigned'
                ? players.filter((p) => !p.teamId)
                : players.filter((p) => p.teamId === activeTeamTab);

            // 현재 탭 범위 안에서만 스쿼드 그룹화 ('전체' 탭에서는 빈 스쿼드도 노출)
            const squadsInScope = activeTeamTab === 'all'
              ? squads
              : squads.filter((sq) => scopedPlayers.some((p) => p.squadId === sq.id));

            const activeDragPlayer = activeDragPlayerId ? players.find((p) => p.id === activeDragPlayerId) : null;

            return (
              <DndContext
                sensors={dndSensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                {/* 팀별 탭 바 */}
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {teamTabs.map((tt) => (
                    <button
                      key={tt.key}
                      onClick={() => setActiveTeamTab(tt.key)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeTeamTab === tt.key ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {tt.key === 'all' ? '📋 ' : tt.key === 'unassigned' ? '❔ ' : '🏳️ '}{tt.label}
                    </button>
                  ))}
                </div>

                {/* 2분할 레이아웃: 왼쪽 40% 참가자 목록(드래그 소스) / 오른쪽 60% 스쿼드 카드(드롭 존) */}
                <div className="flex flex-col md:flex-row gap-5">
                  <div
                    ref={setUnassignedRef}
                    className={`md:w-[40%] flex-shrink-0 rounded-xl p-1.5 transition-colors max-h-[640px] overflow-y-auto ${
                      isOverUnassigned ? 'bg-blue-500/10 ring-2 ring-blue-400' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-1.5">
                      {scopedPlayers.map((p) => (
                        <PlayerRow
                          key={p.id}
                          p={p}
                          squads={squads}
                          standing={standingsMap.get(p.id)}
                          onTier={handleUpdateTier}
                          onAssign={handleAssignSquad}
                          onRemove={handleRemovePlayer}
                          onSavePrev={handleSavePrev}
                          useTierMultiplier={rule.useTierMultiplier ?? true}
                          isOwner={canEdit}
                          battleType={battle.type}
                        />
                      ))}
                      {scopedPlayers.length === 0 && (
                        <p className="text-center text-gray-500 text-sm py-6">참가자가 없습니다</p>
                      )}
                    </div>
                  </div>

                  <div className="md:w-[60%] flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-0.5">
                    {squadsInScope.map((sq) => {
                      const members = scopedPlayers.filter((p) => p.squadId === sq.id);
                      return (
                        <SquadDropZone
                          key={sq.id}
                          sq={sq}
                          members={members}
                          teamLabel={sq.team?.teamName}
                          onDelete={handleDeleteSquad}
                          onUnassign={(playerId) => handleAssignSquad(playerId, null)}
                          isOwner={canEdit}
                        />
                      );
                    })}
                    {squadsInScope.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-6">생성된 스쿼드가 없습니다</p>
                    )}
                    {canEdit && (
                      showSquadForm ? (
                        <div className="flex gap-2">
                          <input
                            value={newSquadName}
                            onChange={(e) => setNewSquadName(e.target.value)}
                            placeholder="스쿼드 이름 (예: 스쿼드1, Alpha)"
                            className="flex-1 bg-gray-800 border border-purple-500/30 rounded-lg text-white text-sm px-3 py-2 placeholder-gray-500"
                          />
                          <button
                            onClick={handleCreateSquad}
                            disabled={creatingSquad}
                            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50"
                          >
                            생성
                          </button>
                          <button onClick={() => setShowSquadForm(false)} className="px-3 py-2 rounded-lg border border-gray-700 text-gray-400 text-xs">취소</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowSquadForm(true)}
                          className="w-full py-2.5 rounded-lg border border-dashed border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-sm font-semibold"
                        >
                          + 스쿼드 추가
                        </button>
                      )
                    )}
                  </div>
                </div>

                <DragOverlay>
                  {activeDragPlayer && (
                    <PlayerDragPreview
                      p={activeDragPlayer}
                      standing={standingsMap.get(activeDragPlayer.id)}
                      useTierMultiplier={rule.useTierMultiplier ?? true}
                      battleType={battle.type}
                    />
                  )}
                </DragOverlay>
              </DndContext>
            );
          })()}

          {isOwner && !isEnded && (
            <div className="mt-4 pt-3 border-t border-gray-800">
              {battle.confirmedAt ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
                  <span className="text-sm text-green-400 font-semibold">확정됨 ✅</span>
                  <button
                    onClick={() => handleBattleAction('unconfirm')}
                    disabled={confirming}
                    className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-semibold disabled:opacity-50"
                  >
                    {confirming ? '처리 중...' : '확정 취소'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleBattleAction('confirm')}
                  disabled={confirming}
                  className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50"
                >
                  {confirming ? '처리 중...' : '✅ 참가자 확정'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {section === 'matches' && !battle.confirmedAt && (
        <div className="bg-gray-900 rounded-xl p-6 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="text-sm text-gray-400 mb-3">참가자를 먼저 확정해주세요</p>
          <button
            onClick={() => setSection('players')}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold"
          >
            참가자 탭으로 이동
          </button>
        </div>
      )}

      {section === 'matches' && battle.confirmedAt && (
        <div>
          {battle.type === 'killmatch' && (
            <div className="sticky top-0 z-10 bg-gray-950 pt-1 pb-3 mb-2">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <p className="text-sm font-bold text-gray-300">📊 실시간 현황</p>
                {!isEnded && (
                  <p className="text-[10px] text-gray-500">
                    🔄 1분마다 자동 갱신 중
                    {lastRefreshedAt && ` · 마지막 갱신: ${lastRefreshedAt.toLocaleTimeString('ko-KR', { hour12: false })}`}
                  </p>
                )}
              </div>

              {battle.targetScore ? (() => {
                const topScore = squadStandings[0]?.totalScore ?? 0;
                const pct = Math.min(100, (topScore / battle.targetScore) * 100);
                const achieved = topScore >= battle.targetScore;
                return (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">목표 점수: {battle.targetScore}점 ({topScore}점 / {battle.targetScore}점)</p>
                    <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${achieved ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {achieved && squadStandings[0] && (
                      <p className="text-sm text-green-400 font-bold mt-1.5">🎉 {squadStandings[0].squadName} 목표 달성!</p>
                    )}
                  </div>
                );
              })() : !battle.endTime ? (
                <p className="text-xs text-gray-500 mb-3">진행중 · 수동 종료 시까지</p>
              ) : null}

              <div className="flex gap-3 overflow-x-auto pb-2">
                {squadStandings.map((s) => (
                  <div key={s.squadId} className="flex-shrink-0 w-48 bg-gray-900 border border-purple-500/20 rounded-xl p-3">
                    <p className="text-sm font-bold text-purple-300 mb-0.5 truncate">🧩 {s.squadName}</p>
                    <p className="text-xs text-yellow-400 font-bold mb-2">총점 {s.totalScore}점</p>
                    <div className="flex flex-col gap-1.5">
                      {s.members.map((m) => {
                        const icon = m.analysisStatus === 'completed' ? '✅'
                          : m.analysisStatus === 'analyzing' ? '⏳'
                          : m.analysisStatus === 'failed' ? '⚠'
                          : '❓';
                        return (
                          <div key={m.playerId} className="text-[11px] border-t border-gray-800 pt-1.5 first:border-t-0 first:pt-0">
                            <p className="text-gray-200 truncate">{m.nickname} <span className="text-gray-500">T{m.tier}</span></p>
                            <p className="text-gray-400">{m.totalKills}킬 · {m.totalScore}점 {icon}</p>
                          </div>
                        );
                      })}
                      {s.members.length === 0 && <p className="text-[11px] text-gray-600">배정된 참가자 없음</p>}
                    </div>
                  </div>
                ))}
                {squadStandings.length === 0 && <p className="text-xs text-gray-600 py-4">스쿼드 데이터가 없습니다</p>}
              </div>

              <div className="border-t border-gray-800" />
            </div>
          )}

          {canManageMatches && battle.type === 'killmatch' && (
            <div className="flex items-center justify-center gap-6 py-3 mb-3">
              <div className="text-center">
                <button
                  onClick={handleAutoRegisterKillmatch}
                  disabled={loadingRecentMatches}
                  title="시간 범위 내 새 경기를 조회하고 자동 등록합니다"
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loadingRecentMatches ? '불러오는 중...' : '🎮 불러오기'}
                </button>
                <p className="text-[10px] text-gray-600 mt-1">새 경기가 끝났을 때 수동으로 누르세요</p>
              </div>
              <div className="text-center">
                <button
                  onClick={handleManualRefresh}
                  title="분석 상태와 점수를 최신화합니다"
                  className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold"
                >
                  🔄 새로고침
                </button>
                <p className="text-[10px] text-gray-600 mt-1">1분마다 자동 갱신됩니다</p>
              </div>
            </div>
          )}

          {canManageMatches && battle.type !== 'killmatch' && (
            <div className="bg-gray-900 border border-blue-500/20 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleLoadRecentMatches}
                  disabled={loadingRecentMatches}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {loadingRecentMatches ? '불러오는 중...' : '🎮 최근 사용자 지정 게임 불러오기'}
                </button>
              </div>

              {recentMatches.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2"
                  >
                    <option value="">경기 선택...</option>
                    {recentMatches.map((m) => (
                      <option key={m.matchId} value={m.matchId}>
                        {new Date(m.playedAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} · {m.mapName} · {m.participantCount}팀
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleImportMatch}
                    disabled={!selectedMatchId || importingMatch}
                    className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {importingMatch ? '불러오는 중...' : '불러오기'}
                  </button>
                </div>
              )}

              {importSummary && (
                <p className="text-[11px] mt-2">
                  <span className="text-green-400">✅ {importSummary.matchedCount}명 자동 입력됨</span>
                  {importSummary.unmatchedCount > 0 && (
                    <span className="text-amber-400 ml-2">❓ {importSummary.unmatchedCount}명 수동 입력 필요</span>
                  )}
                </p>
              )}
            </div>
          )}

          {canManageMatches && (
            <button
              onClick={() => setShowMatchForm((v) => !v)}
              className="mb-3 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              {showMatchForm ? '접기 ▲' : '✏️ 수동 입력'}
            </button>
          )}

          {canManageMatches && showMatchForm && (() => {
            const players = battle.players || [];
            const squads = battle.squads || [];
            const bySquad = squads
              .map((sq) => ({ sq, members: players.filter((p) => p.squadId === sq.id) }))
              .filter((g) => g.members.length > 0);
            const unassigned = players.filter((p) => !p.squadId);

            const renderPlayerRow = (p) => {
              const input = matchInputs[p.id] || { placement: '', kills: '', damage: '', assists: '' };
              return (
                <div key={p.id} className="bg-gray-950 rounded-lg p-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-gray-200 truncate">
                      {p.nickname} <span className="text-gray-600 text-xs">T{p.tier}</span>
                    </span>
                    <span className="text-xs text-yellow-400 font-bold">{computePreviewScore(p.id).toFixed(1)}점</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      ['placement', '개인등수'],
                      ['kills', '킬'],
                      ['damage', '딜량'],
                      ['assists', '어시'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="text-[9px] text-gray-500 block text-center">{label}</label>
                        <input
                          type="number"
                          value={input[key]}
                          onChange={(e) => setMatchInputs((m) => ({ ...m, [p.id]: { ...input, [key]: e.target.value } }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded text-white text-xs text-center py-1 mt-0.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-white mb-1">경기 #{(battle.matches?.length || 0) + 1} 결과 입력</p>
                <p className="text-[11px] text-gray-500 mb-2">스쿼드 등수는 스쿼드 헤더에서 한 번만 입력하면 소속 참가자 전원에게 적용됩니다.</p>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[11px] text-gray-500 flex-shrink-0">맵</label>
                  <input
                    value={importedMapName}
                    onChange={(e) => setImportedMapName(e.target.value)}
                    placeholder="예: 태이고 (자동 불러오기 시 채워짐)"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-1.5 placeholder-gray-500"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  {bySquad.map(({ sq, members }) => (
                    <div key={sq.id} className="border border-purple-500/20 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-purple-300">🧩 {sq.squadName}</span>
                        <span className="text-[11px] text-gray-500">스쿼드 등수</span>
                        <input
                          type="number"
                          value={squadPlacementInputs[sq.id] ?? ''}
                          onChange={(e) => setSquadPlacementInputs((m) => ({ ...m, [sq.id]: e.target.value }))}
                          className="w-16 bg-gray-800 border border-purple-500/30 rounded text-white text-xs text-center py-1"
                        />
                        <span className="text-[11px] text-gray-500">등</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {members.map(renderPlayerRow)}
                      </div>
                    </div>
                  ))}

                  {unassigned.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 mb-1.5">📋 미배정 참가자</p>
                      <div className="flex flex-col gap-2">
                        {unassigned.map(renderPlayerRow)}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSaveMatch}
                  disabled={savingMatch}
                  className="w-full mt-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50"
                >
                  {savingMatch ? '저장 중...' : '경기 결과 저장'}
                </button>
              </div>
            );
          })()}

          <button
            onClick={() => setShowRegisteredMatches((v) => !v)}
            className="w-full flex items-center justify-between px-1 py-2 text-sm text-gray-400 hover:text-gray-200"
          >
            <span>등록된 경기 {battle.matches?.length || 0}개</span>
            <span>{showRegisteredMatches ? '▲' : '▼'}</span>
          </button>

          {showRegisteredMatches && (() => {
            const squads = battle.squads || [];
            const playersById = new Map((battle.players || []).map((p) => [p.id, p]));
            const allMatches = (battle.matches || []).slice().reverse();

            const matchHasSquad = (m, squadId) => m.results.some((r) => playersById.get(r.playerId)?.squadId === squadId);

            const squadTabs = [
              { key: 'all', label: '전체', count: allMatches.length },
              ...squads.map((sq) => ({ key: sq.id, label: sq.squadName, count: allMatches.filter((m) => matchHasSquad(m, sq.id)).length })),
            ];

            const filteredMatches = squadFilterTab === 'all' ? allMatches : allMatches.filter((m) => matchHasSquad(m, squadFilterTab));

            const statusBadge = (status) => {
              if (status === 'completed') return <span className="text-green-400">✅분석완료</span>;
              if (status === 'analyzing') return <span className="text-blue-400">⏳분석중</span>;
              if (status === 'failed') return <span className="text-red-400">⚠분석실패</span>;
              return <span className="text-gray-500">❓미분석</span>;
            };

            return (
              <div>
                {squads.length > 0 && (
                  <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                    {squadTabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setSquadFilterTab(t.key)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          squadFilterTab === t.key ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {t.label} ({t.count})
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {filteredMatches.map((m) => {
                    const isExpanded = expandedMatchId === m.id;

                    // 이 경기 안에서 스쿼드별 합계 계산 (squad 모드면 등수 점수를 매치당 1회만 가산 — standings.js와 동일 로직)
                    const squadTotals = new Map();
                    m.results.forEach((r) => {
                      const player = playersById.get(r.playerId);
                      if (!player?.squadId) return;
                      if (!squadTotals.has(player.squadId)) {
                        const sq = squads.find((s) => s.id === player.squadId);
                        const bonus = rule.placementPointMode === 'squad'
                          ? (Number(rule.placePoints?.[String(r.squadPlacement)]) || 0)
                          : 0;
                        // 스쿼드 등수가 있으면 그걸 표시, 없으면 첫 멤버의 개인 등수로 대체
                        const placementLabel = r.squadPlacement ?? r.placement;
                        squadTotals.set(player.squadId, { squadName: sq?.squadName ?? '', score: bonus, kills: 0, members: [], placementLabel });
                      }
                      const t = squadTotals.get(player.squadId);
                      t.score += r.score;
                      t.kills += r.kills;
                      t.members.push({ nickname: player.nickname, score: r.score });
                    });
                    const squadTotalsToShow = squadFilterTab === 'all'
                      ? Array.from(squadTotals.values())
                      : (squadTotals.has(squadFilterTab) ? [squadTotals.get(squadFilterTab)] : []);
                    const truncateName = (name) => (name.length > 8 ? `${name.slice(0, 8)}…` : name);

                    return (
                      <div key={m.id} className="bg-gray-900 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-800/50"
                        >
                          <p className="text-xs text-gray-400">
                            <span className="text-gray-600 mr-1">{isExpanded ? '▼' : '▶'}</span>
                            경기 #{m.matchNumber} · {new Date(m.playedAt).toLocaleString('ko-KR')}{m.mapName ? ` · ${m.mapName}` : ''}
                            <span className="text-gray-600 ml-1.5">· {m.results.length}명</span>
                          </p>
                        </button>

                        {!isExpanded && squadTotalsToShow.length > 0 && (
                          <div className="px-3 pb-2 -mt-1 flex flex-col gap-0.5">
                            {squadTotalsToShow.map((t, i) => (
                              <p key={i} className="text-[11px] text-gray-400 truncate">
                                <span className="text-purple-300 font-semibold">🧩 {t.squadName}</span>: {t.members.map((mm) => `${truncateName(mm.nickname)} · ${t.placementLabel != null ? `${t.placementLabel}등` : '-'} · ${mm.score.toFixed(1)}점`).join(' · ')} · 합계 {t.score.toFixed(1)}점
                              </p>
                            ))}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-gray-800">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left py-1">닉네임</th>
                                    <th className="text-center py-1">티어</th>
                                    <th className="text-center py-1">킬</th>
                                    <th className="text-center py-1">딜량</th>
                                    <th className="text-center py-1">어시</th>
                                    <th className="text-right py-1">점수</th>
                                    {battle.type === 'killmatch' && <th className="text-right py-1">분석상태</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {m.results.map((r) => {
                                    const player = playersById.get(r.playerId);
                                    const isInSelectedSquad = squadFilterTab === 'all' || player?.squadId === squadFilterTab;
                                    const key = `${m.id}-${r.playerId}`;
                                    return (
                                      <tr key={r.id} className={`border-t border-gray-800/60 ${isInSelectedSquad ? '' : 'opacity-40'}`}>
                                        <td className="py-1 text-gray-200">{player?.nickname ?? '알 수 없음'}</td>
                                        <td className="py-1 text-center text-gray-500">T{player?.tier ?? '-'}</td>
                                        <td className="py-1 text-center text-gray-300">{r.kills}</td>
                                        <td className="py-1 text-center text-gray-300">{r.damage}</td>
                                        <td className="py-1 text-center text-gray-300">{r.assists}</td>
                                        <td className="py-1 text-right text-yellow-400 font-bold">{r.score.toFixed(1)}점</td>
                                        {battle.type === 'killmatch' && (
                                          <td className="py-1 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {statusBadge(r.botAnalysisStatus)}
                                              {canManageMatches && (r.botAnalysisStatus === 'pending' || r.botAnalysisStatus === 'failed') && (
                                                <button
                                                  onClick={() => handleAnalyzeResult(m.id, r.playerId)}
                                                  disabled={analyzingKey === key}
                                                  className="px-1.5 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold disabled:opacity-50"
                                                >
                                                  {analyzingKey === key ? '요청중' : '🔬'}
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {squadTotalsToShow.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-2 pt-2 border-t border-gray-800">
                                {squadTotalsToShow.map((t, i) => (
                                  <p key={i} className="text-xs text-purple-300">
                                    🧩 {t.squadName} 합계: {t.score.toFixed(1)}점 · 총킬 {t.kills}
                                  </p>
                                ))}
                              </div>
                            )}

                            {canManageMatches && (
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={() => handleDeleteMatch(m.id)}
                                  disabled={deletingMatchId === m.id}
                                  className="px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-semibold disabled:opacity-50"
                                >
                                  {deletingMatchId === m.id ? '삭제 중...' : '🗑️ 이 경기 삭제'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredMatches.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-6">등록된 경기가 없습니다</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {section === 'standings' && (() => {
        const placePoints = rule.placePoints || {};
        const matchTabs = (battle.matches || [])
          .slice()
          .sort((a, b) => a.matchNumber - b.matchNumber)
          .map((m) => [m.matchNumber, m.id]);

        // 'all'이면 API가 이미 계산해 준 누적치를 그대로 쓰고, 특정 경기 선택 시 perMatch/squadPerMatch에서 해당 경기만 뽑아 재계산
        const individualRows = standings
          .map((s) => {
            if (matchFilter === 'all') {
              return { ...s, dScore: s.totalScore, dKills: s.totalKills, dDamage: s.totalDamage, dMatchCount: s.matchCount };
            }
            const m = s.perMatch.find((pm) => pm.matchId === matchFilter);
            return { ...s, dScore: m?.score ?? 0, dKills: m?.kills ?? 0, dDamage: m?.damage ?? 0, dMatchCount: m ? 1 : 0 };
          })
          .sort((a, b) => b.dScore - a.dScore);

        const squadRows = squadStandings
          .map((s) => {
            if (matchFilter === 'all') {
              return { ...s, dScore: s.totalScore, dKills: s.totalKills, dMatchCount: s.matchCount };
            }
            const m = s.squadPerMatch.find((pm) => pm.matchId === matchFilter);
            return { ...s, dScore: m?.totalScore ?? 0, dKills: m?.totalKills ?? 0, dMatchCount: m ? 1 : 0 };
          })
          .sort((a, b) => b.dScore - a.dScore);

        return (
          <div>
            {matchTabs.length > 0 && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                <button
                  onClick={() => setMatchFilter('all')}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${matchFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
                >
                  전체
                </button>
                {matchTabs.map(([num, mid]) => (
                  <button
                    key={mid}
                    onClick={() => setMatchFilter(mid)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${matchFilter === mid ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
                  >
                    {num}경기
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-3">
              {[['individual', '개인 순위'], ['squad', '스쿼드 순위']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStandingsView(key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${standingsView === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {standingsView === 'individual' && (
              <div className="bg-gray-900 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-gray-400 text-xs">
                      <th className="px-3 py-2 text-left">순위</th>
                      <th className="px-3 py-2 text-left">닉네임</th>
                      <th className="px-3 py-2 text-left">스쿼드</th>
                      <th className="px-3 py-2 text-left">팀</th>
                      <th className="px-3 py-2 text-right">총점</th>
                      <th className="px-3 py-2 text-center">킬</th>
                      <th className="px-3 py-2 text-center">딜량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {individualRows.map((s, i) => (
                      <Fragment key={s.playerId}>
                        <tr
                          onClick={() => setExpandedPlayerId(expandedPlayerId === s.playerId ? null : s.playerId)}
                          className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/50"
                        >
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-200">
                            <span className="text-gray-600 text-[10px] mr-1">{expandedPlayerId === s.playerId ? '▼' : '▶'}</span>
                            {s.nickname} <span className="text-gray-600 text-xs">T{s.tier}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-400">{s.squadName ?? '-'}</td>
                          <td className="px-3 py-2 text-gray-400">{s.teamName ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-yellow-400 font-bold">{s.dScore.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{s.dKills}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{s.dDamage}</td>
                        </tr>
                        {expandedPlayerId === s.playerId && (
                          <tr className="border-t border-gray-800 bg-gray-950">
                            <td colSpan={7} className="px-4 py-3">
                              <p className="text-xs font-bold text-gray-400 mb-2">경기별 상세</p>
                              {s.perMatch.length === 0 ? (
                                <p className="text-xs text-gray-600">등록된 경기가 없습니다</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500">
                                      <th className="text-left py-1">경기</th>
                                      <th className="text-left py-1">스쿼드등수</th>
                                      <th className="text-left py-1">개인등수</th>
                                      <th className="text-center py-1">킬</th>
                                      <th className="text-center py-1">딜량</th>
                                      <th className="text-right py-1">점수</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {s.perMatch.map((m) => (
                                      <tr key={m.matchId} className="border-t border-gray-800/60">
                                        <td className="py-1 text-gray-300">{m.matchNumber}경기</td>
                                        <td className="py-1 text-purple-300">
                                          {m.squadPlacement != null ? `${m.squadPlacement}등(${Number(placePoints[String(m.squadPlacement)]) || 0}점)` : '-'}
                                        </td>
                                        <td className="py-1 text-gray-300">{m.placement}등</td>
                                        <td className="py-1 text-center text-gray-300">{m.kills}</td>
                                        <td className="py-1 text-center text-gray-300">{m.damage}</td>
                                        <td className="py-1 text-right text-yellow-400 font-bold">{m.score.toFixed(1)}점</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {standings.length === 0 && <p className="text-center text-gray-500 text-sm py-6">경기 결과가 없습니다</p>}
              </div>
            )}

            {standingsView === 'squad' && (
              <div className="bg-gray-900 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-gray-400 text-xs">
                      <th className="px-3 py-2 text-left">순위</th>
                      <th className="px-3 py-2 text-left">스쿼드명</th>
                      <th className="px-3 py-2 text-left">팀</th>
                      <th className="px-3 py-2 text-right">총점</th>
                      <th className="px-3 py-2 text-center">총킬</th>
                      <th className="px-3 py-2 text-center">경기수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squadRows.map((s, i) => (
                      <Fragment key={s.squadId}>
                        <tr
                          onClick={() => setExpandedSquadId(expandedSquadId === s.squadId ? null : s.squadId)}
                          className="border-t border-gray-800 cursor-pointer hover:bg-gray-800/50"
                        >
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 text-purple-300 font-semibold">
                            <span className="text-gray-600 text-[10px] mr-1">{expandedSquadId === s.squadId ? '▼' : '▶'}</span>
                            🧩 {s.squadName}
                          </td>
                          <td className="px-3 py-2 text-gray-400">{s.teamName ?? '-'}</td>
                          <td className="px-3 py-2 text-right text-yellow-400 font-bold">{s.dScore.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{s.dKills}</td>
                          <td className="px-3 py-2 text-center text-gray-400">{s.dMatchCount}</td>
                        </tr>
                        {expandedSquadId === s.squadId && (
                          <tr className="border-t border-gray-800 bg-gray-950">
                            <td colSpan={6} className="px-4 py-3">
                              <p className="text-xs font-bold text-gray-400 mb-2">스쿼드원별 누적 점수</p>
                              <table className="w-full text-xs mb-3">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left py-1">닉네임</th>
                                    <th className="text-left py-1">티어</th>
                                    <th className="text-right py-1">총점</th>
                                    <th className="text-center py-1">킬</th>
                                    <th className="text-center py-1">딜량</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {s.members.map((m) => (
                                    <tr key={m.playerId} className="border-t border-gray-800/60">
                                      <td className="py-1 text-gray-300">{m.nickname}</td>
                                      <td className="py-1 text-gray-500">T{m.tier}</td>
                                      <td className="py-1 text-right text-yellow-400 font-bold">{m.totalScore.toFixed(1)}점</td>
                                      <td className="py-1 text-center text-gray-300">{m.totalKills}</td>
                                      <td className="py-1 text-center text-gray-300">{m.totalDamage}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <p className="text-xs font-bold text-gray-400 mb-1.5">경기별 스쿼드 점수</p>
                              <div className="flex flex-col gap-1">
                                {s.squadPerMatch.length === 0 ? (
                                  <p className="text-xs text-gray-600">등록된 경기가 없습니다</p>
                                ) : (
                                  s.squadPerMatch.map((m) => (
                                    <p key={m.matchId} className="text-xs text-gray-400">
                                      {m.matchNumber}경기: 스쿼드{m.squadPlacement ?? '-'}등 → {m.totalScore.toFixed(1)}점 ({s.members.length}명 합산)
                                    </p>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {squadStandings.length === 0 && <p className="text-center text-gray-500 text-sm py-6">스쿼드 결과가 없습니다</p>}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── 클랜 내전 탭 / 클랜 킬내기 탭 (로그인/PUBG 연동 게이트는 상위 ClanPlay에서 처리) ───
// 두 탭 모두 동일한 BattleList/BattleDetail을 type만 다르게 재사용한다.
// initialBattleId가 있으면(마이페이지 등에서 딥링크로 진입) 목록을 건너뛰고 바로 해당 내전을 연다.
function useInitialBattle(initialBattleId) {
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(!!initialBattleId);

  useEffect(() => {
    if (!initialBattleId) return;
    let cancelled = false;
    fetch(`/api/clan-battle/${initialBattleId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.battle) setSelectedBattle(d.battle); })
      .finally(() => { if (!cancelled) setLoadingInitial(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [initialBattleId]);

  return { selectedBattle, setSelectedBattle, loadingInitial };
}

function ClanBattleTab({ initialBattleId }) {
  const { selectedBattle, setSelectedBattle, loadingInitial } = useInitialBattle(initialBattleId);

  if (loadingInitial) return <p className="text-gray-500 text-sm text-center py-10">불러오는 중...</p>;
  return selectedBattle
    ? <BattleDetail battle={selectedBattle} onBack={() => setSelectedBattle(null)} />
    : <BattleList type="battle" onSelect={setSelectedBattle} />;
}

function KillMatchTab({ initialBattleId }) {
  const { selectedBattle, setSelectedBattle, loadingInitial } = useInitialBattle(initialBattleId);

  if (loadingInitial) return <p className="text-gray-500 text-sm text-center py-10">불러오는 중...</p>;
  return selectedBattle
    ? <BattleDetail battle={selectedBattle} onBack={() => setSelectedBattle(null)} />
    : <BattleList type="killmatch" onSelect={setSelectedBattle} />;
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function ClanPlay() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState('kill'); // kill | battle
  const [initialBattleId, setInitialBattleId] = useState(null);
  const { user } = useAuth() || {};
  const [myUserData, setMyUserData] = useState(undefined); // undefined=로딩, null=없음

  // 마이페이지 등에서 /clan-play?tab=kill&battleId=12 형태로 딥링크 진입 시 탭 + 상세 화면 바로 열기
  useEffect(() => {
    if (!router.isReady) return;
    const { tab, battleId } = router.query;
    if (tab === 'battle' || tab === 'kill') setMainTab(tab);
    if (battleId) setInitialBattleId(parseInt(battleId));
    // eslint-disable-next-line
  }, [router.isReady, router.query.tab, router.query.battleId]);

  const mainAcc = myUserData?.pubgAccounts?.find((a) => a.id === myUserData.mainAccountId);
  const hasLinkedPubg = !!mainAcc;
  // 게이트 표시 조건: 비로그인(user===null) 또는 로그인+PUBG 미연동 확정(myUserData 로딩 완료 후) — clan-analytics.js와 동일 패턴
  const needsAuthGate = user === null || (!!user && myUserData !== undefined && !hasLinkedPubg);
  const isLoading = user === undefined || (!!user && myUserData === undefined);

  // 로그인 상태 확정 후 /api/user/me로 PUBG 연동 정보 조회 (clan-analytics.js와 동일 패턴)
  useEffect(() => {
    if (user === undefined) return; // 아직 로딩 중
    if (!user) { setMyUserData(null); return; }
    fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMyUserData(d?.user ?? null))
      .catch(() => setMyUserData(null));
  }, [user]);

  return (
    <>
      <Head>
        <title>🎮 클랜 놀이 | PKGG</title>
        <meta name="description" content="클랜원들과 즐기는 킬내기·내전 기록. 등수/킬 점수제를 지원합니다." />
      </Head>
      <Header />

      {/* 로딩 스피너 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 비로그인 / PUBG 미연동 팝업 오버레이 */}
      {!isLoading && needsAuthGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">{user === null ? '🔐' : '🎮'}</span>
            </div>
            {user === null ? (
              <>
                <h2 className="text-lg font-bold text-white mb-2">로그인이 필요합니다</h2>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  클랜 놀이는 로그인이 필요합니다<br />구글 로그인 후 이용해주세요.
                </p>
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center justify-center gap-2.5 w-full px-5 py-3 bg-white hover:bg-gray-100 text-gray-800 text-sm font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google로 로그인
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-2">PUBG 계정 연동이 필요합니다</h2>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  PUBG 계정을 연동해야 이용할 수 있습니다.
                </p>
                <Link
                  href="/mypage"
                  className="flex items-center justify-center gap-2.5 w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  마이페이지로 이동
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-gray-950 text-white px-4 py-8 ${needsAuthGate || isLoading ? 'blur-sm pointer-events-none select-none' : ''}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <Link href="/" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">← 홈으로</Link>
            <h1 className="text-2xl font-black mt-2 mb-1">🎮 클랜 놀이</h1>
            <p className="text-sm text-gray-500">클랜원들과 함께 즐기는 킬내기·내전 결과를 기록하세요</p>
          </div>

          {/* 메인 탭 */}
          <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-4">
            {[['kill', '🎯 클랜 킬내기'], ['battle', '⚔️ 클랜 내전']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMainTab(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  mainTab === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mainTab === 'kill' && <KillMatchTab initialBattleId={initialBattleId} />}
          {mainTab === 'battle' && <ClanBattleTab initialBattleId={initialBattleId} />}
        </div>
      </div>
    </>
  );
}
