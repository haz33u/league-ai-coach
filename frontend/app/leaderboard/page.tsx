'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import Link from 'next/link';
import styles from './page.module.css';

type LeaderboardState = {
  players: any[];
  tier?: string;
  platform?: string;
};

const getProfileIcon = (iconId?: number | null) => {
  if (!iconId) return '';
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
};

const getTierEmblem = (tier?: string | null) => {
  const key = (tier || 'CHALLENGER').toLowerCase();
  const map: Record<string, string> = {
    challenger: '/ranks/ChallengerLogo.png',
    grandmaster: '/ranks/GrandmasterLogo.png',
    master: '/ranks/MasterLogo.png',
  };
  return map[key] || '/ranks/ChallengerLogo.png';
};

export default function LeaderboardPage() {
  const [board, setBoard] = useState<LeaderboardState>({ players: [] });
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<'euw1' | 'ru'>('euw1');
  const [updatedAt, setUpdatedAt] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadBoard = async () => {
      try {
        const data = await getLeaderboard(platform, 50);
        if (!isMounted) return;
        setBoard({ players: data.players || [], tier: data.tier, platform: data.platform });
        setUpdatedAt(new Date().toLocaleTimeString());
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    setLoading(true);
    loadBoard();
    const intervalId = setInterval(loadBoard, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [platform]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingPulse}>Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.backdrop} />
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back
        </Link>

        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Nexus Oracle</p>
            <h1 className={styles.title}>Challenger Leaderboard</h1>
            <p className={styles.subtitle}>
              Live ranked solo/duo ladder · {board.tier || 'Challenger'} · updates every 5 min
            </p>
          </div>
          <div className={styles.controls}>
            <div className={styles.toggleGroup}>
              <button
                onClick={() => setPlatform('euw1')}
                className={`${styles.toggleButton} ${platform === 'euw1' ? styles.active : ''}`}
              >
                EUW
              </button>
              <button
                onClick={() => setPlatform('ru')}
                className={`${styles.toggleButton} ${platform === 'ru' ? styles.active : ''}`}
              >
                RU
              </button>
            </div>
            <div className={styles.updatedAt}>Updated: {updatedAt || 'just now'}</div>
          </div>
        </div>

        {board.players.length > 0 && (
          <div className={styles.spotlight}>
            <div className={styles.spotlightGlow} />
            <div className={styles.spotlightBadge}>Top 1 Spotlight</div>
            <div className={styles.spotlightRow}>
              <div className={styles.spotlightAvatar}>
                {getProfileIcon(board.players[0].profile_icon_id) ? (
                  <img
                    src={getProfileIcon(board.players[0].profile_icon_id)}
                    alt={board.players[0].riot_id || board.players[0].summoner_name || 'Challenger'}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {(board.players[0].riot_id || board.players[0].summoner_name || 'C')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}
                <span className={styles.spotlightEmblem} />
              </div>
              <div className={styles.spotlightInfo}>
                <div className={styles.spotlightName}>
                  {board.players[0].riot_id || board.players[0].summoner_name || 'Unknown'}
                </div>
                <div className={styles.spotlightTags}>Arcane Crowned · Challenger</div>
              </div>
              <div className={styles.spotlightStats}>
                <div className={styles.spotlightLp}>
                  {board.players[0].league_points ?? 0} LP
                </div>
                <div className={styles.spotlightWin}>
                  {Math.round(board.players[0].winrate ?? 0)}% Win Rate
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.board}>
          <div className={styles.tableHeader}>
            <span>#</span>
            <span>Summoner</span>
            <span>LP</span>
            <span>Win Rate</span>
          </div>
          <div className={styles.tableBody}>
            {board.players.map((player, index) => {
              const isTop = index === 0;
              const isTop3 = index < 3;
              const isTop10 = index < 10;
              const isTop25 = index < 25;
              const isTop50 = index < 50;
              const isTop15 = index < 15;
              const isTop35 = index < 35;
              const name = player.riot_id || player.summoner_name || 'Unknown';
              const tierEmblem = getTierEmblem(player.tier);
              const profileHref = player.puuid
                ? `/player/${player.puuid}?name=${encodeURIComponent(player.riot_id || player.summoner_name || '')}&tag=${encodeURIComponent((player.riot_id || '').split('#')[1] || '')}&region=${platform}`
                : '#';
              const iconUrl = getProfileIcon(player.profile_icon_id);
              const showTop10Cut = index === 10;
              const showTop25Cut = index === 25;
              const isThird = index === 2;
              return (
                <div key={`${name}-${index}`}>
                  {showTop10Cut && <div className={styles.separator}>Top 10</div>}
                  {showTop25Cut && <div className={styles.separator}>Top 25</div>}
                  <Link
                    href={profileHref}
                    className={`${styles.row} ${styles.rowLink} ${isTop ? styles.rowTop : ''} ${isTop ? styles.rowTop1 : ''} ${isTop3 ? styles.rowTop3 : ''} ${isThird ? styles.rowTop3Low : ''} ${isTop10 ? styles.rowTop10 : ''} ${isTop25 ? styles.rowTop25 : ''} ${!isTop25 && isTop50 ? styles.rowTop50 : ''}`}
                    aria-disabled={!player.puuid}
                  >
                    {isTop3 && <span className={styles.flameLeft} />}
                    {isTop3 && <span className={styles.flameRight} />}
                    <div className={styles.rankCell}>
                      <span className={styles.rankNum}>{index + 1}</span>
                      {isTop && <span className={styles.crown}>👑</span>}
                    </div>
                    <div className={styles.nameCell}>
                      <div className={styles.nameRow}>
                        <div className={styles.avatarWrap}>
                          {iconUrl ? (
                            <img src={iconUrl} alt={name} className={styles.avatar} />
                          ) : (
                            <div className={styles.avatarFallback}>{name.slice(0, 1).toUpperCase()}</div>
                          )}
                          <span className={styles.challengerEmblem} style={{ backgroundImage: `url(${tierEmblem})` }} />
                          {isTop && <span className={styles.topAura} />}
                        </div>
                        <div className={styles.nameStack}>
                          <span className={styles.name}>{name}</span>
                          {isTop && <span className={styles.championTag}>Arcane Crowned</span>}
                        </div>
                      </div>
                      {isTop3 && !isTop && <span className={styles.topBadge}>Arcane Crowned</span>}
                      {!isTop3 && isTop10 && <span className={styles.topBadge}>Arcane Vanguard</span>}
                      {!isTop10 && isTop25 && <span className={styles.topBadge}>Silver Arcane</span>}
                      {!isTop25 && isTop50 && <span className={styles.topBadgeBronze}>Bronze Arcane</span>}
                    </div>
                    <div
                    className={`${styles.lpCell} ${styles.lpPulse} ${isTop ? styles.lpTop1 : ''} ${!isTop && isTop3 ? styles.lpTop3 : ''} ${!isTop3 && isTop10 ? styles.lpTop10 : ''} ${!isTop10 && isTop25 ? styles.lpTop25 : ''} ${!isTop25 && isTop50 ? styles.lpTop50 : ''} ${!isTop25 && isTop50 && !isTop35 ? styles.lpBronze : ''} ${!isTop10 && isTop25 && !isTop15 ? styles.lpSilver : ''}`}
                    >
                      {player.league_points ?? 0} LP
                    </div>
                    <div className={styles.winCell}>
                      <div className={styles.winBar}>
                        <span style={{ width: `${Math.min(player.winrate ?? 0, 100)}%` }} />
                      </div>
                      <span>{Math.round(player.winrate ?? 0)}%</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
