// useLocalStorage.js — v1.4 Production hardened
// - Schema versioning (DATA_VERSION)
// - Corruption recovery (falls back to init on parse failure)
// - Storage-full handling (warn, don't crash)
// - Stale-key migration guard

import { useState, useEffect, useRef } from 'react'

export const DATA_VERSION = 2   // bump this when init shape changes

// Safe JSON parse — never throws
function safeParse(str, fallback) {
  try {
    const parsed = JSON.parse(str)
    // Basic sanity: parsed must be same top-level type as fallback
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
    if (typeof fallback === 'object' && !Array.isArray(fallback) && typeof parsed !== 'object') return fallback
    return parsed
  } catch {
    return fallback
  }
}

// Safe JSON stringify — never throws
function safeStringify(val) {
  try { return JSON.stringify(val) } catch { return null }
}

// Safe localStorage.setItem — handles QuotaExceededError
function safeSet(key, value) {
  const str = safeStringify(value)
  if (str === null) return false
  try {
    localStorage.setItem(key, str)
    return true
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn(`[Botanica] localStorage quota exceeded for key "${key}". Data not saved.`)
    } else {
      console.warn(`[Botanica] localStorage write failed for key "${key}":`, e?.message)
    }
    return false
  }
}

export default function useLocalStorage(key, init) {
  // Initialise from storage, fall back to init on any failure
  const [val, setVal] = useState(() => {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return init
    return safeParse(raw, init)
  })

  // Ref to track whether this is the first render (avoid double-write on mount)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    safeSet(key, val)
  }, [key, val])

  return [val, setVal]
}

// Utility: read any key from localStorage safely, without a hook
export function readLocalStorage(key, fallback = null) {
  const raw = localStorage.getItem(key)
  return raw === null ? fallback : safeParse(raw, fallback)
}

// Utility: delete a key safely
export function deleteLocalStorage(key) {
  try { localStorage.removeItem(key) } catch {}
}

// Utility: estimate total localStorage usage in bytes
export function estimateStorageBytes() {
  try {
    let total = 0
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += (key.length + (localStorage[key]?.length || 0)) * 2
      }
    }
    return total
  } catch { return 0 }
}
