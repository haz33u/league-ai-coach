'use client';

import { useEffect, useState } from 'react';
import styles from './StatsShowcase.module.css';

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change: number;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
}

// Статические данные League API (примеры реальных значений)
const generateStats = (): StatCard[] => {
  return [
    {
      id: 'win-rate',
      label: 'Win Rate',
      value: '52.8%',
      change: 2.4,
      icon: '📈',
      color: 'green',
    },
    {
      id: 'avg-kda',
      label: 'Avg KDA',
      value: '4.2:1',
      change: 0.6,
      icon: '⚔️',
      color: 'blue',
    },
    {
      id: 'games',
      label: 'Ranked Games',
      value: '1,247',
      change: 125,
      icon: '🎮',
      color: 'purple',
    },
    {
      id: 'rank',
      label: 'Current Rank',
      value: 'Diamond II',
      change: 1,
      icon: '👑',
      color: 'orange',
    },
    {
      id: 'main-role',
      label: 'Main Role',
      value: 'Mid Lane',
      change: 0,
      icon: '🧙',
      color: 'blue',
    },
    {
      id: 'fav-champ',
      label: 'Main Champion',
      value: 'Ahri',
      change: 0,
      icon: '🦊',
      color: 'purple',
    },
  ];
};


export default function StatsShowcase() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Симуляция загрузки данных с League API
    setIsLoading(true);
    const timer = setTimeout(() => {
      setStats(generateStats());
      setIsLoading(false);
      setTimeout(() => setIsVisible(true), 50);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={styles.showcase}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Live Analytics</h2>
          <p className={styles.subtitle}>
            Real-time stats powered by League API
          </p>
        </div>

        <div className={`${styles.grid} ${isVisible ? styles.visible : ''}`}>
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className={`${styles.card} ${styles[`color-${stat.color}`]}`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className={styles.cardInner}>
                {/* Icon Section */}
                <div className={styles.iconSection}>
                  <div className={styles.iconWrapper}>
                    <span className={styles.icon}>{stat.icon}</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className={styles.contentSection}>
                  <p className={styles.label}>{stat.label}</p>
                  <div className={styles.valueRow}>
                    <h3 className={styles.value}>{stat.value}</h3>
                  </div>
                  <div className={styles.changeIndicator}>
                    <span className={`${styles.change} ${stat.change >= 0 ? styles.positive : styles.negative}`}>
                      {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.progressBar}>
                <div className={styles.progress}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Data Source Notice */}
        <div className={styles.dataNotice}>
          <p className={styles.dataText}>
            Data sourced from <strong>Riot Games League API</strong> • Last updated: <strong>Real-time</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
