'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import styles from './page.module.css';
import { searchPlayer, RiotAPIError } from '@/lib/api';
import { rateLimiter } from '@/lib/rateLimit';

export default function HomePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('euw1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState('');

  const regions = [
    { value: 'euw1', label: '🇪🇺 Europe West' },
    { value: 'eun1', label: '🇪🇺 Europe Nordic & East' },
    { value: 'na1', label: '🇺🇸 North America' },
    { value: 'kr', label: '🇰🇷 Korea' },
    { value: 'br1', label: '🇧🇷 Brazil' },
    { value: 'tr1', label: '🇹🇷 Turkey' },
    { value: 'ru', label: '🇷🇺 Russia' },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameName.trim() || !tagLine.trim()) {
      setError('Please enter both Game Name and Tag Line');
      return;
    }

    setLoading(true);
    setError('');
    setRateLimitInfo('');

    try {
      const stats = rateLimiter.getStats();
      setRateLimitInfo(`Rate Limit: ${stats.lastSecond}/${stats.limitSecond} req/s`);

      const result = await searchPlayer(gameName, tagLine, region);

      const params = new URLSearchParams({
        name: result.data.gameName,
        tag: result.data.tagLine,
        region: result.region,
      });

      router.push(`/player/${result.data.puuid}?${params.toString()}`);
    } catch (err) {
      if (err instanceof RiotAPIError) {
        if (err.statusCode === 404) {
          setError(`Player "${gameName}#${tagLine}" not found.`);
        } else if (err.statusCode === 429) {
          setError('Rate limit reached. Please wait a moment.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <div className={styles.logoText}>
              <h1 className={styles.logoTitle}>Nexus Oracle</h1>
              <p className={styles.logoSubtitle}>LoL Analytics</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h2 className={styles.heroTitle}>
              League of Legends
              <br />
              <span className={styles.heroGradient}>Performance Analytics</span>
            </h2>
            <p className={styles.heroSubtitle}>
              Professional-grade stats powered by Riot Games API
            </p>
          </div>

          <form onSubmit={handleSearch} ref={formRef} className={styles.searchContainer}>
            <div className={styles.searchForm}>
              <div className={styles.inputWrapper}>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder="Game Name"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className={styles.input}
                    disabled={loading}
                    autoFocus
                    autoComplete="off"
                  />
                  <span className={styles.separator}>#</span>
                  <input
                    type="text"
                    placeholder="Tag"
                    value={tagLine}
                    onChange={(e) => setTagLine(e.target.value)}
                    className={styles.inputTag}
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={loading}
                >
                  {regions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.buttonGroup}>
                <button type="submit" disabled={loading || !gameName.trim() || !tagLine.trim()}>
                  {loading ? <>⟳ Searching...</> : <>🔍 Search</>}
                </button>
              </div>

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              {rateLimitInfo && (
                <div className={styles.rateLimitInfo}>
                  {rateLimitInfo}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
