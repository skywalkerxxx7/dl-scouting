import 'server-only'

const API = 'https://api.deadlock-api.com/v1'
const STEAM64_OFFSET = BigInt('76561197960265728')

export type SteamProfile = {
  account_id: number
  personaname: string
  profileurl: string
  avatarfull: string
  avatarmedium: string
  countrycode: string | null
}

type MatchRow = {
  match_id: number
  hero_id: number
  start_time: number
  game_mode: number
  player_team: number
  player_kills: number
  player_deaths: number
  player_assists: number
  denies: number
  net_worth: number
  last_hits: number
  match_duration_s: number
  match_result: number
}

type HeroStatRow = {
  hero_id: number
  matches_played: number
  wins: number
  kills: number
  deaths: number
  assists: number
  time_played: number
  damage_per_min: number
  networth_per_min: number
  accuracy: number
  last_played: number
}

type MmrRow = { start_time: number; player_score: number; rank: number; division: number; division_tier: number }

export type Hero = { id: number; name: string; icon: string }

export type RecentMatch = {
  matchId: number
  hero: Hero | null
  win: boolean
  kills: number
  deaths: number
  assists: number
  netWorth: number
  durationMin: number
  startTime: number
}

export type HeroSummary = {
  hero: Hero | null
  matches: number
  winRate: number
  kda: number
  damagePerMin: number
}

export type RankInfo = { name: string; color: string; subrank: number; image: string; score: number }

export type PlayerReport = {
  profile: SteamProfile
  rank: RankInfo | null
  rankHistory: { t: number; score: number }[]
  recent: {
    matches: number
    winRate: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    kda: number
    soulsPerMin: number
    lastHitsPerMin: number
    deniesPerGame: number
    avgDurationMin: number
  }
  lifetime: {
    matches: number
    winRate: number
    kda: number
    damagePerMin: number
    soulsPerMin: number
    accuracy: number
    hoursPlayed: number
    heroesPlayed: number
  }
  topHeroes: HeroSummary[]
  matchLog: RecentMatch[]
}

export const RANKS: { name: string; color: string }[] = [
  { name: 'Obscurus', color: '#8A8A8A' },
  { name: 'Initiate', color: '#B0784A' },
  { name: 'Seeker', color: '#C24F8E' },
  { name: 'Acolyte', color: '#7D8FD6' },
  { name: 'Sentinel', color: '#8DBE5C' },
  { name: 'Mystic', color: '#DDA326' },
  { name: 'Ritualist', color: '#EE4F57' },
  { name: 'Emissary', color: '#B47FEB' },
  { name: 'Oracle', color: '#D07A5A' },
  { name: 'Phantom', color: '#A8A8A8' },
  { name: 'Ascendant', color: '#D9AE62' },
  { name: 'Eternus', color: '#5CE9A9' },
]

export const RECENT_WINDOW = 50

async function getJson<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function statlockerUrl(accountId: number) {
  return `https://statlocker.gg/profile/${accountId}`
}

export function parseAccountId(input: string): number | null {
  const trimmed = input.trim()
  const fromUrl = trimmed.match(/(?:statlocker\.gg\/profile|tracklock\.gg\/players?|\/profiles?)\/(\d+)/i)
  const digits = fromUrl?.[1] ?? (/^\d+$/.test(trimmed) ? trimmed : null)
  if (!digits) return null
  const big = BigInt(digits)
  const id = big > STEAM64_OFFSET ? big - STEAM64_OFFSET : big
  const n = Number(id)
  return n > 0 && n < 2 ** 32 ? n : null
}

export async function getHeroes(): Promise<Map<number, Hero>> {
  const data = await getJson<{ id: number; name: string; images: Record<string, string> }[]>(
    '/assets/heroes?only_active=true',
    86400,
  )
  const map = new Map<number, Hero>()
  for (const h of data ?? []) {
    map.set(h.id, { id: h.id, name: h.name, icon: h.images.icon_image_small_webp ?? h.images.icon_image_small })
  }
  return map
}

export async function searchPlayers(query: string): Promise<SteamProfile[]> {
  const id = parseAccountId(query)
  if (id) {
    const profiles = await getSteamProfiles([id])
    if (profiles.length) return profiles
  }
  const q = encodeURIComponent(query.trim())
  return (await getJson<SteamProfile[]>(`/players/steam-search?search_query=${q}&limit=10`, 300)) ?? []
}

export async function getSteamProfiles(ids: number[]): Promise<SteamProfile[]> {
  if (!ids.length) return []
  return (await getJson<SteamProfile[]>(`/players/steam?account_ids=${ids.join(',')}`, 3600)) ?? []
}

