import { useRef, useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import ReportCard, { CARD_W } from '../../components/player/ReportCard'

export default function ReportPage({ data, error, nickname }) {
  const cardRef  = useRef(null)
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(false)
  const [shareErr, setShareErr] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSave = async () => {
    if (saving || !cardRef.current) return
    setSaving(true)
    setShareErr('')
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `pkgg_report_${nickname}.png`
      a.click()
    } catch (e) {
      setShareErr('이미지 저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareErr('링크 복사 실패')
    }
  }

  const handleShare = async () => {
    const url   = window.location.href
    const title = `${nickname}의 PKGG 시즌 리포트`
    const text  = data ? `${nickname} — 실킬 ${data.avgRealKills ?? data.avgKills} · 딜 ${data.avgRealDamage ?? data.avgDamage} · 승률 ${data.winRate}%` : title
    if (navigator.share) {
      try { await navigator.share({ title, text, url }) } catch {}
    } else {
      handleCopyLink()
    }
  }

  return (
    <>
      <Head>
        <title>{`${nickname}의 시즌 41 리포트 | PKGG`}</title>
        <meta name="description" content={data ? `실킬 평균 ${data.avgRealKills ?? data.avgKills} · 평균 딜량 ${data.avgRealDamage ?? data.avgDamage} · 승률 ${data.winRate}%` : `${nickname}의 PKGG 시즌 41 리포트`} />
        <meta property="og:title"        content={`${nickname}의 시즌 41 리포트 | PKGG`} />
        <meta property="og:description"  content={data ? `실킬 평균 ${data.avgRealKills ?? data.avgKills} · 평균 딜량 ${data.avgRealDamage ?? data.avgDamage} · 승률 ${data.winRate}%` : `${nickname}의 PKGG 시즌 41 리포트`} />
        <meta property="og:url"          content={`https://pkgg.vercel.app/report/${encodeURIComponent(nickname)}`} />
        <meta property="og:image"        content={`https://pkgg.vercel.app/api/og/${encodeURIComponent(nickname)}?shard=${data?.shard || 'steam'}`} />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="420" />
        <meta property="og:type"         content="website" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={`${nickname}의 시즌 41 리포트 | PKGG`} />
        <meta name="twitter:description" content={data ? `실킬 평균 ${data.avgRealKills ?? data.avgKills} · 평균 딜량 ${data.avgRealDamage ?? data.avgDamage} · 승률 ${data.winRate}%` : `${nickname}의 PKGG 시즌 41 리포트`} />
        <meta name="twitter:image"       content={`https://pkgg.vercel.app/api/og/${encodeURIComponent(nickname)}?shard=${data?.shard || 'steam'}`} />
      </Head>

      <div style={{ minHeight: '100vh', background: '#080612', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        {/* 상단 네비 */}
        <div style={{ width: '100%', maxWidth: CARD_W, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link href={`/player/steam/${encodeURIComponent(nickname)}`} style={{ color: 'rgba(165,160,240,0.7)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← 전적 보기
          </Link>
          <img src="/logo.png" alt="PKGG" style={{ height: 20, objectFit: 'contain', opacity: 0.7 }} />
        </div>

        {error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '24px 32px', textAlign: 'center', maxWidth: 480 }}>
            <div style={{ color: '#F87171', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>데이터를 불러올 수 없습니다</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{error}</div>
            <Link href={`/player/steam/${encodeURIComponent(nickname)}`} style={{ display: 'inline-block', marginTop: 16, color: '#A5A0F0', fontSize: 12 }}>
              플레이어 페이지 방문 후 다시 시도해주세요 →
            </Link>
          </div>
        ) : (
          <>
            {/* 카드 (캡처 대상) */}
            <div ref={cardRef} style={{ maxWidth: '100%', overflow: isMobile ? 'visible' : 'auto', borderRadius: 16, boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(127,119,221,0.2)' }}>
              <ReportCard data={data} mobile={isMobile} />
            </div>

            {/* 공유 버튼 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, auto)',
              gap: 10,
              marginTop: 20,
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? 360 : 'none',
            }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 20px', background: '#7F77DD', borderRadius: 10, border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? '저장 중...' : '💾 이미지 저장'}
              </button>
              <button
                onClick={handleCopyLink}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: copied ? '#34D399' : 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {copied ? '✓ 복사됨' : '🔗 링크 복사'}
              </button>
              <button
                onClick={handleShare}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', gridColumn: isMobile ? '1 / -1' : 'auto' }}
              >
                📤 공유하기
              </button>
            </div>

            {shareErr && (
              <div style={{ marginTop: 10, color: '#F87171', fontSize: 12 }}>{shareErr}</div>
            )}

            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
              이미지 저장 후 카카오톡·디스코드에 공유하세요
            </div>
          </>
        )}
      </div>
    </>
  )
}

export async function getServerSideProps({ params, query, req }) {
  const { nickname } = params
  const shard = query.shard || 'steam'

  try {
    // req.headers 기반 URL → 환경 변수와 무관하게 항상 자기 자신을 정확히 가리킴
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host     = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000'
    const baseUrl  = `${protocol}://${host}`

    const res  = await fetch(`${baseUrl}/api/report/${encodeURIComponent(nickname)}?shard=${shard}`)
    const text = await res.text()

    let json
    try {
      json = JSON.parse(text)
    } catch {
      return { props: { data: null, error: `서버 오류 (HTTP ${res.status})`, nickname } }
    }

    if (!res.ok) {
      return { props: { data: null, error: json.error || '데이터 조회 실패', nickname } }
    }

    return { props: { data: json, error: null, nickname } }
  } catch (err) {
    return { props: { data: null, error: err.message, nickname } }
  }
}
