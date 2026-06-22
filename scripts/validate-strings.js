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

    // ── Check 2: .join(' followed by actual newline before closing quote ──────
    // Catches things like: .join('↵
    // But not:             .join('\n')
    if (/\.join\(\s*'[^'\\]*$/.test(line)) {
      // Line has .join(' that doesn't close — raw newline follows
      console.error(`[validate] ${rel}:${lineNo}: Unterminated .join() string literal (raw newline)`)
      console.error(`           ${line.trim()}`)
      errors++
    }

    // ── Check 3: alert(' followed by actual newline ───────────────────────────
    if (/alert\(\s*'[^'\\]*$/.test(line) || /alert\(\s*`[^`\\]*$/.test(line)) {
      console.error(`[validate] ${rel}:${lineNo}: alert() string may contain raw newline`)
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
