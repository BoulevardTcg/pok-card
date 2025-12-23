type EnvCheck = {
  key: string
  requiredInProd?: boolean
  minLength?: number
  pattern?: RegExp
}

const isProd = () => (process.env.NODE_ENV || '').toLowerCase() === 'production'

const requireEnv = (checks: EnvCheck[]) => {
  const errors: string[] = []
  for (const c of checks) {
    const v = process.env[c.key]
    const must = isProd() ? (c.requiredInProd ?? true) : false
    if (!v || v.trim() === '') {
      if (must) errors.push(`${c.key} est requis en production`)
      continue
    }
    if (c.minLength && v.length < c.minLength) errors.push(`${c.key} doit faire au moins ${c.minLength} caractères`)
    if (c.pattern && !c.pattern.test(v)) errors.push(`${c.key} ne respecte pas le format attendu`)
  }
  return errors
}

export function validateEnvOrThrow() {
  const checks: EnvCheck[] = [
    { key: 'JWT_SECRET', requiredInProd: true, minLength: 64 },
    { key: 'JWT_REFRESH_SECRET', requiredInProd: true, minLength: 64 },

    { key: 'STRIPE_SECRET_KEY', requiredInProd: true, pattern: /^sk_(test|live)_/ },
    { key: 'STRIPE_WEBHOOK_SECRET', requiredInProd: true, pattern: /^whsec_/ },

    { key: 'SMTP_HOST', requiredInProd: true },
    { key: 'SMTP_PORT', requiredInProd: true },
    { key: 'SMTP_USER', requiredInProd: true },
    { key: 'SMTP_PASS', requiredInProd: true },

    { key: 'SHOP_EMAIL', requiredInProd: true, pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ },
    { key: 'FRONTEND_URL', requiredInProd: true },
  ]

  const errors = requireEnv(checks)
  if (errors.length === 0) return

  const message = `Configuration invalide (env):\n- ${errors.join('\n- ')}`

  if (isProd()) {
    throw new Error(message)
  } else {
    console.warn(message)
  }
}

