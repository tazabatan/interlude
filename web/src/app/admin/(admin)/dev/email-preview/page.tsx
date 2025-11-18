import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'
import { EMAIL_TEMPLATE_DEFINITIONS } from '@/emails/template-definitions'
import EmailPreviewClient from './preview-client'

export default async function EmailPreviewPage() {
  const { role, user } = await getUserRole()
  if (role !== 'admin') {
    redirect('/app')
  }

  const templates = EMAIL_TEMPLATE_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
  }))

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Dev</p>
        <h1 className="text-3xl font-semibold text-[#02374D]">Email Templates Preview</h1>
        <p className="mt-2 text-sm text-[#4F514D]">Preview and send all transactional email templates to yourself.</p>
      </div>
      <EmailPreviewClient templates={templates} currentEmail={user?.email ?? ''} />
    </div>
  )
}
