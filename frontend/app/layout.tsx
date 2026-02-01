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
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
