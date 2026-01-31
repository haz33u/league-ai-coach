# 🔮 Nexus Oracle

**League of Legends Analytics Platform** with real-time player statistics powered by Riot Games API.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Riot API](https://img.shields.io/badge/Riot_API-v5-red?style=flat-square)

## ✨ Features

- 🔍 **Real-time Player Search** - 10 regions (EUW, NA, KR, etc.)
- 🎯 **Live Statistics** - Rank, LP, Winrate, KDA from Riot API v4/v5
- 📊 **Match History** - Last 10 games with detailed analytics
- 🎨 **Official Assets** - League icons from Community Dragon
- 📱 **Responsive Design** - Glassmorphism UI with gradient animations
- ⚡ **Next.js API Routes** - Server-side proxy (no CORS issues)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Riot Games Developer Account

### Installation

```bash
# 1. Clone repository
git clone https://github.com/haz33u/league-ai-coach.git
cd league-ai-coach/frontend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
```

### Get Riot API Key

1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Log in with your Riot account
3. Copy your **Development API Key**
4. Add to `.env.local`:

```env
RIOT_API_KEY=RGAPI-your-key-here
```

> ⚠️ **Important:** Development keys expire every 24 hours! Update daily.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🐞 Troubleshooting

### ❌ "Player not found" error?

**Most common cause:** API key expired (refreshes every 24h)

**Quick Fix:**
```bash
# 1. Get new key from developer.riotgames.com
# 2. Update .env.local with new RIOT_API_KEY
# 3. Restart server:
rm -rf .next && npm run dev
```

**Other causes:**
- Wrong player name/tag format (use `Name#TAG`)
- Wrong region (Faker is on KR, not EUW)
- Player doesn't exist on that region

📝 **Full guide:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## 📚 API Architecture

```
Browser → /api/search → Riot API
         (Next.js)    (Server-side)
         ✅ No CORS   ✅ API key secure
```

**Files:**
- `frontend/app/api/search/route.ts` - API proxy endpoint
- `frontend/lib/api.ts` - Client API functions
- `frontend/app/page.tsx` - Search UI
- `frontend/app/player/[puuid]/page.tsx` - Player profile

## 🔧 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + CSS Modules
- **API:** Riot Games API v5
- **Deployment:** Vercel

## 🎮 Usage Examples

### Search Players

**Europe West:**
- `Caps` + `G2`
- `Rekkles` + `G2`

**Korea:**
- `Faker` + `T1`
- `Zeus` + `T1`

**North America:**
- `Doublelift` + `NA1`

## 🛣️ Roadmap

- [ ] Match history UI improvements
- [ ] Champion pages (builds, runes, winrates)
- [ ] Live game spectator
- [ ] Pro player leaderboard
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

## 📝 Project Structure

```
league-ai-coach/
├── frontend/
│   ├── app/
│   │   ├── api/search/route.ts    # API proxy
│   │   ├── page.tsx                # Home page
│   │   ├── page.module.css         # Gradient design
│   │   └── player/[puuid]/page.tsx # Player profile
│   ├── lib/
│   │   └── api.ts                  # API functions
│   ├── components/
│   │   └── Logo.tsx                # Animated logo
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── TROUBLESHOOTING.md
│   └── RIOT_DEVELOPER.txt
└── README.md
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RIOT_API_KEY` | Server-side Riot API key | ✅ Yes |
| `NEXT_PUBLIC_RIOT_API_KEY` | Client-side key (not recommended) | ❌ No |

## 💫 Deployment

### Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
cd frontend
vercel

# 3. Add environment variable in Vercel dashboard:
# Settings → Environment Variables → RIOT_API_KEY
```

### Production API Key

For production deployment:
1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Apply for **Production API Key**
3. Wait for approval (can take days)
4. Add to Vercel environment variables

## 🐛 Known Issues

- Development API keys expire every 24 hours
- Rate limits: 20 requests/second (Development)
- Some regions may have delayed data

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📜 License

MIT License - see [LICENSE](LICENSE)

## 🚀 Credits

- **Riot Games API** - Player data
- **Community Dragon** - League assets
- **Next.js** - Framework
- **Vercel** - Hosting

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/haz33u/league-ai-coach/issues)
- **Troubleshooting:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Riot API Docs:** [developer.riotgames.com](https://developer.riotgames.com/)

---

**Made with ❤️ for the League community**

**Riot Games API Status:** [API Status Page](https://developer.riotgames.com/api-status)  
**Project Status:** 🟢 Active Development
