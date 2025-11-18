import { redirect } from 'next/navigation'

export default function LegacyEmailPreviewRedirect() {
  redirect('/admin/dev/email-preview')
}
