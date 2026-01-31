'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { searchPlayer } from '@/lib/api';
import Logo from '@/components/Logo';

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
      setError('Please enter a summoner name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('🔍 Searching:', gameName, tagLine || 'EUW', region);
      
      const data = await searchPlayer(
        gameName.trim(), 
        tagLine.trim() || 'EUW',
        region
      );
      
      console.log('✅ Found player:', data);
      router.push(`/player/${data.puuid}?region=${region}`);
      
    } catch (err: any) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Player not found. Check name, tag, and region.');
      setLoading(false);
    }
  }

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

      <main className="main">
        <div className="hero">
          <div className="hero-content">
            <Logo />
            <h1 className="hero-title">
              Nexus Oracle
            </h1>
            <p className="hero-subtitle">
              See Beyond the Rift
            </p>
            <p className="hero-description">
              AI-powered analytics and personalized coaching for League of Legends.
            </p>

            <div className="search-card">
              <form onSubmit={handleSearch} className="search-form">
                <div className="input-group">
                  <div className="input-wrapper">
                    <label className="input-label">
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span className="label-text">SUMMONER NAME</span>
                    </label>
                    <input
                      type="text"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="Diamondprox"
                      className="search-input"
                      disabled={loading}
                    />
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label">
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="label-text">TAG</span>
                    </label>
                    <input
                      type="text"
                      value={tagLine}
                      onChange={(e) => setTagLine(e.target.value)}
                      placeholder="EUW"
                      className="search-input"
                      disabled={loading}
                    />
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label">
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span className="label-text">REGION</span>
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="search-input"
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
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="search-button"
                  disabled={loading}
                >
                  <svg className="button-icon" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="popular-searches">
                <span className="popular-label">✨ TRY:</span>
                <div className="popular-links">
                  <button onClick={() => { setGameName('Faker'); setTagLine('T1'); setRegion('kr'); }} className="popular-link">Faker - T1</button>
                  <button onClick={() => { setGameName('Doublelift'); setTagLine('NA1'); setRegion('na1'); }} className="popular-link">Doublelift</button>
                  <button onClick={() => { setGameName('Caps'); setTagLine('FNC'); setRegion('euw1'); }} className="popular-link">Caps - FNC</button>
                </div>
              </div>
            </div>

            <div className="cta-buttons">
              <button 
                onClick={() => { setGameName('Diamondprox'); setTagLine('ProX'); setRegion('euw1'); handleSearch(new Event('submit') as any); }}
                className="btn btn-primary"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                View Demo
              </button>
              <a href="https://github.com/haz3141/lol-ai-coach" target="_blank" className="btn btn-secondary">
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
