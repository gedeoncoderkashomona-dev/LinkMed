# setup-fase2.ps1 — Estrutura da FASE 2 (POPs)
Write-Host "🚀 Criando estrutura da FASE 2..." -ForegroundColor Cyan

$dirs = @(
  "src\app\(app)\pops",
  "src\app\api\pops",
  "src\app\api\pops\[id]",
  "src\app\api\pops\[id]\file",
  "src\app\api\pops\[id]\publish",
  "src\app\api\pops\[id]\approve",
  "src\app\api\pops\[id]\reject",
  "src\app\api\pops\[id]\new-version",
  "src\app\api\pops\[id]\confirm-read",
  "src\app\api\pops\[id]\read-report",
  "src\app\api\pops\[id]\change-requests",
  "src\app\api\pops\[id]\change-requests\[crId]",
  "src\core\use-cases\pops",
  "src\core\domain\entities",
  "src\core\domain\enums"
)

foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
}

Write-Host "✅ Pastas criadas." -ForegroundColor Green
Write-Host ""
Write-Host "Cole os arquivos e rode: npm run dev" -ForegroundColor Cyan