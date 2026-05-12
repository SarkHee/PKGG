// PUBG 매치의 플레이어별 봇 킬을 분리해서 반환합니다.
// 사용: const result = await analyzeMatch(matchId, platform);
//
// 반환값: AnalyzeResult { status, rows, error? }
//   status === "ok"               → 매치 + 텔레메트리 모두 성공 (rows 정상, bot/real 정확)
//   status === "telemetry_missing" → 매치 OK, 텔레메트리 URL 없음 (보존 기간 초과 가능성, rows는 stats만)
//   status === "telemetry_failed"  → 매치 OK, 텔레메트리 호출 실패 (재시도 후보, rows는 stats만)
//   status === "match_failed"      → 매치 호출 실패 (재시도 후보, rows = [])
//   status === "invalid_args"      → 인자 누락 (재시도 의미 없음, rows = [])
//   status === "unknown_error"     → 예기치 못한 내부 오류 (코드 버그 가능성, rows = [])
//
// 호출부는 try/catch 불필요 — 어떤 경우에도 throw 되지 않음.

interface PlayerStats {
  name: string;
  kills: number;
  DBNOs: number;
  damageDealt: number;
  winPlace: number | null;
}

interface PlayerRow {
  accountId: string;
  name: string;
  total: number;
  bot: number;
  real: number;
  damage: number;
  rank: number | null;
}

type AnalyzeStatus =
  | "ok"
  | "telemetry_missing"
  | "telemetry_failed"
  | "match_failed"
  | "invalid_args"
  | "unknown_error";

interface AnalyzeResult {
  status: AnalyzeStatus;
  rows: PlayerRow[];
  error?: unknown;
}

const BASE_URL = "https://api.pubg.com/shards";
const HEADERS = { Accept: "application/vnd.api+json" };

const getMatch = async (platform: string, matchId: string) => {
  const url = `${BASE_URL}/${platform}/matches/${matchId}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Match fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
};

const getTelemetryUrl = (matchData: any) => {
  const included = matchData?.included ?? [];
  for (const item of included) {
    if (item.type === "asset") {
      const url = item.attributes?.URL;
      if (url) return url as string;
    }
  }
  return null;
};

const fetchTelemetry = async (url: string) => {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Telemetry fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
};

const extractRealPlayers = (matchData: any) => {
  const players = new Map<string, PlayerStats>();
  const included = matchData?.included ?? [];
  for (const item of included) {
    if (item.type !== "participant") continue;
    const stats = item.attributes?.stats ?? {};
    const playerId: string = stats.playerId ?? "";
    if (!playerId.startsWith("account.")) continue;
    players.set(playerId, {
      name: stats.name,
      kills: stats.kills ?? 0,
      DBNOs: stats.DBNOs ?? 0,
      damageDealt: stats.damageDealt ?? 0,
      winPlace: stats.winPlace ?? null,
    });
  }
  return players;
};

const countBotKillsByAccount = (telemetry: any[]) => {
  const counter = new Map<string, number>();
  for (const event of telemetry) {
    if (event._T !== "LogPlayerKillV2") continue;

    const victim = event.victim ?? {};
    const killer = event.killer ?? {};
    const victimId: string = victim.accountId ?? "";
    const killerId: string = killer.accountId ?? "";

    if (!victimId.startsWith("ai.")) continue;
    if (!killerId.startsWith("account.")) continue;

    counter.set(killerId, (counter.get(killerId) ?? 0) + 1);
  }
  return counter;
};

// 텔레메트리 호출/파싱 실패 시 status를 함께 반환 → 호출부에서 retry 판단 가능.
const safeFetchBotKills = async (matchData: any) => {
  const telemetryUrl = getTelemetryUrl(matchData);
  if (!telemetryUrl) {
    console.warn("[bot_kills] 텔레메트리 URL이 없습니다. stats 정보만 사용합니다.");
    return {
      status: "missing" as const,
      counts: new Map<string, number>(),
    };
  }
  try {
    const telemetry = await fetchTelemetry(telemetryUrl);
    return {
      status: "ok" as const,
      counts: countBotKillsByAccount(telemetry),
    };
  } catch (err) {
    console.warn(
      "[bot_kills] 텔레메트리 호출 실패. stats 정보만 사용합니다:",
      err
    );
    return {
      status: "failed" as const,
      counts: new Map<string, number>(),
      error: err,
    };
  }
};

const buildRows = (
  players: Map<string, PlayerStats>,
  botKillsById: Map<string, number>
) => {
  const rows: PlayerRow[] = [];
  for (const [pid, info] of players) {
    const botK = botKillsById.get(pid) ?? 0;
    const totalK = info.kills;
    const realK = totalK - botK;
    rows.push({
      accountId: pid,
      name: info.name,
      total: totalK,
      bot: botK,
      real: realK,
      damage: info.damageDealt,
      rank: info.winPlace,
    });
  }

  rows.sort((a, b) => {
    if (b.real !== a.real) return b.real - a.real;
    if (b.total !== a.total) return b.total - a.total;
    return (a.rank ?? 9999) - (b.rank ?? 9999);
  });

  return rows;
};

const analyzeMatch = async (matchId: string, platform: string) => {
  if (!matchId || !platform) {
    console.warn("[bot_kills] matchId와 platform은 필수입니다.");
    return { status: "invalid_args" as const, rows: [] as PlayerRow[] };
  }

  try {
    let matchData: any;
    try {
      matchData = await getMatch(platform, matchId);
    } catch (err) {
      console.warn("[bot_kills] match 호출 실패:", err);
      return {
        status: "match_failed" as const,
        rows: [] as PlayerRow[],
        error: err,
      };
    }

    const players = extractRealPlayers(matchData);
    const telemetryResult = await safeFetchBotKills(matchData);
    const rows = buildRows(players, telemetryResult.counts);

    if (telemetryResult.status === "ok") {
      return { status: "ok" as const, rows };
    }
    if (telemetryResult.status === "missing") {
      return { status: "telemetry_missing" as const, rows };
    }
    return {
      status: "telemetry_failed" as const,
      rows,
      error: telemetryResult.error,
    };
  } catch (err) {
    console.warn("[bot_kills] 예기치 못한 오류:", err);
    return {
      status: "unknown_error" as const,
      rows: [] as PlayerRow[],
      error: err,
    };
  }
};

export { analyzeMatch };
export type { PlayerRow, AnalyzeResult, AnalyzeStatus };
