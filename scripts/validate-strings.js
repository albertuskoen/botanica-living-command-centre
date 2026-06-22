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

if (errors > 0) {
  console.error(`\n[validate] ${errors} string literal error(s) found. Fix before building.\n`)
  process.exit(1)
} else {
  console.log('[validate] ✅ All string literals OK.')
}
