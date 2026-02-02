'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getPlayerAnalysisByPuuid, getRankedByName, formatRank, type AnalysisResponse, type RecentMatch, type RankedQueue } from '@/lib/api';
import Logo from '@/components/Logo';
import styles from './page.module.css';

export default function PlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const puuid = params.puuid as string;
  const platform = searchParams.get('region') || 'euw1';
  const gameName = searchParams.get('name') || 'Unknown';
  const tagLine = searchParams.get('tag') || 'Unknown';
  
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rankedFallback, setRankedFallback] = useState<RankedQueue | null>(null);

  useEffect(() => {
    async function loadPlayer() {
      try {
        setLoading(true);
        console.log('📊 Loading player:', puuid, platform);
        
        const data = await getPlayerAnalysisByPuuid(puuid, platform, {
          includeTimeline: true,
          timelineMatches: 3,
        });
        console.log('✅ Player loaded:', data);
        
        // Override with URL params if available
        if (gameName !== 'Unknown') data.player.game_name = gameName;
        if (tagLine !== 'Unknown') data.player.tag_line = tagLine;
        
        setAnalysis(data);
        setMatches(data.recent_matches || []);

        const hasRanked = Boolean(data.ranked?.solo?.tier || data.ranked?.flex?.tier);
        if (!hasRanked && gameName !== 'Unknown' && tagLine !== 'Unknown') {
          try {
            const rankedData = await getRankedByName(gameName, tagLine, platform);
            setRankedFallback(rankedData.solo || rankedData.flex || null);
          } catch (rankErr) {
            console.warn('Ranked fallback failed:', rankErr);
          }
        }
        
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
  }, [puuid, platform, gameName, tagLine]);

  const getRankIconSources = (tier?: string | null) => {
    const tierUpper = (tier || 'UNRANKED').toUpperCase();
    const localMap: Record<string, string> = {
      UNRANKED: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-unranked.png',
      IRON: '/ranks/IronLogo.png',
      BRONZE: '/ranks/BronzeLogo.png',
      SILVER: '/ranks/SilverLogo.png',
      GOLD: '/ranks/GoldLogo.png',
      PLATINUM: '/ranks/PlatinumLogo.png',
      EMERALD: '/ranks/EmeraldLogo.png',
      DIAMOND: '/ranks/DiamondLogo.png',
      MASTER: '/ranks/MasterLogo.png',
      GRANDMASTER: '/ranks/GrandMasterLogo.png',
      CHALLENGER: '/ranks/ChallengerLogo.png',
    };

    const tierLower = tierUpper.toLowerCase();
    const tierTitle = tierLower.charAt(0).toUpperCase() + tierLower.slice(1);

    return [
      localMap[tierUpper] || localMap.UNRANKED,
      `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/RankedEmblem_${tierTitle}.png`,
      `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tierLower}.png`,
    ];
  };

  const getProfileIcon = (profileIconId?: number) => {
    const iconId = profileIconId || 29;
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
  };

  const getRoleIcon = (role: string) => {
    const roleKey = role.toLowerCase();
    const spellMap: Record<string, string> = {
      top: 'SummonerTeleport.png',
      jungle: 'SummonerSmite.png',
      mid: 'SummonerDot.png',
      middle: 'SummonerDot.png',
      adc: 'SummonerHeal.png',
      bottom: 'SummonerHeal.png',
      support: 'SummonerExhaust.png',
      utility: 'SummonerExhaust.png',
    };
    const spell = spellMap[roleKey] || 'SummonerFlash.png';
    return `https://ddragon.leagueoflegends.com/cdn/16.2.1/img/spell/${spell}`;
  };

  const getStatGlyph = (key: 'win' | 'kda' | 'games') => {
    const glyphs: Record<string, string> = {
      win: 'W/R',
      kda: 'KDA',
      games: 'GMS',
    };
    return glyphs[key];
  };

  const rankedEntry = analysis?.ranked?.solo || analysis?.ranked?.flex || rankedFallback || null;
  const rankedTier = rankedEntry?.tier || 'UNRANKED';
  const rankedRank = rankedEntry?.rank || '';
  const rankedLp = rankedEntry?.leaguePoints ?? 0;
  const rankIconSources = useMemo(() => getRankIconSources(rankedTier), [rankedTier]);

  const mainChampion = useMemo(() => {
    if (!analysis) return 'Unknown';
    const entries = Object.entries(analysis.champions || {});
    if (entries.length === 0) return 'Unknown';
    return entries.sort((a, b) => b[1].games - a[1].games)[0][0];
  }, [analysis]);

  const mainChampionIcon = useMemo(() => {
    if (!analysis) return '';
    const match = matches.find((m) => m.champion === mainChampion);
    return match?.champion_detail?.icon || '';
  }, [analysis, matches, mainChampion]);

  const queueLabel = (queueId?: number) => {
    switch (queueId) {
      case 420:
        return 'Ranked Solo/Duo';
      case 440:
        return 'Ranked Flex';
      case 450:
        return 'ARAM';
      default:
        return 'Ranked';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatAgo = (timestamp?: number) => {
    if (!timestamp) return '—';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading live stats from Riot API...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className={styles.error}>
        <h2>Player not found</h2>
        <p>{error}</p>
        <a href="/" className={styles.backLink}>← Back to home</a>
      </div>
    );
  }

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

      <main className={styles.main} data-rank={rankedTier.toLowerCase()}>
        <div className={styles.container}>
          
          {/* LIVE INDICATOR */}
          <div className={styles.liveIndicator}>
            <div className={styles.liveDot} />
            <span>
              Nexus Oracle • Live analysis • Platform: {platform.toUpperCase()}
            </span>
          </div>

          {/* PROFILE BANNER */}
          <div className={styles.profileBanner}>
            <div className={styles.bannerBackground}></div>
            <div className={styles.profileContent}>
              <div className={styles.profileAvatarContainer}>
                <img 
                  src={getProfileIcon(analysis.player.profile_icon_id)} 
                  alt="Profile Icon"
                  className={styles.profileAvatar}
                  onError={(e) => {
                    e.currentTarget.src = 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png';
                  }}
                />
                <div className={styles.levelBadge}>{analysis.player.level}</div>
              </div>
              <div className={styles.profileInfo}>
                <div className={styles.playerNameWrap}>
                  <h1 className={styles.playerName}>
                    {analysis.player.game_name} <span className={styles.tag}>#{analysis.player.tag_line}</span>
                  </h1>
                </div>
                <div className={styles.rankInfo}>
                  <div className={styles.rankFrame}>
                    <img
                      src={rankIconSources[0]}
                      alt={rankedTier}
                      className={styles.rankEmblem}
                      data-fallback-idx="0"
                      onError={(e) => {
                        const current = Number(e.currentTarget.dataset.fallbackIdx || '0');
                        const next = current + 1;
                        if (rankIconSources[next]) {
                          e.currentTarget.dataset.fallbackIdx = String(next);
                          e.currentTarget.src = rankIconSources[next];
                        }
                      }}
                    />
                  </div>
                  <span className={styles.rankBadge}>
                    {formatRank(rankedTier, rankedRank)}
                  </span>
                  <span className={styles.lpBadge}>{rankedLp} LP</span>
                </div>
              </div>
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className={styles.statsOverview}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{analysis.summary.winrate.toFixed(1)}%</div>
              <div className={styles.statLabel}>Win Rate</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{analysis.summary.wins}W {analysis.summary.losses}L</div>
              <div className={styles.statLabel}>Ranked Games</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{analysis.performance.avg_kda.toFixed(2)}:1</div>
              <div className={styles.statLabel}>Average KDA</div>
            </div>
          </div>

          {/* DETAILED STATS GRID */}
          <h2 className={styles.sectionTitle}>Player Statistics</h2>
          <div className={styles.statsGrid}>
            
            <div className={`${styles.statCard} ${styles.green}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <span className={styles.tooltipWrap}>
                    <div className={styles.statGlyph} aria-label="Win rate">
                      {getStatGlyph('win')}
                    </div>
                    <span className={styles.tooltip}>Win Rate</span>
                  </span>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Win Rate</p>
                  <h3 className={styles.value}>{analysis.summary.winrate.toFixed(1)}%</h3>
                  <p className={styles.subtext}>{analysis.summary.wins}W - {analysis.summary.losses}L</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.blue}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <span className={styles.tooltipWrap}>
                    <div className={styles.statGlyph} aria-label="Average KDA">
                      {getStatGlyph('kda')}
                    </div>
                    <span className={styles.tooltip}>Average KDA</span>
                  </span>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Average KDA</p>
                  <h3 className={styles.value}>{analysis.performance.avg_kda.toFixed(2)}:1</h3>
                  <p className={styles.subtext}>Recent matches</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.purple}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <span className={styles.tooltipWrap}>
                    <div className={styles.statGlyph} aria-label="Total games">
                      {getStatGlyph('games')}
                    </div>
                    <span className={styles.tooltip}>Total Games</span>
                  </span>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Total Games</p>
                  <h3 className={styles.value}>{analysis.summary.total_games.toLocaleString()}</h3>
                  <p className={styles.subtext}>{queueLabel(420)}</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.orange}`}>
              <div className={styles.cardInner}>
                <div className={`${styles.iconWrapperLarge} ${styles.rankIconWrapper}`}>
                  <div className={styles.rankFrameLarge}>
                    <img 
                      src={rankIconSources[0]} 
                      alt={rankedTier}
                      className={styles.rankIconLarge}
                      data-fallback-idx="0"
                      onError={(e) => {
                        const current = Number(e.currentTarget.dataset.fallbackIdx || '0');
                        const next = current + 1;
                        if (rankIconSources[next]) {
                          e.currentTarget.dataset.fallbackIdx = String(next);
                          e.currentTarget.src = rankIconSources[next];
                        }
                      }}
                    />
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Current Rank</p>
                  <h3 className={styles.value}>{formatRank(rankedTier, rankedRank)}</h3>
                  <p className={styles.subtext}>{rankedLp} LP</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.blue}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  <img
                    src={getRoleIcon(analysis.roles.main_role)}
                    alt={analysis.roles.main_role}
                    className={styles.statIconImage}
                    onError={(e) => {
                      e.currentTarget.src = 'https://ddragon.leagueoflegends.com/cdn/16.2.1/img/spell/SummonerFlash.png';
                    }}
                  />
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Main Role</p>
                  <div className={styles.roleRow}>
                    <h3 className={styles.value}>{analysis.roles.main_role}</h3>
                  </div>
                  <p className={styles.subtext}>Primary role</p>
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.purple}`}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper} title={mainChampion}>
                  <div 
                    className={`${styles.championIconInner} champion-${mainChampion.replace(/\s+/g, '')}`}
                    style={{ 
                      backgroundImage: mainChampionIcon
                        ? `url(${mainChampionIcon})`
                        : `url(https://ddragon.leagueoflegends.com/cdn/16.2.1/img/champion/${mainChampion.replace(/[\s']/g, '')}.png)`,
                    }}
                  />
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.label}>Main Champion</p>
                  <h3 className={styles.value}>{mainChampion}</h3>
                  <p className={styles.subtext}>Most played</p>
                </div>
              </div>
            </div>

          </div>

          <div className={styles.gridSplit}>
            <div className={styles.glassPanel}>
              <h2 className={styles.sectionTitle}>Nexus DNA</h2>
              <div className={styles.dnaHeader}>
                <span className={styles.dnaPrimary}>{analysis.dna?.primary || 'Balanced'}</span>
                <div className={styles.dnaTags}>
                  {(analysis.dna?.tags || []).map((tag) => (
                    <span key={tag} className={styles.tagPill}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className={styles.dnaScores}>
                {analysis.dna?.scores &&
                  Object.entries(analysis.dna.scores).map(([key, value]) => (
                    <div key={key} className={styles.scoreRow}>
                      <span className={styles.scoreLabel}>{key}</span>
                      <div className={styles.scoreBar}>
                        <div className={styles.scoreFill} style={{ width: `${value}%` }} />
                      </div>
                      <span className={styles.scoreValue}>{value}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className={styles.glassPanel}>
              <h2 className={styles.sectionTitle}>Learning Path</h2>
              <div className={styles.learningList}>
                {(analysis.learning_path?.focuses || []).map((focus) => (
                  <div key={focus.title} className={styles.learningItem}>
                    <h3>{focus.title}</h3>
                    <p className={styles.learningReason}>{focus.reason}</p>
                    <p className={styles.learningAction}>{focus.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {analysis.early_game && (
            <div className={styles.glassPanel}>
              <h2 className={styles.sectionTitle}>Early Game Pulse</h2>
              <div className={styles.earlyGrid}>
                <div>
                  <span className={styles.earlyLabel}>Early Kills</span>
                  <span className={styles.earlyValue}>{analysis.early_game.avg_early_kills}</span>
                </div>
                <div>
                  <span className={styles.earlyLabel}>Early Deaths</span>
                  <span className={styles.earlyValue}>{analysis.early_game.avg_early_deaths}</span>
                </div>
                <div>
                  <span className={styles.earlyLabel}>Early Assists</span>
                  <span className={styles.earlyValue}>{analysis.early_game.avg_early_assists}</span>
                </div>
                <div>
                  <span className={styles.earlyLabel}>First Objective</span>
                  <span className={styles.earlyValue}>{Math.round(analysis.early_game.first_objective_participation_rate * 100)}%</span>
                </div>
              </div>
            </div>
          )}

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
                    <span className={styles.tooltipWrap}>
                      <div
                        className={styles.matchChampionIcon}
                        style={{
                          backgroundImage: `url(${match.champion_detail?.icon || `https://ddragon.leagueoflegends.com/cdn/16.2.1/img/champion/${match.champion.replace(/[\s']/g, '')}.png`})`,
                          backgroundSize: 'cover'
                        }} 
                      />
                      <span className={styles.tooltip}>{match.champion}</span>
                    </span>
                    <div className={styles.matchInfo}>
                      <div className={styles.matchChamp}>{match.champion}</div>
                      <div className={styles.matchMode}>{queueLabel(match.queue_id)}</div>
                    </div>
                    <div className={styles.matchKDA}>
                      <div className={styles.matchKDAValue}>{match.kills} / {match.deaths} / {match.assists}</div>
                      <div className={styles.matchKDALabel}>
                        {match.kda.toFixed(2)} KDA
                      </div>
                    </div>
                    <div className={styles.matchTime}>
                      <div className={styles.matchDuration}>{formatDuration(match.game_duration)}</div>
                      <div className={styles.matchAgo}>{formatAgo(match.game_creation)}</div>
                    </div>
                  </div>
                  <div className={styles.matchMeta}>
                    <div className={styles.iconRow}>
                      {(match.items_detail || []).map((item) => (
                        <span key={item.id} className={styles.tooltipWrap}>
                          <img src={item.icon} alt={item.name} className={styles.itemIcon} />
                          <span className={styles.tooltip}>{item.name}</span>
                        </span>
                      ))}
                    </div>
                    <div className={styles.iconRow}>
                      {(match.spells_detail || []).map((spell) => (
                        <span key={spell.id} className={styles.tooltipWrap}>
                          <img src={spell.icon} alt={spell.name} className={styles.spellIcon} />
                          <span className={styles.tooltip}>{spell.name}</span>
                        </span>
                      ))}
                      {match.runes_detail?.keystone && (
                        <span className={styles.tooltipWrap}>
                          <img
                            src={match.runes_detail.keystone.icon}
                            alt={match.runes_detail.keystone.name}
                            className={styles.runeIcon}
                          />
                          <span className={styles.tooltip}>{match.runes_detail.keystone.name}</span>
                        </span>
                      )}
                      {match.runes_detail?.sub_style && (
                        <span className={styles.tooltipWrap}>
                          <img
                            src={match.runes_detail.sub_style.icon}
                            alt={match.runes_detail.sub_style.name}
                            className={styles.runeStyleIcon}
                          />
                          <span className={styles.tooltip}>{match.runes_detail.sub_style.name}</span>
                        </span>
                      )}
                      {(match.runes_detail?.perks || []).slice(0, 4).map((perk) => (
                        <span key={perk.id} className={styles.tooltipWrap}>
                          <img
                            src={perk.icon}
                            alt={perk.name}
                            className={styles.runeStyleIcon}
                          />
                          <span className={styles.tooltip}>{perk.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

    </>
  );
}