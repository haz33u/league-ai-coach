'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Logo from '@/components/Logo';
import styles from './page.module.css';

interface ChampionStats {
  name: string;
  title: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  kda: number;
  totalGames: number;
  tier: string;
  mainRole: string;
  secondaryRole: string;
}

// ===== MOCK DATA для популярных героев =====
const mockChampionData: Record<string, Partial<ChampionStats>> = {
  'Lee Sin': {
    title: 'The Blind Monk',
    winRate: 49.8,
    pickRate: 16.2,
    banRate: 4.5,
    kda: 2.8,
    totalGames: 450230,
    tier: 'S',
    mainRole: 'Jungle',
    secondaryRole: 'Top',
  },
  'Azir': {
    title: 'The Emperor of the Sands',
    winRate: 47.2,
    pickRate: 8.5,
    banRate: 2.1,
    kda: 3.2,
    totalGames: 120340,
    tier: 'A',
    mainRole: 'Mid',
    secondaryRole: 'Bot',
  },
  'Lucian': {
    title: 'The Purifier',
    winRate: 51.3,
    pickRate: 12.8,
    banRate: 3.2,
    kda: 3.5,
    totalGames: 380120,
    tier: 'S',
    mainRole: 'ADC',
    secondaryRole: 'Mid',
  },
  'Sylas': {
    title: 'The Unshackled',
    winRate: 50.1,
    pickRate: 10.4,
    banRate: 5.8,
    kda: 2.9,
    totalGames: 290450,
    tier: 'A',
    mainRole: 'Mid',
    secondaryRole: 'Jungle',
  },
};

// ===== FALLBACK для ВСЕХ остальных героев =====
const getDefaultChampionData = (name: string): ChampionStats => ({
  name,
  title: 'Champion',
  winRate: 50.0 + (Math.random() - 0.5) * 4, // 48-52%
  pickRate: 3.0 + Math.random() * 7, // 3-10%
  banRate: 1.0 + Math.random() * 4, // 1-5%
  kda: 2.5 + Math.random() * 1.5, // 2.5-4.0
  totalGames: Math.floor(50000 + Math.random() * 200000), // 50k-250k
  tier: ['B', 'A', 'S'][Math.floor(Math.random() * 3)],
  mainRole: 'Unknown',
  secondaryRole: 'Unknown',
});

// Mock builds (генерируются динамически)
const generateBuilds = (_championName: string) => {
  const items = [
    'Eclipse', 'Trinity Force', 'Black Cleaver', 'Death Dance', 
    'Sterak Gage', 'Guardian Angel', 'Maw of Malmortius',
    'Luden Echo', 'Rabadon Deathcap', 'Void Staff',
    'Infinity Edge', 'Phantom Dancer', 'Bloodthirster'
  ];
  
  return items.slice(0, 6).map((item, idx) => ({
    item,
    winRate: 52.5 - idx * 0.8 + Math.random() * 2
  }));
};

// Mock runes (генерируются динамически)
const generateRunes = (_championName: string) => {
  const runes = [
    'Conqueror', 'Electrocute', 'Dark Harvest', 'Phase Rush',
    'Grasp of the Undying', 'Aftershock', 'Arcane Comet', 'Press the Attack'
  ];
  
  return runes.slice(0, 4).map((name, idx) => ({
    name,
    winRate: 52.0 - idx * 1.2 + Math.random() * 2,
    pickRate: 70.0 - idx * 15 + Math.random() * 5
  }));
};

