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

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const roleAssignments = [
  ['member@test.com', 'member'],
  ['d.abatan@rivalcontent.co.uk', 'venue_manager'],
  ['you@yourdomain.com', 'admin'],
]

async function findUserByEmail(email) {
  let page = 1
  const perPage = 100
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`)
    }
    if (!data) break
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < perPage) break
    page += 1
  }
  return null
}

async function ensureRole(email, role) {
  let user
  try {
    user = await findUserByEmail(email)
  } catch (err) {
    console.error(`Failed to fetch ${email}:`, err.message)
    return
  }
  if (!user) {
    console.warn(`User ${email} not found`)
    return
  }
  const currentMeta = user.user_metadata || {}
  if (currentMeta.app_role === role) {
    console.log(`User ${email} already has role ${role}`)
    return
  }
  const newMetadata = { ...currentMeta, app_role: role }
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: newMetadata,
  })
  if (updateError) {
    console.error(`Failed to update ${email}:`, updateError.message)
  } else {
    console.log(`Updated ${email} → ${role}`)
  }
}

async function main() {
  for (const [email, role] of roleAssignments) {
    try {
      await ensureRole(email, role)
    } catch (err) {
      console.error(`Unexpected error updating ${email}:`, err)
    }
  }
}

main().catch((err) => {
  console.error('Fatal error', err)
  process.exit(1)
})
