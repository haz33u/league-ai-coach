# Vercel Deployment Security Guide

## ⚠️ Critical Security Rules

### Rule #1: API Keys Location

**RIOT_API_KEY must ONLY be in BACKEND environment variables on Vercel.**

```
❌ WRONG: Frontend Vercel Environment Variables
NEXT_PUBLIC_RIOT_API_KEY=RGAPI-...  // Exposed to browser!

✅ CORRECT: Backend Vercel Environment Variables  
RIOT_API_KEY=RGAPI-...  // Server-only, secure
```

### Why This Matters

Any environment variable with `NEXT_PUBLIC_` prefix is **bundled into your JavaScript** and visible to anyone who opens DevTools[web:23][web:26].

---

## Vercel Configuration

### Backend Project Setup

1. **Go to Vercel Dashboard** → Your Backend Project → **Settings** → **Environment Variables**

2. **Add these variables:**

   | Variable Name | Value | Environments | Sensitive? |
   |---------------|-------|--------------|------------|
   | `RIOT_API_KEY` | `RGAPI-...` | Production, Preview, Development | ✅ Yes |
   | `SECRET_KEY` | Random 32+ chars | Production, Preview | ✅ Yes |
   | `JWT_SECRET_KEY` | Random 32+ chars | Production, Preview | ✅ Yes |
   | `DATABASE_URL` | PostgreSQL URL | Production | ✅ Yes |
   | `REDIS_URL` | Redis URL (optional) | Production | ✅ Yes |
   | `ENVIRONMENT` | `production` | Production | ❌ No |
   | `DEBUG` | `false` | Production | ❌ No |

3. **Mark as Sensitive:**
   - Click the three dots (⋯) next to each secret variable
   - Select "Make Sensitive"
   - This hides values from logs and UI

### Frontend Project Setup

1. **Go to Vercel Dashboard** → Your Frontend Project → **Settings** → **Environment Variables**

2. **Add ONLY this variable:**

   | Variable Name | Value | Environments |
   |---------------|-------|--------------|
   | `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.vercel.app` | Production, Preview, Development |

3. **Verify NO OTHER `NEXT_PUBLIC_*` variables exist** with API keys or secrets

---

## Architecture on Vercel

```
┌───────────────────────────┐
│   User's Browser          │
│   (Untrusted)             │
└────────────┬──────────────┘
             │
             │ HTTPS
             │ No API keys!
             ↓
┌───────────────────────────┐
│  Frontend (Next.js)       │
│  your-frontend.vercel.app │
│                           │
│  ✅ NEXT_PUBLIC_BACKEND_URL│
│  ❌ NO API keys            │
└────────────┬──────────────┘
             │
             │ HTTPS
             │ API requests
             ↓
┌───────────────────────────┐
│  Backend (FastAPI)        │
│  your-backend.vercel.app  │
│                           │
│  ✅ RIOT_API_KEY (hidden) │
│  ✅ SECRET_KEY (hidden)   │
│  ✅ JWT_SECRET (hidden)   │
└────────────┬──────────────┘
             │
             │ X-Riot-Token: RGAPI-...
             ↓
┌───────────────────────────┐
│  Riot Games API           │
└───────────────────────────┘
```

---

## Security Checklist

### Before Deployment

