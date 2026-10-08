[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot
. "$PSScriptRoot/underleaf-compose.ps1"

$composeArguments = @(Get-ComposeArguments -RepositoryRoot $repoRoot)

function Invoke-DockerCapture {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Arguments
  )

  try {
    $output = & docker @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return (@($output) -join "`n").Trim()
  } catch {
    return $null
  }
}

function Get-ContainerId {
  param(
    [Parameter(Mandatory = $true)][string]$Service,
    [Parameter(Mandatory = $true)][string]$ContainerVariable
  )

  $configuredContainer = [Environment]::GetEnvironmentVariable($ContainerVariable)
  if (-not [string]::IsNullOrWhiteSpace($configuredContainer)) {
    return $configuredContainer.Trim()
  }

  $arguments = @('compose') + $composeArguments + @('ps', '-q', $Service)
  $containerId = Invoke-DockerCapture -Arguments $arguments
  if ([string]::IsNullOrWhiteSpace($containerId)) {
    return $null
  }
  return ($containerId -split "`n" | Select-Object -First 1).Trim()
}

function Test-ContainerEndpoint {
  param(
    [string]$ContainerId,
    [Parameter(Mandatory = $true)]
    [string]$Endpoint
  )

  if ([string]::IsNullOrWhiteSpace($ContainerId)) {
    return 'unhealthy'
  }
  $arguments = @('exec', $ContainerId, 'curl', '--fail', '--silent', '--max-time', '5', $Endpoint)
  $result = Invoke-DockerCapture -Arguments $arguments
  if ($null -eq $result) {
    return 'unhealthy'
  }
  return 'ok'
}

function Get-MongoStatus {
  param([string]$ContainerId)

  if ([string]::IsNullOrWhiteSpace($ContainerId)) {
    return 'unhealthy'
  }
  $arguments = @('exec', $ContainerId, 'mongosh', '--quiet', '--eval', 'db.adminCommand({ ping: 1 }).ok')
  if ((Invoke-DockerCapture -Arguments $arguments) -eq '1') {
    return 'ok'
  }
  return 'unhealthy'
}

function Get-RedisStatus {
  param([string]$ContainerId)

  if ([string]::IsNullOrWhiteSpace($ContainerId)) {
    return 'unhealthy'
  }
  $arguments = @('exec', $ContainerId, 'redis-cli', 'ping')
  if ((Invoke-DockerCapture -Arguments $arguments) -eq 'PONG') {
    return 'ok'
  }
  return 'unhealthy'
}

function Get-CompilerHealth {
  param([string]$ContainerId)

  if ([string]::IsNullOrWhiteSpace($ContainerId)) {
    return 'not_started'
  }
  $inspectArguments = @(
    'inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}', $ContainerId
  )
  $status = Invoke-DockerCapture -Arguments $inspectArguments
  if ([string]::IsNullOrWhiteSpace($status)) {
    return 'unhealthy'
  }
  return $status
}

function Get-DiskAvailableBytes {
  param([string]$ContainerId)

  if ([string]::IsNullOrWhiteSpace($ContainerId)) {
    return $null
  }
  $arguments = @('exec', $ContainerId, 'df', '-Pk', '/var/lib/overleaf/data')
  $output = Invoke-DockerCapture -Arguments $arguments
  if ([string]::IsNullOrWhiteSpace($output)) {
    return $null
  }
  $line = @($output -split "`n" | Select-Object -Skip 1 | Select-Object -First 1)
  if ($line.Count -eq 0) {
    return $null
  }
  $fields = @($line[0] -split '\s+') | Where-Object { $_ }
  if ($fields.Count -lt 4 -or $fields[3] -notmatch '^[0-9]+$') {
    return $null
  }
  return ([long]$fields[3] * 1024)
}

function Get-HistoryQueueProjects {
  param([string]$ContainerId)

  if ([string]::IsNullOrWhiteSpace($ContainerId)) {
    return $null
  }
  $arguments = @('exec', $ContainerId, 'curl', '--fail', '--silent', '--max-time', '5', 'http://127.0.0.1:3054/status/queue')
  $output = Invoke-DockerCapture -Arguments $arguments
  if ([string]::IsNullOrWhiteSpace($output)) {
    return $null
  }
  try {
    $queue = $output | ConvertFrom-Json
    $queueValue = 0L
    if ($null -ne $queue.queuedProjects -and [int64]::TryParse([string]$queue.queuedProjects, [ref]$queueValue)) {
      return $queueValue
    }
  } catch {
    return $null
  }
  return $null
}

$appContainer = Get-ContainerId -Service 'app' -ContainerVariable 'UNDERLEAF_APP_CONTAINER'
$mongoContainer = Get-ContainerId -Service 'mongo' -ContainerVariable 'UNDERLEAF_MONGO_CONTAINER'
$redisContainer = Get-ContainerId -Service 'redis' -ContainerVariable 'UNDERLEAF_REDIS_CONTAINER'
$compilerContainer = Get-ContainerId -Service 'compiler' -ContainerVariable 'UNDERLEAF_COMPILER_CONTAINER'

$services = [ordered]@{
  app = Test-ContainerEndpoint -ContainerId $appContainer -Endpoint 'http://127.0.0.1:3000/status'
  mongo = Get-MongoStatus -ContainerId $mongoContainer
  redis = Get-RedisStatus -ContainerId $redisContainer
  project_history = Test-ContainerEndpoint -ContainerId $appContainer -Endpoint 'http://127.0.0.1:3054/check_lock'
  real_time = Test-ContainerEndpoint -ContainerId $appContainer -Endpoint 'http://127.0.0.1:3026/status'
  clsi = Test-ContainerEndpoint -ContainerId $compilerContainer -Endpoint 'http://127.0.0.1:3013/status'
  compiler = Get-CompilerHealth -ContainerId $compilerContainer
}

$overallStatus = 'ok'
foreach ($status in $services.GetEnumerator()) {
  if (($status.Key -eq 'compiler' -and $status.Value -ne 'healthy') -or
      ($status.Key -ne 'compiler' -and $status.Value -ne 'ok')) {
    $overallStatus = 'degraded'
    break
  }
}

$diagnostics = [ordered]@{
  status = $overallStatus
  timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
  services = $services
  metrics = [ordered]@{
    disk_available_bytes = Get-DiskAvailableBytes -ContainerId $appContainer
    history_queue_projects = Get-HistoryQueueProjects -ContainerId $appContainer
  }
}

$diagnostics | ConvertTo-Json -Compress -Depth 5
if ($overallStatus -ne 'ok') {
  exit 1
}
