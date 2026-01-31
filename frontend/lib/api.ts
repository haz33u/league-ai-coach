// Riot Games API configuration
const RIOT_API_KEY = process.env.NEXT_PUBLIC_RIOT_API_KEY || 'RGAPI-YOUR-KEY-HERE';
const BASE_URL_AMERICAS = 'https://americas.api.riotgames.com';
const BASE_URL_EUROPE = 'https://europe.api.riotgames.com';
const BASE_URL_ASIA = 'https://asia.api.riotgames.com';

// Regional endpoints
const REGIONAL_ENDPOINTS: Record<string, string> = {
  'na1': BASE_URL_AMERICAS,
  'br1': BASE_URL_AMERICAS,
  'la1': BASE_URL_AMERICAS,
  'la2': BASE_URL_AMERICAS,
  'euw1': BASE_URL_EUROPE,
  'eun1': BASE_URL_EUROPE,
  'tr1': BASE_URL_EUROPE,
  'ru': BASE_URL_EUROPE,
  'kr': BASE_URL_ASIA,
  'jp1': BASE_URL_ASIA,
};

const PLATFORM_ENDPOINTS: Record<string, string> = {
  'na1': 'https://na1.api.riotgames.com',
  'br1': 'https://br1.api.riotgames.com',
  'la1': 'https://la1.api.riotgames.com',
  'la2': 'https://la2.api.riotgames.com',
  'euw1': 'https://euw1.api.riotgames.com',
  'eun1': 'https://eun1.api.riotgames.com',
  'tr1': 'https://tr1.api.riotgames.com',
  'ru': 'https://ru.api.riotgames.com',
  'kr': 'https://kr.api.riotgames.com',
  'jp1': 'https://jp1.api.riotgames.com',
};

// ==================== TYPES ====================

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

// ==================== HELPER FUNCTIONS ====================

function calculateTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function formatGameDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// ==================== API FUNCTIONS ====================

