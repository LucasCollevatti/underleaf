[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Backup,
  [switch]$Yes
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot
. "$PSScriptRoot/underleaf-compose.ps1"

function Read-ExactBytes {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.Stream]$Stream,
    [Parameter(Mandatory = $true)]
    [int]$Count
  )

  $buffer = [byte[]]::new($Count)
  $offset = 0
  while ($offset -lt $Count) {
    $read = $Stream.Read($buffer, $offset, $Count - $offset)
    if ($read -eq 0) {
      if ($offset -eq 0) {
        return $null
      }
      throw 'Archive ended unexpectedly.'
    }
    $offset += $read
  }
  return ,$buffer
}

function Get-TarText {
  param(
    [byte[]]$Header,
    [int]$Offset,
    [int]$Length
  )

  $value = [Text.Encoding]::ASCII.GetString($Header, $Offset, $Length)
  return $value.Split([char]0)[0].Trim()
}

function Get-TarSize {
  param([byte[]]$Header)

  $value = Get-TarText -Header $Header -Offset 124 -Length 12
  if ([string]::IsNullOrWhiteSpace($value)) {
    return [long]0
  }
  try {
    return [Convert]::ToInt64($value.Trim(), 8)
  } catch {
    throw 'Application archive contains an invalid tar size.'
  }
}

function Test-GzipFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  $inputStream = [System.IO.File]::OpenRead($Path)
  $gzipStream = $null
  try {
    $gzipStream = [System.IO.Compression.GZipStream]::new(
      $inputStream,
      [System.IO.Compression.CompressionMode]::Decompress
    )
    $buffer = [byte[]]::new(1MB)
    while ($gzipStream.Read($buffer, 0, $buffer.Length) -gt 0) { }
  } finally {
    if ($gzipStream) {
      $gzipStream.Dispose()
    }
    $inputStream.Dispose()
  }
}

function Test-GzipTarFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  $inputStream = [System.IO.File]::OpenRead($Path)
  $gzipStream = $null
  try {
    $gzipStream = [System.IO.Compression.GZipStream]::new(
      $inputStream,
      [System.IO.Compression.CompressionMode]::Decompress
    )
    while ($true) {
      $header = Read-ExactBytes -Stream $gzipStream -Count 512
      if ($null -eq $header) {
        throw 'Application archive ended without a tar end marker.'
      }
      $isEmptyHeader = $true
      foreach ($byte in $header) {
        if ($byte -ne 0) {
          $isEmptyHeader = $false
          break
        }
      }
      if ($isEmptyHeader) {
        break
      }

      $name = Get-TarText -Header $header -Offset 0 -Length 100
      $prefix = Get-TarText -Header $header -Offset 345 -Length 155
      if ($prefix) {
        $name = "$prefix/$name"
      }
      $normalizedName = $name.Replace('\', '/')
      if (
        [string]::IsNullOrWhiteSpace($normalizedName) -or
        $normalizedName.StartsWith('/') -or
        $normalizedName -match '(^|/)\.\.(/|$)'
      ) {
        throw "Application archive contains an unsafe path: $name"
      }

      $size = Get-TarSize -Header $header
      $remaining = $size
      $buffer = [byte[]]::new(1MB)
      while ($remaining -gt 0) {
        $readLength = [Math]::Min($buffer.Length, $remaining)
        $read = $gzipStream.Read($buffer, 0, [int]$readLength)
        if ($read -eq 0) {
          throw 'Application archive ended inside a tar entry.'
        }
        $remaining -= $read
      }

      $padding = (512 - ($size % 512)) % 512
      if ($padding -gt 0) {
        $null = Read-ExactBytes -Stream $gzipStream -Count ([int]$padding)
      }
    }
  } finally {
    if ($gzipStream) {
      $gzipStream.Dispose()
    }
    $inputStream.Dispose()
  }
}

function Invoke-BinaryInputCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [object[]]$Arguments,
    [Parameter(Mandatory = $true)]
    [string]$InputPath
  )

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FilePath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  foreach ($argument in $Arguments) {
    [void]$startInfo.ArgumentList.Add([string]$argument)
  }

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $inputStream = $null
  $started = $false
  try {
    if (-not $process.Start()) {
      throw "Could not start $FilePath."
    }
    $started = $true
    $errorTask = $process.StandardError.ReadToEndAsync()
    $outputTask = $process.StandardOutput.ReadToEndAsync()
    $inputStream = [System.IO.File]::OpenRead($InputPath)
    $inputStream.CopyTo($process.StandardInput.BaseStream)
    $process.StandardInput.Close()
    $process.WaitForExit()
    $null = $errorTask.GetAwaiter().GetResult()
    $null = $outputTask.GetAwaiter().GetResult()
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
    if ($inputStream) {
      $inputStream.Dispose()
    }
    $process.Dispose()
  }
}

function Invoke-ComposeCommand {
  param([object[]]$Arguments)

  $dockerArguments = @('compose') + $composeArguments + $Arguments
  & docker @dockerArguments | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed with exit code $LASTEXITCODE."
  }
}

if (-not $Yes) {
  throw 'Restore replaces MongoDB and application data. Re-run with -Yes.'
}

