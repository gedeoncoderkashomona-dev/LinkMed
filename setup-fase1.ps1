# setup-fase1.ps1 — cria estrutura da FASE 1
Write-Host "🚀 Criando estrutura da FASE 1..." -ForegroundColor Cyan

$dirs = @(
  "src\core\domain\enums",
  "src\core\domain\entities",
  "src\core\domain\errors",
  "src\core\repositories",
  "src\core\services",
  "src\core\use-cases\auth",
  "src\core\use-cases\users",
  "src\infra\crypto",
  "src\infra\db\in-memory",
  "src\lib\auth",
  "src\lib\http",
  "src\lib\validation",
  "src\hooks",
  "src\components\ui",
  "src\components\layout",
  "src\app\(auth)\login",
  "src\app\(app)\dashboard",
  "src\app\(app)\pops",
  "src\app\(app)\formularios",
  "src\app\(app)\ncs",
  "src\app\(app)\treinamentos",
  "src\app\(app)\equipamentos",
  "src\app\(app)\indicadores",
  "src\app\(app)\notificacoes",
  "src\app\(app)\usuarios",
  "src\app\(app)\auditoria",
  "src\app\(app)\configuracoes",
  "src\app\api\auth\login",
  "src\app\api\auth\logout",
  "src\app\api\auth\refresh",
  "src\app\api\auth\me",
  "src\app\api\users"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

Write-Host "✅ Pastas criadas." -ForegroundColor Green
Write-Host ""
Write-Host "Agora cole os arquivos de código nos caminhos indicados no chat." -ForegroundColor Yellow
Write-Host "Depois rode:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan