const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv(filePath) {
  const envPath = path.resolve(filePath)
  const contents = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    const value = trimmed.slice(idx + 1)
    env[key] = value
  }
  return env
}

const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const email = process.argv[2] ?? 'admin@test.com'

async function main() {
  const { data: existing } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const already = existing?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (already) {
    console.log(`User ${email} already exists; ensuring metadata`)
    const newMetadata = { ...(already.user_metadata ?? {}), app_role: 'admin' }
    const { error: updateError } = await adminClient.auth.admin.updateUserById(already.id, {
      user_metadata: newMetadata,
    })
    if (updateError) {
      console.error('Failed to update metadata:', updateError.message)
      process.exit(1)
    }
    console.log(`Updated ${email} → admin`)
    return
  }

  const { error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { app_role: 'admin' },
    app_metadata: { provider: 'email' },
  })

  if (error) {
    console.error('Failed to create admin user:', error.message)
    process.exit(1)
  }

  console.log(`Created admin user ${email}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
