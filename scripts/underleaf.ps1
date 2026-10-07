[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('help', 'init', 'config', 'build', 'build-compiler', 'up', 'down', 'logs', 'health', 'create-admin', 'test')]
  [string]$Command = 'help'
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

$composeArgs = @('--file', 'compose.yaml', '--env-file', '.env')

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
  $envPath = Join-Path $repoRoot '.env'
  if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath '.env.example' -Destination $envPath
  }

  $contents = [System.IO.File]::ReadAllText($envPath)
  foreach ($name in @('UNDERLEAF_INVITE_TOKEN_SECRET', 'UNDERLEAF_SESSION_SECRET')) {
    $pattern = "(?m)^$([regex]::Escape($name))=(?<value>.*)$"
    $match = [regex]::Match($contents, $pattern)
    if (-not $match.Success) {
      throw "Missing $name in .env."
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
  Write-Output "Environment ready: $envPath"
}

function Show-Help {
  @'
Usage: .\scripts\underleaf.ps1 <command>

Commands:
  init             Create .env and generate missing secrets
  config           Validate the merged Compose configuration
  build            Build the TeX Live base image and the app image
  build-compiler   Build the optional isolated compiler image
  up               Start Underleaf
  down             Stop Underleaf without deleting volumes
  logs             Follow app logs
  health           Show Compose service health
  create-admin     Create the first administrator interactively
  test             Run the application test command
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
    Invoke-Compose 'config', '--quiet'
  }
  'build' {
    Initialize-Environment
    Invoke-External -FilePath 'docker' -Arguments @('build', '--file', 'server-ce/Dockerfile-base', '--tag', 'underleaf/base:local', '.')
    Invoke-Compose 'build', 'app'
  }
  'build-compiler' {
    Initialize-Environment
    $dockerArguments = @('compose', '--profile', 'compiler') + $composeArgs + @('build', 'compiler')
    Invoke-External -FilePath 'docker' -Arguments $dockerArguments
  }
  'up' {
    Initialize-Environment
    Invoke-Compose 'up', '--detach'
  }
  'down' {
    Invoke-Compose 'down'
  }
  'logs' {
    Invoke-Compose 'logs', '--follow', 'app'
  }
  'health' {
    Invoke-Compose 'ps', '--all'
  }
  'create-admin' {
    Invoke-Compose 'exec', 'app', 'underleaf', 'create-admin'
  }
  'test' {
    Invoke-Compose 'exec', '-T', 'app', 'yarn', 'test'
  }
}
