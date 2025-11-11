'use server'

import { getUserRole } from '@/lib/get-user-role'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type InviteFormState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialInviteFormState: InviteFormState = {
  status: 'idle',
  message: '',
}

const ALLOWED_TARGET_ROLES = new Set(['venue_manager', 'venue_staff'])

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
        return { status: 'error', message: 'Pick a venue for this invite' }
      }
      venueId = requestedVenueId
    } else if (role === 'venue_manager') {
      const managerVenue = user.user_metadata?.venue_id as string | undefined
      if (!managerVenue) {
        return { status: 'error', message: 'Your account is missing a venue' }
      }
      venueId = managerVenue
    } else {
      return { status: 'error', message: 'Only admins or venue managers can send invites' }
    }

    const adminClient = getSupabaseAdminClient()
    const { error } = await adminClient.auth.admin.inviteUserByEmail(emailRaw, {
      data: {
        app_role: targetRole,
        venue_id: venueId,
      },
    })

    if (error) {
      return { status: 'error', message: error.message }
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
