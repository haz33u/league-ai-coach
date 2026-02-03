$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $root "..")

Write-Host "Running data pipeline..." -ForegroundColor Cyan

Push-Location $repo

python scripts\collect_data.py --seed-file scripts\seeds.json --count 50 --queue 420
python scripts\generate_matchups.py --output league-ai-coach-lcu\renderer\matchups.json
python scripts\generate_guides.py --output league-ai-coach-lcu\renderer\champion_guides.json

Pop-Location

Write-Host "Pipeline completed." -ForegroundColor Green
