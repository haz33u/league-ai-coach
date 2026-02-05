import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus Oracle - League of Legends Analytics',
  description: 'Professional-grade League of Legends performance analytics powered by Riot Games API',
  keywords: ['League of Legends', 'Analytics', 'Stats', 'Riot Games', 'LCS', 'Esports'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <meta name="theme-color" content="#007aff" />
      </head>
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            {children}
            <footer className="site-footer">
              <div className="footer-content">
                <span>Nexus Oracle © 2026. Not endorsed by Riot Games.</span>
                <div className="footer-links">
                  <a href="/demo">Demo</a>
                  <a href="/privacy">Privacy</a>
                  <a href="/terms">Terms</a>
                  <a href="https://www.riotgames.com" target="_blank" rel="noreferrer">
                    Riot Games
                  </a>
                  <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer">
                    Riot API
                  </a>
                </div>
              </div>
            </footer>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