function toRank(row: MmrRow): RankInfo {
  const tier = Math.floor(row.rank / 10)
  const subrank = row.rank % 10
  const meta = RANKS[tier] ?? RANKS[0]
  const image =
    tier === 0
      ? 'https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank00_lg.webp'
      : `${API}/assets/ranks/${tier}/${Math.max(subrank, 1)}/image?format=webp`
  return { ...meta, subrank, image, score: row.player_score }
}

const ratio = (k: number, d: number, a: number) => (k + a) / Math.max(d, 1)
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

export async function getPlayerReport(accountId: number): Promise<PlayerReport | null> {
  const [profiles, matches, heroStats, mmrHistory, heroes] = await Promise.all([
    getSteamProfiles([accountId]),
    getJson<MatchRow[]>(`/players/${accountId}/match-history?only_stored_history=true`, 600),
    getJson<HeroStatRow[]>(`/players/${accountId}/hero-stats`, 600),
    getJson<MmrRow[]>(`/players/${accountId}/mmr-history`, 600),
    getHeroes(),
  ])
  const profile = profiles[0]
  if (!profile) return null

  const recentRows = (matches ?? [])
    .filter((m) => m.match_duration_s > 0)
    .sort((a, b) => b.start_time - a.start_time)
    .slice(0, RECENT_WINDOW)

  const matchLog: RecentMatch[] = recentRows.map((m) => ({
    matchId: m.match_id,
    hero: heroes.get(m.hero_id) ?? null,
    win: m.match_result === m.player_team,
    kills: m.player_kills,
    deaths: m.player_deaths,
    assists: m.player_assists,
    netWorth: m.net_worth,
    durationMin: m.match_duration_s / 60,
    startTime: m.start_time,
  }))

  const totalMin = recentRows.reduce((s, m) => s + m.match_duration_s / 60, 0) || 1
  const k = recentRows.reduce((s, m) => s + m.player_kills, 0)
  const d = recentRows.reduce((s, m) => s + m.player_deaths, 0)
  const a = recentRows.reduce((s, m) => s + m.player_assists, 0)

  const recent = {
    matches: recentRows.length,
    winRate: recentRows.length ? matchLog.filter((m) => m.win).length / recentRows.length : 0,
    avgKills: avg(recentRows.map((m) => m.player_kills)),
    avgDeaths: avg(recentRows.map((m) => m.player_deaths)),
    avgAssists: avg(recentRows.map((m) => m.player_assists)),
    kda: ratio(k, d, a),
    soulsPerMin: recentRows.reduce((s, m) => s + m.net_worth, 0) / totalMin,
    lastHitsPerMin: recentRows.reduce((s, m) => s + m.last_hits, 0) / totalMin,
    deniesPerGame: avg(recentRows.map((m) => m.denies)),
    avgDurationMin: avg(recentRows.map((m) => m.match_duration_s / 60)),
  }

  const hs = heroStats ?? []
  const lifeMatches = hs.reduce((s, h) => s + h.matches_played, 0)
  const lifeTime = hs.reduce((s, h) => s + h.time_played, 0)
  const weighted = (key: 'damage_per_min' | 'networth_per_min' | 'accuracy') =>
    lifeTime ? hs.reduce((s, h) => s + (h[key] || 0) * h.time_played, 0) / lifeTime : 0

  const lifetime = {
    matches: lifeMatches,
    winRate: lifeMatches ? hs.reduce((s, h) => s + h.wins, 0) / lifeMatches : 0,
    kda: ratio(
      hs.reduce((s, h) => s + h.kills, 0),
      hs.reduce((s, h) => s + h.deaths, 0),
      hs.reduce((s, h) => s + h.assists, 0),
    ),
    damagePerMin: weighted('damage_per_min'),
    soulsPerMin: weighted('networth_per_min'),
    accuracy: weighted('accuracy'),
    hoursPlayed: lifeTime / 3600,
    heroesPlayed: hs.filter((h) => h.matches_played > 0).length,
  }

  const topHeroes: HeroSummary[] = [...hs]
    .sort((x, y) => y.matches_played - x.matches_played)
    .slice(0, 5)
    .map((h) => ({
      hero: heroes.get(h.hero_id) ?? null,
      matches: h.matches_played,
      winRate: h.matches_played ? h.wins / h.matches_played : 0,
      kda: ratio(h.kills, h.deaths, h.assists),
      damagePerMin: h.damage_per_min,
    }))

  const mmr = [...(mmrHistory ?? [])].sort((x, y) => x.start_time - y.start_time)
  const latest = mmr.at(-1)

  return {
    profile,
    rank: latest ? toRank(latest) : null,
    rankHistory: mmr.slice(-40).map((r) => ({ t: r.start_time, score: r.player_score })),
    recent,
    lifetime,
    topHeroes,
    matchLog,
  }
}
