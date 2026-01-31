# Nexus Oracle

> Real-time League of Legends analytics platform powered by Riot Games API

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Riot API](https://img.shields.io/badge/Riot_API-v5-red?style=flat-square)](https://developer.riotgames.com/)

## Overview

Nexus Oracle provides comprehensive player statistics and match analysis for League of Legends, utilizing official Riot Games API endpoints to deliver accurate, real-time data across all major regions.

### Key Features

- **Live Player Search** — Query players across 10 regions with instant results
- **Real-time Statistics** — Current rank, LP, win rate, and KDA calculations
- **Match History** — Detailed breakdown of recent games with performance metrics
- **Regional Support** — EUW, NA, KR, and 7 additional regions
- **Modern Architecture** — Built with Next.js 14 App Router and TypeScript
- **API Security** — Server-side routing eliminates CORS issues and protects API keys

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Riot Games Developer Account ([Register here](https://developer.riotgames.com/))

### Installation

```bash
# Clone repository
git clone https://github.com/haz33u/league-ai-coach.git
cd league-ai-coach/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

### API Configuration

1. Navigate to [Riot Developer Portal](https://developer.riotgames.com/)
2. Generate a Development API Key
3. Add key to `.env.local`:

```env
RIOT_API_KEY=RGAPI-your-key-here
```

**Note:** Development keys expire after 24 hours and require daily renewal.

### Development Server

```bash
npm run dev
```

Application will be available at `http://localhost:3000`

## Architecture

### API Flow

```
Client → Next.js API Routes → Riot Games API
         (Server-side)         (External)
```

This architecture provides:
- Elimination of CORS restrictions
- Secure API key storage
- Request rate limiting capability
- Response caching potential

### Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── search/route.ts      # Player search endpoint
│   │   └── player/route.ts      # Player stats endpoint
│   ├── player/[puuid]/page.tsx  # Player profile page
│   └── page.tsx                 # Landing page
├── lib/
│   └── api.ts                   # API client functions
└── components/
    └── Logo.tsx                 # Brand logo component
```

## API Endpoints

### Search Player

```typescript
GET /api/search?gameName={name}&tagLine={tag}&region={region}
```

Returns player account data, summoner info, and ranked statistics.

### Player Stats

```typescript
GET /api/player?puuid={puuid}&region={region}
```

Retrieves comprehensive player statistics including match history analysis.

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + CSS Modules
- **API Integration:** Riot Games API v5
- **Deployment:** Vercel Platform

## Troubleshooting

### Common Issues

**Player Not Found**

Most commonly caused by expired API key. Development keys require daily renewal.

```bash
# Solution
1. Obtain new key from developer.riotgames.com
2. Update .env.local
3. Clear Next.js cache: rm -rf .next
4. Restart development server
```

**API Configuration Error**

Verify `.env.local` exists and contains valid `RIOT_API_KEY` value.

Comprehensive troubleshooting guide: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

Configure `RIOT_API_KEY` environment variable in Vercel dashboard.

For production use, apply for a Production API Key through the Riot Developer Portal.

## Development Roadmap

- [ ] Enhanced match history visualization
- [ ] Champion-specific statistics pages
- [ ] Live game spectator functionality
- [ ] Regional leaderboards
- [ ] Multi-language internationalization
- [ ] Theme customization system

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement`)
3. Commit changes (`git commit -m 'Add enhancement'`)
4. Push to branch (`git push origin feature/enhancement`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Resources

- [Riot Games API Documentation](https://developer.riotgames.com/apis)
- [API Status Dashboard](https://developer.riotgames.com/api-status)
- [Community Dragon CDN](https://raw.communitydragon.org/)
- [Next.js Documentation](https://nextjs.org/docs)

## Acknowledgments

Built with data provided by Riot Games API. This project is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.

---

**Project Status:** Active Development  
**Latest Update:** January 31, 2026
