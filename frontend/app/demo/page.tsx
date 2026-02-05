import Link from 'next/link';
import styles from '../legal.module.css';

export default function DemoPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Live Demo Guide</h1>
        <p className={styles.subtitle}>
          This page explains the user flows Riot reviewers can test end-to-end.
        </p>

        <section className={styles.section}>
          <h2>Flow 1 · Player search</h2>
          <ul className={styles.list}>
            <li>Open the home page.</li>
            <li>Enter a Riot ID (Game Name + Tag Line).</li>
            <li>Select region and click Search.</li>
          </ul>
          <p>Tip: Use any public Riot ID from EUW or RU for faster responses.</p>
        </section>

        <section className={styles.section}>
          <h2>Flow 2 · Player analysis</h2>
          <ul className={styles.list}>
            <li>Review match summary, turning points, and coaching recap.</li>
            <li>Scroll to see match history and key statistics.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Flow 3 · Leaderboard</h2>
          <ul className={styles.list}>
            <li>Open the leaderboard page.</li>
            <li>Switch regions (EUW / RU) and confirm auto-refresh every 5 minutes.</li>
            <li>Click a player row to navigate to their profile.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Notes</h2>
          <ul className={styles.list}>
            <li>Data is read-only and sourced from the Riot Games API.</li>
            <li>No automation, scripting, or gameplay modifications are used.</li>
            <li>Rate limits are respected and surfaced to users when reached.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Quick links</h2>
          <div className={styles.linkRow}>
            <Link href="/">Home</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

