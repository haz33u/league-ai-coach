import { cache } from './cache';
import { rateLimiter, RateLimitStats } from './rateLimit';

const API_BASE = 'https://americas.api.riotgames.com';

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

const pendingRequests = new Map<string, Promise<any>>();

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

export interface LeagueEntry {
  summonerId: string;
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | 'RANKED_FLEX_TT';
  tier: 'DIAMOND' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'IRON' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';
  rank: 'I' | 'II' | 'III' | 'IV';
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = retryConfig.initialDelay;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });

      if (response.status === 404 || response.status === 403) {
        throw new RiotAPIError(
          `API Error: ${response.status}`,
          response.status,
          await response.json().catch(() => ({}))
        );
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        console.warn(`⏳ Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (response.status >= 500) {
        if (attempt === retryConfig.maxRetries) {
          throw new RiotAPIError(
            `Server Error: ${response.status}`,
            response.status
          );
        }
        console.warn(`⚠️ Server error ${response.status}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
        continue;
      }

      if (!response.ok) {
        throw new RiotAPIError(
          `HTTP Error: ${response.status}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof RiotAPIError && (error.statusCode === 404 || error.statusCode === 403)) {
        throw error;
      }

      if (attempt < retryConfig.maxRetries) {
        console.warn(
          `❌ Attempt ${attempt + 1}/${retryConfig.maxRetries + 1} failed. Retrying in ${delay}ms...`,
          error
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

async function apiRequest<T>(
  endpoint: string,
  cacheKey?: string,
  cacheTTL: number = 300
): Promise<T> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new Error('RIOT_API_KEY environment variable is not set');
  }

  if (cacheKey) {
    const cached = cache.get<T>(cacheKey);
    if (cached) return cached;
  }

  if (cacheKey && pendingRequests.has(cacheKey)) {
    console.log(`📋 Deduplicating request for ${cacheKey}`);
    return pendingRequests.get(cacheKey)!;
  }

  const requestPromise = (async () => {
    try {
      await rateLimiter.waitForSlot();

      const url = `${API_BASE}${endpoint}?api_key=${apiKey}`;
      const stats = rateLimiter.getStats();
      console.log(`🌐 API Request: ${endpoint} (${stats.lastSecond}/${stats.limitSecond} req/s)`);

      const response = await fetchWithRetry(url);
      const data: T = await response.json();

      if (cacheKey) {
        cache.set(cacheKey, data, cacheTTL);
      }

      return data;
    } finally {
      if (cacheKey) {
        pendingRequests.delete(cacheKey);
      }
    }
  })();

  if (cacheKey) {
    pendingRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

export async function searchPlayer(
  gameName: string,
  tagLine: string,
  region: string = 'euw1'
): Promise<{
  data: PlayerSearchResult;
  region: string;
}> {
  if (!gameName.trim() || !tagLine.trim()) {
    throw new Error('Game name and tag line are required');
  }

  const cacheKey = `player:${gameName}:${tagLine}:${region}`;
  
  try {
    const accountData = await apiRequest<{
      gameName: string;
      tagLine: string;
      puuid: string;
    }>(
      `/riot/account/v1/accounts/by-game-name/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      cacheKey,
      600
    );

    const summonerData = await apiRequest<{
      id: string;
      accountId: string;
      name: string;
      profileIconId: number;
      summonerLevel: number;
      revisionDate: number;
    }>(
      `/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`,
      `summoner:${accountData.puuid}`,
      600
    );

    return {
      data: {
        gameName: accountData.gameName,
        tagLine: accountData.tagLine,
        puuid: accountData.puuid,
        summonerId: summonerData.id,
        accountId: summonerData.accountId,
        name: summonerData.name,
        profileIconId: summonerData.profileIconId,
        summonerLevel: summonerData.summonerLevel,
        revisionDate: summonerData.revisionDate,
      },
      region,
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

export async function getLeagueEntries(
  summonerId: string
): Promise<LeagueEntry[]> {
  const cacheKey = `league:${summonerId}`;

  try {
    const data = await apiRequest<LeagueEntry[]>(
      `/lol/league/v4/entries/by-summoner/${summonerId}`,
      cacheKey,
      600
    );

    return data || [];
  } catch (error) {
    console.error('Failed to get league entries:', error);
    return [];
  }
}

export async function getChampionMastery(
  summonerId: string
): Promise<any[]> {
  const cacheKey = `mastery:${summonerId}`;

  try {
    const data = await apiRequest<any[]>(
      `/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`,
      cacheKey,
      600
    );

    return data || [];
  } catch (error) {
    console.error('Failed to get champion mastery:', error);
    return [];
  }
}

export function getAPIStats() {
  return {
    rateLimiter: rateLimiter.getStats(),
    cache: cache.getStats(),
  };
}

export type { RateLimitStats };
