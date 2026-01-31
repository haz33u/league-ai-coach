'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { searchPlayer } from '@/lib/api';
import Logo from '@/components/Logo';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('euw1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    
    if (!gameName.trim()) {
      setError('Enter summoner name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await searchPlayer(
        gameName.trim(), 
        tagLine.trim() || 'EUW',
        region
      );
      
      const urlName = encodeURIComponent(data.gameName);
      const urlTag = encodeURIComponent(data.tagLine);
      router.push(`/player/${data.puuid}?region=${region}&name=${urlName}&tag=${urlTag}`);
      
    } catch (err: any) {
      setError(err.message || 'Player not found');
      setLoading(false);
    }
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <a href="/" className={styles.navLogo}>
            <Logo />
            <span className={styles.navBrand}>Nexus Oracle</span>
          </a>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.container}>
          
          <div className={styles.heroLogo}>
            <div className={styles.logoCircle}>
              <Logo />
            </div>
          </div>

          <div className={styles.header}>
            <h1 className={styles.title}>
              <span className={styles.gradientText}>Nexus Oracle</span>
            </h1>
            <p className={styles.subtitle}>League of Legends Analytics</p>
            <p className={styles.description}>Real-time player statistics powered by Riot API</p>
          </div>

          <div className={styles.searchCard}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.inputsGrid}>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Summoner name"
                  className={styles.input}
                  disabled={loading}
                />

                <input
                  type="text"
                  value={tagLine}
                  onChange={(e) => setTagLine(e.target.value)}
                  placeholder="Tag"
                  className={styles.input}
                  disabled={loading}
                />

                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={styles.input}
                  disabled={loading}
                >
                  <option value="euw1">EUW</option>
                  <option value="eun1">EUNE</option>
                  <option value="na1">NA</option>
                  <option value="kr">KR</option>
                  <option value="br1">BR</option>
                  <option value="la1">LAN</option>
                  <option value="la2">LAS</option>
                  <option value="tr1">TR</option>
                  <option value="ru">RU</option>
                  <option value="jp1">JP</option>
                </select>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button 
                type="submit" 
                className={styles.button}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search Player'}
              </button>
            </form>
          </div>

          <div className={styles.examples}>
            <p className={styles.examplesLabel}>Popular Players</p>
            <div className={styles.exampleButtons}>
              <button 
                onClick={() => { setGameName('Diamondprox'); setTagLine('ProX'); setRegion('euw1'); }}
                className={styles.exampleBtn}
              >
                Diamondprox
              </button>
              <button 
                onClick={() => { setGameName('Faker'); setTagLine('T1'); setRegion('kr'); }}
                className={styles.exampleBtn}
              >
                Faker
              </button>
              <button 
                onClick={() => { setGameName('Caps'); setTagLine('FNC'); setRegion('euw1'); }}
                className={styles.exampleBtn}
              >
                Caps
              </button>
            </div>
          </div>

          <div className={styles.features}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📊</div>
              <h3>Real-time Stats</h3>
              <p>Live rank, LP, winrate from Riot API</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎯</div>
              <h3>Match History</h3>
              <p>Detailed game analytics & KDA</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌍</div>
              <h3>10 Regions</h3>
              <p>EUW, NA, KR, and more</p>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
