// F15: every VITE_* variable the code reads is listed in .env.example (and the Dockerfile build args).
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.(ts|vue)$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}

const names = (text: string) => new Set([...text.matchAll(/VITE_[A-Z][A-Z0-9_]*[A-Z0-9](?![A-Z0-9_])/g)].map((m) => m[0]))

const used = new Set(sourceFiles(join(root, 'src')).flatMap((f) => [...names(readFileSync(f, 'utf8'))]))

describe('VITE_* inventory', () => {
  it('finds the variables the code reads', () => {
    expect(used.has('VITE_NETWORK')).toBe(true)
    expect(used.size).toBeGreaterThanOrEqual(9)
  })

  it('lists every variable the code reads in .env.example', () => {
    const documented = names(readFileSync(join(root, '.env.example'), 'utf8'))
    expect([...used].filter((n) => !documented.has(n))).toEqual([])
  })

  it('declares every variable the code reads except the docs links as a Dockerfile build arg', () => {
    const dockerfile = readFileSync(join(root, 'Dockerfile'), 'utf8')
    const args = new Set([...dockerfile.matchAll(/^ARG (VITE_[A-Z0-9_]+)/gm)].map((m) => m[1]))
    const optionalLinks = new Set(['VITE_DOCS_URL', 'VITE_DEV_URL'])
    expect([...used].filter((n) => !args.has(n) && !optionalLinks.has(n))).toEqual([])
  })
})
