# Start development environment
# Usage: ./scripts/dev.ps1

Write-Host "Starting OrchestraOS development environment..." -ForegroundColor Green

# Start backend
Write-Host "Starting backend..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location (Join-Path $using:PWD "backend")
    python -m venv .venv 2>$null
    .\.venv\Scripts\Activate.ps1
    pip install -e ".[dev]" 2>$null
    uvicorn app.main:app --reload --port 8000
}

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location (Join-Path $using:PWD "frontend")
    npm install 2>$null
    npm run dev
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Docs:     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

try {
    # Wait for either job to complete
    Wait-Job $backendJob, $frontendJob
}
finally {
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
}
