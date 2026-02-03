## Riot Data Pipeline (Collection → Matchups → Guides)

This pipeline is **read‑only** and uses Riot API + your own database.
It does not scrape third‑party sites.

### 1) Collect Match Data

Prepare seeds:
```
cp scripts/seeds.sample.json scripts/seeds.json
```
Edit `scripts/seeds.json` with real Riot IDs.

Run collection:
```
python scripts/collect_data.py --seed-file scripts/seeds.json --count 50 --queue 420
```

### 2) Generate Matchup Tables

```
python scripts/generate_matchups.py --output league-ai-coach-lcu/renderer/matchups.json
```

### 3) Generate Champion Guides (Analytics + ML)

```
python scripts/generate_guides.py --output league-ai-coach-lcu/renderer/champion_guides.json
```

### 4) Run Everything (Nightly)

```
powershell -ExecutionPolicy Bypass -File scripts/run_nightly_pipeline.ps1
```

To schedule nightly on Windows (Task Scheduler):
```
schtasks /Create /SC DAILY /ST 02:00 /TN "NexusOraclePipeline" /TR "powershell -ExecutionPolicy Bypass -File I:\MyProjects\league-ai-coach\scripts\run_nightly_pipeline.ps1"
```

### Output
- `league-ai-coach-lcu/renderer/matchups.json`
- `league-ai-coach-lcu/renderer/champion_guides.json`

These are loaded by the Electron overlay for pre‑game tips.
