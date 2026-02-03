## LCU Companion App (Separate From The Website)

This project includes LCU support (League Client API), but it should be **isolated**
from the public website. The LCU API works only on the local machine that runs
the League Client, so it’s a perfect fit for a **separate desktop companion app**.

### Recommended Setup

**Website (public):**
- Uses Riot API only.
- No access to LCU endpoints.
- Safe to deploy.

**Companion app (local):**
- Uses LCU for live data (timers, opponent ranks, builds).
- Runs only on the player’s machine.
- Can be a separate repo/app (recommended).

### How We Isolate LCU Right Now

The backend **does not expose** LCU endpoints unless you explicitly enable it:

```
ENABLE_LCU=true
```

When `ENABLE_LCU` is not set, `/api/lcu/*` is not registered at all.

### Run LCU Mode (Local Only)

From repo root:

```powershell
$env:ENABLE_LCU="true"
cd .\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

This keeps the LCU API isolated on a **separate port** (`8001`) for the local
companion app, while the main website can keep running on `8000` without LCU.

### Should This Be A Separate Repo?

**Yes, recommended.** The companion app is a different product:
- Desktop app (Tauri/Electron)
- Local LCU access
- Overlays and in‑game UX

It’s safer, cleaner, and easier to ship without exposing LCU logic to the web app.

