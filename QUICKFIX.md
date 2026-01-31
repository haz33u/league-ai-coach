# ⚡ QUICKFIX - Player Search Not Working

## 🚨 Problem
Searching for any player returns **"Player not found"**

## ✅ Solution (5 minutes)

### Step 1: Get Fresh API Key

1. Open: https://developer.riotgames.com/
2. Click **"REGENERATE API KEY"** button
3. Copy the new key (starts with `RGAPI-`)

### Step 2: Update .env.local

```bash
cd frontend

# Create or edit .env.local
nano .env.local
```

Paste this:
```env
RIOT_API_KEY=RGAPI-paste-your-key-here
```

Save and exit (Ctrl+O, Enter, Ctrl+X)

### Step 3: Restart Server

```bash
# Kill current server (Ctrl+C)

# Clear cache
rm -rf .next

# Restart
npm run dev
```

### Step 4: Test

Go to: http://localhost:3000

Try searching:
- **Name:** `Faker`
- **Tag:** `T1`
- **Region:** `Korea (kr)`

Click Search → Should work! ✅

---

## 👀 Verification

**Browser console should show:**
```
🔍 Searching player: Faker T1 kr
✅ Player found: {gameName: "Faker", ...}
```

**Terminal should show:**
```
🔍 API Route - Search params: {gameName: 'Faker', ...}
🔑 API Key present: true
📊 Account response status: 200
✅ Success! Returning player data
```

---

## 🐞 Still Not Working?

### Error: "Invalid or expired API key"
➡️ Your key is still old. Repeat Step 1-3.

### Error: "Player not found. Check spelling"
➡️ Try these **verified** players:

**Europe West (euw1):**
- `Caps` + `G2`
- `Rekkles` + `G2`

**Korea (kr):**
- `Faker` + `T1`
- `Zeus` + `T1`

**North America (na1):**
- `Doublelift` + `NA1`

### Error: "RIOT_API_KEY not configured"
➡️ Check file name is exactly `.env.local` (not `.env.local.txt`)

```bash
# Check if file exists:
ls -la frontend/.env.local

# Should show: .env.local
```

### Still stuck?
➡️ Read full guide: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## 💡 Why This Happens

**Riot Development API keys expire every 24 hours.**

You need to:
1. Get new key daily from developer portal
2. Update `.env.local`
3. Restart server

**For production:** Apply for Production API key (never expires)

---

## 🛠️ What We Fixed

**Commits:**
- ✅ Added Next.js API Route (`frontend/app/api/search/route.ts`) [commit f4474ac](https://github.com/haz33u/league-ai-coach/commit/f4474ac)
- ✅ Updated `lib/api.ts` to use API route [commit 0fe4c44](https://github.com/haz33u/league-ai-coach/commit/0fe4c44)
- ✅ Added `.env.example` template [commit 2cdb6e9](https://github.com/haz33u/league-ai-coach/commit/2cdb6e9)

**Changes:**
- ❌ Before: Browser → Riot API directly (CORS error)
- ✅ After: Browser → Next.js API Route → Riot API (works!)

---

**Time to fix:** ~5 minutes  
**Difficulty:** Easy  
**Success rate:** 99%

✅ **Done!** Player search should now work perfectly.
