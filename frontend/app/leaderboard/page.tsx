'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-2xl animate-pulse">Loading...</div></div>;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="inline-block glass px-4 py-2 rounded-xl hover:scale-105 transition-transform">
          ← Back
        </Link>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            🏆 Leaderboard
          </h1>
          <p className="text-white/60">Top Challenger Players</p>
        </div>

        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left">
                <th className="p-4">#</th>
                <th className="p-4">Summoner</th>
                <th className="p-4">LP</th>
                <th className="p-4">W/L</th>
                <th className="p-4">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <motion.tr
                  key={player.summonerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-t border-white/10 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4 font-bold text-primary">{index + 1}</td>
                  <td className="p-4">{player.summonerName}</td>
                  <td className="p-4">{player.leaguePoints} LP</td>
                  <td className="p-4">{player.wins}W / {player.losses}L</td>
                  <td className="p-4">{Math.round((player.wins / (player.wins + player.losses)) * 100)}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
