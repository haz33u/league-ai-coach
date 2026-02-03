param(
  [string]$SeedFile = "scripts\seeds.json",
  [int]$Count = 50,
  [int]$Queue = 420
)

Write-Host "Running data pipeline..."

python scripts\collect_data.py --seed-file $SeedFile --count $Count --queue $Queue
python scripts\generate_matchups.py --output league-ai-coach-lcu\renderer\matchups.json
python scripts\generate_guides.py --output league-ai-coach-lcu\renderer\champion_guides.json

Write-Host "Pipeline complete."
