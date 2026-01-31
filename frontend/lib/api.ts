// Riot Games API configuration
const RIOT_API_KEY = process.env.NEXT_PUBLIC_RIOT_API_KEY || 'RGAPI-YOUR-KEY-HERE';

// Regional routing endpoints
const REGIONAL_ENDPOINTS: Record<string, string> = {
  'euw1': 'https://europe.api.riotgames.com',
  'eun1': 'https://europe.api.riotgames.com',
  'tr1': 'https://europe.api.riotgames.com',
  'ru': 'https://europe.api.riotgames.com',
  'na1': 'https://americas.api.riotgames.com',
  'br1': 'https://americas.api.riotgames.com',
  'la1': 'https://americas.api.riotgames.com',
  'la2': 'https://americas.api.riotgames.com',
  'kr': 'https://asia.api.riotgames.com',
  'jp1': 'https://asia.api.riotgames.com',
};

// Platform endpoints
const PLATFORM_ENDPOINTS: Record<string, string> = {
  'euw1': 'https://euw1.api.riotgames.com',
  'eun1': 'https://eun1.api.riotgames.com',
  'tr1': 'https://tr1.api.riotgames.com',
  'ru': 'https://ru.api.riotgames.com',
  'na1': 'https://na1.api.riotgames.com',
  'br1': 'https://br1.api.riotgames.com',
  'la1': 'https://la1.api.riotgames.com',
  'la2': 'https://la2.api.riotgames.com',
  'kr': 'https://kr.api.riotgames.com',
  'jp1': 'https://jp1.api.riotgames.com',
};

export interface PlayerStats {
  gameName: string;
  tagLine: string;
  summonerId: string;
  puuid: string;
  level: number;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
  totalGames: number;
  kda: number;
  mainRole: string;
  mainChampion: string;
  recentForm: number;
}

export interface MatchHistory {
  matchId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  duration: string;
  ago: string;
  mode: string;
  kda: number;
}

function calculateTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function formatGameDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export async function searchPlayer(
  gameName: string,
  tagLine: string,
  region: string = 'euw1'
): Promise<PlayerStats> {
  try {
    const regionalUrl = REGIONAL_ENDPOINTS[region] || REGIONAL_ENDPOINTS['euw1'];
    const platformUrl = PLATFORM_ENDPOINTS[region] || PLATFORM_ENDPOINTS['euw1'];

    console.log('🔍 Search:', gameName, tagLine, region);

    // 1. Get Account
    const accountUrl = `${regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const accountRes = await fetch(accountUrl, {
      headers: { 'X-Riot-Token': RIOT_API_KEY },
    });

    if (!accountRes.ok) {
      throw new Error('Player not found');
    }

    const account = await accountRes.json();
    const puuid = account.puuid;

    // 2. Get Summoner
    const summonerRes = await fetch(
      `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (!summonerRes.ok) throw new Error('Summoner not found');
    const summoner = await summonerRes.json();

    // 3. Get League
    const leagueRes = await fetch(
      `${platformUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    const league = await leagueRes.json();
    const ranked = league.find((e: any) => e.queueType === 'RANKED_SOLO_5x5') || league[0] || {};

    const totalGames = (ranked?.wins || 0) + (ranked?.losses || 0);
    const winRate = totalGames > 0 ? (ranked.wins / totalGames) * 100 : 0;

    // 4. Get Matches
    let kda = 0;
    let mainChampion = 'Unknown';
    let mainRole = 'Unknown';

    try {
      const matchesRes = await fetch(
        `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`,
        { headers: { 'X-Riot-Token': RIOT_API_KEY } }
      );

      if (matchesRes.ok) {
        const matchIds = await matchesRes.json();
        
        if (matchIds.length > 0) {
          const matches = await Promise.all(
            matchIds.slice(0, 5).map((id: string) =>
              fetch(`${regionalUrl}/lol/match/v5/matches/${id}`, {
                headers: { 'X-Riot-Token': RIOT_API_KEY },
              })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
            )
          );

          const validMatches = matches.filter(m => m !== null);
          
          let totalK = 0, totalD = 0, totalA = 0;
          const champCounts: Record<string, number> = {};
          const roleCounts: Record<string, number> = {};

          validMatches.forEach((match: any) => {
            const p = match.info.participants.find((x: any) => x.puuid === puuid);
            if (p) {
              totalK += p.kills;
              totalD += p.deaths;
              totalA += p.assists;
              champCounts[p.championName] = (champCounts[p.championName] || 0) + 1;
              const role = p.teamPosition || 'UTILITY';
              roleCounts[role] = (roleCounts[role] || 0) + 1;
            }
          });

          kda = totalD > 0 ? (totalK + totalA) / totalD : (totalK + totalA);
          mainChampion = Object.entries(champCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
          
          const roleMap: Record<string, string> = {
            'TOP': 'Top', 'JUNGLE': 'Jungle', 'MIDDLE': 'Mid',
            'BOTTOM': 'ADC', 'UTILITY': 'Support'
          };
          const mainRoleKey = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UTILITY';
          mainRole = roleMap[mainRoleKey] || 'Unknown';
        }
      }
    } catch (e) {
      console.warn('Match history error:', e);
    }

    return {
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerId: summoner.id,
      puuid,
      level: summoner.summonerLevel,
      tier: ranked?.tier || 'UNRANKED',
      rank: ranked?.rank || '',
      leaguePoints: ranked?.leaguePoints || 0,
      wins: ranked?.wins || 0,
      losses: ranked?.losses || 0,
      winRate,
      totalGames,
      kda,
      mainRole,
      mainChampion,
      recentForm: winRate,
    };
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

export async function getPlayerStats(puuid: string, region: string = 'euw1'): Promise<PlayerStats> {
  const regionalUrl = REGIONAL_ENDPOINTS[region] || REGIONAL_ENDPOINTS['euw1'];
  const platformUrl = PLATFORM_ENDPOINTS[region] || PLATFORM_ENDPOINTS['euw1'];

  const summonerRes = await fetch(
    `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY } }
  );

  if (!summonerRes.ok) throw new Error('Player not found');
  const summoner = await summonerRes.json();

  const leagueRes = await fetch(
    `${platformUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY } }
  );

  const league = await leagueRes.json();
  const ranked = league.find((e: any) => e.queueType === 'RANKED_SOLO_5x5') || league[0] || {};

  const totalGames = (ranked?.wins || 0) + (ranked?.losses || 0);
  const winRate = totalGames > 0 ? (ranked.wins / totalGames) * 100 : 0;

  let kda = 0, mainChampion = 'Unknown', mainRole = 'Unknown';

  try {
    const matchesRes = await fetch(
      `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (matchesRes.ok) {
      const matchIds = await matchesRes.json();
      
      if (matchIds.length > 0) {
        const matches = await Promise.all(
          matchIds.slice(0, 5).map((id: string) =>
            fetch(`${regionalUrl}/lol/match/v5/matches/${id}`, {
              headers: { 'X-Riot-Token': RIOT_API_KEY },
            })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
          )
        );

        const validMatches = matches.filter(m => m !== null);
        
        let totalK = 0, totalD = 0, totalA = 0;
        const champCounts: Record<string, number> = {};
        const roleCounts: Record<string, number> = {};

        validMatches.forEach((match: any) => {
          const p = match.info.participants.find((x: any) => x.puuid === puuid);
          if (p) {
            totalK += p.kills;
            totalD += p.deaths;
            totalA += p.assists;
            champCounts[p.championName] = (champCounts[p.championName] || 0) + 1;
            const role = p.teamPosition || 'UTILITY';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
          }
        });

        kda = totalD > 0 ? (totalK + totalA) / totalD : (totalK + totalA);
        mainChampion = Object.entries(champCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        
        const roleMap: Record<string, string> = {
          'TOP': 'Top', 'JUNGLE': 'Jungle', 'MIDDLE': 'Mid',
          'BOTTOM': 'ADC', 'UTILITY': 'Support'
        };
        const mainRoleKey = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UTILITY';
        mainRole = roleMap[mainRoleKey] || 'Unknown';
      }
    }
  } catch (e) {
    console.warn('Match error:', e);
  }

  return {
    gameName: 'Unknown',
    tagLine: 'NA1',
    summonerId: summoner.id,
    puuid,
    level: summoner.summonerLevel,
    tier: ranked?.tier || 'UNRANKED',
    rank: ranked?.rank || '',
    leaguePoints: ranked?.leaguePoints || 0,
    wins: ranked?.wins || 0,
    losses: ranked?.losses || 0,
    winRate,
    totalGames,
    kda,
    mainRole,
    mainChampion,
    recentForm: winRate,
  };
}

export async function getMatchHistory(puuid: string, region: string = 'euw1'): Promise<MatchHistory[]> {
  const regionalUrl = REGIONAL_ENDPOINTS[region] || REGIONAL_ENDPOINTS['euw1'];

  try {
    const matchesRes = await fetch(
      `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (!matchesRes.ok) return [];

    const matchIds = await matchesRes.json();
    
    const matches = await Promise.all(
      matchIds.map((id: string) =>
        fetch(`${regionalUrl}/lol/match/v5/matches/${id}`, {
          headers: { 'X-Riot-Token': RIOT_API_KEY },
        })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
      )
    );

    return matches.filter(m => m !== null).map((match: any) => {
      const p = match.info.participants.find((x: any) => x.puuid === puuid);
      const kda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : (p.kills + p.assists);
      
      return {
        matchId: match.metadata.matchId,
        champion: p.championName,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        win: p.win,
        duration: formatGameDuration(match.info.gameDuration),
        ago: calculateTimeAgo(match.info.gameEndTimestamp),
        mode: match.info.queueId === 420 ? 'Ranked Solo/Duo' : 'Normal',
        kda,
      };
    });
  } catch (error) {
    console.error('Match history error:', error);
    return [];
  }
}

export function formatRank(tier: string, rank: string): string {
  if (tier === 'UNRANKED') return 'Unranked';
  if (tier === 'CHALLENGER' || tier === 'GRANDMASTER' || tier === 'MASTER') return tier.charAt(0) + tier.slice(1).toLowerCase();
  return `${tier.charAt(0) + tier.slice(1).toLowerCase()} ${rank}`;
}