$backupPath = [System.IO.Path]::GetFullPath($Backup)
if (-not (Test-Path -LiteralPath $backupPath -PathType Container)) {
  throw "Backup directory does not exist: $backupPath"
}

$expectedFiles = @('manifest.json', 'mongo.archive.gz', 'app-data.tar.gz', 'checksums.sha256')
$entries = @(Get-ChildItem -LiteralPath $backupPath -Force)
if ($entries.Count -ne $expectedFiles.Count -or $entries.Attributes -contains [IO.FileAttributes]::ReparsePoint) {
  throw 'Backup must contain exactly the four regular top-level files.'
}
$actualNames = @($entries | ForEach-Object { $_.Name } | Sort-Object)
$expectedNames = @($expectedFiles | Sort-Object)
if (($actualNames -join "`n") -ne ($expectedNames -join "`n")) {
  throw 'Backup must contain exactly manifest.json, mongo.archive.gz, app-data.tar.gz and checksums.sha256.'
}

try {
  $manifest = Get-Content -LiteralPath (Join-Path $backupPath 'manifest.json') -Raw | ConvertFrom-Json
} catch {
  throw 'Backup manifest is not valid JSON.'
}
if ($manifest.format_version -ne 1 -or $manifest.database -ne 'sharelatex') {
  throw 'Unsupported backup format.'
}
$manifestContents = @($manifest.contents | ForEach-Object { [string]$_ } | Sort-Object)
if (($manifestContents -join "`n") -ne (@('app-data.tar.gz', 'checksums.sha256', 'mongo.archive.gz') -join "`n")) {
  throw 'Backup manifest contents are invalid.'
}

$checksumLines = @(Get-Content -LiteralPath (Join-Path $backupPath 'checksums.sha256'))
$checksums = @{}
foreach ($line in $checksumLines) {
  if ($line -notmatch '^([0-9a-fA-F]{64})  (mongo\.archive\.gz|app-data\.tar\.gz)$') {
    throw 'Backup checksum file has an invalid format.'
  }
  $checksums[$Matches[2]] = $Matches[1].ToLowerInvariant()
}
if ($checksums.Count -ne 2) {
  throw 'Backup checksum file must contain exactly two archive entries.'
}
foreach ($archiveName in @('mongo.archive.gz', 'app-data.tar.gz')) {
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $backupPath $archiveName)).Hash.ToLowerInvariant()
  if ($actualHash -ne $checksums[$archiveName]) {
    throw "Checksum mismatch for $archiveName."
  }
}

Test-GzipFile -Path (Join-Path $backupPath 'mongo.archive.gz')
Test-GzipTarFile -Path (Join-Path $backupPath 'app-data.tar.gz')

$composeArguments = @(Get-ComposeArguments -RepositoryRoot $repoRoot)
$pingArguments = @('compose') + $composeArguments + @(
  'exec', '-T', 'mongo', 'mongosh', '--quiet', '--eval', 'db.adminCommand({ ping: 1 }).ok'
)
$pingResult = & docker @pingArguments 2>$null
if ($LASTEXITCODE -ne 0 -or (@($pingResult) -join '').Trim() -ne '1') {
  throw 'MongoDB preflight connectivity check failed.'
}
$appCheckArguments = @('compose') + $composeArguments + @('exec', '-T', 'app', 'sh', '-c', 'test -d /var/lib/overleaf/data')
& docker @appCheckArguments 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Application data preflight connectivity check failed.'
}

$restoreFailed = $true
try {
  Invoke-ComposeCommand -Arguments @('stop', 'app')

  $mongoRestoreArguments = @('compose') + $composeArguments + @(
    'exec', '-T', 'mongo', 'mongorestore', '--drop', '--archive', '--gzip'
  )
  Invoke-BinaryInputCommand -FilePath 'docker' -Arguments $mongoRestoreArguments -InputPath (Join-Path $backupPath 'mongo.archive.gz')

  $appRestoreCommand = 'for entry in /var/lib/overleaf/data/*; do if [ -d "$entry" ]; then find "$entry" -mindepth 1 -delete; else rm -f "$entry"; fi; done; tar -xzf - -C /var/lib/overleaf; rm -rf /var/lib/overleaf/data/compiles /var/lib/overleaf/data/output; if [ -d /var/lib/overleaf/data/cache ]; then find /var/lib/overleaf/data/cache -mindepth 1 -delete; fi'
  $appRestoreArguments = @('compose') + $composeArguments + @(
    'run', '--rm', '--no-deps', '-T', '--entrypoint', 'sh', 'app', '-c', $appRestoreCommand
  )
  Invoke-BinaryInputCommand -FilePath 'docker' -Arguments $appRestoreArguments -InputPath (Join-Path $backupPath 'app-data.tar.gz')

  Invoke-ComposeCommand -Arguments @('up', '-d', '--no-build', 'app')
  $restoreFailed = $false
  Write-Output "Underleaf backup restored: $backupPath"
} finally {
  if ($restoreFailed) {
    try {
      Invoke-ComposeCommand -Arguments @('up', '-d', '--no-build', 'app')
    } catch {
      Write-Error 'Restore failed and the application could not be started automatically.'
    }
  }
}
