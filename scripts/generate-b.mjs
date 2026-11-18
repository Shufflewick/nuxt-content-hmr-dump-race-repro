// Writes a large collection B whose text barely compresses, so its compressed dump is big and slow
// to rebuild and write. Deterministic (seeded); skips files that already exist.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const count = Number(process.env.B_FILES ?? 3000)
const dir = new URL('../content/b/', import.meta.url)
mkdirSync(dir, { recursive: true })

let seed = 1
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const word = () => Array.from({ length: 3 + Math.floor(random() * 8) }, () => String.fromCharCode(97 + Math.floor(random() * 26))).join('')

for (let i = 0; i < count; i++) {
  const file = new URL(`page-${String(i).padStart(5, '0')}.md`, dir)
  const sections = Array.from({ length: 10 }, (_, s) => `## Section ${s}\n\n${Array.from({ length: 150 }, word).join(' ')}\n`)
  if (!existsSync(file)) writeFileSync(file, `# Page ${i}\n\n${sections.join('\n')}`)
}
console.log(`collection B: ${count} files in content/b`)
