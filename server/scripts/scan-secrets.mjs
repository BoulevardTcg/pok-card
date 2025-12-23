import fs from 'fs'
import path from 'path'

const root = path.resolve(process.cwd(), '..') // repo root from pokecard/server

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cursor',
  'logs',
  'public', // gros assets
])

const IGNORE_FILE_RE = [
  /\\\.env(\.|$)/i, // .env, .env.local, etc.
  /\\ENV_EXAMPLE/i,
  /\\env\.example/i,
  /\\TEST_README\.md$/i,
  /\\BACKEND_EXPLAINED\.md$/i,
  /\\__tests__\\/i,
]

const SECRET_PATTERNS = [
  { name: 'Stripe Secret Key', re: /\bsk_(live|test)_[0-9a-zA-Z]{16,}\b/g },
  { name: 'Stripe Webhook Secret', re: /\bwhsec_[0-9a-zA-Z]{16,}\b/g },
  { name: 'JWT_SECRET assignment', re: /\bJWT_SECRET\s*=\s*["']?[^"'\r\n]{20,}/g },
  { name: 'JWT_REFRESH_SECRET assignment', re: /\bJWT_REFRESH_SECRET\s*=\s*["']?[^"'\r\n]{20,}/g },
  { name: 'SMTP_PASS assignment', re: /\bSMTP_PASS\s*=\s*["']?[^"'\r\n]{6,}/g },
]

const isTextFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  return [
    '.ts', '.tsx', '.js', '.mjs', '.cjs',
    '.json', '.yml', '.yaml',
    '.md', '.txt',
    '.env', '.example',
  ].includes(ext) || ext === ''
}

const walk = (dir, out = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue
      walk(p, out)
    } else if (e.isFile()) {
      out.push(p)
    }
  }
  return out
}

const files = walk(root)
  .filter(isTextFile)
  .filter((f) => !IGNORE_FILE_RE.some((re) => re.test(f)))
const hits = []

for (const f of files) {
  let content = ''
  try {
    content = fs.readFileSync(f, 'utf8')
  } catch {
    continue
  }
  for (const p of SECRET_PATTERNS) {
    const matches = content.match(p.re)
    if (matches && matches.length) {
      hits.push({ file: path.relative(root, f), pattern: p.name, count: matches.length })
    }
  }
}

if (hits.length === 0) {
  console.log('OK: aucun secret évident détecté.')
  process.exit(0)
}

console.log('WARN: secrets potentiels détectés:')
for (const h of hits) {
  console.log(`- ${h.pattern} → ${h.file} (x${h.count})`)
}
process.exit(2)

