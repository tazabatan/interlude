'use server'

import { getUserRole } from '@/lib/get-user-role'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import type { InviteFormState } from './role-invite-action.types'

const ALLOWED_TARGET_ROLES = new Set(['venue_manager', 'venue_staff'])

type ProviderInfo = {
  provider_type: string | null
  passes?: Array<{ id: string; kind: string | null }> | null
}

async function fetchProviderInfo(providerId: string): Promise<ProviderInfo | null> {
  const select = encodeURIComponent("provider_type,passes(id,kind)")
  const res = await serviceRoleFetch(`/rest/v1/venues?id=eq.${providerId}&select=${select}&limit=1`)
  if (!res.ok) return null
  const [row] = (await res.json()) as ProviderInfo[]
  return row ?? null
}

async function assignConciergePasses(userId: string, passIds: string[], role: "manager" | "staff") {
  if (passIds.length === 0) return
  const payload = passIds.map((id) => ({ pass_id: id, user_id: userId, role }))
  await serviceRoleFetch("/rest/v1/concierge_pass_assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(payload),
  })
}

export async function sendRoleInviteAction(_prevState: InviteFormState, formData: FormData): Promise<InviteFormState> {
  try {
    const emailRaw = formData.get('email')?.toString().trim().toLowerCase()
    const targetRole = formData.get('role')?.toString().trim()
    const requestedVenueId = formData.get('venueId')?.toString().trim() || null

    if (!emailRaw) {
      return { status: 'error', message: 'Enter an email address' }
    }

    if (!targetRole || !ALLOWED_TARGET_ROLES.has(targetRole)) {
      return { status: 'error', message: 'Select a role to assign' }
    }

    const { user, role } = await getUserRole()
    if (!user) {
      return { status: 'error', message: 'You must be signed in' }
    }

    let venueId: string | null = null

    if (role === 'admin') {
      if (!requestedVenueId) {
        return { status: 'error', message: 'Pick a provider for this invite' }
      }
      venueId = requestedVenueId
    } else if (role === 'venue_manager') {
      const managerVenue = user.user_metadata?.venue_id as string | undefined
      if (!managerVenue) {
        return { status: 'error', message: 'Your account is missing a provider' }
      }
      venueId = managerVenue
    } else {
      return { status: 'error', message: 'Only admins or provider managers can send invites' }
    }

    const adminClient = getSupabaseAdminClient()
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(emailRaw, {
      data: {
        app_role: targetRole,
        venue_id: venueId,
      },
    })

    if (error) {
      return { status: 'error', message: error.message }
    }

    const invitedUserId = data?.user?.id ?? null

    if (invitedUserId && venueId) {
      const provider = await fetchProviderInfo(venueId)
      const isConcierge =
        provider?.provider_type === 'private_chef' || provider?.provider_type === 'boat_company'
      if (isConcierge) {
        const passIds = (provider?.passes ?? [])
          .filter((p) => typeof p.id === 'string' && p.id.length > 0)
          .map((p) => p.id)
        try {
          await assignConciergePasses(invitedUserId, passIds, targetRole === 'venue_staff' ? 'staff' : 'manager')
        } catch (assignErr) {
          console.warn('Failed to auto-assign concierge passes', assignErr)
        }
      }
    }

    return {
      status: 'success',
      message: `Invite sent to ${emailRaw}. Supabase will email their link shortly.`,
    }
  } catch (error) {
    console.error('sendRoleInviteAction failed', error)
    return { status: 'error', message: 'Something went wrong while sending the invite' }
  }
}