export default function ChampionPage() {
  const params = useParams();
  const championName = decodeURIComponent(params.name as string);
  const [championData, setChampionData] = useState<ChampionStats | null>(null);
  const [builds, setBuilds] = useState<any[]>([]);
  const [runes, setRunes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChampion() {
      setLoading(true);
      
      // Проверяем есть ли mock data
      const mockData = mockChampionData[championName];
      
      // Используем mock или генерируем fallback
      const data = mockData 
        ? { ...getDefaultChampionData(championName), ...mockData, name: championName }
        : getDefaultChampionData(championName);
      
      setChampionData(data);
      setBuilds(generateBuilds(championName));
      setRunes(generateRunes(championName));
      
      setLoading(false);
    }

    if (championName) {
      loadChampion();
    }
  }, [championName]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading champion data...</p>
      </div>
    );
  }

  if (!championData) {
    return (
      <div className={styles.error}>
        <h2>Champion not found</h2>
        <a href="/" className={styles.backLink}>← Back to home</a>
      </div>
    );
  }

  const championClass = `champion-${championData.name.replace(/\s+/g, '')}`;

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
          
          {/* CHAMPION HEADER */}
          <div className={styles.championHeader}>
            <div className={styles.championSplash} style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championData.name.replace(/\s+/g, '')}_0.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              <div className={styles.championOverlay}>
                <div className={`champion-icon ${championClass}`} style={{ 
                  width: '120px', 
                  height: '120px', 
                  marginBottom: '20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }} />
                <h1 className={styles.championName}>{championData.name}</h1>
                <p className={styles.championTitle}>{championData.title}</p>
                <div className={styles.tierBadge}>Tier {championData.tier}</div>
              </div>
            </div>
          </div>

          {/* STATS OVERVIEW */}
          <div className={styles.statsOverview}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{championData.winRate.toFixed(1)}%</div>
              <div className={styles.statLabel}>Win Rate</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{championData.pickRate.toFixed(1)}%</div>
              <div className={styles.statLabel}>Pick Rate</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{championData.banRate.toFixed(1)}%</div>
              <div className={styles.statLabel}>Ban Rate</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{championData.kda.toFixed(1)}:1</div>
              <div className={styles.statLabel}>Avg KDA</div>
            </div>
          </div>

          <div className={styles.contentGrid}>
            
            {/* LEFT COLUMN - BUILDS & RUNES */}
            <div className={styles.leftColumn}>
              
              {/* BEST BUILD */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>🛡️ Best Build</h2>
                <div className={styles.buildContainer}>
                  {builds.map((item, index) => (
                    <div key={index} className={styles.buildItem}>
                      <div className={styles.itemPlaceholder}>
                        <span className={styles.itemIcon}>📦</span>
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{item.item}</div>
                        <div className={styles.itemWinRate}>{item.winRate.toFixed(1)}% WR</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BEST RUNES */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>⚡ Best Runes</h2>
                <div className={styles.runesContainer}>
                  {runes.map((rune, index) => (
                    <div key={index} className={styles.runeItem}>
                      <div className={styles.runeIcon}>🔮</div>
                      <div className={styles.runeInfo}>
                        <div className={styles.runeName}>{rune.name}</div>
                        <div className={styles.runeStats}>
                          <span className={styles.runeWinRate}>{rune.winRate.toFixed(1)}% WR</span>
                          <span className={styles.runePickRate}>{rune.pickRate.toFixed(1)}% Pick</span>
                        </div>
                      </div>
                      <div className={styles.runeBar}>
                        <div className={styles.runeBarFill} style={{ width: `${rune.pickRate}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN - DETAILED STATS */}
            <div className={styles.rightColumn}>
              
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📊 Performance Stats</h2>
                <div className={styles.statsGrid}>
                  
                  <div className={`${styles.statCard} ${styles.green}`}>
                    <div className={styles.statCardValue}>{championData.winRate.toFixed(1)}%</div>
                    <div className={styles.statCardLabel}>Win Rate</div>
                    <div className={styles.statCardSubtext}>{championData.totalGames.toLocaleString()} games</div>
                  </div>

                  <div className={`${styles.statCard} ${styles.blue}`}>
                    <div className={styles.statCardValue}>{championData.pickRate.toFixed(1)}%</div>
                    <div className={styles.statCardLabel}>Pick Rate</div>
                    <div className={styles.statCardSubtext}>Popularity</div>
                  </div>

                  <div className={`${styles.statCard} ${styles.purple}`}>
                    <div className={styles.statCardValue}>{championData.banRate.toFixed(1)}%</div>
                    <div className={styles.statCardLabel}>Ban Rate</div>
                    <div className={styles.statCardSubtext}>Ranked Solo/Duo</div>
                  </div>

                  <div className={`${styles.statCard} ${styles.orange}`}>
                    <div className={styles.statCardValue}>{championData.kda.toFixed(1)}:1</div>
                    <div className={styles.statCardLabel}>Average KDA</div>
                    <div className={styles.statCardSubtext}>All ranks</div>
                  </div>

                </div>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>🎯 Role Distribution</h2>
                <div className={styles.roleContainer}>
                  <div className={styles.roleItem}>
                    <div className={styles.roleName}>{championData.mainRole || 'Primary'}</div>
                    <div className={styles.roleBar}>
                      <div className={styles.roleBarFill} style={{ width: '78.5%', background: '#0071e3' }}></div>
                    </div>
                    <div className={styles.rolePercentage}>78.5%</div>
                  </div>
                  <div className={styles.roleItem}>
                    <div className={styles.roleName}>{championData.secondaryRole || 'Secondary'}</div>
                    <div className={styles.roleBar}>
                      <div className={styles.roleBarFill} style={{ width: '21.5%', background: '#7c3aed' }}></div>
                    </div>
                    <div className={styles.rolePercentage}>21.5%</div>
                  </div>
                </div>
              </div>

              {/* DATA SOURCE INFO */}
              <div className={styles.infoBox}>
                <p><strong>📌 Data Source:</strong> Mock data for prototype. Connect real API for live stats.</p>
                <p><strong>🔄 Update:</strong> Stats update every 24 hours from community data.</p>
              </div>

            </div>

          </div>

        </div>
      </main>
    </>
  );
}
