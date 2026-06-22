#!/usr/bin/env node
// scripts/validate-strings.js
// Pre-build string literal validator.
// Catches two classes of Rollup parse errors before they reach Vercel:
//   1. Single-quoted strings containing an unescaped apostrophe mid-word
//      e.g. position:'Chairman's Office'
//   2. Template literals or strings containing raw newline characters
//      e.g. .join('\n') written as an actual newline

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'

const SRC_ROOT = new URL('../src', import.meta.url).pathname

let errors = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { walk(full); continue }
    const ext = extname(full)
    if (ext !== '.js' && ext !== '.jsx') continue
    check(full)
  }
}

function check(filepath) {
  const src   = readFileSync(filepath, 'utf8')
  const lines = src.split('\n')
  const rel   = filepath.replace(SRC_ROOT + '/', '')

  lines.forEach((line, idx) => {
    const lineNo = idx + 1

    // ── Check 1: single-quoted string with mid-word apostrophe ───────────────
    // Matches:  :'word's  or  ,'word's  etc.
    // Ignores:  CSS shorthand values, template literal interiors
    const apostropheRe = /:\s*'([^']*[a-zA-Z])'s\s*[A-Za-z]/g
    let m
    while ((m = apostropheRe.exec(line)) !== null) {
      console.error(`[validate] ${rel}:${lineNo}: Apostrophe inside single-quoted string`)
      console.error(`           ${line.trim()}`)
      errors++
    }

    // ── Check 2: function call with string argument that spans a raw newline ────
    // Specifically catches:  someFunc(\n  'string starting here but not closed\n
    // The tell: a line that is ONLY a string continuation (starts with whitespace
    // then a quote) OR a call that opens a quote and the NEXT line starts the string.
    //
    // Most reliable heuristic: a line ends with an odd number of single quotes
    // after a call-opening pattern, AND the content after the last quote is empty.
    // Real case: window.confirm(\n  'text here\n  ^ line ends here with no closing '
    //
    // Pattern: line ends with ' preceded by non-quote non-backslash chars (string open)
    // AND the line started with whitespace + quote (continuation from previous open call)
    if (/^\s+'[^']*$/.test(line) && !line.trim().startsWith('//')) {
      // Line starts with whitespace then a quote and doesn't close it — raw newline in string
      console.error(`[validate] ${rel}:${lineNo}: String argument continues across raw newline (use \\n instead)`)
      console.error(`           ${line.trim()}`)
      errors++
    }
  })
}

walk(SRC_ROOT)

// ── Check 4: bracket balance in export const array declarations ─────────────
function checkArrayBalance(filepath) {
  const src = readFileSync(filepath, 'utf8')
  const rel = filepath.replace(SRC_ROOT + '/', '')
  const exportArrayRe = /export const (\w+)\s*=\s*\[/g
  let m
  while ((m = exportArrayRe.exec(src)) !== null) {
    const name  = m[1]
    const start = m.index
    // Scan forward to find the matching close
    let depth = 0, pos = start, found = false
    for (; pos < src.length; pos++) {
      if (src[pos] === '[') depth++
      else if (src[pos] === ']') {
        depth--
        if (depth === 0) { found = true; break }
      }
    }
    if (!found) {
      console.error(`[validate] ${rel}: export const ${name} — unmatched opening bracket [`)
      errors++
      continue
    }
    // Check if there is an extra ] immediately after (ignoring whitespace/newlines)
    const rest = src.slice(pos + 1).trimStart()
    if (rest.startsWith(']')) {
      console.error(`[validate] ${rel}: export const ${name} — extra ] after array close`)
      errors++
    }
  }
}

// Walk again for bracket balance
for (const filepath of (() => {
  const out = []
  function w(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e)
      if (statSync(full).isDirectory()) w(full)
      else if (['.js','.jsx'].includes(extname(full))) out.push(full)
    }
  }
  w(SRC_ROOT); return out
})()) {
  checkArrayBalance(filepath)
}

if (errors > 0) {
  console.error(`\n[validate] ${errors} error(s) found. Fix before building.\n`)
  process.exit(1)
} else {
  console.log('[validate] ✅ All string literals and array brackets OK.')
}
