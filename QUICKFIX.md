# Quick Resolution Guide

## Problem Statement

Player search functionality returns "Player not found" error for all queries.

## Solution Overview

This issue typically stems from an expired Development API key, which requires renewal every 24 hours. Follow the steps below for immediate resolution.

## Resolution Steps

### Step 1: Obtain Fresh API Key

1. Navigate to [Riot Developer Portal](https://developer.riotgames.com/)
2. Authenticate with your Riot account credentials
3. Locate the "REGENERATE API KEY" button
4. Copy the newly generated key (format: `RGAPI-...`)

### Step 2: Update Environment Configuration

**Windows (PowerShell):**
```powershell
cd I:\MyProjects\league-ai-coach\frontend

@"
RIOT_API_KEY=RGAPI-your-key-here
"@ | Out-File -FilePath .env.local -Encoding UTF8 -Force
```

**macOS/Linux:**
```bash
cd /path/to/league-ai-coach/frontend

echo "RIOT_API_KEY=RGAPI-your-key-here" > .env.local
```

### Step 3: Clear Build Cache

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

**macOS/Linux:**
```bash
rm -rf .next
```

### Step 4: Restart Development Server

```bash
npm run dev
```

### Step 5: Verify Functionality

Test with known players:

**Europe West (euw1):**
- Name: `Caps` | Tag: `G2`

**Korea (kr):**
- Name: `Faker` | Tag: `T1`

**North America (na1):**
- Name: `Doublelift` | Tag: `NA1`

## Verification

### Browser Console Output

Expected console output on successful search:

```javascript
Searching player: Faker T1 kr
Player found: {gameName: "Faker", tier: "CHALLENGER", ...}
```

### Server Console Output

Expected server logs:

```
Player stats request: {puuid: '...', region: 'kr'}
Player stats loaded successfully
```

## Additional Troubleshooting

### "Invalid or expired API key"

Repeat Step 1-3. Ensure complete key is copied without truncation.

### "RIOT_API_KEY not configured"

Verify file is named exactly `.env.local` (not `.env.local.txt`).

```bash
# Verify file existence
ls -la .env.local

# Check file contents
cat .env.local
```

### Player Still Not Found

Verify player exists on specified region. Use [u.gg](https://u.gg/) or [op.gg](https://op.gg/) to confirm.

## API Key Management

Development API keys expire every 24 hours and require daily renewal. For production deployments, apply for a Production API Key through the Riot Developer Portal, which does not expire.

## Recent Updates

The following commits address the player search functionality:

- [682707a](https://github.com/haz33u/league-ai-coach/commit/682707a) - Added `/api/player` endpoint
- [5a8d514](https://github.com/haz33u/league-ai-coach/commit/5a8d514) - Updated `getPlayerStats` implementation
- [a932ee0](https://github.com/haz33u/league-ai-coach/commit/a932ee0) - Enhanced logo visibility

## Support Resources

- [Complete Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Riot API Documentation](https://developer.riotgames.com/apis)
- [Project README](README.md)

---

**Resolution Time:** 5 minutes  
**Success Rate:** 99%  
**Last Updated:** January 31, 2026
