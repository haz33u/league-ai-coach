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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameName = searchParams.get('gameName');
  const tagLine = searchParams.get('tagLine');
  const region = searchParams.get('region') || 'euw1';

  console.log('🔍 API Route - Search params:', { gameName, tagLine, region });
  console.log('🔑 API Key present:', !!RIOT_API_KEY);

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: 'Missing gameName or tagLine' },
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

    console.log('🌍 Regional URL:', regionalUrl);
    console.log('🖥️ Platform URL:', platformUrl);

    // Step 1: Get Account by Riot ID
    const accountUrl = `${regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    console.log('📡 Fetching account:', accountUrl);

    const accountRes = await fetch(accountUrl, {
      headers: { 
        'X-Riot-Token': RIOT_API_KEY,
        'Accept': 'application/json'
      },
    });

    console.log('📊 Account response status:', accountRes.status);

    if (!accountRes.ok) {
      const errorText = await accountRes.text();
      console.error('❌ Account API error:', errorText);
      
      if (accountRes.status === 404) {
        return NextResponse.json(
          { error: 'Player not found. Check spelling and tag line.' },
          { status: 404 }
        );
      }
      
      if (accountRes.status === 403 || accountRes.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired API key. Please update RIOT_API_KEY.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `Riot API error: ${accountRes.status}` },
        { status: accountRes.status }
      );
    }

    const account = await accountRes.json();
    console.log('✅ Account found:', account.gameName, account.tagLine);

    const puuid = account.puuid;

    // Step 2: Get Summoner by PUUID
    const summonerUrl = `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    console.log('📡 Fetching summoner:', summonerUrl);

    const summonerRes = await fetch(summonerUrl, {
      headers: { 
        'X-Riot-Token': RIOT_API_KEY,
        'Accept': 'application/json'
      },
    });

    console.log('📊 Summoner response status:', summonerRes.status);

    if (!summonerRes.ok) {
      const errorText = await summonerRes.text();
      console.error('❌ Summoner API error:', errorText);
      return NextResponse.json(
        { error: 'Summoner not found for this region' },
        { status: 404 }
      );
    }

    const summoner = await summonerRes.json();
    console.log('✅ Summoner found, level:', summoner.summonerLevel);

    // Step 3: Get League entries
    const leagueUrl = `${platformUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`;
    console.log('📡 Fetching league:', leagueUrl);

    const leagueRes = await fetch(leagueUrl, {
      headers: { 
        'X-Riot-Token': RIOT_API_KEY,
        'Accept': 'application/json'
      },
    });

    console.log('📊 League response status:', leagueRes.status);

    let ranked = {};
    if (leagueRes.ok) {
      const league = await leagueRes.json();
      ranked = league.find((e: any) => e.queueType === 'RANKED_SOLO_5x5') || league[0] || {};
      console.log('✅ League data:', ranked);
    }

    const totalGames = (ranked?.wins || 0) + (ranked?.losses || 0);
    const winRate = totalGames > 0 ? ((ranked.wins / totalGames) * 100).toFixed(1) : '0';

    const result = {
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid,
      summonerId: summoner.id,
      level: summoner.summonerLevel,
      tier: ranked?.tier || 'UNRANKED',
      rank: ranked?.rank || '',
      leaguePoints: ranked?.leaguePoints || 0,
      wins: ranked?.wins || 0,
      losses: ranked?.losses || 0,
      winRate: parseFloat(winRate),
      totalGames,
    };

    console.log('✅ Success! Returning player data');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
