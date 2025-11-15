import { serviceRoleFetch } from './supabase/service-role'
import { getImpersonationInfo } from './impersonation'

export type ActionType = 'page_view' | 'form_submit' | 'api_call' | 'button_click' | 'data_access' | 'other'

export async function trackImpersonationAction(
  actionType: ActionType,
  actionPath?: string,
  actionDetails?: Record<string, unknown>
) {
  try {
    const impersonationInfo = await getImpersonationInfo()

    if (!impersonationInfo.isImpersonating || !impersonationInfo.session) {
      // Not in an impersonation session, no need to track
      return
    }

    // Find the active session ID
    const filterQuery = encodeURIComponent(
      `admin_user_id.eq.${impersonationInfo.session.adminUserId},impersonated_user_id.eq.${impersonationInfo.session.impersonatedUserId},status.eq.active`
    )
    const sessionRes = await serviceRoleFetch(
      `/rest/v1/impersonation_logs?select=id&${filterQuery}&order=started_at.desc&limit=1`
    )

    if (!sessionRes.ok) {
      console.error('Failed to find impersonation session for action tracking')
      return
    }

    const sessions = (await sessionRes.json()) as Array<{ id: string }>

    if (sessions.length === 0) {
      console.error('No active impersonation session found')
      return
    }

    const sessionId = sessions[0].id

    // Log the action
    await serviceRoleFetch('/rest/v1/impersonation_actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        action_type: actionType,
        action_path: actionPath,
        action_details: actionDetails,
      }),
    })
  } catch (error) {
    console.error('Failed to track impersonation action:', error)
    // Don't throw - we don't want tracking failures to break the app
  }
}
