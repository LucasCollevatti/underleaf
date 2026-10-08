#!/usr/bin/env bash

# Parse only the explicit Compose-file syntax accepted by the operator scripts.
# Environment-variable contents must never be evaluated as shell code.
parse_compose_specification() {
  local specification="$1"
  local character
  local token=""
  local quote=""
  local escaped=false
  local token_started=false
  local index
  local -a tokens=()

  for ((index = 0; index < ${#specification}; index++)); do
    character="${specification:index:1}"

    if [[ -n "$quote" ]]; then
      if [[ "$character" == "$quote" ]]; then
        quote=""
      elif [[ "$character" == '\\' && "$quote" == '"' ]]; then
        index=$((index + 1))
        if ((index >= ${#specification})); then
          echo "Invalid UNDERLEAF_COMPOSE_FILES: trailing escape." >&2
          return 2
        fi
        token+="${specification:index:1}"
      else
        token+="$character"
      fi
      token_started=true
      continue
    fi

    if [[ "$escaped" == true ]]; then
      token+="$character"
      token_started=true
      escaped=false
      continue
    fi

    case "$character" in
      ' '|$'\t'|$'\n'|$'\r')
        if [[ "$token_started" == true ]]; then
          tokens+=("$token")
          token=""
          token_started=false
        fi
        ;;
      "'"|"\"")
        quote="$character"
        token_started=true
        ;;
      '\\')
        escaped=true
        token_started=true
        ;;
      *)
        token+="$character"
        token_started=true
        ;;
    esac
  done

  if [[ -n "$quote" || "$escaped" == true ]]; then
    echo "Invalid UNDERLEAF_COMPOSE_FILES: unfinished quote or escape." >&2
    return 2
  fi
  if [[ "$token_started" == true ]]; then
    tokens+=("$token")
  fi
  if ((${#tokens[@]} == 0)); then
    echo "UNDERLEAF_COMPOSE_FILES must contain at least one Compose file." >&2
    return 2
  fi

  compose_args=()
  local token_index=0
  while ((token_index < ${#tokens[@]})); do
    case "${tokens[token_index]}" in
      -f|--file)
        token_index=$((token_index + 1))
        if ((token_index >= ${#tokens[@]})) || [[ -z "${tokens[token_index]}" ]]; then
          echo "Invalid UNDERLEAF_COMPOSE_FILES: -f requires a path." >&2
          return 2
        fi
        compose_args+=(-f "${tokens[token_index]}")
        ;;
      *)
        echo "Invalid UNDERLEAF_COMPOSE_FILES: expected -f/--file, got ${tokens[token_index]}." >&2
        return 2
        ;;
    esac
    token_index=$((token_index + 1))
  done
}

configure_compose_args() {
  local default_compose_file="$1"

  if [[ -n "${UNDERLEAF_COMPOSE_FILES:-}" ]]; then
    parse_compose_specification "$UNDERLEAF_COMPOSE_FILES"
  elif [[ -n "${UNDERLEAF_COMPOSE_FILE:-}" ]]; then
    compose_args=(-f "$UNDERLEAF_COMPOSE_FILE")
  else
    compose_args=(-f "$default_compose_file")
  fi
}
