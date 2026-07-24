// pages/replay/index.js — 2D 리플레이 목록. 로그인 + PUBG 계정 연동된 유저만 접근 가능.
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import Layout from '../../components/layout/Layout'
import { getMapName } from '../../utils/mapUtils'
import { getSessionAuthUser } from '../../utils/clanBattleAuth'
import prisma from '../../utils/prisma'

const MAX_MATCHES = 30

export async function getServerSideProps({ req, res }) {
  const authUser = await getSessionAuthUser(req, res)
  if (!authUser) {
    return { props: { accessError: 'not_logged_in', matches: [] } }
  }
  if (!authUser.pubgAccounts || authUser.pubgAccounts.length === 0) {
    return { props: { accessError: 'not_linked', matches: [] } }
  }

  const rows = await prisma.playerMatch.findMany({
    where: {
      pubgAccountId: { in: authUser.pubgAccounts.map((a) => a.pubgAccountId) },
      telemetryUrl: { not: null }, // 리플레이 가능한(텔레메트리 있는) 매치만 노출
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_MATCHES,
    select: {
      matchId: true, nickname: true, shard: true, mode: true, mapName: true,
      placement: true, kills: true, damage: true, createdAt: true,
    },
  })

  return {
    props: {
      accessError: null,
      matches: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    },
  }
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ReplayListPage({ accessError, matches }) {
  const router = useRouter()

  if (accessError) {
    const GATE = {
      not_logged_in: {
        icon: '🔐',
        title: '로그인이 필요합니다',
        desc: '2D 리플레이는 본인이 참여한 경기에 한해 구글 로그인 후 확인할 수 있습니다.',
        actionLabel: 'Google로 로그인',
        onAction: () => signIn('google'),
      },
      not_linked: {
        icon: '🔗',
        title: 'PUBG 계정 연동이 필요합니다',
        desc: '마이페이지에서 PUBG 닉네임을 먼저 연동해주세요.',
        actionLabel: '마이페이지로 이동',
        onAction: () => router.push('/mypage'),
      },
    }[accessError]

    return (
      <Layout>
        <Head><title>리플레이 | PK.GG</title></Head>
        <div className="max-w-2xl mx-auto mt-20 p-6">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-lg text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">{GATE.icon}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">{GATE.title}</h1>
            <p className="text-gray-400 mb-8">{GATE.desc}</p>
            <button
              onClick={GATE.onAction}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
            >
              {GATE.actionLabel}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Head><title>리플레이 | PK.GG</title></Head>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-100 mb-2">🎬 2D 리플레이</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          본인이 참여한 최근 경기를 2D로 다시 볼 수 있어요.<br />
          경기를 선택하면 위치·자기장·킬 흐름을 재생할 수 있습니다.
        </p>

        {matches.length === 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center text-gray-400 text-sm">
            아직 리플레이할 수 있는 최근 경기가 없습니다.
          </div>
        )}

        <div className="space-y-2">
          {matches.map((m) => (
            <Link key={m.matchId} href={`/replay/${m.matchId}`} passHref>
              <span className="flex items-center justify-between gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 cursor-pointer transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                    <span>{getMapName(m.mapName)}</span>
                    <span className="text-gray-500 font-normal">· {m.mode}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDate(m.createdAt)} · {m.nickname}
                  </div>
                </div>
                <div className="text-right shrink-0 text-xs text-gray-400">
                  <div className="text-amber-400 font-semibold">#{m.placement}</div>
                  <div>킬 {m.kills} · 딜 {Math.round(m.damage)}</div>
                </div>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
