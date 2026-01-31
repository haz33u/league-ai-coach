'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getPlayerStats, getMatchHistory, formatRank, type PlayerStats, type MatchHistory } from '@/lib/api';
import Logo from '@/components/Logo';
import styles from './page.module.css';

export default function PlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const puuid = params.puuid as string;
  const region = searchParams.get('region') || 'euw1';
  const gameName = searchParams.get('name') || 'Unknown';
  const tagLine = searchParams.get('tag') || 'Unknown';
  
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPlayer() {
      try {
        setLoading(true);
        console.log('📊 Loading player:', puuid, region);
        
        // Load player stats
        const data = await getPlayerStats(puuid, region);
        console.log('✅ Player loaded:', data);
        
        // Override with URL params if available
        if (gameName !== 'Unknown') data.gameName = gameName;
        if (tagLine !== 'Unknown') data.tagLine = tagLine;
        
        setPlayerData(data);
        
        // Load match history
        const matchHistory = await getMatchHistory(puuid, region);
        console.log('✅ Matches loaded:', matchHistory.length);
        setMatches(matchHistory);
        
      } catch (err: any) {
        console.error('❌ Load error:', err);
        setError(err.message || 'Failed to load player data');
      } finally {
        setLoading(false);
      }
    }

    if (puuid) {
      loadPlayer();
    }
  }, [puuid, region, gameName, tagLine]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading live stats from Riot API...</p>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className={styles.error}>
        <h2>Player not found</h2>
        <p>{error}</p>
        <a href="/" className={styles.backLink}>← Back to home</a>
      </div>
    );
  }

  const getRankIcon = (tier: string) => {
    if (!tier || tier === 'UNRANKED') {
      return 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-unranked.png';
    }
    const tierLower = tier.toLowerCase();
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tierLower}.png`;
  };

  const getProfileIcon = (level: number) => {
    // Use a default profile icon based on level
    const iconId = (level % 28) + 1;
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-content">
          <a href="/" className="logo">
            <Logo /> Nexus Oracle
          </a>
          <ul className="nav-links">
            <li><a href="/">Search</a></li>
            <li><a href="/leaderboard">Leaderboard</a></li>
          </ul>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.container}>
          
          {/* LIVE INDICATOR */}
          <div style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#fff',
              borderRadius: '50%',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
              🔴 LIVE STATS - Updated from Riot API • Region: {region.toUpperCase()}
            </span>
          </div>

          {/* PROFILE BANNER */}
          <div className={styles.profileBanner}>
            <div className={styles.bannerBackground}></div>
            <div className={styles.profileContent}>
              <div className={styles.profileAvatarContainer}>
                <img 
                  src={getProfileIcon(playerData.level)} 
                  alt="Profile Icon"
                  className={styles.profileAvatar}
                  onError={(e) => {
                    e.currentTarget.src = 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png';
                  }}
                />
                <div className={styles.levelBadge}>{playerData.level}</div>
              </div>
              <div className={styles.profileInfo}>
                <h1 className={styles.playerName}>
                  {playerData.gameName} <span className={styles.tag}>#{playerData.tagLine}</span>
                </h1>
                <div className={styles.rankInfo}>
                  <span className={styles.rankBadge}>
                    {formatRank(playerData.tier, playerData.rank)}
                  </span>
                  <span className={styles.lpBadge}>{playerData.leaguePoints} LP</span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className={styles.statsOverview}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{playerData.winRate.toFixed(1)}%</div>
              <div className={styles.statLabel}>Win Rate</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{playerData.wins}W {playerData.losses}L</div>
              <div className={styles.statLabel}>Ranked Games</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{playerData.kda.toFixed(1)}:1</div>
              <div className={styles.statLabel}>Average KDA</div>
            </div>
          </div>

          {/* DETAILED STATS GRID */}
          <h2 className={styles.sectionTitle}>Player Statistics</h2>
          <div className={styles.statsGrid}>
            
            <div className={`${styles.statCard} ${styles.green}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#22c55e"/>
                  </svg>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Win Rate</p>
                  <h3 className={styles.value}>{playerData.winRate.toFixed(1)}%</h3>
                  <p className={styles.subtext}>{playerData.wins}W - {playerData.losses}L</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.blue}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7V12C2 17.55 5.84 22.54 12 24C18.16 22.54 22 17.55 22 12V7L12 2Z" fill="#0071e3"/>
                  </svg>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Average KDA</p>
                  <h3 className={styles.value}>{playerData.kda.toFixed(1)}:1</h3>
                  <p className={styles.subtext}>Last 10 games</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.purple}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#7c3aed" opacity="0.2"/>
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#7c3aed"/>
                  </svg>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Total Games</p>
                  <h3 className={styles.value}>{playerData.totalGames.toLocaleString()}</h3>
                  <p className={styles.subtext}>Ranked Solo/Duo</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.orange}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapperLarge}>
                  <img 
                    src={getRankIcon(playerData.tier)} 
                    alt={playerData.tier}
                    className={styles.rankIconLarge}
                    onError={(e) => {
                      e.currentTarget.src = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-unranked.png';
                    }}
                  />
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Current Rank</p>
                  <h3 className={styles.value}>{formatRank(playerData.tier, playerData.rank)}</h3>
                  <p className={styles.subtext}>{playerData.leaguePoints} LP</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.blue}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 19H22L12 2Z" fill="#0071e3" opacity="0.3"/>
                    <path d="M12 2L19 14H5L12 2Z" fill="#0071e3"/>
                  </svg>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Main Role</p>
                  <h3 className={styles.value}>{playerData.mainRole}</h3>
                  <p className={styles.subtext}>Most played</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.purple}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapperLarge}>
                  <div 
                    className={`champion-icon champion-${playerData.mainChampion.replace(/\s+/g, '')}`}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '12px',
                      background: `url(https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${playerData.mainChampion.replace(/[\s']/g, '')}.png)`,
                      backgroundSize: 'cover'
                    }}
                  />
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Main Champion</p>
                  <h3 className={styles.value}>{playerData.mainChampion}</h3>
                  <p className={styles.subtext}>Most played</p>
                </div>
              </div>
            </div>

          </div>

          {/* RECENT MATCHES */}
          <h2 className={styles.sectionTitle}>Recent Matches</h2>
          {matches.length === 0 ? (
            <div className={styles.noMatches}>
              <p>No recent matches found</p>
            </div>
          ) : (
            <div className={styles.matchesContainer}>
              {matches.map((match, index) => (
                <div key={index} className={`${styles.matchCard} ${match.win ? styles.matchWin : styles.matchLoss}`}>
                  <div className={styles.matchResult}>
                    <span className={styles.matchResultText}>
                      {match.win ? 'Victory' : 'Defeat'}
                    </span>
                  </div>
                  <div className={styles.matchDetails}>
                    <div 
                      className={styles.matchChampionIcon}
                      style={{ 
                        background: `url(https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${match.champion.replace(/[\s']/g, '')}.png)`,
                        backgroundSize: 'cover'
                      }} 
                    />
                    <div className={styles.matchInfo}>
                      <div className={styles.matchChamp}>{match.champion}</div>
                      <div className={styles.matchMode}>{match.mode}</div>
                    </div>
                    <div className={styles.matchKDA}>
                      <div className={styles.matchKDAValue}>{match.kills} / {match.deaths} / {match.assists}</div>
                      <div className={styles.matchKDALabel}>
                        {match.kda.toFixed(2)} KDA
                      </div>
                    </div>
                    <div className={styles.matchTime}>
                      <div className={styles.matchDuration}>{match.duration}</div>
                      <div className={styles.matchAgo}>{match.ago}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}