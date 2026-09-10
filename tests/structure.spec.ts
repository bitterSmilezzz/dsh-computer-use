import { readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const SRC = join(ROOT, 'src')

/** Domain folders — the only directories allowed directly under `src/`. */
const DOMAINS = [
  'binding',
  'charter',
  'client',
  'conductor',
  'custody',
  'motion',
  'optics',
  'panel',
  'playbook',
  'toolbelt',
  'tuning',
]

/** Root entry files allowed beside the domain folders. */
const ENTRY_FILES = ['index.ts']

/** The browser half is flat and explicit; new modules must be declared here. */
const CLIENT_FILES = [
  'copy.en.ts',
  'copy.zh.ts',
  'guard.bounds.ts',
  'guard.issues.ts',
  'index.tsx',
  'state.controller.ts',
  'state.draft.ts',
  'view.section.tsx',
  'view.styles.ts',
]

/** Pre-refactor re-export shells (and the flat `providers/` folder) that must not come back. */
const RETIRED_SHELLS = [
  'approval-policy.ts',
  'artifacts.ts',
  'backend.ts',
  'config.ts',
  'confirmations.ts',
  'diff.ts',
  'errors.ts',
  'exposure.ts',
  'leases.ts',
  'service.ts',
  'skill.ts',
  'target-resolver.ts',
  'tools.ts',
  'types.ts',
  'web.ts',
  'providers',
]

describe('source tree structure', () => {
  it('keeps src/ to the domain folders plus the package entry', async () => {
    const entries = await readdir(SRC, { withFileTypes: true })
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
    expect(directories).toEqual([...DOMAINS].sort())
    expect(files).toEqual([...ENTRY_FILES].sort())
  })

  it('names every host-domain module <domain>.<role>.ts', async () => {
    for (const domain of DOMAINS) {
      if (domain === 'client') continue
      const names = (await readdir(join(SRC, domain))).sort()
      expect(names.length, domain).toBeGreaterThan(0)
      for (const name of names) {
        expect(name, `${domain}/${name}`).toMatch(new RegExp(`^${domain}\\.[a-z0-9-]+\\.ts$`))
      }
    }
  })

  it('keeps the browser half flat inside client/', async () => {
    expect((await readdir(join(SRC, 'client'))).sort()).toEqual([...CLIENT_FILES].sort())
  })

  it('never re-introduces a retired compatibility shell', async () => {
    for (const shell of RETIRED_SHELLS) {
      await expect(stat(join(SRC, shell)), shell).rejects.toThrow()
    }
  })
})