- [ ] **Check Git History:** Ensure no API keys were ever committed
  ```bash
  git log -p | grep -i "RGAPI"
  git log -p | grep -i "api_key"
  ```
  If found, see [Rotating Secrets](#rotating-secrets) below

- [ ] **Verify .gitignore:** Includes `.env*` and `RGAPI-*` patterns
  ```bash
  cat .gitignore | grep -E "(env|RGAPI)"
  ```

- [ ] **Remove Frontend API Keys:** Delete any `RIOT_API_KEY` from frontend code
  ```bash
  cd frontend
  grep -r "RIOT_API_KEY" .
  grep -r "RGAPI" .
  ```

### After Deployment

- [ ] **Test API Flow:**
  ```bash
  curl https://your-backend.vercel.app/health
  # Should return: {"status":"ok","riot_api":"configured"}
  ```

- [ ] **Inspect Browser Bundle:**
  1. Open your deployed frontend in Chrome
  2. Press F12 → Sources tab
  3. Search for "RGAPI" in all files
  4. **Result must be:** 0 matches found ✅

- [ ] **Check Network Tab:**
  1. Search for a player
  2. Open DevTools → Network tab
  3. Filter by "api"
  4. **Verify:** All requests go to your backend URL, not directly to `api.riotgames.com`

- [ ] **Review Vercel Logs:**
  - Go to Vercel Dashboard → Deployments → View Function Logs
  - **Confirm:** No API keys appear in logs
  - If keys visible, mark variables as "Sensitive"

---

## Common Mistakes

### Mistake #1: Using NEXT_PUBLIC_ for Secrets

```env
# ❌ WRONG - This gets exposed to browser!
NEXT_PUBLIC_RIOT_API_KEY=RGAPI-abc123
```

**Impact:** Anyone can steal your API key from JavaScript bundle[web:23].

**Fix:**
1. Remove from frontend environment variables
2. Add to backend environment variables (without `NEXT_PUBLIC_`)
3. Clear deployment cache and redeploy

### Mistake #2: Hardcoding Keys in Code

```typescript
// ❌ WRONG - Committed to Git!
const RIOT_API_KEY = "RGAPI-abc123";
```

**Impact:** Key exposed in GitHub repository, visible to all.

**Fix:**
1. Remove hardcoded key
2. Use environment variables
3. Rotate the compromised key immediately

### Mistake #3: Logging Secrets

```python
# ❌ WRONG - Key appears in Vercel logs!
logger.info(f"Using API key: {settings.riot_api_key}")
```

**Impact:** Keys visible in Vercel function logs.

**Fix:**
```python
# ✅ CORRECT - Log only key prefix
logger.info(f"API key configured: {settings.riot_api_key[:10]}...")
```

---

## Rotating Secrets

### If Your Key Was Compromised

1. **Regenerate Immediately:**
   - Go to [developer.riotgames.com](https://developer.riotgames.com/)
   - Click "Regenerate API Key"
   - Copy new key

2. **Update Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Edit `RIOT_API_KEY` with new value
   - Apply to all environments

3. **Redeploy:**
   ```bash
   vercel --prod  # Force production redeployment
   ```

4. **Verify Old Key Deactivated:**
   ```bash
   curl -H "X-Riot-Token: OLD_KEY" \
     "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/test/EUW"
   # Should return 403 Forbidden
   ```

### If Committed to Git

**WARNING:** Simply removing the key from code is NOT enough. It remains in Git history.

1. **Rotate key immediately** (see above)
2. **Clean Git history:**
   ```bash
   # Install BFG Repo Cleaner
   brew install bfg  # macOS
   # or download from https://rtyley.github.io/bfg-repo-cleaner/

   # Remove all RGAPI keys from history
   bfg --replace-text <(echo 'RGAPI-*===[REMOVED]===') 

   # Force push (WARNING: rewrites history)
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

3. **Notify team:** If in organization, inform all collaborators

---

## Monitoring

### Set Up Alerts

1. **Vercel Integration Monitoring:**
   - Vercel Dashboard → Settings → Integrations
   - Enable deployment notifications

2. **Rate Limit Monitoring:**
   ```python
   # backend/app/services/riot_api.py
   if response.status_code == 429:
       logger.critical("Riot API rate limit hit! Check for key leaks.")
       # Send alert to your monitoring service
   ```

3. **API Key Usage Monitoring:**
   - Check [Riot Developer Portal](https://developer.riotgames.com/) regularly
   - Review request patterns for anomalies

---

## Production Checklist

### Environment Variables

- [ ] Backend has `RIOT_API_KEY` (NOT `NEXT_PUBLIC_RIOT_API_KEY`)
- [ ] Backend has `SECRET_KEY` with 32+ random characters
- [ ] Backend has `JWT_SECRET_KEY` different from `SECRET_KEY`
- [ ] All secrets marked as "Sensitive" in Vercel
- [ ] Frontend has ONLY `NEXT_PUBLIC_BACKEND_URL`
- [ ] No `NEXT_PUBLIC_RIOT_API_KEY` anywhere

### Code Review

- [ ] No hardcoded keys in source code
- [ ] No keys in frontend code (search for "RGAPI")
- [ ] All API calls go through backend
- [ ] No direct fetch to `api.riotgames.com` from frontend
- [ ] Logging sanitizes secrets

### Git Security

- [ ] `.gitignore` includes `.env*` and `RGAPI-*`
- [ ] No keys in Git history (`git log -p | grep RGAPI`)
- [ ] No `.env` files committed
- [ ] GitHub repository is private (for extra safety)

### Deployment Testing

- [ ] Frontend loads without errors
- [ ] Backend `/health` returns 200 OK
- [ ] Player search works end-to-end
- [ ] Browser DevTools shows no API keys
- [ ] All network requests go through backend
- [ ] Vercel logs don't expose secrets

---

## Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/environment-variables)[web:21]
- [Sensitive Variables on Vercel](https://vercel.com/docs/environment-variables/sensitive-environment-variables)[web:19]
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)[web:24]
- [Riot API Best Practices](https://developer.riotgames.com/apis)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Last Updated:** February 10, 2026  
**Importance:** 🔴 CRITICAL
