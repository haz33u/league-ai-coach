'use client';

import { motion } from 'framer-motion';

interface PlayerCardProps {
  player: {
    gameName: string;
    tagLine: string;
    summonerLevel: number;
    profileIconId: number;
  };
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-8 flex items-center gap-6"
    >
      <img
        src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${player.profileIconId}.png`}
        alt="Profile"
        className="w-24 h-24 rounded-2xl border-4 border-primary/50 animate-glow"
      />
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {player.gameName}#{player.tagLine}
        </h1>
        <p className="text-white/60 mt-2">Level {player.summonerLevel}</p>
      </div>
    </motion.div>
  );
}
