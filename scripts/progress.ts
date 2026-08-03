// Progress bar for long scripts. It is rendered in stderr to keep stdout
// for the script’s result.

import readline from 'node:readline'
import { isatty } from 'node:tty'
import { styleText } from 'node:util'

const COLORS = styleText('bgGreen', ' ', { stream: process.stderr }) !== ' '

let total = 0
let current = 0
let enabled = false

function render(): void {
  let width = process.stderr.columns
  let filled = Math.floor((width * current) / total)
  let rest = width - filled
  let bar: string
  if (COLORS) {
    bar =
      styleText('bgGreen', ' '.repeat(filled), { stream: process.stderr }) +
      styleText('bgWhite', ' '.repeat(rest), { stream: process.stderr })
  } else {
    bar = '█'.repeat(filled) + '▒'.repeat(rest)
  }
  process.stderr.write(`${bar}\n`)
  readline.moveCursor(process.stderr, 0, 0)
}

function rendered(): boolean {
  return enabled && total > 0 && current < total
}

export function startProgress(steps: number): void {
  enabled = isatty(2) && !process.env.CI
  if (!enabled) return
  total = steps
  current = 0
  render()
}

export function nextProgress(): void {
  if (!rendered()) return
  current += 1
  readline.moveCursor(process.stderr, 0, -1)
  readline.clearLine(process.stderr, 0)
  if (current < total) render()
}

export function printAboveProgress(
  message: string,
  mode: 'error' | 'status' | 'text' | 'warning' = 'text'
): void {
  let text = message
  if (mode === 'error') {
    text = styleText('red', message, { stream: process.stderr })
  } else if (mode === 'warning') {
    text = styleText('yellow', message, { stream: process.stderr })
  } else if (mode === 'status') {
    text = styleText('gray', message, { stream: process.stderr })
  }
  if (rendered()) {
    readline.moveCursor(process.stderr, 0, -1)
    readline.clearLine(process.stderr, 0)
    process.stderr.write(`${text}\n`)
    render()
  } else {
    process.stderr.write(`${text}\n`)
  }
}

interface NoFileError extends Error {
  code: string
  path: string
}

function isNoFileError(e: unknown): e is NoFileError {
  return e instanceof Error && `code` in e && e.code === 'ENOENT'
}

let errors = 0

export function warning(text: string): void {
  printAboveProgress(text, 'warning')
  nextProgress()
}

export function error(err: unknown, details?: string): void {
  errors += 1
  let msg: string
  if (isNoFileError(err)) {
    msg = `File not found: ${err.path}`
  } else if (err instanceof Error) {
    msg = err.stack ?? err.message
  } else {
    msg = String(err)
  }
  printAboveProgress('')
  printAboveProgress(
    styleText('bold', styleText('bgRed', ' ERROR ')) +
      ' ' +
      styleText('bold', styleText('red', msg))
  )
  if (details) printAboveProgress(details)
  printAboveProgress('')
  nextProgress()
}

export function success(msg: string, details?: string): void {
  let text = msg
  if (details) {
    text += ` ${styleText('gray', details)}`
  }
  printAboveProgress(styleText('green', styleText('bold', '✓ ') + text))
  nextProgress()
}

export function semiSuccess(msg: string, note: string): void {
  printAboveProgress(
    styleText('bold', '✓ ') + msg + ' ' + styleText('bold', note),
    'warning'
  )
  nextProgress()
}

export function finish(msg: string): void {
  printAboveProgress('')
  let postfix = ''
  if (errors > 0) {
    postfix =
      ', ' + styleText('red', styleText('bold', `${errors} errors found`))
  }
  printAboveProgress(msg + postfix, 'status')
  process.exit(errors > 0 ? 1 : 0)
}
