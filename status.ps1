# Website Analytics Platform - Status Check Script
Write-Host "`n=== Website Analytics Platform Status ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Check MongoDB
Write-Host "1. MongoDB Status:" -ForegroundColor Yellow
$mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "   OK - MongoDB is RUNNING (PID: $($mongoProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   FAIL - MongoDB is NOT RUNNING" -ForegroundColor Red
    Write-Host "   START: npm run docker:up" -ForegroundColor Cyan
}

# Check Redis
Write-Host "`n2. Redis Status:" -ForegroundColor Yellow
$redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "   OK - Redis is RUNNING (PID: $($redisProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   FAIL - Redis is NOT RUNNING" -ForegroundColor Red
    Write-Host "   START: npm run docker:up" -ForegroundColor Cyan
}

# Check Next.js API Server
Write-Host "`n3. Next.js API Server:" -ForegroundColor Yellow
$apiResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
if ($apiResponse -and $apiResponse.StatusCode -eq 200) {
    Write-Host "   OK - API Server is RUNNING on port 3000" -ForegroundColor Green
    Write-Host "   OK - Health check passed" -ForegroundColor Green
} else {
    Write-Host "   FAIL - API Server is NOT RUNNING" -ForegroundColor Red
    Write-Host "   START: npm run dev" -ForegroundColor Cyan
}

# Check Worker Process
Write-Host "`n4. Background Worker:" -ForegroundColor Yellow
$allNodes = Get-Process -Name "node" -ErrorAction SilentlyContinue
$workerFound = $false
foreach ($proc in $allNodes) {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
    if ($cmd -like "*worker/processor*") {
        Write-Host "   OK - Worker is RUNNING (PID: $($proc.Id))" -ForegroundColor Green
        $workerFound = $true
        break
    }
}
if (-not $workerFound) {
    Write-Host "   FAIL - Worker is NOT RUNNING" -ForegroundColor Red
    Write-Host "   START: npm run worker" -ForegroundColor Cyan
}

# Check ports
Write-Host "`n5. Port Status:" -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port6379 = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
$port27017 = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "   OK - Port 3000 (Next.js API)" -ForegroundColor Green
} else {
    Write-Host "   FAIL - Port 3000 not in use" -ForegroundColor Red
}

if ($port6379) {
    Write-Host "   OK - Port 6379 (Redis)" -ForegroundColor Green
} else {
    Write-Host "   FAIL - Port 6379 not in use" -ForegroundColor Red
}

if ($port27017) {
    Write-Host "   OK - Port 27017 (MongoDB)" -ForegroundColor Green
} else {
    Write-Host "   FAIL - Port 27017 not in use" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$mongoRunning = $null -ne $mongoProcess
$redisRunning = $null -ne $redisProcess
$apiRunning = $apiResponse -and $apiResponse.StatusCode -eq 200
$workerRunning = $workerFound

$totalServices = 4
$runningCount = 0
if ($mongoRunning) { $runningCount++ }
if ($redisRunning) { $runningCount++ }
if ($apiRunning) { $runningCount++ }
if ($workerRunning) { $runningCount++ }

Write-Host "Services Running: $runningCount / $totalServices" -ForegroundColor Yellow

if ($runningCount -eq $totalServices) {
    Write-Host "`nALL SYSTEMS GO - System is ready!" -ForegroundColor Green
    Write-Host "`nQuick Links:" -ForegroundColor Cyan
    Write-Host "  API Server: http://localhost:3000" -ForegroundColor Gray
    Write-Host "  Health Check: http://localhost:3000/api/health" -ForegroundColor Gray
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "  See QUICK_REFERENCE.md for API usage" -ForegroundColor Gray
} else {
    Write-Host "`nWARNING - Some services are not running." -ForegroundColor Yellow
    Write-Host "`nTo start missing services:" -ForegroundColor Cyan
    if (-not $mongoRunning -or -not $redisRunning) {
        Write-Host "  npm run docker:up     # Start MongoDB + Redis" -ForegroundColor Gray
    }
    if (-not $apiRunning) {
        Write-Host "  npm run dev           # Start API server (new terminal)" -ForegroundColor Gray
    }
    if (-not $workerRunning) {
        Write-Host "  npm run worker        # Start worker (new terminal)" -ForegroundColor Gray
    }
}

Write-Host ""
