function ConvertFrom-ComposeSpecification {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Specification
  )

  $tokens = [System.Collections.Generic.List[string]]::new()
  $token = ''
  $quote = [char]0
  $escaped = $false
  $tokenStarted = $false

  for ($index = 0; $index -lt $Specification.Length; $index++) {
    $character = $Specification[$index]

    if ($quote -ne [char]0) {
      if ($character -eq $quote) {
        $quote = [char]0
      } elseif ($quote -eq '"' -and $character -eq '\') {
        $index++
        if ($index -ge $Specification.Length) {
          throw 'Invalid UNDERLEAF_COMPOSE_FILES: trailing escape.'
        }
        $token += $Specification[$index]
      } else {
        $token += $character
      }
      $tokenStarted = $true
      continue
    }

    if ($escaped) {
      $token += $character
      $tokenStarted = $true
      $escaped = $false
      continue
    }

    if ([char]::IsWhiteSpace($character)) {
      if ($tokenStarted) {
        $tokens.Add($token)
        $token = ''
        $tokenStarted = $false
      }
      continue
    }

    if ($character -eq "'" -or $character -eq '"') {
      $quote = $character
      $tokenStarted = $true
    } elseif ($character -eq '\') {
      $escaped = $true
      $tokenStarted = $true
    } else {
      $token += $character
      $tokenStarted = $true
    }
  }

  if ($quote -ne [char]0 -or $escaped) {
    throw 'Invalid UNDERLEAF_COMPOSE_FILES: unfinished quote or escape.'
  }
  if ($tokenStarted) {
    $tokens.Add($token)
  }
  if ($tokens.Count -eq 0) {
    throw 'UNDERLEAF_COMPOSE_FILES must contain at least one Compose file.'
  }

  $composeArguments = [System.Collections.Generic.List[object]]::new()
  for ($index = 0; $index -lt $tokens.Count; $index++) {
    if ($tokens[$index] -ne '-f' -and $tokens[$index] -ne '--file') {
      throw "Invalid UNDERLEAF_COMPOSE_FILES: expected -f/--file, got $($tokens[$index])."
    }
    $index++
    if ($index -ge $tokens.Count -or [string]::IsNullOrEmpty($tokens[$index])) {
      throw 'Invalid UNDERLEAF_COMPOSE_FILES: -f requires a path.'
    }
    $composeArguments.Add('-f')
    $composeArguments.Add($tokens[$index])
  }

  return $composeArguments.ToArray()
}

function Get-ComposeArguments {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot
  )

  if ($env:UNDERLEAF_COMPOSE_FILES) {
    $composeArguments = [System.Collections.Generic.List[object]]::new()
    foreach ($argument in (ConvertFrom-ComposeSpecification $env:UNDERLEAF_COMPOSE_FILES)) {
      $composeArguments.Add($argument)
    }
  } elseif ($env:UNDERLEAF_COMPOSE_FILE) {
    $composeArguments = [System.Collections.Generic.List[object]]::new()
    $composeArguments.Add('-f')
    $composeArguments.Add($env:UNDERLEAF_COMPOSE_FILE)
  } else {
    $composeArguments = [System.Collections.Generic.List[object]]::new()
    $composeArguments.Add('-f')
    $composeArguments.Add((Join-Path $RepositoryRoot 'compose.yaml'))
  }

  $envPath = Join-Path $RepositoryRoot '.env'
  if (Test-Path -LiteralPath $envPath -PathType Leaf) {
    $composeArguments.Add('--env-file')
    $composeArguments.Add($envPath)
  }
  return $composeArguments.ToArray()
}
