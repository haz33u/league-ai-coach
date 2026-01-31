import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY || process.env.NEXT_PUBLIC_RIOT_API_KEY;

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

interface LeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get('puuid');
  const region = searchParams.get('region') || 'euw1';

  console.log('Player stats request:', { puuid, region });

  if (!puuid) {
    return NextResponse.json(
      { error: 'Missing puuid parameter' },
      { status: 400 }
    );
  }

  if (!RIOT_API_KEY) {
    return NextResponse.json(
      { error: 'RIOT_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const regionalUrl = REGIONAL_ENDPOINTS[region] || REGIONAL_ENDPOINTS['euw1'];
    const platformUrl = PLATFORM_ENDPOINTS[region] || PLATFORM_ENDPOINTS['euw1'];

    // Step 1: Get Summoner by PUUID
    const summonerRes = await fetch(
      `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      {
        headers: { 
          'X-Riot-Token': RIOT_API_KEY,
          'Accept': 'application/json'
        },
      }
    );

    if (!summonerRes.ok) {
      const errorText = await summonerRes.text();
      console.error('Summoner API error:', errorText);
      return NextResponse.json(
        { error: 'Summoner not found' },
        { status: 404 }
      );
    }

    const summoner = await summonerRes.json();

    // Step 2: Get League entries
    const leagueRes = await fetch(
      `${platformUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`,
      {
        headers: { 
          'X-Riot-Token': RIOT_API_KEY,
          'Accept': 'application/json'
        },
      }
    );

    let ranked: Partial<LeagueEntry> = {};
    if (leagueRes.ok) {
      const league: LeagueEntry[] = await leagueRes.json();
      ranked = league.find((e) => e.queueType === 'RANKED_SOLO_5x5') || league[0] || {};
    }

    const totalGames = (ranked.wins || 0) + (ranked.losses || 0);
    const winRate = totalGames > 0 ? ((ranked.wins || 0) / totalGames * 100) : 0;

    // Step 3: Get Match History for KDA and main champion
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

    const result = {
      gameName: 'Unknown',
      tagLine: 'Unknown',
      puuid,
      summonerId: summoner.id,
      level: summoner.summonerLevel,
      tier: ranked.tier || 'UNRANKED',
      rank: ranked.rank || '',
      leaguePoints: ranked.leaguePoints || 0,
      wins: ranked.wins || 0,
      losses: ranked.losses || 0,
      winRate,
      totalGames,
      kda,
      mainRole,
      mainChampion,
      recentForm: winRate,
    };

    console.log('Player stats loaded successfully');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
