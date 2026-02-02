const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const PLATFORM_TO_REGION: Record<string, string> = {
  ru: 'europe',
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  kr: 'asia',
  jp1: 'asia',
};

export class RiotAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'RiotAPIError';
  }
}

export interface PlayerSearchResult {
  gameName: string;
  tagLine: string;
  puuid: string;
  summonerId: string;
  accountId: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  revisionDate: number;
}

export interface AnalysisResponse {
  player: {
    game_name: string;
    tag_line: string;
    puuid: string;
    level: number;
    profile_icon_id?: number;
  };
  ranked: {
    solo?: {
      queueType?: string;
      tier?: string;
      rank?: string;
      leaguePoints?: number;
      wins?: number;
      losses?: number;
    } | null;
    flex?: {
      queueType?: string;
      tier?: string;
      rank?: string;
      leaguePoints?: number;
      wins?: number;
      losses?: number;
    } | null;
  };
  summary: {
    total_games: number;
    wins: number;
    losses: number;
    winrate: number;
  };
  performance: {
    avg_kda: number;
    avg_cs: number;
    avg_cs_per_min?: number;
    avg_vision_score: number;
    avg_vision_per_min?: number;
    avg_gold?: number;
    avg_gold_per_min?: number;
    avg_damage?: number;
    avg_damage_per_min?: number;
    avg_kill_participation?: number;
  };
  roles: {
    main_role: string;
    breakdown: Record<string, { games: number; percentage: number }>;
  };
  champions: Record<string, { games: number; wins: number; losses: number; winrate: number }>;
  recent_matches: RecentMatch[];
  dna?: {
    primary: string;
    tags: string[];
    scores: Record<string, number>;
  };
  learning_path?: {
    main_role: string;
    focuses: { title: string; reason: string; action: string }[];
  };
  early_game?: {
    tracked_matches: number;
    avg_early_kills: number;
    avg_early_deaths: number;
    avg_early_assists: number;
    first_objective_participation_rate: number;
  } | null;
}

export interface RankedQueue {
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
}

export interface RankedByNameResponse {
  solo: RankedQueue | null;
  flex: RankedQueue | null;
}

export interface RecentMatch {
  match_id: string;
  queue_id?: number;
  game_duration?: number;
  game_creation?: number;
  champion: string;
  role: string;
  team_position?: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  lane_cs?: number;
  neutral_cs?: number;
  cs_per_min?: number;
  vision_score?: number;
  vision_per_min?: number;
  gold?: number;
  gold_per_min?: number;
  damage?: number;
  damage_per_min?: number;
  win: boolean;
  items: number[];
  spells: number[];
  runes?: Record<string, any>;
  champion_detail?: { id: string; name: string; icon: string };
  items_detail?: { id: number; name: string; icon: string }[];
  spells_detail?: { id: number; name: string; icon: string }[];
  runes_detail?: {
    primary_style?: { id: number; name: string; icon: string };
    sub_style?: { id: number; name: string; icon: string };
    keystone?: { id: number; name: string; icon: string };
    perks?: { id: number; name: string; icon: string }[];
  };
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new RiotAPIError(error?.detail || `HTTP Error: ${response.status}`, response.status, error);
  }

  return response.json();
}

export async function searchPlayer(
  gameName: string,
  tagLine: string,
  platform: string = 'euw1'
): Promise<{
  data: PlayerSearchResult;
  region: string;
}> {
  if (!gameName.trim() || !tagLine.trim()) {
    throw new Error('Game name and tag line are required');
  }

  const region = PLATFORM_TO_REGION[platform] || 'europe';
  try {
    const result = await fetchJson<any>(`${BACKEND_URL}/api/summoner/search`, {
      method: 'POST',
      body: JSON.stringify({
        game_name: gameName,
        tag_line: tagLine,
        region,
        platform,
      }),
    });

    return {
      data: {
        gameName: result.account.gameName,
        tagLine: result.account.tagLine,
        puuid: result.account.puuid,
        summonerId: result.summoner?.id || '',
        accountId: result.summoner?.accountId || '',
        name: `${result.account.gameName}#${result.account.tagLine}`,
        profileIconId: result.summoner?.profileIconId || 0,
        summonerLevel: result.summoner?.summonerLevel || 0,
        revisionDate: result.summoner?.revisionDate || 0,
      },
      region: platform,
    };
  } catch (error) {
    if (error instanceof RiotAPIError) {
      throw error;
    }
    throw new RiotAPIError(
      `Failed to search player: ${(error as Error).message}`,
      500
    );
  }
}

export function formatRank(tier?: string | null, rank?: string | null) {
  if (!tier || tier === 'UNRANKED') return 'Unranked';
  return rank ? `${tier} ${rank}` : tier;
}

export async function getPlayerAnalysisByPuuid(
  puuid: string,
  platform: string,
  options?: { includeTimeline?: boolean; timelineMatches?: number }
): Promise<AnalysisResponse> {
  const region = PLATFORM_TO_REGION[platform] || 'europe';
  const params = new URLSearchParams({
    puuid,
    region,
    platform,
    include_timeline: options?.includeTimeline ? 'true' : 'false',
    timeline_matches: String(options?.timelineMatches ?? 0),
  });

  return fetchJson<AnalysisResponse>(`${BACKEND_URL}/api/analysis/by-puuid?${params.toString()}`);
}

export async function getRankedByName(
  gameName: string,
  tagLine: string,
  platform: string
): Promise<RankedByNameResponse> {
  const region = PLATFORM_TO_REGION[platform] || 'europe';
  const params = new URLSearchParams({
    game_name: gameName,
    tag_line: tagLine,
    region,
    platform,
  });

  const data = await fetchJson<any>(`${BACKEND_URL}/api/ranked/by-name?${params.toString()}`, {
    method: 'POST',
  });

  const normalize = (entry: any): RankedQueue | null => {
    if (!entry) return null;
    return {
      tier: entry.tier,
      rank: entry.rank,
      leaguePoints: entry.lp ?? entry.leaguePoints ?? 0,
      wins: entry.wins,
      losses: entry.losses,
    };
  };

  return {
    solo: normalize(data.ranked_solo),
    flex: normalize(data.ranked_flex),
  };
}

export async function getLeaderboard(limit: number = 10) {
  return fetchJson<any[]>(`${BACKEND_URL}/api/players/leaderboard/?limit=${limit}`);
}
