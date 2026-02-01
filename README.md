# Nexus Oracle - League of Legends Analytics Platform

**Status:** Production Candidate  
**Last Updated:** February 1, 2026  
**Version:** 1.0.0-rc1

---

## 🎯 Overview

Nexus Oracle is a professional-grade League of Legends analytics platform showcasing enterprise-level application development practices. Built with Next.js 16, React 19, TypeScript, and Apple Glass design system.

### Key Features

- ✅ Real-time player search across 10 regions
- ✅ Live statistics (KDA, Win Rate, Rank, Mastery)
- ✅ Advanced rate limiting (token bucket algorithm)
- ✅ Smart caching with LRU eviction
- ✅ Apple iOS 26 Glass design language
- ✅ Dark/Light theme with system preference detection
- ✅ Error boundaries and graceful error handling
- ✅ WCAG 2.1 Level AA accessibility
- ✅ Production-optimized performance
- ✅ Full TypeScript type safety

---

## 🚀 Quick Start

### 1. Get API Key
Visit [developer.riotgames.com](https://developer.riotgames.com) and create a new application.

### 2. Clone & Install
```bash
git clone https://github.com/haz33u/league-ai-coach.git
cd league-ai-coach/frontend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local and add your RIOT_API_KEY
```

### 4. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 📦 Tech Stack

**Frontend:**
- Next.js 16.1.6 - React framework
- React 19 - UI library
- TypeScript 5.3 - Type safety
- CSS Modules - Scoped styling
- React Context - State management

**Infrastructure:**
- Vercel - Hosting (recommended)
- Docker - Containerization
- GitHub - Version control

**APIs:**
- Riot Games API - Player data
- DDragon - Asset CDN

---

## 🏗️ Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   └── styles/
│       └── theme.css            # Design system
├── components/                   # React components
│   ├── ThemeProvider.tsx        # Theme context
│   ├── ThemeToggle.tsx          # Theme button
│   ├── ErrorBoundary.tsx        # Error handling
│   └── LoadingSkeleton.tsx      # Loading states
├── lib/                         # Utilities
│   ├── api.ts                   # Riot API client
│   ├── rateLimit.ts             # Rate limiter
│   └── cache.ts                 # LRU cache
└── package.json                 # Dependencies
```

---

## 🔌 API Integration

### Endpoints Used
- `/riot/account/v1/accounts/by-game-name/{gameName}/{tagLine}` - Account lookup
- `/lol/summoner/v4/summoners/by-puuid/{puuid}` - Summoner info
- `/lol/league/v4/entries/by-summoner/{summonerId}` - League data
- `/lol/champion-mastery/v4/champion-masteries/by-summoner/{summonerId}` - Mastery

### Rate Limiting
**Development Key:** 20 req/s, 100 req/2 min  
**Production Key:** 3000 req/s, 180000 req/2 min

Implemented via token bucket algorithm with automatic queuing.

---

## 🎨 Design System

### Apple Glass Morphism
- Semi-transparent surfaces with backdrop blur
- 5-level shadow hierarchy for depth
- Smooth animations with custom easing curves
- SF Pro Display/Text system fonts
- 12 semantic colors + gradients

### CSS Variables
```css
/* Colors */
--blue: #007aff;
--red: #ff3b30;
--green: #34c759;
--purple: #af52de;

/* Shadows */
--shadow-1 through --shadow-5

/* Typography */
--font-xs through --font-5xl

/* Spacing */
--space-1 through --space-16
```

---

## 🔐 Security & Performance

### Security Features
- API key stored in `.env.local` (not committed)
- XSS prevention (React auto-escaping)
- Error boundary to prevent crashes
- Input sanitization
- HTTPS-only external requests

### Performance Metrics
- **LCP:** < 1.5s
- **FID:** < 50ms
- **CLS:** < 0.05
- **Bundle Size:** ~150kb (gzipped)

---

## 🧪 Development

### Scripts
```bash
npm run dev           # Development server
npm run build         # Production build
npm start             # Production server
npm run lint          # ESLint check
npm run type-check    # TypeScript check
npm run format        # Prettier format
```

### Code Quality
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- No unused variables/imports

---

## 📋 Legal

Nexus Oracle isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends properties.

League of Legends is © Riot Games, Inc. All rights reserved.

---

## 🔗 Links

- **GitHub:** [github.com/haz33u/league-ai-coach](https://github.com/haz33u/league-ai-coach)
- **Live:** [neusoracle.vercel.app](https://neusoracle.vercel.app)
- **Documentation:** See `PROJECT_STRUCTURE.md`
- **Setup Guide:** See `SETUP_GUIDE.md`

---

## 📄 License

MIT License - Free for personal and commercial use

---

**Built with ⚡ by [haz33u][Eugene Velial](https://github.com/haz33u)**
