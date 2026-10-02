/* eslint-disable
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import Path from 'node:path'
import _ from 'lodash'
import logger from '@overleaf/logger'
let CommandRunner

logger.debug('using standard command runner')

// Track PIDs that have been intentionally killed so that the close handler
// can detect termination even when the child exits with a numeric code instead
// of being reported as killed by a signal (e.g. exit code 4 from latexmk).
const killedPids = new Set()

const SAFE_COMPILE_ENVIRONMENT_KEYS = new Set([
  'PATH',
  'HOME',
  'LANG',
  'LC_ALL',
  'SOURCE_DATE_EPOCH',
  'TMPDIR',
  'TEXMFCONFIG',
  'TEXMFHOME',
  'TEXMFOUTPUT',
  'TEXMFVAR',
  'TEXINPUTS',
  'BIBINPUTS',
  'BSTINPUTS',
])

const MEMORY_UNIT_IN_KIB = {
  '': 1,
  k: 1,
  m: 1024,
  g: 1024 * 1024,
  t: 1024 * 1024 * 1024,
}

function getSafeCompileEnvironment(overrides = {}) {
  const safeOverrides =
    overrides != null && typeof overrides === 'object' ? overrides : {}
  const environment = {}
  for (const key of SAFE_COMPILE_ENVIRONMENT_KEYS) {
    if (process.env[key] != null) {
      environment[key] = process.env[key]
    }
  }
  for (const [key, value] of Object.entries(safeOverrides)) {
    if (SAFE_COMPILE_ENVIRONMENT_KEYS.has(key) && value != null) {
      environment[key] = String(value)
    }
  }
  return environment
}

function parseMemoryLimitInKib(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?)$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = MEMORY_UNIT_IN_KIB[match[2].toLowerCase()]
  if (!Number.isFinite(amount) || unit == null) return null
  return Math.max(1, Math.floor(amount * unit))
}

function buildResourceLimitedCommand(command, timeout) {
  const limits = []
  const timeoutInSeconds = Math.ceil(Number(timeout) / 1000)
  if (Number.isFinite(timeoutInSeconds) && timeoutInSeconds > 0) {
    limits.push(`ulimit -t ${timeoutInSeconds}`)
  }

  const memoryLimitInKib = parseMemoryLimitInKib(
    process.env.UNDERLEAF_COMPILE_MEMORY
  )
  if (memoryLimitInKib != null) {
    limits.push(`ulimit -v ${memoryLimitInKib}`)
  }

  if (limits.length === 0) return command
  return [
    '/bin/bash',
    '-c',
    `${limits.join('; ')}; exec "$@"`,
    'underleaf-compile',
    ...command,
  ]
}

function stopProcessGroup(pid) {
  try {
    process.kill(-pid, 'SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') {
      logger.warn({ err: error, pid }, 'failed to stop compile process group')
    }
  }
}

export default CommandRunner = {
  run(
    projectId,
    command,
    directory,
    image,
    timeout,
    environment,
    compileGroup,
    cwd,
    callback
  ) {
    callback = _.once(callback)
    const spawnCwd = cwd ? Path.join(directory, cwd) : directory
    command = Array.from(command).map(arg =>
      arg.toString().replace('$COMPILE_DIR', directory)
    )
    command = buildResourceLimitedCommand(command, timeout)
    logger.debug(
      { projectId, command, directory, cwd: spawnCwd },
      'running command'
    )
    const env = getSafeCompileEnvironment(environment)

    // run command as detached process so it has its own process group (which can be killed if needed)
    const proc = spawn(command[0], command.slice(1), {
      cwd: spawnCwd,
      env,
      stdio: ['pipe', 'pipe', 'ignore'],
      detached: true,
    })

    const timeoutTimer =
      Number.isFinite(Number(timeout)) && Number(timeout) > 0
        ? setTimeout(() => {
            killedPids.add(proc.pid)
            logger.warn({ projectId, timeout }, 'compile timeout reached')
            stopProcessGroup(proc.pid)
          }, Number(timeout))
        : null

    let stdout = ''
    proc.stdout.setEncoding('utf8').on('data', data => (stdout += data))

    proc.on('error', function (err) {
      if (timeoutTimer) clearTimeout(timeoutTimer)
      killedPids.delete(proc.pid)
      logger.err(
        { err, projectId, command, directory },
        'error running command'
      )
      return callback(err)
    })

    proc.on('close', function (code, signal) {
      if (timeoutTimer) clearTimeout(timeoutTimer)
      let err
      logger.debug({ code, signal, projectId }, 'command exited')
      const wasKilled = killedPids.delete(proc.pid)
      if (signal === 'SIGTERM' || wasKilled) {
        err = new Error('terminated')
        err.terminated = true
        return callback(err)
      } else if (code === 1) {
        // exit status from chktex
        err = new Error('exited')
        err.code = code
        return callback(err)
      } else {
        return callback(null, { stdout, exitCode: code })
      }
    })

    return proc.pid
  }, // return process id to allow job to be killed if necessary

  kill(pid, callback) {
    if (callback == null) {
      callback = function () {}
    }
    try {
      killedPids.add(pid)
      stopProcessGroup(pid)
    } catch (err) {
      killedPids.delete(pid)
      return callback(err)
    }
    return callback()
  },

  canRunSyncTeXInOutputDir() {
    return true
  },
}

CommandRunner.promises = {
  run: promisify(CommandRunner.run),
  kill: promisify(CommandRunner.kill),
}
