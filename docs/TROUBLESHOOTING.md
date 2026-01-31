# Nexus Oracle - Troubleshooting Guide

## ❌ Player Search Not Working

### Symptom
- Searching for any player returns "Player not found"
- Console shows 401/403 or CORS errors
- API requests fail in browser

### Root Causes

#### 1. Expired API Key (Most Common)
**Development API keys expire every 24 hours!**

**Solution:**
```bash
# 1. Go to https://developer.riotgames.com/
# 2. Log in and copy your new Development API Key
# 3. Update .env.local:
RIOT_API_KEY=RGAPI-your-new-key-here

# 4. Restart dev server:
rm -rf .next
npm run dev
```

**How to check if key is expired:**
```bash
# Test your API key manually:
curl -H "X-Riot-Token: YOUR_KEY_HERE" \
  "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Faker/T1"

# If expired, you'll see:
# {"status":{"message":"Forbidden","status_code":403}}
```

#### 2. CORS Errors
**Browser cannot make direct requests to Riot API**

**Solution:** Use Next.js API Routes (already implemented)
- ✅ Frontend calls `/api/search` (same domain)
- ✅ API route calls Riot API server-side (no CORS)

**Files:**
- `frontend/app/api/search/route.ts` - Server-side proxy
- `frontend/lib/api.ts` - Client calls API route

#### 3. Wrong Player Name Format
**Riot ID format changed in 2023!**

**Old format (doesn't work):**
```
Diamondprox
```

**New format (correct):**
```
Game Name: Diamondprox
Tag Line: ProX
Full: Diamondprox#ProX
```

**Examples:**
- Faker → `Faker` + `T1`
- Caps → `Caps` + `G2`
- Hide on bush → `Hide on bush` + `KR1`

#### 4. Wrong Region
Player must exist on the selected region!

**Region Codes:**
- `euw1` - Europe West
- `eun1` - Europe Nordic & East
- `na1` - North America
- `kr` - Korea
- `ru` - Russia
- `br1` - Brazil
- `tr1` - Turkey

**Example:**
- Faker is on KR server, not EUW
- Caps is on EUW server, not NA

---

## 🔧 Complete Fix Checklist

### Step 1: Update API Key
```bash
cd frontend

# Create .env.local if not exists
cp .env.example .env.local

# Edit .env.local and add your key:
# RIOT_API_KEY=RGAPI-your-key-here
```

### Step 2: Verify API Route Exists
```bash
# Check if file exists:
ls -la app/api/search/route.ts

# If missing, create it (see commit f4474ac)
```

### Step 3: Clear Next.js Cache
```bash
rm -rf .next
rm -rf node_modules/.cache
```

### Step 4: Restart Dev Server
```bash
npm run dev
```

### Step 5: Test with Known Players
Try these verified players:

**Europe (euw1):**
- Game Name: `Caps`, Tag: `G2`
- Game Name: `Rekkles`, Tag: `G2`

**Korea (kr):**
- Game Name: `Faker`, Tag: `T1`
- Game Name: `Zeus`, Tag: `T1`

**North America (na1):**
- Game Name: `Doublelift`, Tag: `NA1`

### Step 6: Check Browser Console
```javascript
// Should see:
🔍 Searching player: Faker T1 kr
✅ Player found: {gameName: "Faker", ...}

// If you see:
❌ API Route error: Invalid API key
// → Your key expired, go back to Step 1
```

### Step 7: Check Server Logs
```bash
# In terminal where npm run dev is running:
🔍 API Route - Search params: {gameName: 'Faker', tagLine: 'T1', region: 'kr'}
🔑 API Key present: true
🌍 Regional URL: https://asia.api.riotgames.com
📡 Fetching account: ...
📊 Account response status: 200
✅ Account found: Faker T1
```

---

## 🐞 Common Errors

### Error: "Missing gameName or tagLine"
**Cause:** Search form not submitting correctly

**Fix:** Check that both fields are filled

### Error: "RIOT_API_KEY not configured"
**Cause:** .env.local missing or wrong variable name

**Fix:**
```bash
# .env.local must contain:
RIOT_API_KEY=RGAPI-...

# NOT:
NEXT_PUBLIC_RIOT_API_KEY=RGAPI-...  # ❌ Client-side (insecure)
```

### Error: "Player not found. Check spelling and tag line."
**Cause:** 
- Wrong game name or tag
- Wrong region
- Player doesn't exist

**Fix:**
1. Verify name spelling (case-sensitive)
2. Check tag line (without #)
3. Select correct region
4. Try searching on https://u.gg/ first to verify player exists

### Error: "Summoner not found for this region"
**Cause:** Player account exists but never played on this region

**Fix:** Select the correct region where player actually plays

### Error: Network request failed
**Cause:** Dev server not running or API route missing

**Fix:**
```bash
# Make sure dev server is running:
npm run dev

# Check API route exists:
curl http://localhost:3000/api/search?gameName=Faker&tagLine=T1&region=kr
```

---

## 🛠️ Advanced Debugging

### Test API Route Directly
```bash
# In browser or curl:
http://localhost:3000/api/search?gameName=Faker&tagLine=T1&region=kr

# Should return JSON:
{
  "gameName": "Faker",
  "tagLine": "T1",
  "puuid": "...",
  "level": 734,
  "tier": "CHALLENGER",
  ...
}
```

### Test Riot API Directly
```bash
# 1. Test Account API
curl -H "X-Riot-Token: YOUR_KEY" \
  "https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Faker/T1"

# 2. Test Summoner API (use puuid from step 1)
curl -H "X-Riot-Token: YOUR_KEY" \
  "https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/PUUID_HERE"

# 3. Test League API (use summonerId from step 2)
curl -H "X-Riot-Token: YOUR_KEY" \
  "https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/SUMMONER_ID_HERE"
```

### Enable Detailed Logging
```typescript
// In frontend/app/api/search/route.ts, logs are already enabled:
console.log('🔍 API Route - Search params:', { gameName, tagLine, region });
console.log('🔑 API Key present:', !!RIOT_API_KEY);
console.log('📊 Account response status:', accountRes.status);
```

### Check Environment Variables
```bash
# In Next.js server component or API route:
console.log('API Key:', process.env.RIOT_API_KEY?.slice(0, 10) + '...');

# Should print: RGAPI-xxxx...
# If undefined, .env.local not loaded
```

---

## 📚 Resources

- **Riot Developer Portal:** https://developer.riotgames.com/
- **API Documentation:** https://developer.riotgames.com/apis
- **API Status:** https://developer.riotgames.com/api-status
- **Community Discord:** https://discord.gg/riotgamesdevrel
- **Rate Limits:** https://developer.riotgames.com/apis#rate-limiting

---

## ✅ Verification

If everything works, you should see:

1. **Browser Console:**
```
🔍 Searching player: Faker T1 kr
✅ Player found: {gameName: "Faker", tier: "CHALLENGER", ...}
```

2. **Server Logs:**
```
🔍 API Route - Search params: {gameName: 'Faker', tagLine: 'T1', region: 'kr'}
✅ Success! Returning player data
```

3. **Browser UI:**
- Player page loads: `/player/PUUID`
- Shows rank, level, winrate
- Displays match history

---

**Last Updated:** January 31, 2026  
**API Version:** Riot Games API v5  
**Next.js Version:** 14.x
