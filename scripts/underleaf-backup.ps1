[CmdletBinding()]
param(
  [string]$Destination
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot
. "$PSScriptRoot/underleaf-compose.ps1"

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Contents
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Contents, $encoding)
}

function Invoke-BinaryOutputCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [object[]]$Arguments,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FilePath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  foreach ($argument in $Arguments) {
    [void]$startInfo.ArgumentList.Add([string]$argument)
  }

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $outputStream = $null
  $started = $false
  try {
    if (-not $process.Start()) {
      throw "Could not start $FilePath."
    }
    $started = $true
    $errorTask = $process.StandardError.ReadToEndAsync()
    $outputStream = [System.IO.File]::Open(
      $OutputPath,
      [System.IO.FileMode]::CreateNew,
      [System.IO.FileAccess]::Write,
      [System.IO.FileShare]::None
    )
    $process.StandardOutput.BaseStream.CopyTo($outputStream)
    $outputStream.Flush()
    $process.WaitForExit()
    $null = $errorTask.GetAwaiter().GetResult()
    if ($process.ExitCode -ne 0) {
      throw "$FilePath failed with exit code $($process.ExitCode)."
    }
  } catch {
    if ($started -and $process.HasExited -eq $false) {
      $process.Kill()
      $process.WaitForExit()
    }
    throw
  } finally {
    if ($outputStream) {
      $outputStream.Dispose()
    }
    $process.Dispose()
  }

  if ((Get-Item -LiteralPath $OutputPath).Length -eq 0) {
    throw "$FilePath produced an empty archive."
  }
}

$timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ', [Globalization.CultureInfo]::InvariantCulture)
$homePath = if ($env:USERPROFILE) { $env:USERPROFILE } elseif ($env:HOME) { $env:HOME } else { $repoRoot }
$backupRoot = if ($env:UNDERLEAF_BACKUP_ROOT) {
  $env:UNDERLEAF_BACKUP_ROOT
} else {
  Join-Path $homePath 'underleaf-backups'
}
$destinationPath = if ($Destination) {
  $Destination
} else {
  Join-Path $backupRoot "underleaf-$timestamp"
}
$destinationPath = [System.IO.Path]::GetFullPath($destinationPath)

if (Test-Path -LiteralPath $destinationPath) {
  throw "Backup destination already exists: $destinationPath"
}

$parentPath = Split-Path -Parent $destinationPath
if (-not (Test-Path -LiteralPath $parentPath -PathType Container)) {
  New-Item -ItemType Directory -Path $parentPath -Force | Out-Null
}

$stagingPath = Join-Path $parentPath ".underleaf-backup.partial-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stagingPath | Out-Null
$composeArguments = @(Get-ComposeArguments -RepositoryRoot $repoRoot)
$archiveNames = @('mongo.archive.gz', 'app-data.tar.gz')

try {
  Invoke-BinaryOutputCommand -FilePath 'docker' -Arguments @(
    (@('compose') + $composeArguments + @('exec', '-T', 'mongo', 'mongodump', '--archive', '--gzip', '--db', 'sharelatex'))
  ) -OutputPath (Join-Path $stagingPath 'mongo.archive.gz')

  Invoke-BinaryOutputCommand -FilePath 'docker' -Arguments @(
    (@('compose') + $composeArguments + @(
      'exec', '-T', 'app', 'sh', '-c',
      'tar -czf - --exclude=data/cache --exclude=data/compiles --exclude=data/output -C /var/lib/overleaf data'
    ))
  ) -OutputPath (Join-Path $stagingPath 'app-data.tar.gz')

  $checksumLines = foreach ($archiveName in $archiveNames) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $stagingPath $archiveName)).Hash.ToLowerInvariant()
    "$hash  $archiveName"
  }
  $checksumTempPath = Join-Path $stagingPath 'checksums.sha256.tmp'
  Write-Utf8NoBom -Path $checksumTempPath -Contents (($checksumLines -join [Environment]::NewLine) + [Environment]::NewLine)
  Move-Item -LiteralPath $checksumTempPath -Destination (Join-Path $stagingPath 'checksums.sha256')

  $revision = 'unknown'
  if (Get-Command git -ErrorAction SilentlyContinue) {
    $revisionOutput = & git -C $repoRoot rev-parse --short HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $revisionOutput) {
      $revision = ([string]$revisionOutput).Trim()
    }
  }
  $manifest = [ordered]@{
    format_version = 1
    created_at = [DateTime]::UtcNow.ToString('o')
    repository_revision = $revision
    database = 'sharelatex'
    contents = @('mongo.archive.gz', 'app-data.tar.gz', 'checksums.sha256')
  }
  $manifestTempPath = Join-Path $stagingPath 'manifest.json.tmp'
  Write-Utf8NoBom -Path $manifestTempPath -Contents (($manifest | ConvertTo-Json -Depth 3) + [Environment]::NewLine)
  Move-Item -LiteralPath $manifestTempPath -Destination (Join-Path $stagingPath 'manifest.json')

  Move-Item -LiteralPath $stagingPath -Destination $destinationPath
  $stagingPath = $null
  Write-Output "Underleaf backup created: $destinationPath"
} catch {
  if ($stagingPath -and (Test-Path -LiteralPath $stagingPath)) {
    Remove-Item -LiteralPath $stagingPath -Recurse -Force
  }
  throw
}
