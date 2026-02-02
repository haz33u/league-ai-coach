# Nexus Oracle — League of Legends Analytics

Nexus Oracle is a League of Legends analytics platform focused on player insights, performance summaries, and a glass‑style UI inspired by modern Apple aesthetics and Arcane‑like visual energy.

**Status:** Active development  
**Version:** 1.0.0‑rc1

---

## Highlights

- Player search by Riot ID (multi‑region)
- Rich match analysis (KDA, CS, vision, gold, damage, roles)
- Player DNA + Learning Path summaries
- DDragon enrichment for champions/items/spells/runes
- Timeline‑aware early game metrics
- Rate limiting + caching for Riot API
- Liquid Glass + Arcane inspired UI

---

## Screenshots

Add screenshots to `docs/screenshots/` and update the links below.

- `docs/screenshots/player.png`
- `docs/screenshots/matches.png`
- `docs/screenshots/dna.png`

---

## Quick Start (Local)

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r app\requirements.txt
```

Create `backend/.env`:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/league_ai_coach
RIOT_API_KEY=RGAPI-...
SECRET_KEY=...
JWT_SECRET_KEY=...
```

Run:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

Run:
```bash
npm run dev
```

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router), React 19, TypeScript
- CSS Modules + design tokens

**Backend**
- FastAPI + SQLAlchemy + Alembic
- PostgreSQL

**APIs**
- Riot Games API
- DDragon (asset CDN)

---

## Project Layout

```
backend/
  app/
  migrations/
frontend/
  app/
  components/
  lib/
docs/
  screenshots/
```

---

## Legal

Nexus Oracle isn’t endorsed by Riot Games and doesn’t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends properties.

League of Legends is © Riot Games, Inc. All rights reserved.

---

## License

All rights reserved. See `LICENSE`.

---

**Built by [haz33u](https://github.com/haz33u)**  
