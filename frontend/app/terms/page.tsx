import styles from '../legal.module.css';

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>
          By using Nexus Oracle, you agree to the terms below.
        </p>

        <section className={styles.section}>
          <h2>Service scope</h2>
          <p>
            Nexus Oracle provides read-only analytics based on Riot Games API data. We do not automate
            gameplay, do not modify game files, and do not provide in-game advantages beyond
            informational analysis.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Acceptable use</h2>
          <ul className={styles.list}>
            <li>Use the service for personal analysis or coaching insights.</li>
            <li>Do not abuse rate limits or attempt to scrape the API.</li>
            <li>Do not use the service to violate Riot Games policies or terms.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Disclaimer</h2>
          <p>
            Nexus Oracle isn’t endorsed by Riot Games and doesn’t reflect the views or opinions of
            Riot Games or anyone officially involved in producing or managing Riot Games properties.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to:{' '}
            <a href="mailto:support@nexusoracle.gg">support@nexusoracle.gg</a>
          </p>
        </section>
      </div>
    </main>
  );
}