export async function searchPlayer(
  gameName: string,
  tagLine: string,
  region: string = 'euw1'
): Promise<PlayerStats> {
  try {
    console.log('🔍 Searching for player:', gameName, tagLine, region);

    // 1. Get Account (PUUID) from REGIONAL endpoint
    const regionalUrl = REGIONAL_ENDPOINTS[region.toLowerCase()] || BASE_URL_EUROPE;
    const accountUrl = `${regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    
    console.log('📡 Account URL:', accountUrl);

    const accountResponse = await fetch(accountUrl, {
      headers: { 
        'X-Riot-Token': RIOT_API_KEY,
      },
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('❌ Account Error:', accountResponse.status, errorText);
      throw new Error('Player not found');
    }

    const account = await accountResponse.json();
    console.log('✅ Account found:', account);
    const puuid = account.puuid;

    // 2. Get Summoner Data from PLATFORM endpoint
    const platformUrl = PLATFORM_ENDPOINTS[region.toLowerCase()] || 'https://euw1.api.riotgames.com';
    const summonerUrl = `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    
    console.log('📡 Summoner URL:', summonerUrl);

    const summonerResponse = await fetch(summonerUrl, {
      headers: { 'X-Riot-Token': RIOT_API_KEY },
    });

    if (!summonerResponse.ok) {
      console.error('❌ Summoner Error:', summonerResponse.status);
      throw new Error('Could not fetch summoner data');
    }

    const summoner = await summonerResponse.json();
    console.log('✅ Summoner found:', summoner);

    // 3. Get Ranked Data
    const leagueUrl = `${platformUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`;
    console.log('📡 League URL:', leagueUrl);

    const leagueResponse = await fetch(leagueUrl, {
      headers: { 'X-Riot-Token': RIOT_API_KEY },
    });

    if (!leagueResponse.ok) {
      console.error('❌ League Error:', leagueResponse.status);
      throw new Error('Could not fetch league data');
    }

    const league = await leagueResponse.json();
    console.log('✅ League data:', league);

    const rankedData = league.find((entry: any) => entry.queueType === 'RANKED_SOLO_5x5') || league[0] || {};

    const totalGames = (rankedData?.wins || 0) + (rankedData?.losses || 0);
    const winRate = totalGames > 0 ? ((rankedData.wins / totalGames) * 100) : 0;

    // 4. Get Match History for KDA & Main Champion
    const matchesUrl = `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20`;
    console.log('📡 Matches URL:', matchesUrl);

    let kda = 0;
    let mainChampion = 'Unknown';
    let mainRole = 'Unknown';

    try {
      const matchesResponse = await fetch(matchesUrl, {
        headers: { 'X-Riot-Token': RIOT_API_KEY },
      });

      if (matchesResponse.ok) {
        const matchIds = await matchesResponse.json();
        console.log('✅ Found matches:', matchIds.length);
        
        if (matchIds.length > 0) {
          const matchPromises = matchIds.slice(0, 10).map((matchId: string) =>
            fetch(`${regionalUrl}/lol/match/v5/matches/${matchId}`, {
              headers: { 'X-Riot-Token': RIOT_API_KEY },
            })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
          );

          const matches = (await Promise.all(matchPromises)).filter(m => m !== null);
          console.log('✅ Loaded match details:', matches.length);
          
          let totalKills = 0;
          let totalDeaths = 0;
          let totalAssists = 0;
          const championCounts: Record<string, number> = {};
          const roleCounts: Record<string, number> = {};

          matches.forEach((match: any) => {
            const participant = match.info.participants.find((p: any) => p.puuid === puuid);
            if (participant) {
              totalKills += participant.kills;
              totalDeaths += participant.deaths;
              totalAssists += participant.assists;
              
              championCounts[participant.championName] = (championCounts[participant.championName] || 0) + 1;
              
              const role = participant.teamPosition || participant.individualPosition || 'UTILITY';
              roleCounts[role] = (roleCounts[role] || 0) + 1;
            }
          });

          kda = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : (totalKills + totalAssists);
          mainChampion = Object.entries(championCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
          
          const roleMap: Record<string, string> = {
            'TOP': 'Top',
            'JUNGLE': 'Jungle',
            'MIDDLE': 'Mid',
            'BOTTOM': 'ADC',
            'UTILITY': 'Support'
          };
          const mainRoleKey = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UTILITY';
          mainRole = roleMap[mainRoleKey] || 'Unknown';

          console.log('📊 KDA:', kda.toFixed(2), 'Main Champion:', mainChampion, 'Main Role:', mainRole);
        }
      }
    } catch (matchError) {
      console.warn('⚠️ Could not load match history:', matchError);
    }

    const playerStats: PlayerStats = {
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerId: summoner.id,
      puuid,
      level: summoner.summonerLevel,
      tier: rankedData?.tier || 'UNRANKED',
      rank: rankedData?.rank || '',
      leaguePoints: rankedData?.leaguePoints || 0,
      wins: rankedData?.wins || 0,
      losses: rankedData?.losses || 0,
      winRate,
      totalGames,
      kda,
      mainRole,
      mainChampion,
      recentForm: winRate,
    };

    console.log('✅ Final player stats:', playerStats);
    return playerStats;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
}

export async function getPlayerStats(puuid: string, region: string = 'euw1'): Promise<PlayerStats> {
  try {
    const platformUrl = PLATFORM_ENDPOINTS[region.toLowerCase()] || 'https://euw1.api.riotgames.com';
    const regionalUrl = REGIONAL_ENDPOINTS[region.toLowerCase()] || BASE_URL_EUROPE;

    const summonerResponse = await fetch(
      `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (!summonerResponse.ok) throw new Error('Player not found');

    const summoner = await summonerResponse.json();

    const leagueResponse = await fetch(
      `${platformUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    const league = await leagueResponse.json();
    const rankedData = league.find((entry: any) => entry.queueType === 'RANKED_SOLO_5x5') || league[0] || {};

    const totalGames = (rankedData?.wins || 0) + (rankedData?.losses || 0);
    const winRate = totalGames > 0 ? ((rankedData.wins / totalGames) * 100) : 0;

    let kda = 0;
    let mainChampion = 'Unknown';
    let mainRole = 'Unknown';

    const matchesResponse = await fetch(
      `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (matchesResponse.ok) {
      const matchIds = await matchesResponse.json();
      
      if (matchIds.length > 0) {
        const matchPromises = matchIds.slice(0, 10).map((matchId: string) =>
          fetch(`${regionalUrl}/lol/match/v5/matches/${matchId}`, {
            headers: { 'X-Riot-Token': RIOT_API_KEY },
          })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
        );

        const matches = (await Promise.all(matchPromises)).filter(m => m !== null);
        
        let totalKills = 0, totalDeaths = 0, totalAssists = 0;
        const championCounts: Record<string, number> = {};
        const roleCounts: Record<string, number> = {};

        matches.forEach((match: any) => {
          const participant = match.info.participants.find((p: any) => p.puuid === puuid);
          if (participant) {
            totalKills += participant.kills;
            totalDeaths += participant.deaths;
            totalAssists += participant.assists;
            championCounts[participant.championName] = (championCounts[participant.championName] || 0) + 1;
            const role = participant.teamPosition || 'UTILITY';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
          }
        });

        kda = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : (totalKills + totalAssists);
        mainChampion = Object.entries(championCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        
        const roleMap: Record<string, string> = {
          'TOP': 'Top', 'JUNGLE': 'Jungle', 'MIDDLE': 'Mid',
          'BOTTOM': 'ADC', 'UTILITY': 'Support'
        };
        const mainRoleKey = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UTILITY';
        mainRole = roleMap[mainRoleKey] || 'Unknown';
      }
    }

    return {
      gameName: 'Unknown',
      tagLine: 'NA1',
      summonerId: summoner.id,
      puuid,
      level: summoner.summonerLevel,
      tier: rankedData?.tier || 'UNRANKED',
      rank: rankedData?.rank || '',
      leaguePoints: rankedData?.leaguePoints || 0,
      wins: rankedData?.wins || 0,
      losses: rankedData?.losses || 0,
      winRate,
      totalGames,
      kda,
      mainRole,
      mainChampion,
      recentForm: winRate,
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function getMatchHistory(puuid: string, region: string = 'euw1'): Promise<MatchHistory[]> {
  try {
    const regionalUrl = REGIONAL_ENDPOINTS[region.toLowerCase()] || BASE_URL_EUROPE;

    const matchesResponse = await fetch(
      `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (!matchesResponse.ok) return [];

    const matchIds = await matchesResponse.json();
    
    const matchPromises = matchIds.map((matchId: string) =>
      fetch(`${regionalUrl}/lol/match/v5/matches/${matchId}`, {
        headers: { 'X-Riot-Token': RIOT_API_KEY },
      })
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
    );

    const matches = (await Promise.all(matchPromises)).filter(m => m !== null);
    
    return matches.map((match: any) => {
      const participant = match.info.participants.find((p: any) => p.puuid === puuid);
      const kda = participant.deaths > 0 
        ? (participant.kills + participant.assists) / participant.deaths 
        : (participant.kills + participant.assists);
      
      return {
        matchId: match.metadata.matchId,
        champion: participant.championName,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        win: participant.win,
        duration: formatGameDuration(match.info.gameDuration),
        ago: calculateTimeAgo(match.info.gameEndTimestamp),
        mode: match.info.queueId === 420 ? 'Ranked Solo/Duo' : 'Normal',
        kda,
      };
    });
  } catch (error) {
    console.error('Match History Error:', error);
    return [];
  }
}

export function formatRank(tier: string, rank: string): string {
  if (tier === 'UNRANKED') return 'Unranked';
  if (tier === 'CHALLENGER') return 'Challenger';
  if (tier === 'GRANDMASTER') return 'Grandmaster';
  if (tier === 'MASTER') return 'Master';
  return `${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()} ${rank}`;
}
