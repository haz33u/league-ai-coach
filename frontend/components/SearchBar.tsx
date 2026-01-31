'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchPlayer, formatRank, type PlayerStats } from '@/lib/api';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!gameName.trim() || !tagLine.trim()) {
    setError('Please fill in both fields');
    return;
  }

  setLoading(true);
  setError('');
  setPlayerData(null);

  try {
    const player = await searchPlayer(gameName.trim(), tagLine.trim());
    setPlayerData(player);
    setError('');
    
    // ПЕРЕХОД НА СТРАНИЦУ ИГРОКА
    setTimeout(() => {
      router.push(`/player/${player.puuid}`);
    }, 1000);
  } catch (err) {
    setError('Player not found. Try again!');
    setPlayerData(null);
  } finally {
    setLoading(false);
  }
};


  const handleQuickSearch = (name: string, tag: string) => {
    setGameName(name);
    setTagLine(tag);
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchGlow}></div>
      
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchHeader}>
          <div className={styles.iconBadge}>
            <svg
              viewBox="0 0 200 200"
              width="48"
              height="48"
              className={styles.nexusIcon}
            >
              <defs>
                <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#0071e3', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <polygon
                points="100,20 140,60 120,100 140,140 100,180 60,140 80,100 60,60"
                fill="url(#nexusGradient)"
                opacity="0.3"
              />

              <circle
                cx="100"
                cy="100"
                r="55"
                fill="none"
                stroke="url(#nexusGradient)"
                strokeWidth="2"
                opacity="0.6"
              />

              <path
                d="M 70 100 Q 100 70 130 100"
                fill="none"
                stroke="url(#nexusGradient)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <path
                d="M 70 100 Q 100 130 130 100"
                fill="none"
                stroke="url(#nexusGradient)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              <circle
                cx="100"
                cy="100"
                r="15"
                fill="url(#nexusGradient)"
                filter="url(#glow)"
              />

              <circle
                cx="100"
                cy="100"
                r="8"
                fill="#ffffff"
                opacity="0.9"
              />

              <circle
                cx="100"
                cy="100"
                r="4"
                fill="#0071e3"
              />
            </svg>
          </div>
          <h2 className={styles.searchTitle}>Nexus Oracle</h2>
          <p className={styles.searchSubtitle}>See Beyond the Rift</p>
        </div>

        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <label htmlFor="gameName" className={styles.inputLabel}>
              <span className={styles.labelIcon}>👤</span>
              Summoner Name
            </label>
            <input
              id="gameName"
              type="text"
              placeholder="e.g., Faker"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.inputWrapper}>
            <label htmlFor="tagLine" className={styles.inputLabel}>
              <span className={styles.labelIcon}>#️⃣</span>
              Tag
            </label>
            <input
              id="tagLine"
              type="text"
              placeholder="e.g., T1"
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              className={styles.input}
              disabled={loading}
              maxLength={5}
            />
          </div>

          <button
            type="submit"
            className={`${styles.searchBtn} ${loading ? styles.loading : ''}`}
            disabled={loading}
          >
            <span className={styles.btnIcon}>⚡</span>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {playerData && (
          <div className={styles.playerCard}>
            <div className={styles.playerInfo}>
              <h3 className={styles.playerName}>
                {playerData.gameName} <span className={styles.playerTag}>#{playerData.tagLine}</span>
              </h3>
              <p className={styles.playerRank}>
                {formatRank(playerData.tier, playerData.rank)} • Level {playerData.level}
              </p>
            </div>
            <div className={styles.playerStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Win Rate</span>
                <span className={styles.statValue}>{playerData.winRate.toFixed(1)}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Record</span>
                <span className={styles.statValue}>{playerData.wins}W-{playerData.losses}L</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.suggestions}>
          <p className={styles.suggestionsLabel}>Popular Searches:</p>
          <div className={styles.suggestionTags}>
            <button
              type="button"
              className={styles.tag}
              onClick={() => {
                handleQuickSearch('Faker', 'T1');
              }}
            >
              Faker • T1
            </button>
            <button
              type="button"
              className={styles.tag}
              onClick={() => {
                handleQuickSearch('Doublelift', 'NA1');
              }}
            >
              Doublelift
            </button>
            <button
              type="button"
              className={styles.tag}
              onClick={() => {
                handleQuickSearch('Caps', 'FNC');
              }}
            >
              Caps • FNC
            </button>
          </div>
        </div>
      </form>

      <div className={styles.floatingElements}>
        <div className={styles.float1}>📊</div>
        <div className={styles.float2}>🏆</div>
        <div className={styles.float3}>⚔️</div>
      </div>
    </div>
  );
}
