import styles from '../legal.module.css';

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>
          Effective date: 2026-02-05 <span className={styles.highlight}>Read-only analytics</span>
        </p>

        <section className={styles.section}>
          <h2>What we collect</h2>
          <p>
            Nexus Oracle only processes public Riot Games API data to provide performance analytics.
            We do not collect passwords, do not access private account details, and do not automate gameplay.
          </p>
          <ul className={styles.list}>
            <li>Summoner profile data (Riot ID, rank, profile icon).</li>
            <li>Match history and match timeline data.</li>
            <li>Derived analytics such as CS/min, vision, and objective impact.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How we use data</h2>
          <ul className={styles.list}>
            <li>Display player stats, match summaries, and coaching insights.</li>
            <li>Show public ladder data for leaderboard views.</li>
            <li>Improve our analytics and presentation quality.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data retention</h2>
          <p>
            We store only the minimum data needed to power analytics and caching. Data is refreshed
            periodically and can be deleted upon request.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Sharing</h2>
          <p>
            We do not sell personal data. We only share data when required to comply with applicable law.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            For privacy requests, contact: <a href="mailto:privacy@nexusoracle.gg">privacy@nexusoracle.gg</a>
          </p>
        </section>
      </div>
    </main>
  );
}

