[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('help', 'init', 'config', 'build', 'build-compiler', 'up', 'down', 'logs', 'health', 'create-admin', 'test', 'backup', 'restore')]
  [string]$Command = 'help',
  [Parameter(Position = 1)]
  [string]$Destination,
  [string]$Backup,
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot
. "$PSScriptRoot/underleaf-compose.ps1"

$startupTimeoutSeconds = 600
if ($env:UNDERLEAF_STARTUP_TIMEOUT) {
  if (-not [int]::TryParse($env:UNDERLEAF_STARTUP_TIMEOUT, [ref]$startupTimeoutSeconds) -or $startupTimeoutSeconds -lt 1) {
    throw 'UNDERLEAF_STARTUP_TIMEOUT must be a positive integer (seconds).'
  }
}

$composeArgs = Get-ComposeArguments -RepositoryRoot $repoRoot

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [object[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE."
  }
}

function Invoke-Compose {
  param([object[]]$Arguments)

  $dockerArguments = @('compose') + $composeArgs + $Arguments
  Invoke-External -FilePath 'docker' -Arguments $dockerArguments
}

function New-Secret {
  $bytes = [byte[]]::new(32)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  [Convert]::ToBase64String($bytes)
}

function Initialize-Environment {
  param([switch]$Quiet)

  $envPath = Join-Path $repoRoot '.env'
  if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath '.env.example' -Destination $envPath
  }

  $contents = [System.IO.File]::ReadAllText($envPath)
  foreach ($name in @('UNDERLEAF_SESSION_SECRET')) {
    $pattern = "(?m)^$([regex]::Escape($name))=(?<value>.*)$"
    $match = [regex]::Match($contents, $pattern)
    if (-not $match.Success) {
      $separator = if ($contents.EndsWith("`n") -or $contents.EndsWith("`r")) { '' } else { [Environment]::NewLine }
      $contents = $contents + $separator + "$name=$(New-Secret)" + [Environment]::NewLine
      continue
    }
    if ([string]::IsNullOrWhiteSpace($match.Groups['value'].Value)) {
      $contents = [regex]::Replace(
        $contents,
        $pattern,
        "$name=$(New-Secret)",
        1
      )
    }
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($envPath, $contents, $utf8NoBom)
  $script:composeArgs = Get-ComposeArguments -RepositoryRoot $repoRoot
  if (-not $Quiet) {
    Write-Output "Environment ready: $envPath"
  }
}

function Show-Help {
  @'
Usage: .\scripts\underleaf.ps1 <command>

Commands:
  init             Create .env and generate missing secrets
  config           Validate the merged Compose configuration
  build            Build the app and official TeX Live compiler images
  build-compiler   Build the official isolated TeX Live compiler image
  up               Start Underleaf
  down             Stop Underleaf without deleting volumes
  logs             Follow app logs
  health           Show Compose service health
  create-admin     Create the first administrator interactively
  test             Run the application test command
  backup           Create a backup outside the checkout by default
  restore          Restore a backup with -Backup <path> -Yes
'@
}

switch ($Command) {
  'help' {
    Show-Help
  }
  'init' {
    Initialize-Environment
  }
  'config' {
    Initialize-Environment
    Invoke-Compose 'config', '--quiet'
  }
  'build' {
    Initialize-Environment
    Invoke-Compose 'build', 'base'
    Invoke-Compose 'build', 'app', 'compiler'
  }
  'build-compiler' {
    Initialize-Environment
    Invoke-Compose 'build', 'base'
    Invoke-Compose 'build', 'compiler'
  }
  'up' {
    Initialize-Environment
    Invoke-Compose 'build', 'base'
    Invoke-Compose 'up', '--build', '--detach', '--wait', '--wait-timeout', $startupTimeoutSeconds
    Invoke-Compose 'ps', '--all'
  }
  'down' {
    Initialize-Environment
    Invoke-Compose 'down'
  }
  'logs' {
    Initialize-Environment
    Invoke-Compose 'logs', '--follow', 'app'
  }
  'health' {
    Initialize-Environment -Quiet
    & (Join-Path $PSScriptRoot 'underleaf-health.ps1')
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
  'create-admin' {
    Initialize-Environment
    Invoke-Compose 'exec', 'app', 'underleaf', 'create-admin'
  }
  'test' {
    Initialize-Environment
    Invoke-External -FilePath 'corepack' -Arguments @('yarn', 'workspace', '@overleaf/web', 'run', 'test:unit')
    Invoke-External -FilePath 'corepack' -Arguments @('yarn', 'workspace', '@overleaf/clsi', 'run', 'test:unit')
  }
  'backup' {
    Initialize-Environment
    $backupArguments = @()
    if ($Destination) {
      $backupArguments += @('-Destination', $Destination)
    }
    & (Join-Path $PSScriptRoot 'underleaf-backup.ps1') @backupArguments
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
      throw "Backup failed with exit code $LASTEXITCODE."
    }
  }
  'restore' {
    Initialize-Environment
    if (-not $Backup) {
      throw 'Restore requires -Backup <path>.'
    }
    & (Join-Path $PSScriptRoot 'underleaf-restore.ps1') -Backup $Backup -Yes:$Yes
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
      throw "Restore failed with exit code $LASTEXITCODE."
    }
  }
}
